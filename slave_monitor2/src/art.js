import * as d3 from "d3";
// let PIXI = require('pixi.js');
import 'pixi';
import * as PIXI from "pixi.js";

export default class {

    constructor() {
    }

    render() {

        // inspired by
        // https://jix.one/img/logo.png

        var app = new PIXI.Application(800, 600, { antialias: true });
        document.body.appendChild(app.view);

        var graphics = new PIXI.Graphics();

        // set a fill and line style
        graphics.beginFill(0xFFFFFF);
        graphics.lineStyle(8, 0x000000, 1);

        // draw a shape
        var a = 40;
        var b = 90;
        var c = 80;
        function draw(x, y) {
          graphics.moveTo(x,y);
          graphics.lineTo(x+c,y+a);
          graphics.lineTo(x+c,y+a+b);
          graphics.lineTo(x,y+b);
          graphics.lineTo(x,y);
          x = x+c;
          y = y+a;
          graphics.moveTo(x,y);
          graphics.lineTo(x+c,y-a);
          graphics.lineTo(x+c,y-a+b);
          graphics.lineTo(x,y+b);
          graphics.lineTo(x,y);

          graphics.moveTo(x,y);
          graphics.lineTo(x+c,y-a);
          graphics.lineTo(x,y-a-a);
          graphics.lineTo(x-c,y-a);
          graphics.lineTo(x,y);
        }

        draw(300, 420);
        draw(300, 300);
        draw(300, 180);

        app.stage.addChild(graphics);
    }
};
