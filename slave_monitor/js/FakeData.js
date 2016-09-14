
var conf = require('./conf.js');

//var all_urls = [
//    "cluster1234-host1115.example-cr.gov:43001", "cluster1234-host1116.example-cr.gov:43001",
//    "cluster1234-host1117.example-cr.gov:43001", "cluster1234-host1119.example-cr.gov:43001",
//    "cluster1234-host1118.example-cr.gov:43001", "cluster1234-host1120.example-cr.gov:43001",
//    "cluster1234-host1121.example-cr.gov:43001", "cluster1234-host1123.example-cr.gov:43001",
//    "cluster1234-host1122.example-cr.gov:43001", "cluster1234-host1124.example-cr.gov:43001",
//    "cluster1234-host1125.example-cr.gov:43001", "cluster1234-host1126.example-cr.gov:43001",
//    "cluster1234-host1006.example-cr.gov:43001", "cluster1234-host1007.example-cr.gov:43001",
//    "cluster1234-host1046.example-cr.gov:43001", "cluster1234-host1112.example-cr.gov:43001",
//    "cluster1234-host1113.example-cr.gov:43001", "cluster1234-host1052.example-cr.gov:43001",
//    "cluster1234-host1114.example-cr.gov:43001", "cluster1234-host1087.example-cr.gov:43001",
//    "cluster1234-host1032.example-cr.gov:43001", "cluster1234-host1024.example-cr.gov:43001",
//    "cluster1234-host1039.example-cr.gov:43001", "cluster1234-host1028.example-cr.gov:43001",
//    "cluster1234-host1031.example-cr.gov:43001", "cluster1234-host1025.example-cr.gov:43001",
//    "cluster1234-host1088.example-cr.gov:43001", "cluster1234-host1027.example-cr.gov:43001",
//    "cluster1234-host1089.example-cr.gov:43001", "cluster1234-host1090.example-cr.gov:43001",
//    "cluster1234-host1026.example-cr.gov:43001", "cluster1234-host1030.example-cr.gov:43001",
//    "cluster1234-host1029.example-cr.gov:43001", "cluster1234-host1038.example-cr.gov:43001",
//    "cluster1234-host1033.example-cr.gov:43001", "cluster1234-host1034.example-cr.gov:43001",
//    "cluster1234-host1091.example-cr.gov:43001", "cluster1234-host1092.example-cr.gov:43001",
//    "cluster1234-host1094.example-cr.gov:43001", "cluster1234-host1036.example-cr.gov:43001",
//    "cluster1234-host1035.example-cr.gov:43001", "cluster1234-host1037.example-cr.gov:43001",
//    "cluster1234-host1093.example-cr.gov:43001", "cluster1234-host1050.example-cr.gov:43001",
//    "cluster1234-host1077.example-cr.gov:43001"
//];

var all_urls = [
    "cluster1234-host0001.example-cr.gov:43001", "cluster1234-host0002.example-cr.gov:43001",
    "cluster1234-host0003.example-cr.gov:43001", "cluster1234-host0004.example-cr.gov:43001",
    "cluster1234-host0005.example-cr.gov:43001", "cluster1234-host0006.example-cr.gov:43001",
    "cluster1234-host0007.example-cr.gov:43001", "cluster1234-host0008.example-cr.gov:43001",
    "cluster1234-host0009.example-cr.gov:43001", "cluster1234-host0010.example-cr.gov:43001",
    "cluster1234-host0011.example-cr.gov:43001", "cluster1234-host0012.example-cr.gov:43001",
    "cluster1234-host0013.example-cr.gov:43001", "cluster1234-host0014.example-cr.gov:43001",
    "cluster1234-host0015.example-cr.gov:43001", "cluster1234-host0016.example-cr.gov:43001",
    "cluster1234-host0017.example-cr.gov:43001", "cluster1234-host0018.example-cr.gov:43001",
    "cluster1234-host0019.example-cr.gov:43001", "cluster1234-host0020.example-cr.gov:43001",
    "cluster1234-host0021.example-cr.gov:43001", "cluster1234-host0022.example-cr.gov:43001",
    "cluster1234-host0023.example-cr.gov:43001", "cluster1234-host0024.example-cr.gov:43001",
    "cluster1234-host0025.example-cr.gov:43001", "cluster1234-host0026.example-cr.gov:43001",
    "cluster1234-host0027.example-cr.gov:43001", "cluster1234-host0028.example-cr.gov:43001",
    "cluster1234-host0029.example-cr.gov:43001", "cluster1234-host0030.example-cr.gov:43001",
    "cluster1234-host0031.example-cr.gov:43001", "cluster1234-host0032.example-cr.gov:43001",
    "cluster1234-host0033.example-cr.gov:43001", "cluster1234-host0034.example-cr.gov:43001",
    "cluster1234-host0035.example-cr.gov:43001", "cluster1234-host0036.example-cr.gov:43001",
    "cluster1234-host0037.example-cr.gov:43001", "cluster1234-host0038.example-cr.gov:43001",
    "cluster1234-host0039.example-cr.gov:43001", "cluster1234-host0040.example-cr.gov:43001",
    "cluster1234-host0041.example-cr.gov:43001", "cluster1234-host0042.example-cr.gov:43001",
    "cluster1234-host0043.example-cr.gov:43001", "cluster1234-host0044.example-cr.gov:43001",
    "cluster1234-host0045.example-cr.gov:43001", "cluster1234-host0046.example-cr.gov:43001",
    "cluster1234-host0047.example-cr.gov:43001", "cluster1234-host0048.example-cr.gov:43001",
    "cluster1234-host0049.example-cr.gov:43001", "cluster1234-host0050.example-cr.gov:43001",
    "cluster1234-host0051.example-cr.gov:43001", "cluster1234-host0052.example-cr.gov:43001",
    "cluster1234-host0053.example-cr.gov:43001", "cluster1234-host0054.example-cr.gov:43001",
    "cluster1234-host0055.example-cr.gov:43001", "cluster1234-host0056.example-cr.gov:43001",
    "cluster1234-host0057.example-cr.gov:43001", "cluster1234-host0058.example-cr.gov:43001",
    "cluster1234-host0059.example-cr.gov:43001", "cluster1234-host0060.example-cr.gov:43001",
    "cluster1234-host0061.example-cr.gov:43001", "cluster1234-host0062.example-cr.gov:43001",
    "cluster1234-host0063.example-cr.gov:43001", "cluster1234-host0064.example-cr.gov:43001",
    "cluster1234-host0065.example-cr.gov:43001", "cluster1234-host0066.example-cr.gov:43001",
    "cluster1234-host0067.example-cr.gov:43001", "cluster1234-host0068.example-cr.gov:43001",
    "cluster1234-host0069.example-cr.gov:43001", "cluster1234-host0070.example-cr.gov:43001",
    "cluster1234-host0071.example-cr.gov:43001", "cluster1234-host0072.example-cr.gov:43001"
];

var nextBuildNum = 712;
var buildNumIncrement = 53;

var slavesList = all_urls.map(function(url, i) {
    return {
        url: url,
        current_build_id: null,
        num_executors: 10,
        id: i + 1,
        num_executors_in_use: 0
    };
});

var exampleJobNames = [
    'PHPUnit',
    'Specs2',
    'PHPUnitPerformanceHHVM',
    'QUnit',
    'PHPUnitHHVM',
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
            if (build.id == buildId) build.status = 'BUILDING';
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
