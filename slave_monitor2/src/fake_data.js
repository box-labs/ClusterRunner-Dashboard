
import * as d3 from 'd3';
import {conf} from './conf';


let all_urls = [];
for (let i = 0; i < 40; ++i) {
    all_urls.push('ip-14-121-87-' + i + '.pod.box.net:43001')
}

let nextBuildNum = 712;
let buildNumIncrement = 53;

let slavesList = all_urls.map(function(url, i) {
    return {
        url: url,
        current_build_id: null,
        num_executors: 10,
        id: i + 1,
        num_executors_in_use: 0,
        session_id: '155ea7c1-d85e-449b-b289-5c442132f81e',
        is_alive: true,
        is_in_shutdown_mode: false
    };
});

let jobNameIndex = 0;
let exampleJobNames = [
    'PHPUnit',
    'Specs2',
    'PHPUnitPerformanceHHVM',
    'QUnit',
    'PHPUnitHHVM'
];

function randomJobName() {
    let name = exampleJobNames[jobNameIndex];
    jobNameIndex = (jobNameIndex + 1) % exampleJobNames.length;
    return name;
    // return exampleJobNames[Math.floor(Math.random() * exampleJobNames.length)];
}

let buildQueue = [
    {  // a fake error build that should be ignored (and actually we should make CR remove this from the queue)
        failed_atoms: null,
        id: 3,
        num_atoms: null,
        result: null,
        num_subjobs: 0,
        error_message: "Build setup failed! ",
        status: "ERROR",
        details: null,
        artifacts: null,
        request_params: {
            job_name: randomJobName()
        }
    }
];

function queueBuild() {
    let buildId = nextBuildNum;
    nextBuildNum += buildNumIncrement;
    let queuedBuild = {
        failed_atoms: null,
        id: buildId,
        num_atoms: null,
        result: null,
        num_subjobs: 0,
        error_message: null,
        status: "QUEUED",
        details: null,
        artifacts: null,
        request_params: {
            url: "ssh://gitosis@dev-scm-ro.dev.box.net/scm",
            job_name: randomJobName()
        },
        state_timestamps: {
            queued: 1473842415.938,
            preparing: null,
            prepared: null,
            building: null,
            finished: null,
            canceled: null,
            error: null
        }
    };
    buildQueue.push(queuedBuild);
    return buildId;
}

function finishBuild(buildId) {
    // mark all slaves working on this build as idle
    for (let slave of slavesList) {
        if (slave.current_build_id === buildId) {
            slave.num_executors_in_use = 0;
            slave.current_build_id = null;
        }
    }
    // remove build from buildQueue
    for (let i = 0, l = buildQueue.length; i < l; i++) {
        if (buildQueue[i].id === buildId) {
            buildQueue.splice(i, 1);
            break;
        }
    }
}


function clone(oldObj) {
    let newObj = {};
    Object.keys(oldObj).forEach(function(key) {
        newObj[key] = oldObj[key];
    });
    return newObj;
}

let hiddenSlaves = [];

function cloneSlavesList() {
    slavesList = slavesList
        .map(function(datum) {
            return clone(datum);
        });
}

function cloneBuildQueue() {
    buildQueue = buildQueue
        .map(function(build) {
            return clone(build);
        });
}

function resetAllSlavesToIdle() {
    slavesList
        .map(function(datum) {
            datum.num_executors_in_use = 0;
            datum.current_build_id = null;
        });
}

function markSlavesBusy(slaveIdsToMark, buildId, numBusyExecutors) {
    numBusyExecutors = typeof numBusyExecutors === 'undefined' ? 10 : numBusyExecutors;  // default value
    slavesList
        .filter(function(datum) {return slaveIdsToMark.indexOf(datum.id) !== -1})
        .map(function(datum) {
            datum.num_executors_in_use = numBusyExecutors;
            datum.current_build_id = buildId;
        });

    // mark this build in the queue as BUILDING
    if (buildId !== null) {
        buildQueue.map(function(build) {
            if (build.id === buildId) {
                build.status = 'BUILDING';
                build.state_timestamps.building = Date.now()/1000;
                console.log(`${buildId}: ${build.state_timestamps.building}`)
            }
        });
    }
}

function markSlavesIdle(slaveIdsToMark) {
    markSlavesBusy(slaveIdsToMark, null, 0);
}

