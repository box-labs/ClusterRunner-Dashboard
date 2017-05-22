
import {conf} from './conf';
import Visualizer from './base_visualizer';


class SlaveVisualizer extends Visualizer
{
    constructor(slaveDatasource, buildVisualizer, hostAbbrevRegex) {
        super();
        this._slaveDatasource = slaveDatasource;
        this._buildVisualizer = buildVisualizer;
        this._hostAbbrevRegex = hostAbbrevRegex;
        this._slaveCircles = null;
        this._slaveLabels = null;
        this._force = null;
        this._width = null;
        this._height = null;
    }

    init(g, force, width, height) {
        this._g = g;
        this._slaveCircles = g.selectAll('.slaveCircle');
        this._slaveLabels = g.selectAll('.slaveLabel');
        this._slaveToBuildLinks = g.selectAll('.slaveToBuildLinks');
        this._force = force;
        this._width = width;
        this._height = height;
    };

    update() {
        // Note: We have to persist the same node objects in between updates (instead of recreating them on each update).
        // The reason is that the force directed graph stores position data on the existing objects, and the physics tick
        // occurs more frequently than this update method is called. If we replace a node object with a new one, even if
        // they have the exact same creation properties, they will not have the same positioning data.
        // Log.debug('SlaveVisualizer.update()');
        let graphStateChanged = false;
        // Use the buildVisualizer to create a map from buildId to build graph node
        let currentBuildNodesById = {};
        this._buildVisualizer.getNodes().map(function(buildNode) {
            currentBuildNodesById[buildNode.buildId.toString()] = buildNode;
        });
        // generate a map of slaveId to graphNode // todo: can we cache this and not generate every time? if so, how do we remove elements (or does it matter)?
        let graphNodesBySlaveId = {};
        for (let i = 0, iMax = this._graphNodes.length; i < iMax; i++) {
            graphNodesBySlaveId[this._graphNodes[i].slaveDatum.id] = this._graphNodes[i];
        }
        // create a list of old slave ids and new slave ids, then compare them.
        let oldSlaveIds = Object.keys(graphNodesBySlaveId).sort();
        let newSlaveIds = Object.keys(this._slaveDatasource.data).sort();
        // if the lists are different at all, that means slaves were added or removed.
        graphStateChanged = !this.areArraysSame(oldSlaveIds, newSlaveIds) || graphStateChanged;
        let _this = this;
        let updatedGraphNodesList = [];
        for (let i = 0, l = newSlaveIds.length; i < l; i++) {
            let slaveId = newSlaveIds[i];
            let slaveDatum = this._slaveDatasource.data[slaveId];
            let attractToNode = currentBuildNodesById[slaveDatum.current_build_id] || currentBuildNodesById['IDLE'];  // may be undefined
            let graphNode;
            if (slaveId in graphNodesBySlaveId) {
                // if we already have a node for this slaveId, just update that object instead of replacing it (the object has extra positioning data that we want to preserve)
                graphNode = graphNodesBySlaveId[slaveId];
                if (graphNode.attractToNode !== attractToNode) {
                    --graphNode.attractToNode.numAttractedSlaves;
                    ++attractToNode.numAttractedSlaves;
                    graphNode.attractToNode = attractToNode;
                    graphStateChanged = true;
                }
                graphNode.slaveDatum = slaveDatum;
            }
            else {
                // otherwise this is a new node
                graphNode = {
                    type: 'slave',
                    slaveDatum: slaveDatum,
                    x: conf.width/2,
                    y: conf.height/2,  // initial position so it doesn't get stuck at 0,0
                    size: conf.slaveCircleSize,
                    classes: function() {
                        let extraClasses = '';
                        let slaveIsBusy = (this.slaveDatum.current_build_id || this.slaveDatum.num_executors_in_use > 0);
                        let slaveIsMarkedDead = this.slaveDatum.is_alive === false;
                        if (slaveIsMarkedDead) {
                            extraClasses += 'dead ';
                        }
                        else if (slaveIsBusy) {
                            extraClasses += 'busy ';
                        }
                        else {
                            extraClasses += 'idle ';
                        }
                        return 'slaveCircle ' + extraClasses;
                    },
                    wallRepelForce: conf.slaveWallRepelForce,
                    link: null,
                    attractToNode: attractToNode
                };
                ++attractToNode.numAttractedSlaves;
            }
            updatedGraphNodesList.push(graphNode);
        }
        this._graphNodes = updatedGraphNodesList;
        // update links on graphNodes
        // todo: update links directly instead of updating attractToNode?
        let graphLinks = [];
        this._graphNodes.map(function(graphNode) {
            // create new links if needed
            if (graphNode.attractToNode && !graphNode.link) {
                graphNode.link = {source: graphNode};
            }
            // update all link targets
            if (graphNode.link) {
                graphNode.link.target = graphNode.attractToNode;  // may be setting to null
            }
            // remove dead links
            if (graphNode.link && !graphNode.link.target) {
                graphNode.link = null;
            }
            // aggregate current links
            if (graphNode.link) {
                graphNode.link.linkLength = graphNode.link.target.linkLength;
                graphNode.link.linkStrength = graphNode.link.target.linkStrength;
                if (graphNode.attractToNode.numAttractedSlaves === 1) {
                    // try to prevent single-node builds from swimming around
                    graphNode.link.linkLength = (graphNode.link.linkLength || conf.defaultLinkLength) + 15;
                    graphNode.link.linkStrength = 0;
                }
                graphLinks.push(graphNode.link);
            }
        });
        this._graphLinks = graphLinks;
        this._updateSvgElements();
        return graphStateChanged;
    };

