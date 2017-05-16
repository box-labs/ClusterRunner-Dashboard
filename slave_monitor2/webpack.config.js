let path = require('path');

// Phaser webpack config
let phaserModule = path.join(__dirname, '/node_modules/phaser-ce/');
let phaser = path.join(phaserModule, 'build/custom/phaser-split.js');
let pixi = path.join(phaserModule, 'build/custom/pixi.js');
let p2 = path.join(phaserModule, 'build/custom/p2.js');

// module.exports = {
//   entry: './src/index.js',
//   output: {
//     path: __dirname + './build',
//     filename: 'bundle.js'
//   },
//   module: {
//     loaders: [{
//       test: /\.js$/,
//       exclude: /node_modules/,
//       loader: 'babel-loader'
//     }]
//   }
// };

module.exports = {
    entry: './src/index.js',
    // entry: {
    //     app: [
    //         'babel-polyfill',
    //         path.resolve(__dirname, 'src/index.js')
    //     ],
    //     vendor: ['pixi', 'p2', 'phaser', 'webfontloader']
    // },
    devtool: 'cheap-source-map',
    output: {
        // pathinfo: true,
        // path: path.resolve(__dirname, 'dist'),
        // publicPath: './dist/',
        path: path.resolve(__dirname, 'build'),
        filename: 'bundle.js'
    },
    watch: true,
    // plugins: [
    //     definePlugin,
    //     new webpack.optimize.CommonsChunkPlugin({ name: 'vendor'/* chunkName= */, filename: 'vendor.bundle.js'/* filename= */}),
    //     new BrowserSyncPlugin({
    //         host: process.env.IP || 'localhost',
    //         port: process.env.PORT || 3000,
    //         server: {
    //             baseDir: ['./', './build']
    //         }
    //     })
    // ],
    module: {
        rules: [
            { test: /\.js$/, use: ['babel-loader'], include: path.join(__dirname, 'src') },
            { test: /pixi\.js/, use: ['expose-loader?PIXI'] },
            { test: /phaser-split\.js$/, use: ['expose-loader?Phaser'] },
            { test: /p2\.js/, use: ['expose-loader?p2'] }
        ]
    },
    // node: {
    //     fs: 'empty',
    //     net: 'empty',
    //     tls: 'empty'
    // },
    resolve: {
        alias: {
            'phaser': phaser,
            'pixi': pixi,
            'p2': p2
        }
    }
};
