var path = require('path');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var webpack = require("webpack");

module.exports=
    /**
     *
     * @param {string} configdir
     * @param {string} buildir
     * @param {object} config
     * @param {string} outputdir
     */
    function build_config(configdir, buildir, cfg, outputdir) {
        var config = {
            context: buildir,
            entry: {}, 
            resolveLoader: {
                modules: [
                    path.resolve(configdir, 'node_modules'),
                    path.resolve(configdir, 'node_modules/polymerize_webpack_support'),
                 /*   ,path.resolve(configdir, 'loader')*/
                ]
            },
            module: {
                rules: [{
                    test: /lib__.*\.js|web__.*\.js/,
                    use: [{
                        loader: 'loader/polymerize_loader',
                        options: cfg
                    }]
                }]
            },
            resolve: {
                modules: [
                    ".",
                    path.resolve(configdir, 'support')
                ]
            },
            output: {
                path: outputdir,
                filename: "[name].js",
                libraryTarget: "amd"
            },
            plugins: [new webpack.optimize.CommonsChunkPlugin({
                name: "common",
                minChunks: 1

            }),
                new CopyWebpackPlugin([{
                    context: buildir,
                    from: "**/*",
                    to: outputdir,
                    ignore: [
                        '*.js',
                        'index.html',
                        '*.webpack.html'
                    ]
                }, {
                    context: buildir,
                    from: "bower_components/**/*.js",
                    to: outputdir
                }, {
                    context: buildir,
                    from: "packages/**/*.js",
                    to: outputdir
                }, {
                    from: path.resolve(buildir, 'require.js'),
                    to: path.resolve(outputdir, 'require.js')
                },
                    {
                        from: path.resolve(buildir, '*.webpack.html'),
                        to: path.resolve(outputdir, 'index.html')
                    }])

            ]
        };

        // Add modules
        cfg.modules.forEach(function (mod) {
            config.entry[mod] = ["./" + mod];
        });

        return config;
    };
