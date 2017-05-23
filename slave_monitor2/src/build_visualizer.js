'use strict';

import {conf} from './conf';
import BaseVisualizer from './base_visualizer';


let IDLE = 'IDLE';  // a special identifier to represent the null build
let extraGravity = 0.01;


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
        // todo: move this node to SlaveVisualizer instead?
        this._specialIdleNode = { // a fake build node to represent the lack of a build
            type: 'build',  // this is needed to make this build collide with other builds because of how collision detection is implemented
            extraClass: 'idleAttractor',
            hideLabel: true,
            // alternateLabel: 'idle nodes',
            buildId: IDLE,
            size: conf.buildSize * 1.2,  // todo: adjust size based on how many idle slaves?
            slaveEmbedAmount: conf.buildSize * 1.2,
            wallRepelForce: conf.buildWallRepelForce,
            linkLength: 10,
            linkStrength: 0.2,
            charge: -350,
            preventQueueAnimation: true,
            numAttractedSlaves: 0,
            id: "idle",
            x: conf.width / 2,
            y: conf.height / 2
        };
        // save some useful properties
        this._force = force;
        this._stage = stage;
        this._width = width;
        this._height = height;
    }

    update() {
        // Create or remove any nodes or links based on the current datasource data, then update svg representations.
        let _this = this;
        let graphStateChanged = false;
        // Get a list of current build ids from the slave datasource.
        // todo: get this from the BUILDING builds in the queue datasource (and maybe supplement with slave datasource?)
        let currentActiveSlaveData = Object.keys(this._slaveDatasource.data)
            .map(function(slaveId) {
                return _this._slaveDatasource.data[slaveId]
            })
            .filter(function(slaveDatum) {
                return slaveDatum.current_build_id !== null
            });
        let newBuildIds = {};  // start with an object so we can easily dedupe build ids
        currentActiveSlaveData.map(function(slaveDatum) {
            newBuildIds[slaveDatum.current_build_id] = true;  // value doesn't matter -- we just need the keys
        });
        newBuildIds = Object.keys(newBuildIds).sort();
        // Generate a map from build id to graphNode
        let graphNodesByBuildId = {};
        for (let i = 0, iMax = this._graphNodes.length; i < iMax; i++) {
            if (this._graphNodes[i] === this._specialIdleNode) continue;  // ignore this special node when detecting changes
            graphNodesByBuildId[this._graphNodes[i].buildId] = this._graphNodes[i];
        }
        // Compare the old build ids and new build ids to see if the force graph has changed.
        let oldBuildIds = Object.keys(graphNodesByBuildId).sort();
        graphStateChanged = !this.areArraysSame(oldBuildIds, newBuildIds) || graphStateChanged;
        // Create a new updated list of graphNodes.
        let updatedGraphNodesList = [];
        for (let i = 0, iMax = newBuildIds.length; i < iMax; i++) {
            let buildId = newBuildIds[i];
            let graphNode;
            if (buildId in graphNodesByBuildId) {
                // if we already have a node for this id, just update that object instead of replacing it (the object has extra positioning data that we want to preserve)
                graphNode = graphNodesByBuildId[buildId];
            }
            else if (buildId in this._buildQueueDatasource.data) {
                // otherwise this is a new graph node
                let buildData = this._buildQueueDatasource.data[buildId];
                let repoName = '';
                let matches = (new RegExp(this._repoNameRegex, 'g')).exec(buildData.request_params.url);
                if (matches && matches.length > 1) {
                    repoName = matches[1];
                }
                graphNode = {
                    type: 'build',
                    buildId: buildId,
                    size: conf.queuedBuildSize,  // start with small queued build size (we'll animate to full size)
                    wallRepelForce: conf.buildWallRepelForce,
                    x: conf.queuedBuildSize + 5,
                    y: this._height + conf.queuedBuildSize + 5,
                    jobName: buildData.request_params.job_name,
                    repoName: repoName,
                    startTime: buildData.state_timestamps.building,
                    shouldUpdateElapsedTime: true,
                    numAttractedSlaves: 0
                };
                // search the queued nodes to see if we've already drawn this build, so we can have position continuity
                // todo: is this needed? would this be handled by the above if block?
                for (let j = 0, jMax = this._queuedBuildNodes.length; j < jMax; j++) {
                    let queuedBuildNode = this._queuedBuildNodes[j];
                    if (queuedBuildNode.buildId === buildId) {
                        graphNode.x = queuedBuildNode.x;
                        graphNode.y = queuedBuildNode.y;
                        graphNode.px = graphNode.x - 40;  // set previous position to give this node some velocity
                        graphNode.py = graphNode.y - 40;
                        graphNode.fromQueue = true;  // flag to enable animating between queued and active appearances
                    }
                }
            }
            else {
                continue;
            }
            updatedGraphNodesList.push(graphNode);
        }
        updatedGraphNodesList.push(this._specialIdleNode);
        this._graphNodes = updatedGraphNodesList;
        this._updateQueueVisualization(newBuildIds);
        this._updateSvgElements();
        return graphStateChanged;
    }

    _updateQueueVisualization(newActiveBuildIds) {
        // todo: move buildqueue to separate vis?
        // copy the build queue data map so we can modify it
        let datasourceData = this._buildQueueDatasource.data;
        let queuedBuildsById = {};
        Object.keys(datasourceData).forEach(function(queuedBuildId) {
            queuedBuildsById[queuedBuildId] = datasourceData[queuedBuildId];
        });
        // iterate through active builds, deleting those from map
        for (let i = 0, l = newActiveBuildIds.length; i < l; i++) {
            delete queuedBuildsById[newActiveBuildIds[i]];
        }
        let newQueuedBuildIds = Object.keys(queuedBuildsById);
        let nodes = [];
        for (let i = 0, l = newQueuedBuildIds.length; i < l; i++) {
            let queuedBuild = queuedBuildsById[newQueuedBuildIds[i]];
            if (queuedBuild.status !== 'QUEUED') continue;  // ignore builds that don't have status QUEUED
            nodes.push({
                buildId: queuedBuild.id,
                size: conf.queuedBuildSize
            });
        }
        this._queuedBuildNodes = nodes;
    }

    _updateSvgElements() {
        let _this = this;
        this._buildGraphicGroups = this._buildGraphicGroups.data(this._graphNodes, function(d) {
            return d.buildId
        });
        let enterSelection = this._buildGraphicGroups.enter()
            .insert('g', '.slaveCircle')  // insert before .slaveCircle to show slaves on top
            .attr('class', 'buildGraphicGroup')
            .call(this.drag(this._force));
        let buildCircles = enterSelection
            .append('circle')
            .attr('class', function(d) {
                return 'buildCircle ' + (d.extraClass || '')
            })
            .attr('r', function(d) {
                return d.size;
            });
        buildCircles.filter(function(d) {
            return !d.preventQueueAnimation
        })
            .attr('class', '')  // remove class so we can animate properties
            .style('stroke-width', this._dummyQueuedBuildGraphic.style('stroke-width'))
            .style('fill', this._dummyQueuedBuildGraphic.style('fill'))
            .style('stroke', this._dummyQueuedBuildGraphic.style('stroke'))
            .style('stroke-dasharray', this._dummyQueuedBuildGraphic.style('stroke-dasharray'))
            .transition().duration(conf.buildTransitionEnterDuration)
            .attr('r', function(d) {
                d.size = conf.buildSize;
                return d.size;
            })  // need to reset d.size for collision
            .style('stroke-width', this._dummyBuildCircle.style('stroke-width'))
            .style('fill', this._dummyBuildCircle.style('fill'))
            .style('stroke', this._dummyBuildCircle.style('stroke'))
            .style('stroke-dasharray', this._dummyBuildCircle.style('stroke-dasharray'))
            // .each('end', function() {d3.select(this)
            .each(function() {
                d3.select(this)
                    .attr('class', function(d) {
                        return 'buildCircle ' + (d.extraClass || '')
                    })
            });  // restore class
        this._buildLabels = enterSelection
            .append('text')
            .attr('text-anchor', 'left')
            .attr('class', function(d) {
                return 'buildLabel ' + (d.extraClass || '')
            })
            .attr('x', 0)
            .attr('y', 4);
        //    this._buildLabels
        //        .transition().duration(conf.buildTransitionEnterDuration)
        //            .attr('font-size', '1.6em');
        let textLeftEdge = function(d) {
            return -d.size + 40
        };
        this._buildLabels
            .append('tspan')
            .attr('x', textLeftEdge)
            .attr('dy', '-1.5em')
            .text(function(d) {
                return (d.hideLabel) ? '' : (d.alternateLabel) ? d.alternateLabel : '#' + d.buildId
            });
        this._buildLabels
            .append('tspan')
            .attr('class', 'buildLabelJobName')
            .attr('x', textLeftEdge)
            .attr('dy', '1.8em')
            .attr('font-size', '80%')
            .text(function(d) {
                return (d.hideLabel) ? '' : d.jobName
            });
        this._buildLabels
            .append('tspan')
            .attr('class', 'repoUrl')
            .attr('x', textLeftEdge)
            .attr('dy', '1em')
            .attr('font-size', '80%')
            .text(function(d) {
                return (d.hideLabel) ? '' : d.repoName
            });
        this._buildLabels
            .append('tspan')
            .attr('class', 'buildTime')
            .attr('x', textLeftEdge)
            .attr('dy', '2em')
            .attr('font-size', '80%')
            .html(function(d) {
                if (d.hideLabel) {
                    return '';
                }
                // set up an interval to update the time every second
                let el = d3.select(this);
                let updateFunc = function() {
                    if (d.shouldUpdateElapsedTime) {
                        let elapsedTotalSecs = Math.round((new Date().getTime() / 1000) - d.startTime);
                        el.html('<tspan class="tinyText">Elapsed: </tspan>' + _formatTimeDuration(elapsedTotalSecs));
                        setTimeout(updateFunc, 1000);
                    }
                };
                setTimeout(updateFunc, 1000);
            });
        let exitSelection = this._buildGraphicGroups.exit();
        exitSelection
            .transition().duration(conf.buildTransitionExitDuration)
            .attr('transform', function(d) {
                return 'translate(' + d.x + ', ' + conf.buildGraphicsPosYExit + ')'
            })
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
        this._queuedBuildGraphics = this._queuedBuildGraphics.data(this._queuedBuildNodes, function(d) {
            return d.buildId
        });
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
            .attr('cy', function(d, i) {
                return _this._height + (2 * i + 1) * (conf.queuedBuildSize + 5)
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
        this._queuedBuildLabels = this._queuedBuildLabels.data(this._queuedBuildNodes, function(d) {
            return d.buildId
        });
        this._queuedBuildLabels
            .transition().duration(300)
            .attr('x', conf.queuedBuildSize + 5)
            .attr('y', function(d, i) {
                return (2 * i + 1) * (conf.queuedBuildSize + 5) + 4
            });
        enterSelection = this._queuedBuildLabels.enter().append('text')
            .attr('class', 'queuedBuildLabel')
            .attr('text-anchor', 'middle')
            .attr('x', conf.queuedBuildSize + 5)
            .attr('y', function(d, i) {
                return _this._height + (2 * i + 1) * (conf.queuedBuildSize + 5) + 4
            })
            .text(function(d) {
                return '' + d.buildId
            })
        ;
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

module.exports = BuildVisualizer;
