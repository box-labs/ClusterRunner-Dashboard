
var BuildQueueDatasource = require('./BuildQueueDatasource.js');
var BuildVisualizer = require('./BuildVisualizer.js');
var conf = require('./conf.js');
var Network = require('./Network.js');
var SlavesListDatasource = require('./SlavesListDatasource.js');
var SlaveVisualizer = require('./SlaveVisualizer.js');


function ClusterRunnerSlaveMonitor(containerSelector, masterUrl, hostAbbrevRegex, repoNameRegex)
{
    this._masterUrl = masterUrl;
    this._container = d3.select(containerSelector);
    this._hostAbbrevRegex = hostAbbrevRegex;
    this._repoNameRegex = repoNameRegex;
    this.force = null;

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
var cls = ClusterRunnerSlaveMonitor.prototype;

cls.startMonitor = function()
{
    var slaveDatasource = new SlavesListDatasource(this._masterUrl);
    slaveDatasource.start();

    var buildQueueDatasource = new BuildQueueDatasource(this._masterUrl);
    buildQueueDatasource.start();

    var buildVisualizer = new BuildVisualizer(slaveDatasource, buildQueueDatasource, this._repoNameRegex);
    var slaveVisualizer = new SlaveVisualizer(slaveDatasource, buildVisualizer, this._hostAbbrevRegex);

    // the order of this array matters! dependent visualizations should come after dependees.
    this._startVisualization([buildVisualizer, slaveVisualizer]);
};

cls._startVisualization = function(visualizers)
{
    var _this = this;
    conf.width = this._getNumericalStyleAttribute(this._container, 'width');
    conf.height = this._getNumericalStyleAttribute(this._container, 'height');

    var g = this._container.append('svg')
        .attr('width', conf.width)
        .attr('height', conf.height)
        .append('g');

    var force = d3.layout.force();
    this.force = force;

    var frameDelay = 0;  // hack to slow down force animation but imperfect because it doesn't slow down anything else
    var frameTimer = null;

    reset = function() {
        force.
            size([conf.width, conf.height])
            .gravity(conf.gravity)
            .charge(function (d) {

                if (d.type == 'slave') {
                    return (d.slaveDatum['num_executors_in_use'] == 0
                            ? conf.idleSlaveCharge
                            : conf.activeSlaveCharge)
                }
                return d.charge || conf.buildCharge;
            })
            .linkDistance(function(d) {return d.linkLength || conf.defaultLinkLength})
            .linkStrength(function (d) {return d.linkStrength || conf.defaultLinkStrength})
            .on('tick', function (e) {
                var nodes = [];
                visualizers.map(function (visualizer) {
                    nodes = nodes.concat(visualizer.getNodes());
                });
                _this._swirl(nodes, force, e.alpha, conf.width, conf.height);
                _this._repelWalls(nodes, e.alpha, conf.width, conf.height);
                _this._collide(nodes);
                visualizers.map(function (visualizer) {
                    visualizer.tick(e)
                });
                if (frameDelay > 0) {
                    force.stop();
                    clearTimeout(frameTimer);
                    frameTimer = setTimeout(force.resume, frameDelay);
                }
            });
    }
    reset();

    var pause = false;  // global variable to stop the visual updates
    window.pause = function() {pause = !pause}

    function update() {
        setTimeout(update, conf.updateFrequencyMs);
        if (pause) return;

        var nodes = [], links = [];
        var graphStateChanged = false;
        visualizers.forEach(function (visualizer) {
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
            force.nodes(nodes).links(links);
            force.start();
        }
    }
    visualizers.forEach(function(visualizer) {
        visualizer.init(g, force, conf.width, conf.height)
    });
    setTimeout(update, 1000);  // initial delay to give data sources a chance to update
};

cls._collide = function(nodes)
{
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
};

cls._repelWalls = function(nodes, alpha, width, height)
{
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
};

cls._swirl = function(nodes, force, alpha, width, height) {
    if (conf.features.swirl) {
        force.resume();
        nodes.map(function (node) {
            var swirlForce = (node.swirlForce || conf.defaultSwirlForce) * alpha;
            var swirlCx = width / 2;
            var swirlCy = height / 2;

            var dx = node.x - swirlCx;
            var dy = node.y - swirlCy;
            node.x -= swirlForce * -dy;
            node.y -= swirlForce * dx;
        });
    }
};

cls._getNumericalStyleAttribute = function(element, attributeName)
{
    var stringAttrValue = element.style(attributeName);
    return Number(stringAttrValue.substring(0, stringAttrValue.length - 2));
};


module.exports = ClusterRunnerSlaveMonitor;
