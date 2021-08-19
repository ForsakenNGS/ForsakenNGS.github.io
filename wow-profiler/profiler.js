"use strict";

let apikey = '234218deb60cfa4cc4844d91faf868f2';

async function WarcraftLogs_Fetch(path) {
    let response = await fetch(`https://classic.warcraftlogs.com:443/v1/${path}&api_key=${apikey}`);
    if (!response) {
      throw "Failed to fetch: "+path;
    }
    if (response.status != 200) {
      throw "Failed to fetch: "+path+" (Status: "+response.status+")";
    }
    return await response.json();
}

class Report {

  constructor(reportId) {
    this.id = reportId;
  }

  async fetch() {
    if ("data" in this) {
      return; // Already loaded
    }
    this.data = await WarcraftLogs_Fetch(`report/fights/${this.reportId}?`);
  }

}

jQuery("#reportForm").on("submit", function() {
  let logId = jQuery("#reportId").val();
  let urlmatch = logId.match(/https:\/\/(?:[a-z]+\.)?(?:classic\.|www\.)?warcraftlogs\.com\/reports\/((?:a:)?\w+)/);
  if (urlmatch) {
    // Url instead of ID given, extract id.
    logId = urlmatch[1];
  }
  // Obtain report from warcraftlogs
  let report = new Report(logId);
  report.fetch().then(() => {
    debugger;    
  });
});
