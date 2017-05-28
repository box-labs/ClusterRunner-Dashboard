'use strict';

import {conf} from './conf';
import BaseVisualizer from './base_visualizer';
import {rgb} from './util';
import * as PIXI from 'pixi.js';
import MultiStyleText from 'pixi-multistyle-text';


let IDLE = 'IDLE';  // a special identifier to represent the null build
let extraGravity = 0.01;

let buildLineColor = rgb('#1F78C1');
let buildFillColor = rgb('#1F2D3A');
let buildLabelColor = rgb('#D8D9DA');

let waitingStates = ['QUEUED', 'PREPARING', 'PREPARED'];

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
        this.x = conf.queuedBuildSize + 5;
        this.y = conf.height + conf.queuedBuildSize + 5;
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
        stage.addChild(this.gfx);
        this.remove = () => stage.removeChild(this.gfx);

        this.text = new MultiStyleText('', this._getTextStyles());
        this.text.anchor.set(0, 0.3);
        this.text.x = -0.5 * this.size;
        this.updateLabel();
        this.gfx.addChild(this.text);
    }

    update() {
        let newState,
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

    updateLabel() {
        let elapsedTotalSecs = Math.round((new Date().getTime() / 1000) - this.startTime);
        let elapsedTime = _formatTimeDuration(elapsedTotalSecs);
        this.text.text =
`#${this.buildId}
<micro> </micro>
<heavySmall>${this.jobName}</heavySmall>
<small>${this.repoName}</small>
<micro> </micro>
<tiny>Elapsed:</tiny>
<small>${elapsedTime}</small>`;
    }

    _updateState(state) {
        this.state = state;
        switch (state) {
            case BuildState.WAITING:
                this.size = conf.queuedBuildSize;
                this._redraw();
                break;
            case BuildState.BUILDING:
                this.size = conf.buildSize;
                this._redraw();
                break;
            default:
                throw new Error(`Invalid state "${state}"`);
        }
    }

    _redraw() {
        this.gfx.clear();
        this.gfx.lineStyle(2, buildLineColor);
        this.gfx.beginFill(buildFillColor, 0.9);
        this.gfx.drawCircle(0, 0, this.size);
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
        this._queuedBuildNodes = [];  // keep track of these separately from this._graphNodes since the queue is not part of the graph
        this._force = null;
        this._stage = null;
        this._width = null;
        this._height = null;
    }

    init(g, force, stage, width, height) {
        // create selections
        this._buildGraphicGroups = g.selectAll('.buildGraphicGroup');
        this._buildLabels = g.selectAll('.buildLabel');
        this._queuedBuildGraphics = g.selectAll('.queuedBuildGraphic');
        this._queuedBuildLabels = g.selectAll('.queuedBuildLabel');
        // create dummy elements so we can access css values
        this._dummyBuildCircle = g.append('circle').attr('class', 'buildCircle invisible');
        this._dummyQueuedBuildGraphic = g.append('circle').attr('class', 'queuedBuildGraphic invisible');

        this._buildGraphics = g.selectAll('fdsa');

        // todo: move this node to SlaveVisualizer instead?
        this._specialIdleNode = new IdleSlaveNode();
        // save some useful properties
        this._force = force;
        this._stage = stage;
        this._width = width;  // wip: needed?
        this._height = height;  // wip: needed?

        setInterval(() => {
            for (let node of this._graphNodes) {
                node.updateLabel();
            }
        }, 1000);
    }

    update() {
        // Create or remove any nodes or links based on the current datasource data, then update svg representations.
        let graphStateChanged = false;
        // Get a list of current build ids from the slave datasource.
        // todo: get this from the BUILDING builds in the queue datasource (and maybe supplement with slave datasource?)
        let currentActiveSlaveData = Object.values(this._slaveDatasource.data)
            .filter(function(slaveDatum) {
                return slaveDatum.current_build_id !== null
            });

        // Get list of build ids which slaves are currently working on.
        let currentBuildIds = {};
        currentActiveSlaveData.map(function(slaveDatum) {
            currentBuildIds[slaveDatum.current_build_id] = true;  // value doesn't matter -- we just need the keys
        });
        currentBuildIds = Object.keys(currentBuildIds).sort();

        // Generate a map from build id to graphNode
        let graphNodesByBuildId = {};
        for (let i = 0, iMax = this._graphNodes.length; i < iMax; i++) {
            if (this._graphNodes[i] === this._specialIdleNode) continue;  // ignore this special node when detecting changes
            graphNodesByBuildId[this._graphNodes[i].buildId] = this._graphNodes[i];
        }

        // Compare the old build ids and new build ids to see if the force graph has changed.
        let oldBuildIds = Object.keys(graphNodesByBuildId).sort();
        graphStateChanged = !this.areArraysSame(oldBuildIds, currentBuildIds) || graphStateChanged;

        // Create a new updated list of graphNodes.
        let updatedGraphNodesList = [];
        for (let i = 0, iMax = currentBuildIds.length; i < iMax; i++) {
            let buildId = currentBuildIds[i];
            if (buildId in graphNodesByBuildId) {
                // if we already have a node for this id, just update that object instead of replacing it (the object has extra positioning data that we want to preserve)
                updatedGraphNodesList.push(graphNodesByBuildId[buildId]);
            }
            else if (buildId in this._buildQueueDatasource.data) {
                // otherwise this is a new graph node
                let buildData = this._buildQueueDatasource.data[buildId];
                updatedGraphNodesList.push(new BuildNode(buildData, this._stage));
            }
        }
        updatedGraphNodesList.push(this._specialIdleNode);
        this._graphNodes = updatedGraphNodesList;
        this._queuedBuildNodes = this._generateQueuedBuildNodes();
        this._updateSvgElements();
        return graphStateChanged;
    }

    _generateQueuedBuildNodes() {
        let nodes = [];
        for (let buildData of Object.values(this._buildQueueDatasource.data)) {
            if (!waitingStates.includes(buildData.status)) continue;  // ignore builds that are currently building
            nodes.push(new BuildNode(buildData, this._stage));
        }
        return nodes;
    }

    _updateGraphics() {
        this._buildGraphics = this._buildGraphics.data(this._graphNodes, d => d.buildId);
        this._buildGraphics.exit()
            .each(d => d.remove());
        this._buildGraphics = this._buildGraphics
            .enter().merge(this._buildGraphics)
            .each(d => d.update());
    }

    _updateSvgElements() {
        this._buildGraphicGroups = this._buildGraphicGroups.data(this._graphNodes, d => d.buildId);
        let enterSelection = this._buildGraphicGroups.enter()
            .insert('g', '.slaveCircle')  // insert before .slaveCircle to show slaves on top
            .attr('class', 'buildGraphicGroup')
            .call(this.drag(this._force));
        // let buildCircles = enterSelection
        //     .append('circle')
        //     .attr('class', d => 'buildCircle ' + (d.extraClass || ''))
        //     .attr('r', d => d.size);
        // buildCircles
        //     .filter(d => !d.preventQueueAnimation)
        //     .attr('class', '')  // remove class so we can animate properties
        //     .style('stroke-width', this._dummyQueuedBuildGraphic.style('stroke-width'))
        //     .style('fill', this._dummyQueuedBuildGraphic.style('fill'))
        //     .style('stroke', this._dummyQueuedBuildGraphic.style('stroke'))
        //     .style('stroke-dasharray', this._dummyQueuedBuildGraphic.style('stroke-dasharray'))
        //     .transition().duration(conf.buildTransitionEnterDuration)
        //     .each(d => d.size = conf.buildSize)
        //     .attr('r', d => d.size)  // need to reset d.size for collision
        //     .style('stroke-width', this._dummyBuildCircle.style('stroke-width'))
        //     .style('fill', this._dummyBuildCircle.style('fill'))
        //     .style('stroke', this._dummyBuildCircle.style('stroke'))
        //     .style('stroke-dasharray', this._dummyBuildCircle.style('stroke-dasharray'))
        //     .each(function() {
        //         d3.select(this)
        //             .attr('class', function(d) {
        //                 return 'buildCircle ' + (d.extraClass || '')
        //             })
        //     });  // restore class
        // this._buildLabels = enterSelection
        //     .append('text')
        //     .attr('text-anchor', 'left')
        //     .attr('class', function(d) {
        //         return 'buildLabel ' + (d.extraClass || '')
        //     })
        //     .attr('x', 0)
        //     .attr('y', 4);
        // //    this._buildLabels
        // //        .transition().duration(conf.buildTransitionEnterDuration)
        // //            .attr('font-size', '1.6em');
        // let textLeftEdge = function(d) {
        //     return -d.size + 40
        // };
        // this._buildLabels
        //     .append('tspan')
        //     .attr('x', textLeftEdge)
        //     .attr('dy', '-1.5em')
        //     .text(function(d) {
        //         return (d.hideLabel) ? '' : (d.alternateLabel) ? d.alternateLabel : '#' + d.buildId
        //     });
        // this._buildLabels
        //     .append('tspan')
        //     .attr('class', 'buildLabelJobName')
        //     .attr('x', textLeftEdge)
        //     .attr('dy', '1.8em')
        //     .attr('font-size', '80%')
        //     .text(function(d) {
        //         return (d.hideLabel) ? '' : d.jobName
        //     });
        // this._buildLabels
        //     .append('tspan')
        //     .attr('class', 'repoUrl')
        //     .attr('x', textLeftEdge)
        //     .attr('dy', '1em')
        //     .attr('font-size', '80%')
        //     .text(function(d) {
        //         return (d.hideLabel) ? '' : d.repoName
        //     });
        // this._buildLabels
        //     .append('tspan')
        //     .attr('class', 'buildTime')
        //     .attr('x', textLeftEdge)
        //     .attr('dy', '2em')
        //     .attr('font-size', '80%')
        //     .html(function(d) {
        //         if (d.hideLabel) {
        //             return '';
        //         }
        //         // set up an interval to update the time every second
        //         let el = d3.select(this);
        //         let updateFunc = function() {
        //             if (d.shouldUpdateElapsedTime) {
        //                 let elapsedTotalSecs = Math.round((new Date().getTime() / 1000) - d.startTime);
        //                 el.html('<tspan class="tinyText">Elapsed: </tspan>' + _formatTimeDuration(elapsedTotalSecs));
        //                 setTimeout(updateFunc, 1000);
        //             }
        //         };
        //         setTimeout(updateFunc, 1000);
        //     });
        let exitSelection = this._buildGraphicGroups.exit();
        exitSelection
            .transition().duration(conf.buildTransitionExitDuration)
            .attr('transform', (d) => 'translate(' + d.x + ', ' + conf.buildGraphicsPosYExit + ')')
            .remove();
        exitSelection.selectAll('circle')
            .transition().duration(conf.buildTransitionExitDuration)
            .attr('class', 'buildGraphicGroup completed')
            .style('fill', 'rgb(166, 216, 84)');
        exitSelection.selectAll('.buildTime')
            .text(function(d) {
                d.shouldUpdateElapsedTime = false;  // this prevents the updating setTimeout loop from going forever
                return 'Completed!';
            });
        this._buildGraphicGroups = enterSelection.merge(this._buildGraphicGroups);
        this._queuedBuildGraphics = this._queuedBuildGraphics.data(this._queuedBuildNodes, d => d.buildId);
        this._queuedBuildGraphics.exit()
            .remove();  // just remove this element -- this._buildGraphicGroups creates a new element in its place
        this._queuedBuildGraphics
            .transition().duration(300)
            .attr('cx', function(d) {
                d.x = (conf.queuedBuildSize + 5);
                return d.x;
            })
            .attr('cy', function(d, i) {
                d.y = (2 * i + 1) * (conf.queuedBuildSize + 5);
                return d.y
            });
        let enterQueuedBuilds = this._queuedBuildGraphics.enter().append('circle')
            .attr('class', 'queuedBuildGraphic')
            .attr('r', conf.queuedBuildSize)
            .attr('cx', function(d) {
                d.x = conf.queuedBuildSize + 5;
                return d.x;
            })
            .attr('cy', (d, i) => {
                return this._height + (2 * i + 1) * (conf.queuedBuildSize + 5)
            });
        enterQueuedBuilds.transition().duration(1000)
            .delay(function(d, i) {
                return 150 * i
            })  // stagger animating new builds entering the queue
            .attr('cy', function(d, i) {
                d.y = (2 * i + 1) * (conf.queuedBuildSize + 5);
                return d.y;
            });  // animate upward from offscreen
        this._queuedBuildGraphics = enterQueuedBuilds.merge(this._queuedBuildGraphics);
        this._queuedBuildLabels = this._queuedBuildLabels.data(this._queuedBuildNodes, d => d.buildId);
        this._queuedBuildLabels
            .transition().duration(300)
            .attr('x', conf.queuedBuildSize + 5)
            .attr('y', (d, i) => (2 * i + 1) * (conf.queuedBuildSize + 5) + 4);
        enterSelection = this._queuedBuildLabels.enter().append('text')
            .attr('class', 'queuedBuildLabel')
            .attr('text-anchor', 'middle')
            .attr('x', conf.queuedBuildSize + 5)
            .attr('y', (d, i) => this._height + (2 * i + 1) * (conf.queuedBuildSize + 5) + 4)
            .text(d => '' + d.buildId);
        enterSelection
            .transition().duration(1000)
            .delay(function(d, i) {
                return 150 * i
            })
            .attr('y', function(d, i) {
                return (2 * i + 1) * (conf.queuedBuildSize + 5) + 4
            });  // animate upward from offscreen
        this._queuedBuildLabels.exit()
            .remove();
        this._queuedBuildLabels = enterSelection.merge(this._queuedBuildLabels);

        this._updateGraphics();
    }

    tick() {
        // push special idle attractor node toward the center
        this._specialIdleNode.x += extraGravity * (this._width / 2 - this._specialIdleNode.x);
        this._specialIdleNode.y += extraGravity * (this._height / 2 - this._specialIdleNode.y);
        // update positions of build graphics
        this._buildGraphicGroups
            .attr('transform', function(d) {
                return 'translate(' + d.x + ', ' + d.y + ')'
            });
    }
}

export default BuildVisualizer;
