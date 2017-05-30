'use strict';

import {conf} from './conf';
import BaseVisualizer from './base_visualizer';
import {rgb} from './util';
import * as PIXI from 'pixi.js';
import MultiStyleText from 'pixi-multistyle-text';
import TWEEN from 'tween.js';


let IDLE = 'IDLE';  // a special identifier to represent the null build
let extraGravity = 0.01;

let buildLineColor = rgb('#1F78C1');
let buildFillColor = rgb('#1F2D3A');
let buildLabelColor = rgb('#D8D9DA');

let waitingStates = ['QUEUED', 'PREPARING', 'PREPARED'];
let buildingStates = ['BUILDING'];

const BuildState = Object.freeze({
    WAITING: 'waiting',
    BUILDING: 'building',
});


class BaseBuildNode {
    constructor(buildData) {
        this.type = 'build';  // wip: remove and use class
        this.buildId = buildData.id;
        this.buildData = buildData;
        // wip: can we get rid of this.size and just use conf values directly?
        this.size = conf.buildSize;  // start with small queued build size (we'll animate to full size)
        this.state = null;
        this.wallRepelForce = conf.buildWallRepelForce;
        this.index = null;
        // this.x = conf.queuedBuildSize + 5;
        // this.y = conf.height + conf.queuedBuildSize + 5;
        // this.x = 400;
        // this.y = 400;
        this.shouldUpdateElapsedTime = true;
        this.numAttractedSlaves = 0;
        this.jobName = buildData.request_params && buildData.request_params.job_name;
        this.startTime = buildData.state_timestamps && buildData.state_timestamps.building;

        this.repoName = null;
        if (buildData.request_params) {
            let repoNameRegex = new RegExp(conf.dashboard.slave_monitor.repo_name_regex || '(.*)', 'g');
            let matches = repoNameRegex.exec(buildData.request_params.url);
            if (matches && matches.length > 1) {
                this.repoName = matches[1];
            }
        }
    }

    update() {}
    updateLabel() {}
}


class BuildNode extends BaseBuildNode {
    constructor(buildData, stage) {
        super(buildData);

        this.gfx = new PIXI.Graphics();
        this.gfx.zIndex = 0;
        stage.addChild(this.gfx);
        this.remove = () => stage.removeChild(this.gfx);

        this.label = new MultiStyleText('', this._getTextStyles());
        this.gfx.addChild(this.label);
        this.updateLabel();
    }

    update(buildData=null) {
        if (buildData) this.buildData = buildData;
        let newState = null,
            buildIsWaiting = waitingStates.includes(this.buildData.status);

        if (buildIsWaiting) {
            newState = BuildState.WAITING;
        } else {
            newState = BuildState.BUILDING;
        }

        if (this.state !== newState) {
            this._updateState(newState);
        }
    }

    _updateState(state) {
        let prevState = this.state;
        this.state = state;
        switch (state) {
            case BuildState.WAITING:
                this.size = conf.queuedBuildSize;
                this.gfx.position.x = this.size + 5;
                this.gfx.position.y = conf.height + (2 * this.index + 1) * (conf.queuedBuildSize + 5);
                this.label.anchor.set(0.5, 0.5);
                this.label.x = 0;

                // Animate queued builds moving up from off bottom of screen.
                new TWEEN.Tween(this.gfx.position)
                    .to({y: (2 * this.index + 1) * (conf.queuedBuildSize + 5)}, 1000)
                    .delay(150 * this.index)
                    .easing(TWEEN.Easing.Cubic.InOut)
                    .start();

                this._redraw({strokeWidth: 1});
                this.updateLabel();
                break;

            case BuildState.BUILDING:
                // Grow circle to bigger size.
                new TWEEN.Tween(this)
                    .to({size: conf.buildSize}, 1000)
                    .onUpdate(() => this._redraw({strokeWidth: 2}))
                    .easing(TWEEN.Easing.Cubic.InOut)
                    .start();

                if (prevState === null) {
                    this.gfx.position.x = conf.width / 2;
                    this.gfx.position.y = conf.height / 2;
                }

                this.label.anchor.set(0, 0.3);
                this.label.x = -0.5 * conf.buildSize;
                this._redraw({strokeWidth: 2});
                this.updateLabel();
                break;

            default:
                throw new Error(`Invalid state "${state}"`);
        }
    }

    _redraw({strokeWidth}) {
        this.gfx.clear();
        this.gfx.lineStyle(strokeWidth, buildLineColor);
        this.gfx.beginFill(buildFillColor);
        this.gfx.drawCircle(0, 0, this.size);
    }

    updateLabel() {
        if (this.state === BuildState.BUILDING) {
            let elapsedTotalSecs = Math.round((new Date().getTime() / 1000) - this.startTime);
            let elapsedTime = _formatTimeDuration(elapsedTotalSecs);
            this.label.text = `#${this.buildId}
<micro> </micro>
<heavySmall>${this.jobName}</heavySmall>
<small>${this.repoName}</small>
<micro> </micro>
<tiny>Elapsed:</tiny>
<small>${elapsedTime}</small>`;
        }
        else if (this.state === BuildState.WAITING) {
            this.label.text = `<smaller>${this.buildId}</smaller>`;
        }
    }

