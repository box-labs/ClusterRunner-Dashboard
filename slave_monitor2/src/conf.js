

// todo: indicate progress of builds / subjob completion
// todo: make finished builds shrink and move off to the side so you can still click on them (change color based on fail/success)
// todo: fix css issues that create scroll bars

//DEBUG_MODE = true;
//Log.setLevel(Log.DEBUG);

let conf = {
    height: null,
    width: null,
    features: {
        swirl: false,
        drawSlaveLinks: false
    },

    gravity: 0.004,
    updateFrequencyMs: 5000,
    collisionPadding: 3,
    collisionConstant: 0.5,  // should be between 0 and 1
    // slaveEmbedAmount: 65,
    slaveEmbedAmount: 25,
    wallPadding: 5,
    defaultSwirlForce: 0.0002,

//    defaultLinkLength: 15,
    defaultLinkLength: 70,  // this is directly related to slaveEmbedAmount
    defaultLinkStrength: 1.5,

    buildSize: 100,
    buildCharge: -400,

    queuedBuildSize: 15,

    buildWallRepelForce: 200,
    // buildWallRepelForce: 5200,  // setting for high load
    buildGraphicsPosYEnter: 100,  // start at height + 100 so that we animate from offscreen
    buildGraphicsPosYExit: -100,
    buildTransitionEnterDuration: 1000,
    buildTransitionExitDuration: 500,

    idleSlaveCharge: 0,
    activeSlaveCharge: 0,

    buildSlaveRepelForce: 8500,
    // buildSlaveRepelForce: 6500,
    // buildSlaveRepelForce: 1000,  // setting for high load

    slaveCircleSize: 9,
    slaveWallRepelForce: 600,
    slaveBuildAttractionForce: 0.3
};


export {conf};
