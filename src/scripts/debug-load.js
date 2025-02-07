import debug, { isSimpleType, logNames, markers } from './debug.js'

// NOTE: debug helpers ----------------------------------------------------------------------------]

const dev = debug

// make `DevTools` available from global scope
if (typeof window !== 'undefined') {
	window.dev = dev
	window.dev.more = { logNames, isSimpleType, markers }
}
