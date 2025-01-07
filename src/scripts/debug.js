/* eslint-disable no-use-before-define */
import {
	castArray,
	cloneDeepWith,
	concat,
	difference,
	findKey,
	first,
	forEach,
	get,
	has,
	includes,
	isArray,
	isBoolean,
	isElement,
	isEmpty,
	isEqual,
	isFunction,
	isNil,
	isNumber,
	isObject,
	isString,
	isUndefined,
	join,
	keys,
	map,
	mapValues,
	merge,
	pick,
	slice,
	split,
	startsWith,
	take,
	transform,
	trimStart,
} from 'lodash-es'

// WordPress dependencies
import { usePrevious } from '@wordpress/compose'
import { useEffect, useRef } from '@wordpress/element'

// log levels (but errors are always shown!):
//
//      'short' || 1                - only milestone messages & warn (without data and annoying handlers)
//      'default' || 'normal' || 2  - all messages & warn (but without data)
//      'verbose' || 'full' || 3    - all messages & their data
//      'none' || 0                 - only errors

// Examples of using:
//
//      * * * all data will be cloned before output to avoid reacting to subsequent changes * * *
//
//      Zubug.useTrace(props, state)    - trace the changes of the props ('state' arg is optional)
//      Zubug.useTraceWithId(props);    - trace the changes of the props when there is 'clientId' among the props
//      Zubug.useMU()                   - output information when a component has been mounted or unmounted
//
//      Zubug.data({images, action})    - output data (name: value)
//      Zubug.info('text', {id, links}) - output data with text label
//      Zubug.renderWithId(clientId)    - output information when the component was rendered
//      Zubug.log(message, ...data)     - output message with data
//
// Ajax helpers:
//      Zubug.request(route, options)   - output Ajax request information
//      Zubug.response(route, data)     - output Ajax response information

// Модификаторы цвета и шрифта (первый символ сообщения для log() и info()):
//      '>' - начать группу (не портировал, завершить!)
//      '!' - bold, '#ff2020'
//      '?' - bold, '#cc0096'
//      '*' - bold, '#1f993f'
//      '+' - bold, '#0070c9'
//      '#' - bold, '#a79635'
//      '^' - bold, цвет зависит от функции и конфига

// some internal vars
const config = {
	level: 'default',
	simplify: true, // когда установлено, то пытается упростить вывод
	//  - например, заменяет вывод массива с одним элементом на
	//  на вывод element[0] как объекта и т.д.
	clone: false, // clone logged values if true

	mods: {
		default: false, // do not use colors, do not simplify (почти как console.log)
		ignoreNext: false, // do not output next error
	},
	colors: {
		ok: false,
		info: false,
		data: false,
		query: false,
	},
	markers: {
		accented: '±',
		bold: '§',
		colored: '~',
		dim: '‡',
		param: ['[', ']'],
		opaque: ['{', '}'],
	},
	timing: false,
}

const _markers = transform(config.markers, (a, v, k) => (a[k[0]] = v))
const _accented = (s) => `${_markers.a}${s}${_markers.a}`
const _bold = (s) => `${_markers.b}${s}${_markers.b}`
const _colored = (s) => `${_markers.c}${s}${_markers.c}`
const _dim = (s) => `${_markers.d}${s}${_markers.d}`
const _param = (s, alt) => `${_markers.p[0]}${s}${alt ? ' : ' : ''}${alt ?? ''}${_markers.p[1]}`
const _opaque = (s) => `${_markers.o[0]}${s}${_markers.o[1]}`

let dcolors = {
	basic: '#a79635',
	name: '#e56a17',

	alert: '#ff2020',
	query: '#cc0096',
	ok: '#1f993f',
	info: '#0070c9',
	data: '#a79635',

	white: '#ffffff',
	black: '#111111',
	accent: '#cb5e14',
	accentBg: '#fff7e5',
	colored: '#0f5d9a',
	coloredBg: '#ecffe5',
	dim: 'rgba(0,0,51,0.2)',

	// cyan not used, maybe later?
	cyan: '#00b3b0',
}

const mods = { alert: '!', query: '?', ok: '*', info: '+', data: '#' }
const arrowSymbol = ' ' + _colored('⇢') + ' '
const chevronSymbol = ' ' + _bold('»') + ' ' // ' » ';
const compactKeysCount = 6

