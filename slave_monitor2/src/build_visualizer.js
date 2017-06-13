'use strict';

import {BaseVisualizer} from './base_visualizer';
import {BuildNode, IDLE, IdleSlaveNode} from './build_node';


let extraGravity = 0.01;


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
