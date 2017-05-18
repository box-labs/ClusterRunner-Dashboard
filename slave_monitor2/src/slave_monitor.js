'use strict';
import * as d3 from 'd3';

import BuildQueueDatasource from './build_queue_datasource';
import BuildVisualizer from './build_visualizer';
import {conf} from './conf';
import {Log} from './log';
import {Network} from './network';
import {SlavesListDatasource} from './slaves_list_datasource';
import SlaveVisualizer from './slave_visualizer';


function dragstarted(d) {
    if (!d3.event.active) forze.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
}

function dragended(d) {
    if (!d3.event.active) forze.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}
var linkz, nodez, forze;
function ticked() {
    linkz
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    nodez
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
}

class SlaveMonitor {
    constructor(containerSelector, masterUrl, hostAbbrevRegex, repoNameRegex) {
        this._masterUrl = masterUrl;
        this._container = d3.select(containerSelector);
        this._hostAbbrevRegex = hostAbbrevRegex;
        this._repoNameRegex = repoNameRegex;
        this.force = null;
        this._links = null;
        var _this = this;
        Network.setErrorCallback(function(url, apiError) {
            // todo: this still stops execution -- should just have it show error until next successful call?
            Log.raw(apiError);
            _this._container.insert('p', 'svg')
                .attr('class', 'errorMessage')
                .style('top', (conf.height / 2 - 50) + 'px')
                .html('Error occurred getting url "' + url + '". Check JS console for details. ' +
                    '<a href="./' + window.location.search + '">Refresh page.</a>');
        });
    }

    startMonitor() {
        var slaveDatasource = new SlavesListDatasource(this._masterUrl);
        slaveDatasource.start();
        var buildQueueDatasource = new BuildQueueDatasource(this._masterUrl);
        buildQueueDatasource.start();
        var buildVisualizer = new BuildVisualizer(slaveDatasource, buildQueueDatasource, this._repoNameRegex);
        var slaveVisualizer = new SlaveVisualizer(slaveDatasource, buildVisualizer, this._hostAbbrevRegex);
        // the order of this array matters! dependent visualizations should come after dependees.
        this._startVisualization([buildVisualizer, slaveVisualizer]);
    };

    _startVisualization(visualizers) {
        var _this = this;
        conf.width = this._getNumericalStyleAttribute(this._container, 'width');
        conf.height = this._getNumericalStyleAttribute(this._container, 'height');
        var g = this._container.append('svg')
            .attr('width', conf.width)
            .attr('height', conf.height)
            .append('g');
        // var force = d3.layout.force();
        this.force = d3.forceSimulation();
        forze = this.force;
        this._links = d3.forceLink();
        var frameDelay = 0;  // hack to slow down force animation but imperfect because it doesn't slow down anything else
        var frameTimer = null;

        var testGraph = {
            nodes: [
                {"id": 1},
                {"id": 2},
                {"id": 3},
                {"id": 4},
            ],
            links: [
                {"source": 1, "target": 2},
                {"source": 1, "target": 3},
                {"source": 3, "target": 4},
                {"source": 1, "target": 4},
            ]
        };


        linkz = g.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(testGraph.links)
            .enter().append("line")
            .attr("stroke", "white");

        nodez = g.append("g")
            .selectAll("circle")
            .data(testGraph.nodes)
            .enter().append("circle")
            .attr("class", "slaveCircle busy")
            .attr("r", 15)
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        let reset = function() {
            _this.force
                .force('centerX', d3.forceX(conf.width / 2))
                .force('centerY', d3.forceY(conf.height / 2))
                .force('charge', d3.forceManyBody().strength(-1000))
                // .force('charge', d3.forceManyBody().strength(function(d) {
                //     if (d.type == 'slave') {
                //         return (d.slaveDatum['num_executors_in_use'] == 0
                //             ? conf.idleSlaveCharge
                //             : conf.activeSlaveCharge)
                //     }
                //     return d.charge || conf.buildCharge;
                // }))
                .force('link', d3.forceLink().id(function(d) { return d.id; }))
                // .force('link', d3.forceLink()
                //     .distance(function(d) {
                //         return d.linkLength || conf.defaultLinkLength
                //     })
                //     .strength(function(d) {
                //         return d.linkStrength || conf.defaultLinkStrength
                //     })
                // )
                .on("tick", ticked)
                // .on('tick', function() {
                //     let alpha = 1;
                //     var nodes = [];
                //     visualizers.map(function(visualizer) {
                //         nodes = nodes.concat(visualizer.getNodes());
                //     });
                //     // _this._swirl(nodes, _this.force, e.alpha, conf.width, conf.height);
                //     // _this._repelWalls(nodes, alpha, conf.width, conf.height);
                //     // _this._collide(nodes);
                //     visualizers.map(function(visualizer) {
                //         visualizer.tick(alpha)
                //     });
                //     if (frameDelay > 0) {
                //         _this.force.stop();
                //         clearTimeout(frameTimer);
                //         frameTimer = setTimeout(_this.force.resume, frameDelay);
                //     }
                // })
            ;

            _this.force
                .nodes(testGraph.nodes);
            _this.force.force('link')
                .links(testGraph.links);
            // force.size([conf.width, conf.height])
            //     .gravity(conf.gravity)
            //     .charge(function(d) {
            //         if (d.type == 'slave') {
            //             return (d.slaveDatum['num_executors_in_use'] == 0
            //                 ? conf.idleSlaveCharge
            //                 : conf.activeSlaveCharge)
            //         }
            //         return d.charge || conf.buildCharge;
            //     })
            //     .linkDistance(function(d) {
            //         return d.linkLength || conf.defaultLinkLength
            //     })
            //     .linkStrength(function(d) {
            //         return d.linkStrength || conf.defaultLinkStrength
            //     })
            //     .on('tick', function(e) {
            //         var nodes = [];
            //         visualizers.map(function(visualizer) {
            //             nodes = nodes.concat(visualizer.getNodes());
            //         });
            //         _this._swirl(nodes, force, e.alpha, conf.width, conf.height);
            //         _this._repelWalls(nodes, e.alpha, conf.width, conf.height);
            //         _this._collide(nodes);
            //         visualizers.map(function(visualizer) {
            //             visualizer.tick(e)
            //         });
            //         if (frameDelay > 0) {
            //             force.stop();
            //             clearTimeout(frameTimer);
            //             frameTimer = setTimeout(force.resume, frameDelay);
            //         }
            //     });
        };
        window.reset = reset;
        reset();
        let pause = false;  // global variable to stop the visual updates
        window.pause = function() {
            pause = !pause
        };
        function update() {
            setTimeout(update, conf.updateFrequencyMs);
            if (pause) return;
            var nodes = [], links = [];
            var graphStateChanged = false;
            visualizers.forEach(function(visualizer) {
                graphStateChanged = visualizer.update() || graphStateChanged;
                nodes = nodes.concat(visualizer.getNodes());
                links = links.concat(visualizer.getLinks());
            });
            //d3 removes all existing click handlers on an element before adding a
            // new one. https://github.com/mbostock/d3/wiki/Selections#on
            d3.selectAll('.slaveCircle').on('click', function(e, i) {
                window.open('http://' + e.slaveDatum.url + '/v1', '');
            });
            if (graphStateChanged) {
                _this.force.nodes(nodes);
                _this.force('link').links(links);
                // _this.force.start();
                _this.force.restart();
            }
        }


        // visualizers.forEach(function(visualizer) {
        //     visualizer.init(g, _this.force, conf.width, conf.height)
        // });
        // setTimeout(update, 1000);  // initial delay to give data sources a chance to update
    }

