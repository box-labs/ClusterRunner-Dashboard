import * as d3 from "d3";
// let PIXI = require('pixi.js');
import 'pixi';
import * as PIXI from "pixi.js";

export default class {

    constructor() {
    }

    render() {

        let width = window.innerWidth, height = window.innerHeight;

        let stage = new PIXI.Container();
        let renderer = PIXI.autoDetectRenderer(width, height);//, {antialias: !0, transparent: !0, resolution: 1});
        console.log(renderer.view);
        document.body.appendChild(renderer.view);

        let graph = {};

        graph.nodes = d3.range(300).map(function(i) {
            return {
                index: i,
                group: Math.floor(i / 50),

            };
        });

        graph.links = d3.range(graph.nodes.length - 1).map(function(i) {
            return {
                source: Math.floor(Math.sqrt(i)),
                target: i + 1,
            };
        });

        let linksGraphics = new PIXI.Graphics();
        stage.addChild(linksGraphics);

        graph.nodes.forEach((node) => {
            node.gfx = new PIXI.Graphics();
            node.gfx.lineStyle(2, 0xFFFFFF);
            node.gfx.beginFill(0xFFFF00);
            node.gfx.drawCircle(0, 0, 5);
            stage.addChild(node.gfx);
        });

        // var canvas = document.querySelector("canvas"),
        //     context = canvas.getContext("2d");
            // width = canvas.width,
            // height = canvas.height;

        var simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(function(d) { return d.index; }))
            .force("charge", d3.forceManyBody())
            .force("center", d3.forceCenter(width / 2, height / 2));

        simulation
            .nodes(graph.nodes)
            .on("tick", ticked);

        simulation.force("link")
            .links(graph.links);

        d3.select(renderer.view)
            .call(d3.drag()
                .container(renderer.view)
                .subject(() => {
                    console.log('here');
                    return simulation.find(d3.event.x, d3.event.y);
                })
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        function ticked() {
            // context.clearRect(0, 0, width, height);
            //
            // context.beginPath();
            // graph.links.forEach(drawLink);
            // context.strokeStyle = "#aaa";
            // context.stroke();
            //
            // context.beginPath();
            // graph.nodes.forEach(drawNode);
            // context.fill();
            // context.strokeStyle = "#fff";
            // context.stroke();

            graph.nodes.forEach((node) => {
                let { x, y, gfx } = node;
                gfx.position = new PIXI.Point(x, y);
            });

            linksGraphics.clear();
            linksGraphics.alpha = 0.6;

            graph.links.forEach((link) => {
                let { source, target } = link;
                // links.lineStyle(Math.sqrt(link.value), 0x999999);
                linksGraphics.lineStyle(2, 0x999999);
                linksGraphics.moveTo(source.x, source.y);
                linksGraphics.lineTo(target.x, target.y);
            });

            linksGraphics.endFill();

            renderer.render(stage);
        }

        function dragsubject() {
            return simulation.find(d3.event.x, d3.event.y);
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

        // function drawLink(d) {
        //     context.moveTo(d.source.x, d.source.y);
        //     context.lineTo(d.target.x, d.target.y);
        // }
        //
        // function drawNode(d) {
        //     context.moveTo(d.x + 3, d.y);
        //     context.arc(d.x, d.y, 3, 0, 2 * Math.PI);
        // }


    }
};