    _updateSvgElements() {
        let hostAbbrevRegex = this._hostAbbrevRegex;
        this._slaveCircles = this._slaveCircles.data(this._graphNodes, function(d) {
            return d.slaveDatum['url']
        });
        this._slaveCircles.exit()  // Destroy
            .remove();
        this._slaveCircles = this._slaveCircles
            .enter()  // Create
            .append('circle')
            .attr('r', function(d) {
                return d.size;
            })
            .call(this.drag(this._force))
            .merge(this._slaveCircles)  // Create + Update
            .attr('class', function(d) {
                return d.classes();
            })
        ;
        this._slaveLabels = this._slaveLabels.data(this._graphNodes, function(d) {
            return d.slaveDatum['url']
        });
        this._slaveLabels.exit()  // Destroy
            .remove();
        let enterSelection = this._slaveLabels
            .enter()  // Create
            .append('text')
            .attr('class', 'slaveLabel')
            .text(function(d) {
                let slaveUrl = d.slaveDatum['url'];
                // generate an abbreviated hostname from the dashboard.ini conf value
                let matches = (new RegExp(hostAbbrevRegex, 'g')).exec(slaveUrl);
                if (matches && matches.length > 1) {
                    return matches[1];
                }
                // if no conf value specified, extract the last numerical sequence before the port number (if any)
                matches = /(\d+)[\D]*:\d+$/.exec(slaveUrl);
                if (matches && matches.length > 1) {
                    return matches[1];
                }
                // if still no match, just abbreviate the hostname
                return slaveUrl.substring(0, 7) + '...';
            });
        this._slaveLabels = enterSelection.merge(this._slaveLabels);
        if (conf.features.drawSlaveLinks) {
            let slaveToBuildLinks = this._g.selectAll('.slaveLink')
                .data(this._graphLinks, function(d) {
                    return d.source.slaveDatum['url']
                });
            slaveToBuildLinks.exit().remove();
            slaveToBuildLinks.enter().append('line')
                .attr('class', 'slaveLink');
        }
        else {
            let slaveToBuildLinks = this._g.selectAll('.slaveLink').data([]);
            slaveToBuildLinks.exit().remove();
        }
    };

    /**
     * Update the positions of SVG elements managed by this visualizer.
     * @param alpha
     */
    tick(alpha) {
        // partition slave nodes into groups based on build
        let slaveGroupsByBuild = {};
        for (let i = 0, l = this._graphLinks.length; i < l; i++) {
            let link = this._graphLinks[i];
            let buildNode = link.target;
            if (!(buildNode.buildId in slaveGroupsByBuild)) {
                slaveGroupsByBuild[buildNode.buildId] = [];
            }
            slaveGroupsByBuild[buildNode.buildId].push(link.source);
        }
        // make all slave nodes for each build repel each other
        let slaveRepelForce = conf.buildSlaveRepelForce * alpha;
        Object.keys(slaveGroupsByBuild).forEach(function(buildId) {
            let slaves = slaveGroupsByBuild[buildId];
            slaves.map(function(slaveNodeA) {
                slaves.map(function(slaveNodeB) {
                    if (slaveNodeA === slaveNodeB) return;
                    let dx = slaveNodeB.x - slaveNodeA.x;
                    let dy = slaveNodeB.y - slaveNodeA.y;
                    let dxSq = Math.pow(dx, 2);
                    let dySq = Math.pow(dy, 2);
                    let dSq = dxSq + dySq;
                    let d = Math.sqrt(dSq);
                    let f = slaveRepelForce / dSq;
                    slaveNodeA.x -= dx * f / d;
                    slaveNodeA.y -= dy * f / d;
                })
            });
        });
        // update positions of svg circles
        this._slaveCircles
            .attr('cx', function(d) {
                return d.x;
            })
            .attr('cy', function(d) {
                return d.y;
            });
        // update positions of text labels
        this._slaveLabels
            .attr('text-anchor', 'middle')
            .attr('x', function(d) {
                return d.x;
            })
            .attr('y', function(d) {
                return d.y + d.size + 9;
            });
        if (conf.features.drawSlaveLinks) {
            // update positions of svg lines
            this._g.selectAll('.slaveLink')
                .attr('x1', function(d) {
                    return d.source.x;
                })
                .attr('x1', function(d) {
                    return d.source.x;
                })
                .attr('y1', function(d) {
                    return d.source.y;
                })
                .attr('x2', function(d) {
                    return d.target.x;
                })
                .attr('y2', function(d) {
                    return d.target.y;
                });
        }
    };
}

module.exports = SlaveVisualizer;
