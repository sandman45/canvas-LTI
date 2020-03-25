const nodeExternals = require('webpack-node-externals');
const path = require('path');
module.exports = {
    mode: 'development',
    target: 'node',
    externals: [nodeExternals()],
    entry: path.resolve(__dirname, '..', 'src/index.js'),
    output: {
        path: path.resolve(__dirname, '..', 'dist'),
        publicPath: '/dist/',
        filename: 'client.js'
    },
    devServer: {
        contentBase: path.resolve(__dirname, '..', 'src/client'),
        publicPath: '/dist/'
    },
    resolve: {
        extensions: ['.js'],
        alias: {
            components: path.resolve(__dirname, '..', 'src/components'),
        }
    },
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
                query: {
                    presets: ["@babel/preset-env", "@babel/preset-react"],
                    plugins: [
                        "@babel/plugin-proposal-class-properties",
                        "@babel/plugin-transform-runtime",
                        ["css-modules-transform", {
                            "extensions": [ ".styl", ".css" ]
                        }]
                    ]
                }
            },
            {
                test: /\.scss$/,
                use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(ttf|eot|otf|svg|png|gif|jpg)$/,
                loader: 'file-loader'
            },
            {
                test: /\.(woff|woff2)$/,
                loader: 'url-loader'
            }
        ]
    }
};

