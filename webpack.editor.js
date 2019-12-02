const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');


module.exports = {
    mode: 'development',
    entry: {
        app: './editor/app.js'
    },
    devtool: 'inline-source-map',
    devServer: {
        contentBase: './editor-dist',
        port: 4748
    },
    plugins: [
        // new CleanWebpackPlugin(['dist/*']) for < v2 versions of CleanWebpackPlugin
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            hash: true,
            title: 'My Awesome application',
            myPageHeader: 'Hello World',
            template: './editor/index.html',
            filename: './index.html'
        }),
        new CopyPlugin([
            { from: 'editor/preview.html', to: 'preview.html' },
            { from: 'editor/editor.html', to: 'editor.html' },
            { from: 'editor/assets', to: 'assets' },
            { from: 'editor/css', to: 'css' }
        ])
    ],
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'editor-dist'),
    },
    module: {
        rules: [{
            test: /\.less$/,
            use: [
                'style-loader',
                'css-loader',
                'less-loader'
            ]
        }]
    }
};