"use strict";

let apikey = '234218deb60cfa4cc4844d91faf868f2';

async function WarcraftLogs_Fetch(path, parameters) {
    let strParams = [ `api_key=${apikey}` ];
    if (typeof parameters != "undefined") {
      for (let name in parameters) {
        strParams.push(name+"="+encodeURI(parameters[name]));
      }
    }
    strParams = strParams.join("&");
    let response = await fetch(`https://classic.warcraftlogs.com:443/v1/${path}?${strParams}`);
    if (!response) {
      throw "Failed to fetch: "+path;
    }
    if (response.status != 200) {
      throw "Failed to fetch: "+path+" (Status: "+response.status+")";
    }
    return await response.json();
}


class Fight {

  constructor(fight, report) {
    this.id = fight.id;
    this.name = fight.name;
    this.start = fight.start_time;
    this.end = fight.end_time;
    this.encounter = fight.boss;
    this.report = report;
  }

  async fetch() {
    if ("data" in this) {
      return; // Already loaded
    }
    if (!"combatantInfo" in this) {
      this.combatantInfo = await WarcraftLogs_Fetch(`report/event/${this.report.id}`, {
        start: this.start, end: this.end, filter: `type IN ("combatantinfo")`
      });
    }
    if (!"events" in this) {
      this.events = await WarcraftLogs_Fetch(`report/event/${this.report.id}`, {
        start: this.start, end: this.end,
        filter: `type IN ("death","cast","begincast","damage","heal","healing","miss","applybuff","applybuffstack","refreshbuff","applydebuff","applydebuffstack","refreshdebuff","energize","absorbed","healabsorbed","leech","drain", "removebuff")`
      });
    }
    debugger;
  }

}

class Report {

  constructor(reportId) {
    this.id = reportId;
  }

  async fetch() {
    if ("data" in this) {
      return; // Already loaded
    }
    this.data = await WarcraftLogs_Fetch(`report/fights/${this.id}`);
    this.fights = {};
    for (let fightData of this.data.fights) {
      this.fights[fightData.id] = new Fight(fightData, this);
      await this.fights[fightData.id].fetch();
    }
  }

}

jQuery("#reportForm").on("submit", function(event) {
  event.preventDefault();
  let logId = jQuery("#reportId").val();
  let urlmatch = logId.match(/https:\/\/(?:[a-z]+\.)?(?:classic\.|www\.)?warcraftlogs\.com\/reports\/((?:a:)?\w+)/);
  if (urlmatch) {
    // Url instead of ID given, extract id.
    logId = urlmatch[1];
  }
  // Obtain report from warcraftlogs
  let report = new Report(logId);
  report.fetch().then(() => {
    console.log(report);
    debugger;
  });
});
