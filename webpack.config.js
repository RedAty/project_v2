const path = require('path');

module.exports = {
    entry: './src/index.ts',
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
    mode: 'development',
    /*devtool: 'eval-cheap-module-source-map',*/
    optimization: {
        //minimize: false,
        usedExports: true
    },
    devtool: 'source-map',
    resolve: {
        extensions: [".ts", ".js", ".tsx"],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
            },
        ],
    },
    plugins: [

    ],
};
