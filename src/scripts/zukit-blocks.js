import * as components from './components/blocks-index.js'
import * as data from './data/use-store.js'
import debug from './debug.js'
import { blocksSet as fetch } from './fetch.js'
import * as icons from './icons.jsx'
import * as jq from './jquery-helpers.js'
import * as plugins from './plugins/with-plugin.jsx'
import { blocksSet as render } from './render.jsx'
import { blocksSet as utils } from './utils.jsx'

wp.zukit = {
	fetch,
	utils,
	render,
	icons,
	jq,
	components,
	plugins,
	data,
	debug,
}
