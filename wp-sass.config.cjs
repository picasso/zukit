/* eslint-disable no-undef */
// See https://developer.wordpress.org/block-editor/reference-guides/packages/packages-scripts/#advanced-usage

const defaultConfig = require('@wordpress/scripts/config/webpack.config')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MiniCSSExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
	...defaultConfig,
	entry: {
		'zukit-blocks': './src/sass/zukit-blocks.scss',
		'zukit-colors': './src/sass/zukit-colors.scss',
		zukit: './src/sass/zukit.scss',
	},
	// специальный трюк, потому что `wp-scripts` все равно будет пытаться генерить JS скрипт
	// мы потом всё удалим с помощью `CleanWebpackPlugin`
	output: {
		filename: '[name].remove',
		path: __dirname + '/dist',
		clean: false,
	},
	plugins: [
		new MiniCSSExtractPlugin({ filename: '[name].css' }),
		new CleanWebpackPlugin({
			protectWebpackAssets: false,
			cleanOnceBeforeBuildPatterns: ['**/*', '!*.js'],
			cleanAfterEveryBuildPatterns: ['*.remove'],
		}),
	],
	stats: {
		children: false,
		assets: false,
		modules: false,
	},
}