function logLevel(newLevel = '') {
	if (newLevel) {
		if (includes(['short', 1], newLevel)) config.level = 1
		else if (includes(['default', 'normal', 2], newLevel)) config.level = 2
		else if (includes(['verbose', 'full', 3], newLevel)) config.level = 3
		else if (includes(['none', 0], newLevel)) config.level = 0
	}
	return config.level
}

// требует восстановления!
function canIlog(message, isData = false) {
	let permission = !(/level defaults|ready\(\)/gi.test(message) && config.level == 1)
	permission = isData ? !(config.level < 3) : permission
	return config.level == 0 ? false : permission
}

/* eslint-disable no-console */
function logWithColors(message, ...data) {
	const colored = !config.mods.default
	let func = config.colors.info && colored ? console.info : console.log
	// if starts with '>' - then make it as collapsed group
	if (message.startsWith('>')) {
		message = message.replace(/^>/, '')
		func = console.groupCollapsed
	}

	const colors = getColors(colorBy(message))
	let { format, items } = parseWithColors(stripColorModifiers(message), colors)
	if (!isEmpty(data)) format = format + '  '

	forEach(data, (item) => {
		// delayed value creation - if the 'item' is a function,
		// then we replace it with the value returned from the function
		const value = isFunction(item) ? item() : item
		if (isString(value) && colored) {
			const { format: newFormat, items: newItems } = parseWithColors(value, colors)
			format = format + newFormat
			items.push(...newItems)
		} else {
			format = format + (isString(value) ? '%s' : '%o')
			items.push(config.clone ? cloneValue(value) : value)
		}
	})

	func(format, ...items)
	resetAllModifiers()
}

function log(message, ...data) {
	if (!canIlog(message)) return

	let loglevel = logLevel()
	if (loglevel == 0) return

	if (isString(message)) {
		config.mods.default = true
		logWithColors(message, ...data)
	} else {
		console.log(message, ...data)
	}
	// удалить после восстановления логирования Аякс
	// if(message) {
	//     message = message.trim();
	//
	//     let colors = [ colorBy(message, true),  dcolors.name, null ];
	//     let param_regex = /\[\s*([^\]]+)]/i;
	//     // let color2 = /loading =|ver /ig.test(message) ? dcolors.navigate : dcolors.name;
	//
	//     if(param_regex.test(message)) {
	//         let matches = param_regex.exec(message);
	//
	//         if(/ajax\s*\w*\s*request/ig.test(message)) colors = dcolors.ajaxInit;
	//         else if(/ajax\s*\w*\s*response/ig.test(message)) colors = dcolors.ajaxResponse;
	//         else if(/ajax\s*\w*\s*error/ig.test(message)) colors = dcolors.ajaxError;
	//
	//         const messages = [message.replace(matches[0], '[ '), matches[1], ' ]'];
	//         logWithColors(messages, colors, ...data);
	//     } else {
	//         logWithColors([message], colors, ...data);
	//     }
	// }
}

function logVerbose(...data) {
	if (logLevel() > 2) log(...data)
}

function logGroup(groupName, groupData, params) {
	let shouldCloseGroup = true
	// if starts with '<' - then just close group
	if (!groupName.startsWith('<')) {
		const { withoutNil = false, withoutIndex = false, arrayName = groupName } = params ?? {}
		if (groupName.startsWith('-') || groupName.startsWith('+')) {
			const func = groupName.startsWith('+') ? _accented : _dim
			logWithColors(
				`^${func(groupName.replace(/^[-|+]/, ''))} ${arrowSymbol} `,
				...castArray(groupData),
			)
			shouldCloseGroup = false
		} else {
			logWithColors(`>${groupName}`)
			if (isNil(groupData)) shouldCloseGroup = false
			if (isFunction(groupData)) groupData = groupData()
			forEach(groupData, (value, key) => {
				if (!(withoutNil && isNil(value))) {
					const indexName = withoutIndex ? '' : `[${key}]`
					const keyName =
						groupName && isArray(groupData) ? `${arrayName}${indexName}` : key
					if (isFunction(value)) {
						console.dir(value)
					} else logWithColors(`^${_accented(keyName)} ${arrowSymbol} `, value)
				}
			})
		}
	}
	if (shouldCloseGroup) console.groupEnd()
	// reset all modifiers
	resetAllModifiers()
}

