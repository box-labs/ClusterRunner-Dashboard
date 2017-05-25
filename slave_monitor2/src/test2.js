import * as d3 from "d3";
import * as PIXI from "pixi.js";


export default class {

    constructor() {
    }

    render() {
        let width = 960, height = 600;

        let stage = new PIXI.Container();
        let renderer = PIXI.autoDetectRenderer(width, height,
            {antialias: !0, transparent: !0, resolution: 1});

        document.body.appendChild(renderer.view);

        let colour = (function() {
            let scale = d3.scaleOrdinal(d3.schemeCategory20);
            return (num) => parseInt(scale(num).slice(1), 16);
        })();

        let simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id((d) => d.id))
            .force('charge', d3.forceManyBody())
            .force('center', d3.forceCenter(width / 2, height / 2));

        let graph = {};

        graph.nodes = d3.range(300).map(function(i) {
            return {
                id: i,
                group: Math.floor(i / 50),

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
            node.gfx.lineStyle(1.5, 0xFFFFFF);
            node.gfx.beginFill(colour(node.group));
            node.gfx.drawCircle(0, 0, 5);
            stage.addChild(node.gfx);
        });

        d3.select(renderer.view)
            .call(d3.drag()
                .container(renderer.view)
                .subject(() => simulation.find(d3.event.x, d3.event.y))
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));


        simulation
            .nodes(graph.nodes)
            .on('tick', ticked);

        simulation.force('link')
              .links(graph.links);

      function ticked() {

          graph.nodes.forEach((node) => {
              let { x, y, gfx } = node;
              gfx.position = new PIXI.Point(x, y);
          });

          links.clear();
          links.alpha = 0.6;

          graph.links.forEach((link) => {
              let { source, target } = link;
              links.lineStyle(Math.sqrt(link.value), 0x999999);
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