    _collide(nodes) {
        // do collision detection between all nodes. use a quadtree for efficient filtering.
        // most of the below implementation is stolen from d3 examples, with minor edits.
        // see http://bl.ocks.org/mbostock/3231298
        var quadtree = d3.geom.quadtree(nodes);
        var padding = conf.collisionPadding;
        var collisionConstant = conf.collisionConstant;
        nodes.map(function(nodeA) {
            quadtree.visit(function(quad, x1, y1, x2, y2) {
                var nodeB = quad.point;
                var shouldVisitChildNode = true;
                if (nodeB && (nodeB !== nodeA)) {
                    // calculate the bounding box for detecting collisions between these two nodes
                    var r = nodeA.size + nodeB.size + padding;
                    // make slave nodes embed in their builds
                    if (nodeA.attractToNode == nodeB || nodeB.attractToNode == nodeA) {
                        r -= nodeA.slaveEmbedAmount || nodeB.slaveEmbedAmount || conf.slaveEmbedAmount;
                    }
                    var nx1 = nodeA.x - r,
                        nx2 = nodeA.x + r,
                        ny1 = nodeA.y - r,
                        ny2 = nodeA.y + r;
                    // if we're outside the bounding box we don't need to visit any child nodes
                    shouldVisitChildNode = x1 <= nx2 && x2 >= nx1 && y1 <= ny2 && y2 >= ny1;
                    var x = nodeA.x - nodeB.x,
                        y = nodeA.y - nodeB.y,
                        l = Math.sqrt(x * x + y * y),  //
                        t;
                    if (l < r) {  // real distance < mimimum distance (if the shapes are colliding)
                        t = (l - r) / l * collisionConstant;
                        x *= t;
                        y *= t;
                        // don't change build position when slaves collide with builds (prevents build kickback on eject)
                        if (nodeA.type == 'slave' || nodeA.type == nodeB.type) {
                            nodeA.x -= x;
                            nodeA.y -= y;
                        }
                        if (nodeB.type == 'slave' || nodeB.type == nodeA.type) {
                            nodeB.x += x;
                            nodeB.y += y;
                        }
                    }
                }
                // returning true prevents us from visiting child nodes
                return !shouldVisitChildNode;
            });
        });
    }

    _repelWalls(nodes, alpha, width, height) {
        nodes.map(function(node) {
            var wallRepelForce = node.wallRepelForce * alpha;
            var wallPadding = conf.wallPadding;
            // collision detection on walls
            node.x = Math.min(node.x, width - wallPadding);
            node.y = Math.min(node.y, height - wallPadding);
            node.x = Math.max(node.x, wallPadding);
            node.y = Math.max(node.y, wallPadding);
            // minimal repellent force from walls
            node.x += wallRepelForce * (1 / (node.x - width));  // right
            node.y += wallRepelForce * (1 / (node.y - height)); // bottom
            node.x += wallRepelForce * (1 / node.x);  // left
            node.y += wallRepelForce * (1 / node.y);  // top
        });
    }

    _swirl(nodes, force, alpha, width, height) {
        if (conf.features.swirl) {
            force.resume();
            nodes.map(function(node) {
                var swirlForce = (node.swirlForce || conf.defaultSwirlForce) * alpha;
                var swirlCx = width / 2;
                var swirlCy = height / 2;
                var dx = node.x - swirlCx;
                var dy = node.y - swirlCy;
                node.x -= swirlForce * -dy;
                node.y -= swirlForce * dx;
            });
        }
    }

    _getNumericalStyleAttribute(element, attributeName) {
        var stringAttrValue = element.style(attributeName);
        return Number(stringAttrValue.substring(0, stringAttrValue.length - 2));
    }
}

export {SlaveMonitor};
