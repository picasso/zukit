import { noop, transform } from 'lodash-es'

import debug from './debug.js'
// import * as process from 'process'

const isDev = process.env.NODE_ENV === 'development'

// NOTE: debug helpers ----------------------------------------------------------------------------]

const dev = debug
// copy of `DevTools` with `silent` loggers
const devNone = transform(
	dev,
	(acc, _, key) => {
		acc[key] = noop
	},
	{},
)

// make `DevTools` available from global scope
if (typeof window !== 'undefined') {
	window.dev = isDev ? dev : devNone
}