    _getTextStyles() {
        return {
            default: {
                fontFamily: '"Open Sans", "Helvetica Neue", "Helvetica", Helvetica, Arial, sans-serif',
                fontSize: '18px',
                fontWeight: '200',
                fill: ['#ffffff'],
            },
            heavySmall: {fontWeight: 'bold', fontSize: '14px'},
            small: {fontSize: '15px'},
            smaller: {fontSize: '10px'},
            tiny: {fontSize: '8px'},
            micro: {fontSize: '5px'},
        };
    }
}


// a placeholder invisible build node to attract idle slaves
class IdleSlaveNode extends BaseBuildNode {
    constructor() {
        super({id: IDLE});
        this.extraClass = 'idleAttractor';  // wip: remove
        this.hideLabel = true;  // wip: remove
        this.size = conf.buildSize * 1.2;
        this.slaveEmbedAmount = conf.buildSize * 1.2;
        this.linkLength = 10;
        this.linkStrength = 0.2;
        this.charge = -350;
        this.numAttractedSlaves = 0;
        this.x = conf.width / 2;
        this.y = conf.height / 2;
    }
}



function _formatTimeDuration(numTotalSeconds) {
    let numHours = Math.floor(numTotalSeconds / 3600);
    let numMins = Math.floor((numTotalSeconds - numHours * 3600) / 60);
    let numSecs = numTotalSeconds - numHours * 3600 - numMins * 60;
    return numHours + ':' + _zeroPad(numMins) + ':' + _zeroPad(numSecs);
}


function _zeroPad(s) {
    // Add a leading zero if number is less than 10
    let padStr = '00';
    s = '' + s;
    return padStr.substring(0, padStr.length - s.length) + s;
}


class BuildVisualizer extends BaseVisualizer
{
    constructor(slaveDatasource, buildQueueDatasource, repoNameRegex) {
        super();
        this._slaveDatasource = slaveDatasource;
        this._buildQueueDatasource = buildQueueDatasource;
        this._repoNameRegex = repoNameRegex;
        this._queuedBuildNodesById = {};  // keep track of these separately from this._graphNodes since the queue is not part of the graph
        this._force = null;
        this._stage = null;
        this._width = null;
        this._height = null;

        this._buildGraphics = null;
        this._buildingBuildGraphics = null;
    }

    init(g, force, stage, width, height) {
        this._allBuildGraphics = g.selectAll('nonexistent-element');
        this._buildingBuildGraphics = g.selectAll('nonexistent-element');

        // todo: move this node to SlaveVisualizer instead?
        this._specialIdleNode = new IdleSlaveNode();
        // save some useful properties
        this._force = force;
        this._stage = stage;
        this._width = width;  // wip: needed? (no, we can get it from conf)
        this._height = height;  // wip: needed?

        setInterval(() => {
            for (let node of this._graphNodes) {
                node.updateLabel();
            }
        }, 1000);
    }

    update() {
        // Filter buildQueueDatasource to only the builds we want to draw.
        let buildsData = {};
        for (let buildData of Object.values(this._buildQueueDatasource.data)) {
            if (waitingStates.includes(buildData.status) || buildingStates.includes(buildData.status)) {
                buildsData[buildData.id] = buildData;
            }
        }

        // Use d3 selection to do created/updated/deleted operations on graphics.
        let buildingNodes = [];
        this._allBuildGraphics = this._allBuildGraphics
            .data(Object.values(buildsData), d => d.id);
        this._allBuildGraphics.exit()
            .each(function() {
                this.remove();
            });
        let newNodesSelection = this._allBuildGraphics
            .enter()
            .select(d => new BuildNode(d, this._stage));
        this._allBuildGraphics
            .each(function(d) {
                this.update(d);
                // if node change state to building, graph changed
                if (this.state === BuildState.BUILDING) {
                    buildingNodes.push(this);
                }
            });
        this._allBuildGraphics = this._allBuildGraphics.merge(newNodesSelection);

        // Use d3 selection to determine if the force layout graph needs updating.
        let graphStateChanged = false;
        this._buildingBuildGraphics = this._buildingBuildGraphics.data(buildingNodes, d => d.buildId);
        this._buildingBuildGraphics.exit()
            .each(() => graphStateChanged = true);
        this._buildingBuildGraphics = this._buildingBuildGraphics.enter()
            .each(() => graphStateChanged = true)
            .merge(this._buildingBuildGraphics);

        this._graphNodes = buildingNodes.concat([this._specialIdleNode]);
        return graphStateChanged;
    }

    tick() {
        // push special idle attractor node toward the center
        this._specialIdleNode.x += extraGravity * (this._width / 2 - this._specialIdleNode.x);
        this._specialIdleNode.y += extraGravity * (this._height / 2 - this._specialIdleNode.y);
    }
}

export {
    BuildVisualizer,
    IDLE,
};
