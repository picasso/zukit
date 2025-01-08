/* eslint-disable no-undef */
// See https://developer.wordpress.org/block-editor/reference-guides/packages/packages-scripts/#advanced-usage

const defaultConfig = require('@wordpress/scripts/config/webpack.config')
const BrowserSyncPlugin = require('browser-sync-webpack-plugin')
const path = require('path')

// remove default `RtlCssPlugin` plugin
const defaultPlugins = defaultConfig.plugins.filter((p) => p.constructor?.name !== 'RtlCssPlugin')

module.exports = {
	...defaultConfig,
	context: path.resolve(__dirname, 'src'),
	entry: {
		'zukit-blocks': ['./scripts/zukit-blocks.js', './sass/zukit-blocks.scss'],
		zukit: ['./scripts/zukit.js', './sass/zukit.scss'],
	},
	output: {
		filename: '[name].min.js',
		path: path.resolve(__dirname, 'dist'),
	},
	plugins: [
		...defaultPlugins,
		new BrowserSyncPlugin({
			// browse to http://localhost:3002/ during development,
			host: 'localhost',
			port: 3002,
			https: true,
			open: false,
			proxy: 'https://dr.local/wp-admin',
		}),
	],
	stats: {
		children: false,
		assets: false,
		modules: false,
	},
}
