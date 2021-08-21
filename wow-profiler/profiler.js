"use strict";

const requestThrottle = 250;
let requestNext = 0;
let apikey = '234218deb60cfa4cc4844d91faf868f2';
let reportActive = null;

function sleep(ms) {
    return new Promise(f => setTimeout(f, ms));
}

async function WarcraftLogs_Fetch(path, parameters) {
  let now = (new Date).getTime();
  requestNext = Math.max(requestNext, now);
  if (requestNext > now) {
    await sleep(requestNext - now);
  }
  requestNext = now + requestThrottle;
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

async function WarcraftLogs_FetchByTime(path, parameters, field) {
  let result = [];
  while (typeof parameters.start == "number") {
    let json = await WarcraftLogs_Fetch(path, parameters);
    if (!json[field]) {
      throw "Expected field '"+field+"' not found in "+path;
    }
    // Add field contents to result
    result.push(...json[field]);
    parameters.start = json.nextPageTimestamp;
  }
  return result;
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
    if (!("combatantInfo" in this)) {
      this.combatantInfo = await WarcraftLogs_FetchByTime(`report/events/${this.report.id}`, {
        start: this.start, end: this.end,
        filter: `type IN ("combatantinfo")`
      }, 'events');
    }
  }

  async fetchEvents() {
    this.events = await WarcraftLogs_FetchByTime(`report/events/${this.report.id}`, {
      start: this.start, end: this.end,
      filter: `type IN ("death","cast","begincast","damage","heal","healing","miss","applybuff","applybuffstack","refreshbuff","applydebuff","applydebuffstack","refreshdebuff","energize","absorbed","healabsorbed","leech","drain", "removebuff")`
    }, 'events');
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
    reportActive = report;
    jQuery("#characterId").html("").each(function() {
      for (let characterData of report.data.exportedCharacters) {
        jQuery(this).append( jQuery("<option></option>").attr("id", characterData.id).text(characterData.name) );
      }
    });
    jQuery("#fightId").html("").each(function() {
      for (let fightData of report.data.fights) {
        jQuery(this).append( jQuery("<option></option>").attr("id", fightData.id).text("#"+fightData.id+" "+fightData.name) );
      }
    });
    jQuery("#fightContainer").show();
  });
});

jQuery("#fightForm").on("submit", function(event) {
  let characterId = jQuery("#characterId").val();
  let fightId = jQuery("#fightId").val();
  let character = null;
  let fight = null;
  for (let characterData of reportActive.data.exportedCharacters) {
    if (characterData.id == characterId) {
      character = characterData;
    }
  }
  for (let fightData of reportActive.data.fights) {
    if (fightData.id == characterId) {
      fight = fightData;
    }
  }
  debugger;
});
