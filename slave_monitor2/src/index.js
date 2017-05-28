import * as d3 from 'd3';

import {dashboard_conf} from './dashboard_conf';
import {conf} from './conf';
import {SlaveMonitor} from './slave_monitor';
import {Log} from './log';
import {FakeData} from './fake_data';

// $apiProxyUrl = $_SERVER['HTTP_HOST'] . '/api.php';  // proxy requests through this host

let urlParams;
(window.onpopstate = function () {
    let match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = window.location.search.substring(1);

    urlParams = {};
    while (match = search.exec(query))
       urlParams[decode(match[1])] = decode(match[2]);
})();

let masterUrl = urlParams.master || dashboard_conf.master_url;
if (masterUrl.indexOf(':') < 0) {
    masterUrl += ':43000';  // append default port to master url if not present
}

let repoNameRegex = dashboard_conf.slave_monitor.repo_name_regex || '(.*)';

conf.dashboard = dashboard_conf;

window.DEBUG_MODE = urlParams.debug || dashboard_conf.debug;
Log.setLevel(Log.DEBUG);
// Log.setLevel(Log.WARNING);
if (window.DEBUG_MODE) {
    Log.setLevel(Log.DEBUG);
    // FakeData.beginAutoRepeatingProgression();
    FakeData.progressDataSequence();
    FakeData.progressDataSequence();
    FakeData.progressDataSequence();
}

window.d3 = d3;
window.FakeData = FakeData;
let monitor = new SlaveMonitor('.dashboard', masterUrl, repoNameRegex);
monitor.startMonitor();

// import art from './art';
// let a = new art();
// a.render();

// import test from './test2';
// let t = new test();
// t.render();

// import test from './test-phaser';
// let t = new test();
// t.render();