let tmpSlaveList = [];
function toggleSlaveList() {
    cloneSlavesList();
    let temp = slavesList;
    slavesList = tmpSlaveList;
    tmpSlaveList = temp;
}

let tmpBuildQueue = [];
function toggleBuildQueue() {
    cloneBuildQueue();
    let temp = buildQueue;
    buildQueue = tmpBuildQueue;
    tmpBuildQueue = temp;
}

function toggleAll() {
    toggleSlaveList();
    toggleBuildQueue();
}

function range(a, b) {
    let arr = [];
    for (let i = a; i <= b; i++) arr.push(i);
    return arr;
}


let sequenceA = [
    function() {
        resetAllSlavesToIdle();
        markSlavesBusy([1], 788);
    },
    function() {
        markSlavesBusy(range(1, 24), 788);
    },
    function() {
        markSlavesBusy(range(25, 48), 891);
        markSlavesBusy(range(49, 72), 891);
    },
    function() {
        markSlavesBusy(range(10, 20), 891);
    },
    function() {
        markSlavesIdle(range(1, 10));
    },
    function() {
        markSlavesIdle(range(11, 15));
    },
    function() {
        resetAllSlavesToIdle();
    },
    function() {
        hiddenSlaves.push(slavesList.pop());
        hiddenSlaves.push(slavesList.pop());
        hiddenSlaves.push(slavesList.pop());
        hiddenSlaves.push(slavesList.pop());
    },
    function() {
        slavesList.push(hiddenSlaves.pop());
        slavesList.push(hiddenSlaves.pop());
        slavesList.push(hiddenSlaves.pop());
        slavesList.push(hiddenSlaves.pop());
    }
];


let buildIdA, buildIdB, buildIdC, buildIdD, buildIdE, buildIdF;
let sequenceB = [
    function() {
        resetAllSlavesToIdle();
        buildIdA = queueBuild();
        buildIdB = queueBuild();
    },
    function() {
        markSlavesBusy(range(1, 2), buildIdA);
    },
    function() {
        buildIdC = queueBuild();
        buildIdD = queueBuild();
        buildIdE = queueBuild();
        buildIdF = queueBuild();
        markSlavesBusy(range(3, 27), buildIdB);
        markSlavesBusy(range(28, 51), buildIdC);
    },
    function() {
        finishBuild(buildIdA);
        markSlavesIdle(range(3, 26));
    },
    function() {
        finishBuild(buildIdB);
        markSlavesIdle(range(28, 40));
        markSlavesBusy(range(1, 24), buildIdD);
        markSlavesBusy(range(25, 40), buildIdE);
        markSlavesBusy(range(52, 72), buildIdF);
    },
    function() {
        finishBuild(buildIdC);
        finishBuild(buildIdD);
        finishBuild(buildIdE);
        finishBuild(buildIdF);
        resetAllSlavesToIdle();
    },
    function() {
        hiddenSlaves.push(slavesList.pop());
        hiddenSlaves.push(slavesList.pop());
        hiddenSlaves.push(slavesList.pop());
        hiddenSlaves.push(slavesList.pop());
    },
    function() {
        slavesList.push(hiddenSlaves.pop());
        slavesList.push(hiddenSlaves.pop());
        slavesList.push(hiddenSlaves.pop());
        slavesList.push(hiddenSlaves.pop());
    }
];

let dataSequenceFunctions = sequenceB;
let currentSequenceIndex = 0;

function progressDataSequence() {
    cloneSlavesList();
    cloneBuildQueue();
    if (typeof dataSequenceFunctions[currentSequenceIndex] === 'undefined') currentSequenceIndex = 0;  // allows hot swapping dataToUse
    dataSequenceFunctions[currentSequenceIndex]();
    currentSequenceIndex = (currentSequenceIndex + 1) % dataSequenceFunctions.length;
}

let shouldAutoRepeat = true;
function setAutoProgress(newVal) {
    shouldAutoRepeat = newVal;
}

function setProgressionIndex(newVal) {
    currentSequenceIndex = newVal;
}

function beginAutoRepeatingProgression() {
    d3.interval(progressDataSequence, conf.updateFrequencyMs);
}

function getFakeSlavesList() {
    return slavesList;
}

function getFakeBuildQueue() {
    return buildQueue;
}

export {
    progressDataSequence,
    beginAutoRepeatingProgression,
    setAutoProgress,
    getFakeSlavesList,
    getFakeBuildQueue,
    toggleAll,
    setProgressionIndex,
};
