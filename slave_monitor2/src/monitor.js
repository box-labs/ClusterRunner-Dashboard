import * as d3 from "d3";
import * as PIXI from "pixi.js";


export default class {

    constructor() {
    }

    render() {

        let width = window.innerWidth, height = window.innerHeight;

        let stage = new PIXI.Container();
        let renderer = PIXI.autoDetectRenderer(width, height, {antialias: !0, transparent: !0, resolution: 1});

        document.body.appendChild(renderer.view);

        let colour = (function() {
            let scale = d3.scaleOrdinal(d3.schemeCategory20);
            return (num) => parseInt(scale(num).slice(1), 16);
        })();

        let graph = {};

        // console.log(d3.range(10));

        graph.nodes = d3.range(300).map(function(i) {
          return {
            index: i,
          };
        });

        graph.links = d3.range(graph.nodes.length - 1).map(function(i) {
          return {
            source: Math.floor(Math.sqrt(i)),
            target: i + 1,
          };
        });

        let links = new PIXI.Graphics();
        stage.addChild(links);

        graph.nodes.forEach((node) => {
            node.gfx = new PIXI.Graphics();
            node.gfx.lineStyle(2, 0xFFFFFF);
            node.gfx.beginFill(colour(node.group));
            node.gfx.drawCircle(0, 0, 5);
            stage.addChild(node.gfx);
        });

        let simulation = d3.forceSimulation(graph.nodes)
            // .force('link', d3.forceLink().id((d) => d.id))
            .force('link', d3.forceLink(graph.links).distance(10).strength(1))
            .force('charge', d3.forceManyBody().strength(-30))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .on("tick", ticked);

        d3.select(renderer.view)
            .call(d3.drag()
                .container(renderer.view)
                .subject(() => simulation.find(d3.event.x, d3.event.y))
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));


        function ticked() {

            graph.nodes.forEach((node) => {
                let { x, y, gfx } = node;
                gfx.position = new PIXI.Point(x, y);
            });

            links.clear();
            links.alpha = 0.6;

            graph.links.forEach((link) => {
                let { source, target } = link;
                // links.lineStyle(Math.sqrt(link.value), 0x999999);
                links.lineStyle(2, 0x999999);
                links.moveTo(source.x, source.y);
                links.lineTo(target.x, target.y);
            });

            links.endFill();

            renderer.render(stage);

        }

        function dragstarted() {
            if (!d3.event.active) simulation.alphaTarget(0.3).restart();
            d3.event.subject.fx = d3.event.subject.x;
            d3.event.subject.fy = d3.event.subject.y;
        }

        function dragged() {
            d3.event.subject.fx = d3.event.x;
            d3.event.subject.fy = d3.event.y;
        }

        function dragended() {
            if (!d3.event.active) simulation.alphaTarget(0);
            d3.event.subject.fx = null;
            d3.event.subject.fy = null;
        }

    }
};