function logExpanded(...data) {
	console.dir(...data)
}

function logColapsed(...data) {
	console.log(...data)
}

function logSmart(value, len) {
	const length = len ?? keys(value).length
	if (length < compactKeysCount) logColapsed(value)
	else logExpanded(value)
}

function warn(message, ...data) {
	if (logLevel() === 0) return
	if (!canIlog(message)) return
	if (message) console.warn(message, ...data)
	console.trace()
}

function error(message, ...data) {
	// ignore errors when requested
	if (config.mods.ignoreNext) return
	if (isEmpty(data)) console.error(message)
	else {
		console.error(message)
		console.info('Error data:', ...data)
	}
}

function logAsOneString(chunks, ...data) {
	const message = isArray(chunks) ? join(chunks, ' ') : String(chunks)
	logWithColors(
		message.replace(/\s+/g, ' ').replace(/\s*\]/g, ']').replace(/\[\s*/g, '['),
		...data,
	)
}

// требует восстановления!
// log ajax request and its options
function logRequestResponse(type, route, options, response, method = 'GET') {
	const messages = {
		request: ` «« Initiating Ajax ${method} request with route [${route}]`,
		error: ` »» Ajax ${method} error received from [${route}]`,
		response: ` »» Ajax ${method} response received from [${route}]`,
	}
	let message = get(messages, type) || `? Ajax ${type}`
	let logData = response ? response : options
	if (response) {
		logData = merge(logData, { timestamp: new Date().toString() })
		if (isEmpty(response)) {
			message += ` : response is empty `
		}
	}
	// Log request URL and its data (options or response) if presented
	if (isEmpty(logData)) {
		log(message)
	} else {
		log(`>${message}`)
		logGroup(logData)
	}
	// start/stop timing if was set in defaults
	if (config.timing) {
		if (response) console.timeEnd(route)
		else console.time(route)
	}
}

/* eslint-enable no-console */

// Debugging in components ----------------------------------------------------]

// just display the label every time the component is rendered
function renderComponent(maybeClientId) {
	const [clientId, clientId2] = castArray(maybeClientId)
	const component = componentName(
		clientId2 ? 'renderComponentWithId,renderComponent' : 'renderComponent',
	)
	const id = (clientId ?? clientId2) ? withId(clientId ?? clientId2) : ''
	config.colors.ok = true
	logAsOneString(`${_bold(component)}${id} {render}`)
}

// display variables and their values, possibly simplifying the data
function dataInComponent(data, marker = false) {
	// delayed value creation - if the 'data' is a function,
	// then we replace it with the value returned from the function
	if (isFunction(data)) data = data()

	const component = componentName('dataInComponent')
	const dataKeys = keys(data)
	const isSingleKey = dataKeys.length === 1
	const key = isSingleKey ? first(dataKeys) : join(map(dataKeys, _accented), `, `)
	const value = isSingleKey ? data[key] : data
	const withName = !startsWith(marker, '-')
	const altName =
		!!stripColorModifiers(marker) && marker ? `:${_colored(stripColorModifiers(marker))}` : ''
	const message = `${withName ? _bold(component) : ''}${altName} ${arrowSymbol} value for ${isSingleKey ? _accented(key) : key}`
	config.colors.data = true
	if (isSimpleType(value)) {
		logAsOneString(message, value)
	} else {
		logAsOneString(message)
		logSimplified(value)
	}
}

// display a formatted string and possibly some data
function infoInComponent(messageData, ...data) {
	const [message, clientId] = castArray(messageData)
	// minus - a special sign to skip the function name
	const colorMod = stripColorModifiers(message, true)
	const id = clientId ? withId(clientId) : ''
	const component = componentName(
		clientId ? 'infoInComponentWithId,infoInComponent' : 'infoInComponent',
	)
	const withName = startsWith(message, '-') ? false : component !== '?'
	const spacer = withName || id ? ` ${arrowSymbol} ` : ''
	const info = `${colorMod}${withName ? _bold(component) : ''}${id}${spacer}${stripColorModifiers(message)}`
	config.colors.info = true
	if (data.length === 0 || (data.length === 1 && isCompactType(data[0]))) {
		logAsOneString(info, ...data)
	} else {
		logAsOneString(info)
		logExpanded(...data)
	}
}

