const path = require('path');

module.exports = {
	entry: { '/dist/sync': './src/index.ts', 'demo/js/main': './src/demo/index.ts' },
	devtool: 'inline-source-map',
	output: {
		path: path.resolve(__dirname, ''),
		filename: '[name].js'
	},
	resolve: {
		extensions: [ '.tsx', '.ts', '.js', '.json' ]
	},
	module: {
		rules: [
			// all files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'
			{ test: /\.tsx?$/, use: [ 'ts-loader' ], exclude: /node_modules/ }
		]
	},
	mode: 'development'
};
