// import * as d3 from "d3";
// let PIXI = require('pixi.js');

import 'pixi';
import 'p2';
import 'phaser';
import * as Phaser from "phaser-ce";
// import Phaser from 'phaser-ce';


// class MonsterParticle extends Phaser.Particle {
//     constructor(game, x, y) {
//         super(game, x, y);
//         Phaser.Particle.call(this, game, x, y, game.cache.getBitmapData('particleShade'));
//     }
// }


export default class {

    constructor() {
        console.log(Phaser);
    }

    render() {
        let width = window.innerWidth, height = window.innerHeight;
        let game = new Phaser.Game(
            width, height, Phaser.AUTO, 'rootElement', { preload: preload, create: create, update:update });
        let balls, cursors, ship;

        let bigSize = 5;
        let littleSize = 20;
        let numBalls = 200;

        function preload() {
            // game.load.image('car', 'sprites/car.png');
            // game.load.image('tinycar', 'sprites/tinycar.png');
        }

        function create() {
            game.physics.startSystem(Phaser.Physics.P2JS);
            // game.physics.startSystem(Phaser.Physics.ARCADE);
            // game.physics.p2.restitution = 1.1;
            balls = game.add.group();
            for (let i = 0; i < numBalls; i++) {
                let jitter = game.rnd.integerInRange(0, 10);
                let size = bigSize + jitter;
                let ball = game.add.graphics(
                    game.rnd.integerInRange(size, game.world.width - size),
                    game.rnd.integerInRange(size, game.world.height - size));
                ball.beginFill(0xFF0000, 1);
                ball.drawCircle(0, 0, size);

                game.physics.p2.enable(ball);
                ball.body.collideWorldBounds = true;
                ball.body.setCircle(size / 2 + 0.5);
                balls.add(ball);
                // ball.body.velocity.x = 300;
                // ball.body.thrust(100);
                // ballCircle.body.bounce.set(1);

                // let ball = balls.create(
                //     game.rnd.integerInRange(200, 1700), game.rnd.integerInRange(-200, 400),
                //     'tinycar'
                // );
                // game.physics.p2.enable(ball, false);
            }
            cursors = game.input.keyboard.createCursorKeys();

            ship = game.add.graphics(32, game.world.height - 150);
            ship.beginFill(0x00FFAA, 1);
            ship.drawCircle(0, 0, littleSize);
            game.physics.p2.enable(ship);
            ship.body.collideWorldBounds = true;
            ship.body.setCircle(littleSize / 2);
            ship.body.mass = 40;
        }

        function update() {
            // balls.forEachAlive(moveBullets, this);  //make bullets accelerate to ship

            balls.forEachAlive(function(bullet1) {
                balls.forEachAlive(function(bullet2) {
                    if (bullet1 === bullet2) return;
                    accelerateToObject(bullet1, bullet2, 1);
                }, this);

            }, this);  //make bullets accelerate to ship

            // if (cursors.left.isDown) {ship.body.rotateLeft(100);}   //ship movement
            // else if (cursors.right.isDown){ship.body.rotateRight(100);}
            // else {ship.body.setZeroRotation();}
            // if (cursors.up.isDown){ship.body.thrust(400);}
            // else if (cursors.down.isDown){ship.body.reverse(400);}

            let dv = 20;
            if (cursors.left.isDown) {ship.body.velocity.x -= dv;}   //ship movement
            else if (cursors.right.isDown){ship.body.velocity.x += dv;}
            // else {ship.body.setZeroRotation();}
            if (cursors.up.isDown){ship.body.velocity.y -= dv;}
            else if (cursors.down.isDown){ship.body.velocity.y += dv;}
        }

        function moveBullets(bullet) {
            // accelerateToObject(bullet, ship, 300);  //start accelerateToObject on every bullet
            accelerateToObject(bullet, ship, -500);  //start accelerateToObject on every bullet
            accelerateToObject(bullet, {x: width/2, y: height/2}, 500);  //start accelerateToObject on every bullet
            n += 1;
        }


        function accelerateToObject(obj1, obj2, g) {
            // if (typeof g === 'undefined') {g = 60;}
            let dist = Phaser.Math.distance(obj1.x, obj1.y, obj2.x, obj2.y) + 20;
            let force = g / dist;
            let angle = Math.atan2(obj2.y - obj1.y, obj2.x - obj1.x);
            // if (n === 0) {
            //     console.log(g + ', ' + dist + ', ' + force);
            // }
            // obj1.body.rotation = angle + game.math.degToRad(90);  // correct angle of angry bullets (depends on the sprite used)
            // obj1.body.force.x = Math.cos(angle) * speed;    // accelerateToObject
            // obj1.body.force.y = Math.sin(angle) * speed;
            obj1.body.velocity.x += Math.cos(angle) * force;    // accelerateToObject
            obj1.body.velocity.y += Math.sin(angle) * force;
        }


    }
};
