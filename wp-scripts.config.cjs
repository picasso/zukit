/* eslint-disable no-undef */
// See https://developer.wordpress.org/block-editor/reference-guides/packages/packages-scripts/#advanced-usage

const defaultConfig = require('@wordpress/scripts/config/webpack.config')

module.exports = {
	...defaultConfig,
	entry: {
		'zukit-blocks': './src/scripts/zukit-blocks.js',
		zukit: './src/scripts/zukit.js',
	},
	output: {
		filename: '[name].min.js',
		path: __dirname + '/dist',
	},
	stats: {
		children: false,
		assets: false,
		modules: false,
	},
}