// trace changes in component props and state
function useTraceUpdate(props, state = {}, trackClientId = false) {
	const ref = useRef({
		key: componentName(
			trackClientId ? 'useTraceUpdate,useTraceUpdateWithId' : 'useTraceUpdate',
		),
		id: trackClientId ? withId(props) : '',
	})

	const prevProps = usePrevious(props)
	const prevState = usePrevious(state)

	useEffect(() => {
		const { id, key } = ref.current ?? {}
		const propKeys = changedKeys(props, prevProps)
		const stateKeys = changedKeys(state, prevState)

		const propsChanged = propKeys[0].length || propKeys[1] || propKeys[2]
		const stateChanged = stateKeys[0].length || stateKeys[1] || stateKeys[2]

		if (propsChanged && !stateChanged)
			logAsOneString(`Traced changes${id} ${_param(key, 'props')}`)
		if (!propsChanged && stateChanged)
			logAsOneString(`Traced changes${id} ${_param(key, 'state')}`)
		if (propsChanged && stateChanged)
			logAsOneString(`Traced changes${id} ${_param(key, 'props & state')}`)

		if (propsChanged) logChanges(propKeys, prevProps, props)
		if (stateChanged) logChanges(stateKeys, prevState, state)
	}, [props, prevProps, state, prevState])
}

// to log 'aka' Mounting and Unmounting events
function useMountUnmount() {
	const ref = useRef({
		component: componentName('useMountUnmount'),
	})
	useEffect(() => {
		const { component } = ref.current ?? {}
		config.colors.query = true
		logAsOneString(`${_bold(component)} ${arrowSymbol} ${_colored('componentDidMount')}`)
		return () => {
			config.colors.query = true
			logAsOneString(`${_bold(component)} ${arrowSymbol} ${_opaque('componentWillUnmount$')}`)
		}
	}, [])
}

// to trace several instances of one component on the page --------------------]

function withId(id) {
	return ` with ID ${_bold(shortenId(id))}`
}

function useTraceUpdateWithId(props, state = {}) {
	useTraceUpdate(props, state, true)
}

function infoInComponentWithId(clientId, message, ...data) {
	infoInComponent([message, clientId], ...data)
}

function renderComponentWithId(clientId) {
	renderComponent(clientId)
}

// Helpers for colored console & components debuging --------------------------]

function resetAllModifiers() {
	config.colors = mapValues(config.colors, () => false)
	config.mods = mapValues(config.mods, () => false)
}

