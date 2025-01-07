/* eslint-disable no-undef */
// See https://developer.wordpress.org/block-editor/reference-guides/packages/packages-scripts/#advanced-usage

const defaultConfig = require('@wordpress/scripts/config/webpack.config')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const path = require('path')

module.exports = {
	...defaultConfig,
	context: path.resolve(__dirname, 'src'),
	entry: {
		'zukit-blocks': ['./scripts/zukit-blocks.js', './sass/zukit-blocks.scss'],
		zukit: ['./scripts/zukit.js', './sass/zukit.scss'],
		// трюк, потому что `wp-scripts` все равно будет пытаться генерить JS скрипт
		// мы потом всё удалим с помощью `CleanWebpackPlugin`
		'zukit-colors': './sass/zukit-colors.scss',
	},
	output: {
		filename: '[name].min.js',
		path: path.resolve(__dirname, 'dist'),
	},
	plugins: [
		...defaultConfig.plugins,
		new CleanWebpackPlugin({
			protectWebpackAssets: false,
			cleanOnceBeforeBuildPatterns: ['**/*', '!*.js'],
			cleanAfterEveryBuildPatterns: ['*-rtl.css', '*asset.php', '*-colors.min.js'],
		}),
	],
	stats: {
		children: false,
		assets: false,
		modules: false,
	},
}
