
import {conf} from './conf';
import {rgb} from './util';
import Visualizer from './base_visualizer';
import * as PIXI from "pixi.js";


let idleSlaveColor = rgb('#34692C');
let busySlaveColor = rgb('#6CC644');
let deadSlaveColor = rgb('#B10502');
let slaveLabelColor = rgb('#AEAEAE');

const SlaveState = Object.freeze({
    DEAD: 'dead',
    IDLE: 'idle',
    BUSY: 'busy',
});

class SlaveNode {
    constructor(stage, slaveDatum, attractToNode) {
        this.type = 'slave';
        this.state = null;
        this.slaveDatum = slaveDatum;
        this.x = conf.width / 2;
        this.y = conf.height / 2;  // initial position so it doesn't get stuck at 0,0
        this.size = conf.slaveCircleSize;
        this.wallRepelForce = conf.slaveWallRepelForce;
        this.link = null;
        this.attractToNode = attractToNode;

        this.gfx = new PIXI.Graphics();
        this.gfx.zIndex = 1;
        this._setText(this._getLabel());
        stage.addChild(this.gfx);
        this.remove = () => stage.removeChild(this.gfx);

        // let blurFilter1 = new PIXI.filters.BlurFilter();
        // blurFilter1.blur = 2;
        // this.gfx.filters = [blurFilter1];
        // let colorMatrix = new PIXI.filters.ColorMatrixFilter();
        // this.gfx.filters = [colorMatrix];
        // colorMatrix.contrast(2);

        // this.gfx.rotation = Math.random() * 2 * Math.PI;
    }

    update() {
        let newState,
            slaveIsMarkedDead = this.slaveDatum.is_alive === false,
            slaveIsBusy = (this.slaveDatum.current_build_id || this.slaveDatum.num_executors_in_use > 0);
        if (slaveIsMarkedDead) {
            newState = SlaveState.DEAD;
        } else if (slaveIsBusy) {
            newState = SlaveState.BUSY;
        } else {
            newState = SlaveState.IDLE;
        }

        if (this.state !== newState) {
            this._updateState(newState);
        }
    }

    _updateState(state) {
        this.state = state;
        switch (state) {
            case SlaveState.DEAD:
                this._setCircle(deadSlaveColor);
                break;
            case SlaveState.BUSY:
                this._setCircle(busySlaveColor);
                break;
            case SlaveState.IDLE:
                this._setCircle(idleSlaveColor);
                break;
            default:
                throw new Error(`Invalid state "${state}"`);
        }
    }

    _setCircle(color) {
        this.gfx.clear();
        // gfx.lineStyle(2, color);
        this.gfx.beginFill(color);
        this.gfx.drawCircle(0, 0, this.size);
    }

    _setText(string) {
        let style = new PIXI.TextStyle({
            fontFamily: '"Open Sans", "Helvetica Neue", "Helvetica", Helvetica, Arial, sans-serif',
            fontSize: '7.5px',
            fontWeight: '300',
            fill: ['#ffffff'],
        });

        let text = new PIXI.Text(string, style);
        text.y = this.size;
        text.anchor.set(0.5, 0);
        this.gfx.addChild(text);
    }

    _getLabel() {
        let hostAbbrevRegex = conf.dashboard.slave_monitor.host_abbreviation_regex;
        let slaveUrl = this.slaveDatum['url'];
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
    }

    classes() {
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
    }
}


class SlaveVisualizer extends Visualizer
{
    constructor(slaveDatasource, buildVisualizer) {
        super();
        this._slaveDatasource = slaveDatasource;
        this._buildVisualizer = buildVisualizer;
        this._slaveCircles = null;
        this._force = null;
        this._stage = null;
        this._width = null;
        this._height = null;
    }

    init(g, force, stage, width, height) {
        this._g = g;
        // this._slaveCircles = g.selectAll('.slaveCircle');
        this._slaveCircles = g.selectAll('fdsa');
        this._force = force;
        this._stage = stage;
        this._width = width;
        this._height = height;
    }

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
                graphNode = new SlaveNode(this._stage, slaveDatum, attractToNode);
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
        this._updateGraphics();
        return graphStateChanged;
    }

    _updateGraphics() {
        this._slaveCircles = this._slaveCircles.data(
            this._graphNodes,
            d => d.slaveDatum['url']);
        this._slaveCircles.exit()
            .each(d => d.remove());
        this._slaveCircles = this._slaveCircles
            .enter().merge(this._slaveCircles)
            .each(d => d.update());
    }

    /**
     * Update the positions of SVG elements managed by this visualizer.
     * @param alpha
     */
    tick(alpha) {
        // for (let node of this._graphNodes) {
        //     node.gfx.rotation = (node.gfx.rotation + (Math.random() / 5)) % (2 * Math.PI);
        // }
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
    }
}

export default SlaveVisualizer;