const modRegex = /^[!|?|*|+|#|^|>]/
function stripColorModifiers(string, returnMod = false) {
	// minus - a special sign to skip the function name - first remove it
	const str = trimStart(string, '-')
	return returnMod ? (modRegex.test(str) ? str[0] : '') : str.replace(modRegex, '')
}

function colorBy(message) {
	const color =
		dcolors[findKey(config.colors)] ?? (config.mods.default ? dcolors.black : dcolors.basic)
	// first check special modifiers from which the string can start
	const mod = stripColorModifiers(message, true)
	if (mod) {
		const modColor = dcolors[findKey(mods, (v) => v === mod)] ?? dcolors.basic
		if (mod === '^') config.colors.opaque = { color: dcolors.white, bg: dcolors.cyan }
		return mod === '^'
			? [color, true, null]
			: [modColor, true, { color: dcolors.white, bg: modColor }]
	}
	return color
}

function getColors(main = dcolors.basic) {
	const [mainColor, mainBold, mainOpaque] = isArray(main)
		? main
		: [main, false, { color: dcolors.white, bg: main }]
	const weightBold = 'font-weight: bold;'
	const weightNormal = mainBold ? weightBold : 'font-weight: normal;'
	const padding = 'padding: 0 2px 0 2px;'
	const paddingBg = 'padding: 1px 3px 1px 3px;'
	const rounded = 'border-radius: 3px;'
	const opaque = mainOpaque ?? config.colors.opaque ?? { color: dcolors.white, bg: dcolors.alert }
	return {
		normal: `${weightNormal} color: ${mainColor}`,
		accent: `${weightBold} ${paddingBg} ${rounded} color: ${dcolors.accent}; background: ${dcolors.accentBg}`,
		bold: `${weightBold} color: ${mainColor}`,
		params: `${weightBold} ${padding} color: ${dcolors.name}`,
		colored: `${weightBold} ${paddingBg} ${rounded} color: ${dcolors.colored}; background: ${dcolors.coloredBg}`,
		opaque: `${weightBold} ${paddingBg} ${rounded} color: ${opaque.color}; background: ${opaque.bg}`,
		dim: `${weightBold} ${paddingBg} ${rounded} color: ${dcolors.dim}`,
	}
}

// старая реализация через regex, сохранил тут для идей
// const fixed = { '*':'#1','_':'#2','~':'#3','{':'#4','}':'#5' };
// const fixed = { '*':'#1','_':'#2' };
// const inverted = _.invert(fixed);
// replace the characters that will be used for formatting (then we will restore them)
// const safe = s => s.replace(/[*_]/g, m => fixed[m]); // /[*_~{}]/g
// const restore = s => s.replace(/(#1|#2)/g, m => inverted[m]); // /(#1|#2|#3|#4|#5)/g
const tokenFormat = (t) => `${t}%c`

function parseWithColors(message, colors) {
	const { normal, bold, params, accent, colored, opaque, dim } = colors ?? getColors()
	const { a, b, c, d, p, o } = _markers // accented, bold, colored, dim, param, opaque
	let isComplete = true
	let format = '%c'
	let items = [normal]
	let token = ''
	// ±text± as 'accented'
	// §text§ as 'bold'
	// ~text~ as 'colored'
	// [text] as 'param'
	// {text} as 'opaque'
	forEach(message, (char, index) => {
		// if 'token' is -1, then skip the current symbol
		if (token === -1) {
			token = ''
		} else {
			if (char === a) {
				if (isComplete) {
					format += tokenFormat(token)
					items.push(accent)
					token = ''
					isComplete = false
				} else {
					format += tokenFormat(token)
					items.push(normal)
					token = ''
					isComplete = true
				}
			} else if (char === c) {
				if (isComplete) {
					format += tokenFormat(token)
					items.push(colored)
					token = ''
					isComplete = false
				} else {
					format += tokenFormat(token)
					items.push(normal)
					token = ''
					isComplete = true
				}
			} else if (char === b) {
				if (isComplete) {
					format += tokenFormat(token)
					items.push(bold)
					token = ''
					isComplete = false
				} else {
					format += tokenFormat(token)
					items.push(normal)
					token = ''
					isComplete = true
				}
			} else if (char === d) {
				if (isComplete) {
					format += tokenFormat(token)
					items.push(dim)
					token = ''
					isComplete = false
				} else {
					format += tokenFormat(token)
					items.push(normal)
					token = ''
					isComplete = true
				}
			} else if (char === p[0]) {
				format += tokenFormat(token + p[0])
				items.push(params)
				token = ''
			} else if (char === p[1]) {
				format += tokenFormat(token)
				items.push(normal)
				token = p[1]
			} else if (char === o[0]) {
				format += tokenFormat(token)
				const coloredOpaque = stripColorModifiers(message[index + 1], true)
				if (coloredOpaque) {
					const { opaque: opaqueColor } = getColors(colorBy(message[index + 1]))
					items.push(opaqueColor)
					token = -1
				} else {
					items.push(opaque)
					token = ''
				}
			} else if (char === o[1]) {
				format += tokenFormat(token)
				items.push(normal)
				token = ''
			} else {
				token += char
			}
		}
	})
	format += token
	return { format, items }
}

function isSimpleType(val) {
	return isNil(val) || isBoolean(val) || isString(val) || isNumber(val)
}

function isCompactType(val) {
	return isSimpleType(val) || (isObject(val) && keys(val).length < compactKeysCount)
}

function changedKeys(next, prev) {
	const updated = []
	forEach(next, (val, key) => {
		if (prev && prev[key] !== val) {
			updated.push(key)
		}
	})
	const nextKeys = keys(next)
	const prevKeys = keys(prev)
	const added = difference(nextKeys, prevKeys)
	const removed = difference(prevKeys, nextKeys)
	// 'added' keys will also be included in 'updated', so we exclude them
	return [
		difference(updated, added),
		isEmpty(added) ? null : added,
		isEmpty(removed) ? null : removed,
	]
}

function shortenId(props, forStorage = false) {
	const clientId = get(props, 'clientId', props)
	const shortened = isString(clientId) ? clientId.slice(-4) : 0
	return forStorage ? shortened : shortened === 0 ? '?' : `✷✷✷-${shortened}`
}

function cloneValue(value) {
	// do nothing for null & undefined
	if (isNil(value)) return value
	// first try with lodash 'cloneDeepWith'
	const nodeCloner = (value) => (isElement(value) ? value.cloneNode(true) : undefined)
	let cloned = cloneDeepWith(value, nodeCloner)
	if (!isEmpty(cloned)) return cloned
	// try with JSON if 'cloneDeepWith' failed
	const seen = new WeakSet()
	const circularReplacer = (_key, value) => {
		if (typeof value === 'object' && value !== null) {
			if (seen.has(value)) return
			seen.add(value)
		}
		return isUndefined(value) ? '__undefined' : value
	}
	return JSON.parse(JSON.stringify(value, circularReplacer))
}

function logSimplified(val) {
	if (config.simplify) {
		const valKeys = keys(val)
		const firstKey = first(valKeys)
		const value = valKeys.length === 1 ? val[firstKey] : val

		if (valKeys.length === 1) {
			const kind = isArray(val) ? `at ${_accented('index')}` : `for ${_accented('key')}`
			const message = `value ${kind} ${_param(firstKey)}`
			if (isSimpleType(value)) {
				logAsOneString(message, value)
			} else {
				logAsOneString(message)
				logSimplified(value)
			}
		} else {
			logSmart(val, valKeys.length)
		}
	} else {
		logSmart(val)
	}
}

function logAddedRemoved(added, removed) {
	const addedKeys = added ? (added.length > 1 ? 'keys' : 'key') : false
	const removedKeys = removed ? (removed.length > 1 ? 'keys' : 'key') : false
	let message = addedKeys || removedKeys ? chevronSymbol : ''
	if (addedKeys) {
		const keys =
			added.length > compactKeysCount
				? concat(take(added, compactKeysCount), ['and more...'])
				: added
		message += `added ${_bold(addedKeys)} ${_param(join(keys, ', '))}${removedKeys ? ', ' : ''}`
	}
	if (removedKeys) {
		const keys =
			removed.length > compactKeysCount
				? concat(take(removed, compactKeysCount), ['and more...'])
				: removed
		message += `removed ${_bold(removedKeys)} ${_param(join(keys, ', '))}`
	}
	if (message) logAsOneString(message)
}

function logWasNow(was, now, keys) {
	const firstKey = first(keys)
	const wasValue = keys.length === 1 ? was[firstKey] : was
	const nowValue = keys.length === 1 ? now[firstKey] : now
	const [updated, added, removed] = keys.length === 1 ? changedKeys(nowValue, wasValue) : []
	const changed = keys.length === 1 ? (updated ?? []) : false

	logAddedRemoved(added, removed)
	if (changed && changed.length === 1) {
		const firstChanged = first(changed)
		const message = `${chevronSymbol}changed for ${_bold('key')} ${_param(firstChanged)}`
		if (isSimpleType(nowValue[firstChanged])) {
			logAsOneString(message, wasValue[firstChanged], arrowSymbol, nowValue[firstChanged])
		} else {
			logAsOneString(message)
			logWasNow(wasValue, nowValue, changed)
		}
	} else {
		logAsOneString(`${_colored('was')}`)
		logSmart(wasValue)
		logAsOneString(
			changed
				? `${_colored('now')} changed for ${_bold('keys')} ${_param(join(changed, ', '))}`
				: `${_colored('now')}`,
		)
		logSmart(nowValue)
		if (isEqual(wasValue, nowValue)) {
			logAsOneString(`{!Attention} ${_bold('they are equal!')}`)
		}
	}
}

function logChanges(keys, prevValues, values) {
	const [updated, added, removed] = keys
	// maybe there were additions and deletions?
	logAddedRemoved(added, removed)
	if (updated.length === 0) logWasNow(prevValues, values, updated)
	// log in detail for changes
	forEach(updated, (key) => {
		const value = values[key]
		config.colors.ok = true
		const message = `${chevronSymbol}${_accented(key)}`
		if (isSimpleType(value)) logAsOneString(message, prevValues[key], arrowSymbol, value)
		else {
			if (isFunction(value)) {
				logAsOneString([message, `${_param('function')}`])
			} else {
				const [changed, addedKeys, removedKeys] = changedKeys(value, prevValues[key])
				logAddedRemoved(addedKeys, removedKeys)
				const firstKey = first(changed)
				if (!changed.length && !addedKeys?.length && !removedKeys?.length) {
					logAsOneString(
						`${message} ${arrowSymbol} changed itself but the keys unchanged {something is wrong!}`,
					)
					logWasNow(prevValues[key], value, changed)
				} else {
					const keyMsg = `${message} @1 ${_bold('@2')} ${_param(join(changed, ', '))}`
					if (isArray(value)) {
						const arrayMsg = keyMsg
							.replace('@2', changed.length === 1 ? 'index' : 'indexes')
							.replace('@1', 'at')
						if (changed.length === 1 && isSimpleType(value[firstKey])) {
							logAsOneString(
								arrayMsg,
								prevValues[key][firstKey],
								arrowSymbol,
								value[firstKey],
							)
						} else {
							logAsOneString(arrayMsg)
							logWasNow(prevValues[key], value, changed)
						}
					} else {
						if (has(value, '$$typeof')) {
							logAsOneString([message, `${_param('React Component')}`])
						} else {
							const objMsg = keyMsg
								.replace('@2', changed.length === 1 ? 'key' : 'keys')
								.replace('@1', 'for')
							if (changed.length === 1 && isSimpleType(value[firstKey])) {
								logAsOneString(
									objMsg,
									prevValues[key][firstKey],
									arrowSymbol,
									value[firstKey],
								)
							} else {
								logAsOneString(objMsg)
								logWasNow(
									pick(prevValues[key], changed),
									pick(value, changed),
									changed,
								)
							}
						}
					}
				}
			}
		}
	})
}

// Get function & component names from stack ----------------------------------]

function skipFrames(name, prev) {
	const frames = isArray(name) ? name.length : split(name, ',').length
	const prevFrames = isNumber(prev) ? prev : isArray(prev) ? prev.length : split(prev, ',').length
	return prevFrames + frames
}

function componentName(prevFrames = 0) {
	const [name] = findOnStack(skipFrames('componentName', prevFrames))
	// component name should start with UpperCase
	if (name[0] === name[0].toUpperCase()) return name
	// maybe we have function?
	const func = name.replace('/zu_blocks', '').replace(/[/]/g, '.')
	return `${func}()`
}

function findOnStack(prevFrames) {
	const removeFrames = skipFrames('findOnStack', prevFrames)
	const stack = slice(split(new Error().stack, '\n'), removeFrames, removeFrames + 2)
	return [funcFromStack(stack, 0), funcFromStack(stack, 1)]
}

function funcFromStack(frames, index = 0) {
	return (get(split(frames[index], '@'), 0, '?') || '?').replace(/[<|/]+$/g, '')
}

export default {
	get level() {
		return logLevel()
	},
	set level(val) {
		logLevel(val)
	},

	set ignoreNext(val) {
		config.mods.ignoreNext = val
	},

	log,
	logVerbose,
	logGroup,
	warn,
	error,
	shortenId,

	render: renderComponent,
	data: dataInComponent,
	info: infoInComponent,
	useTrace: useTraceUpdate,
	useMU: useMountUnmount,

	useTraceWithId: useTraceUpdateWithId,
	renderWithId: renderComponentWithId,
	infoWithId: infoInComponentWithId,

	request(route, options, method) {
		logRequestResponse('request', route, options, null, method)
	},
	response(route, data, method) {
		logRequestResponse('response', route, null, data, method)
	},
	requestError(route, error, method) {
		logRequestResponse('error', route, null, error, method)
	},
}
