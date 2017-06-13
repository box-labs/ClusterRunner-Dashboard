import {conf} from './conf';
import {rgb} from './util';

import MultiStyleText from 'pixi-multistyle-text';
import * as PIXI from 'pixi.js';
import TWEEN from 'tween.js';


let waitingStates = ['QUEUED', 'PREPARING', 'PREPARED'];
let buildingStates = ['BUILDING'];

let buildLineColor = rgb('#1F78C1');
let buildFillColor = rgb('#1F2D3A');
let buildLabelColor = rgb('#D8D9DA');


let IDLE = 'IDLE';  // a special identifier to represent the null build


const BuildState = Object.freeze({
    WAITING: 'waiting',
    BUILDING: 'building',
});


class BaseBuildNode {
    constructor(buildData) {
        this.type = 'build';  // wip: remove and use class
        this.setBuildData(buildData);
        // wip: can we get rid of this.size and just use conf values directly?
        this.size = conf.buildSize;  // start with small queued build size (we'll animate to full size)
        this.state = null;
        this.wallRepelForce = conf.buildWallRepelForce;
        this.index = null;
        this.x = conf.width / 2;
        this.y = conf.height / 2;
        this.shouldUpdateElapsedTime = true;
        this.numAttractedSlaves = 0;
    }

    setBuildData(buildData) {
        this.buildData = buildData;
        this.buildId = buildData.id;
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
        if (buildData) this.setBuildData(buildData);
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

                this.x = this.gfx.position.x;  // Set x and y for force layout starting position.
                this.y = this.gfx.position.y;

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


export {
    BuildNode,
    IDLE,
    IdleSlaveNode,
};
