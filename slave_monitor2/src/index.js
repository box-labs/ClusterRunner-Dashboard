import * as d3 from 'd3';

import {dashboard_conf} from './dashboard_conf';
import {conf} from './conf';
import {SlaveMonitor} from './slave_monitor';
import {Log} from './log';
import * as FakeData from './fake_data';
import {ListRecording} from './list_recording';

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
window.RECORD_MODE = urlParams.record || dashboard_conf.record;
window.PLAYBACK_MODE = urlParams.playback || dashboard_conf.playback;
// Log.setLevel(Log.DEBUG);
Log.setLevel(Log.INFO);
// Log.setLevel(Log.WARNING);
if (window.DEBUG_MODE) {
    Log.setLevel(Log.DEBUG);
    FakeData.beginAutoRepeatingProgression();
    // FakeData.progressDataSequence();
    // FakeData.progressDataSequence();
    // FakeData.progressDataSequence();
}

// let o = {a: 1, b: 2, c: 3};
// for (let [k, v] of Object.entries(o)) {
//     console.log(`k:${k}, v:${v}`);
// }

// let o = {a: 1, b: 2, c: 3};
// for (let v of Object.values(o)) {
//     console.log(`v:${v}`);
// }

// let s = new Set();
// s.add("hello").add("goodbye").add("hello");
// console.log(s);
// console.log(s.size === 2);
// console.log(s.has("hello") === true);

// let r = new ListRecording('');
// let data1 = [{"id": 1, "name": "joey", "lastname": "hoops", "color": "green"}, {"id": 2, "name": "kahn"}, {"id": 3, "name": "shooter"}];
// let data2 = [{"id": 1, "name": "johnny", "lastname": "hoops"}, {"id": 3, "name": "shooter"}];
// let data3 = [{"id": 3}];
// let data4 = [];
//
// r.append(data1);
// r.append(data2);
// r.append(data3);
// r.append(data4);
//
// // console.log(r._recording);
// let play1 = r.next();
// let play2 = r.next();
// let play3 = r.next();
// let play4 = r.next();
// let play5 = r.next();
//
// console.log({
//     play1,
//     play2,
//     play3,
//     play4,
//     play5,
// });
//
// function compareObjs(o1, o2) {
//     let keys1 = Object.keys(o1);
//     let keys2 = Object.keys(o2);
//     if (keys1.length !== keys2.length) {
//         return false;
//     }
//
//     for (let k of keys1) {
//         if (!keys2.includes(k)) {
//             return false;
//         }
//         if (o1[k] !== o2[k]) {
//             return false;
//         }
//     }
//     return true;
// }
//
//
// function compareObjLists(list1, list2, key = 'id') {
//     let list1ByKey = {};
//     for (let i of list1) {
//         list1ByKey[i[key]] = i;
//     }
//
//     for (let i of list2){
//         let other = list1ByKey[i[key]];
//         delete list1ByKey[i[key]];
//         if (!compareObjs(i, other)) {
//             return false;
//         }
//     }
//
//     return Object.keys(list1ByKey).length === 0;
// }
//
// console.log({
//     compare1: compareObjLists(play1, data1),
//     compare2: compareObjLists(play2, data2),
//     compare3: compareObjLists(play3, data3),
//     compare4: compareObjLists(play4, data4),
//     compare5: play5 === null,
// });


// r.download();

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
