

// todo: ping slaves individually to make sure they're still responsive
// todo: indicate progress of builds / subjob completion
// todo: make finished builds shrink and move off to the side so you can still click on them (change color based on fail/success)
// todo: show incoming queued builds
// todo: fix css issues that create scroll bars
// todo: make idle nodes attract

//DEBUG_MODE = true;
//Log.setLevel(Log.DEBUG);

var conf = {
    height: null,
    width: null,
    features: {
        swirl: false,
        drawSlaveLinks: false
    },

    gravity: 0.004,
//    gravity: 0,
    updateFrequencyMs: 5000,
//    updateFrequencyMs: 1000,
    collisionPadding: 3,
    collisionConstant: 0.5,  // should be between 0 and 1
    slaveEmbedAmount: 65,
    wallPadding: 5,
    defaultSwirlForce: 0.0002,

//    defaultLinkLength: 15,
    defaultLinkLength: 15,
    defaultLinkStrength: 0.4,

    buildSize: 100,
    buildCharge: -900,

    queuedBuildSize: 15,

    buildWallRepelForce: 200,
    buildGraphicsPosYEnter: 100,  // start at height + 100 so that we animate from offscreen
    buildGraphicsPosYExit: -100,
    buildTransitionEnterDuration: 1000,
    buildTransitionExitDuration: 500,

    idleSlaveCharge: 0,
    activeSlaveCharge: 0,

    buildSlaveRepelForce: 6500,

    slaveCircleSize: 10,
    slaveWallRepelForce: 600,
    slaveBuildAttractionForce: 0.1
};


module.exports = conf;
