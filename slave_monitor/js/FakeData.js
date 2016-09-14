
var conf = require('./conf.js');


var all_urls = [];
for (var i = 0; i < 40; ++i) {
    all_urls.push('ip-14-121-87-' + i + '.pod.box.net:43001')
}

var nextBuildNum = 712;
var buildNumIncrement = 53;

var slavesList = all_urls.map(function(url, i) {
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

var exampleJobNames = [
    'PHPUnit',
    'Specs2',
    'PHPUnitPerformanceHHVM',
    'QUnit',
    'PHPUnitHHVM'
];

function randomJobName() {
    return exampleJobNames[Math.floor(Math.random() * exampleJobNames.length)];
}

var buildQueue = [
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
    var buildId = nextBuildNum;
    nextBuildNum += buildNumIncrement;
    var queuedBuild = {
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
};

function finishBuild(buildId) {
    // mark all its slaves idle and remove from the queue
    // todo: find out what happens to a build in the queue right after all slaves leave it
        // does it stay there for a bit? if so, do we need to completely filter out all "BUILDING" status builds?
}


function clone(oldObj) {
    var newObj = {};
    Object.keys(oldObj).forEach(function(key) {
        newObj[key] = oldObj[key];
    });
    return newObj;
}

var hiddenSlaves = [];

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
    numBusyExecutors = typeof numBusyExecutors == 'undefined' ? 10 : numBusyExecutors;  // default value
    slavesList
        .filter(function(datum) {return slaveIdsToMark.indexOf(datum.id) != -1})
        .map(function(datum) {
            datum.num_executors_in_use = numBusyExecutors;
            datum.current_build_id = buildId;
        });

    // mark this build in the queue as BUILDING
    if (buildId !== null) {
        buildQueue.map(function(build) {
            if (build.id == buildId) {
                build.status = 'BUILDING';
                build.state_timestamps.building = Date.now()/1000;
            }
        });
    }
}

function markSlavesIdle(slaveIdsToMark) {
    markSlavesBusy(slaveIdsToMark, null, 0);
}

var tmpSlaveList = [];
function toggleSlaveList() {
    cloneSlavesList();
    var temp = slavesList;
    slavesList = tmpSlaveList;
    tmpSlaveList = temp;
}

var tmpBuildQueue = [];
function toggleBuildQueue() {
    cloneBuildQueue();
    var temp = buildQueue;
    buildQueue = tmpBuildQueue;
    tmpBuildQueue = temp;
}

function toggleAll() {
    toggleSlaveList();
    toggleBuildQueue();
}

function range(a, b) {
    var arr = [];
    for (var i = a; i <= b; i++) arr.push(i);
    return arr;
}


sequenceA = [
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


var buildIdA, buildIdB, buildIdC, buildIdD, buildIdE, buildIdF;
sequenceB = [
    function() {
        resetAllSlavesToIdle();
        buildIdA = queueBuild();
        buildIdB = queueBuild();
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
        markSlavesIdle(range(1, 26));
    },
    function() {
        markSlavesIdle(range(21, 40));
        markSlavesBusy(range(1, 24), buildIdD);
        markSlavesBusy(range(25, 40), buildIdE);
        markSlavesBusy(range(52, 72), buildIdF);
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

var dataSequenceFunctions = sequenceB;
var currentSequenceIndex = 0;

function progressDataSequence() {
    cloneSlavesList();
    cloneBuildQueue();
    if (typeof dataSequenceFunctions[currentSequenceIndex] == 'undefined') currentSequenceIndex = 0;  // allows hot swapping dataToUse
    dataSequenceFunctions[currentSequenceIndex]();
    currentSequenceIndex = (currentSequenceIndex + 1) % dataSequenceFunctions.length;
}

var shouldAutoRepeat = true;
function setAutoProgress(newVal) {
    shouldAutoRepeat = newVal;
}

function setProgressionIndex(newVal) {
    currentSequenceIndex = newVal;
}

function beginAutoRepeatingProgression() {
    progressDataSequence();
    if (shouldAutoRepeat)
        d3.timer(beginAutoRepeatingProgression, conf.updateFrequencyMs);
    return true;
}

function getFakeSlavesList() {
    return slavesList;
}

function getFakeBuildQueue() {
    return buildQueue;
}

module.exports.progressDataSequence = progressDataSequence;
module.exports.beginAutoRepeatingProgression = beginAutoRepeatingProgression;
module.exports.setAutoProgress = setAutoProgress;
module.exports.getFakeSlavesList = getFakeSlavesList;
module.exports.getFakeBuildQueue = getFakeBuildQueue;
module.exports.toggleAll = toggleAll;
module.exports.setProgressionIndex = setProgressionIndex;
