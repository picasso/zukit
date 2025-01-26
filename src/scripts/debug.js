/* eslint-disable no-use-before-define */
import {
	castArray,
	cloneDeepWith,
	compact,
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
	isDate,
	isElement,
	isEmpty,
	isEqual,
	isFunction,
	isMap,
	isNil,
	isNumber,
	isObject,
	isSet,
	isString,
	isUndefined,
	join,
	keys,
	map,
	mapValues,
	pick,
	reduce,
	set,
	slice,
	split,
	startsWith,
	take,
	transform,
	trimStart,
	union,
	uniq,
} from 'lodash-es'

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

const logMode = {
	none: 0,
	short: 10,
	changes: 11,
	default: 20,
	normal: 21,
	verbose: 30,
	full: 31,
}

// some internal vars
const config = {
	level: logMode.default,
	withoutCaller: true, // skip output of 'caller' name
	localDates: true, // convert 'dates' with 'toLocaleString()'
	simplify: true, // когда установлено, то пытается упростить вывод
	//  - например, заменяет вывод массива с одним элементом на
	//  на вывод element[0] как объекта и т.д.
	clone: false, // clone logged values if true
	mods: {
		default: false, // do not use colors, do not simplify (почти как console.log)
		ignoreNext: false, // do not output next error
		func: false, // console function to use
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

const dcolors = {
	basic: '#a79635',
	name: '#e56a17',

	alert: '#ff2020',
	query: '#cc0096',
	ok: '#1f993f',
	info: '#0070c9',
	info2: '#0070c9',
	data: '#a79635',

	white: '#ffffff',
	black: '#111111',
	accent: '#cb5e14',
	accentBg: '#fff7e5',
	colored: '#0f5d9a',
	coloredBg: '#ecffe5',
	dim: 0.6, // 'rgba(45,93,149,0.7)',

	cyan: '#00D1D4', // '#00b3b0',
	green: '#00A862',
}

const modRegex = /^[!|?|*|+|#|^|@|&|%|$|>]/
const mods = {
	alert: '!',
	query: '?',
	ok: '*',
	info: '+',
	info2: '@',
	data: '#',
	cyan: '&',
	green: '%',
	name: '$',
}
const arrowSymbol = ' ' + _colored('⇢') + ' '
const chevronSymbol = ' ' + _bold('»') + ' '
const compactKeysCount = 6

// convert 'string' level to number
function logLevel(newLevel = '') {
	if (newLevel) {
		config.level = has(logMode, newLevel) ? logMode[newLevel] : config.level
	}
	return config.level
}

// returns array of log levels based on its code
function logNames(level) {
	if (isString(level)) return [level]
	const names = reduce(
		logMode,
		(acc, val, name) => {
			if (val === level) acc.push(name)
			return acc
		},
		[],
	)
	return isEmpty(names) ? ['none'] : names
}

/* eslint-disable no-console */
function logWithColors(message, ...data) {
	const colored = !config.mods.default
	let func = config.colors.info && colored ? console.info : console.log
	if (config.mods.func) func = config.mods.func
	// replace 'predefined' symbols
	message = message.replace(/{->}/g, arrowSymbol).replace(/{>>}/g, chevronSymbol)
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
			items.push(
				config.clone
					? cloneValue(value)
					: config.localDates && isDate(value)
						? value.toLocaleString()
						: value,
			)
		}
	})

	func(format, ...items)
	resetAllModifiers()
}

function log(message, ...data) {
	const loglevel = logLevel()
	if (loglevel == 0) return

	if (isString(message)) {
		config.mods.default = true
		logWithColors(message, ...data)
	} else {
		console.log(message, ...data)
	}
}

function logVerbose(...data) {
	if (logLevel() > 21) log(...data)
}

function logGroup(groupName, groupData, params) {
	let shouldCloseGroup = true
	// if starts with '<' - then just close group
	if (!groupName.startsWith('<')) {
		const {
			withoutNil = false,
			withoutIndex = false,
			arrayName = groupName,
			resolveFuncData = false,
		} = params ?? {}
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
			if (resolveFuncData && isFunction(groupData)) groupData = groupData()
			const config = { withoutNil, withoutIndex, arrayName, groupName, groupData }

			if (isMap(groupData) || isSet(groupData)) {
				groupData.forEach((value, key) => doGroupItem(value, key, config))
			} else {
				forEach(groupData, (value, key) => doGroupItem(value, key, config))
			}
		}
	}
	if (shouldCloseGroup) console.groupEnd()
	// reset all modifiers
	resetAllModifiers()
}

function doGroupItem(value, key, { withoutNil, withoutIndex, arrayName, groupName, groupData }) {
	if (!(withoutNil && isNil(value))) {
		const indexName = withoutIndex ? '' : `[${key}]`
		const keyName = groupName && isArray(groupData) ? `${arrayName}${indexName}` : key
		if (isFunction(value)) {
			console.dir(value)
		} else logWithColors(`^${_accented(keyName)}${arrowSymbol}`, value)
	}
}

function logReducer(name, mode, action, next, prev) {
	const devMode = logNames(mode)
	if (includes(devMode, 'none')) return

	const hasChanged = !isEqual(prev, next)
	const data = includes(devMode, 'changes')
		? null
		: {
				action,
				prev,
				state: hasChanged ? next : '=prev',
			}

	logGroup(
		`?${name} [${action.type ?? String(action)}] - {${
			hasChanged ? '*effective change' : '#same as the previous'
		}}`,
		data,
	)
	if (includes(devMode, 'changes')) {
		if (!hasChanged) {
			logGroup('+action', [action])
			logGroup('+current state', [prev])
		} else {
			const [updated, updatedKeys] = onlyChanges(next, prev ?? {})
			const { next: nval, prev: pval } = updated
			const updatedProps = uniq(concat(keys(nval), keys(pval)))
			logGroup('+updated keys', [`[${updatedProps.join(', ')}]`])
			forEach(updatedProps, (prop) => {
				const subkeys = updatedKeys[prop] ?? null
				logGroup(`+${prop}`, [
					subkeys ? `changes for [${subkeys.join(', ')}]:` : 'value:',
					'  {* now }  ',
					fixValue(nval[prop], prop, next),
					'  {! was }  ',
					fixValue(pval[prop], prop, prev),
				])
			})
		}
		logGroupClose()
	}
}

function logGroupClose() {
	logGroup('<')
}

function logExpanded(...data) {
	console.dir(...data)
}

function warn(message, ...data) {
	if (logLevel() === 0) return

	if (message) {
		config.mods.default = true
		config.mods.func = console.warn
		logWithColors(message, ...data)
	} else {
		console.trace()
	}
}

function error(message, ...data) {
	// ignore errors when requested
	if (config.mods.ignoreNext) return
	config.mods.default = true
	config.mods.func = console.error
	logWithColors(`!${message}`)
	if (!isEmpty(data)) {
		log('-!{Error data}', ...data)
	}
}

function logAsOneString(chunks, ...data) {
	let message = isArray(chunks) ? join(chunks, ' ') : String(chunks)
	// remove extra spaces
	message = message.replace(/\s+/g, ' ').replace(/\s*\]/g, ']').replace(/\[\s*/g, '[')
	logWithColors(message, ...data)
}

/* eslint-enable no-console */

// Debugging in components ----------------------------------------------------]

// display variables and their values, possibly simplifying the data
function dataInComponent(data, marker = '') {
	// delayed value creation - if the 'data' is a function,
	// then we replace it with the value returned from the function
	if (isFunction(data)) data = data()

	const cname = componentName('dataInComponent')
	const dataKeys = keys(data)
	const isSingleKey = dataKeys.length === 1
	const key = isSingleKey ? first(dataKeys) : join(map(dataKeys, _accented), ', ')
	const value = isSingleKey ? data[key] : data
	const withName = !startsWith(marker, '-')
	const altName =
		!!stripColorModifiers(marker) && marker ? `:${_colored(stripColorModifiers(marker))}` : ''
	const message = `${caller(cname, withName)}${altName} ${arrowSymbol} value for ${
		isSingleKey ? _accented(key) : key
	}`
	config.colors.data = true
	if (isSimpleType(value)) {
		logAsOneString(message, value)
	} else {
		logAsOneString(message)
		logExpanded(value)
	}
}

// display a formatted string and possibly some data
function infoInComponent(message, ...data) {
	// minus - a special sign to skip the function name
	const colorMod = stripColorModifiers(message, true)
	const cname = componentName('infoInComponent')
	const withName = startsWith(message, '-') ? false : cname !== '?'
	const spacer = withName ? ` ${arrowSymbol} ` : ''
	const info = `${colorMod}${caller(cname, withName)}${spacer}${stripColorModifiers(message)}`
	config.colors.info = true
	if (data.length === 0 || (data.length === 1 && isCompactType(data[0]))) {
		logAsOneString(info, ...data)
	} else {
		logAsOneString(info)
		logExpanded(...data)
	}
}

// log only changes between 'data' and 'prevData'
function logDataWasNow(data, prevData) {
	const dataKeys = changedKeys(data, prevData)
	logChanges(dataKeys, prevData, data)
}

// Helpers for colored console & components debuging --------------------------]

function resetAllModifiers() {
	config.colors = mapValues(config.colors, () => false)
	config.mods = mapValues(config.mods, () => false)
}

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

function hexToRgb(hex) {
	return hex
		.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => '#' + r + r + g + g + b + b)
		.substring(1)
		.match(/.{2}/g)
		.map((x) => parseInt(x, 16))
}

function getColors(main = dcolors.basic) {
	const [mainColor, mainBold, mainOpaque] = isArray(main)
		? main
		: [main, false, { color: dcolors.white, bg: main }]
	const weightBold = 'font-weight: bold;'
	const weightRegular = 'font-weight: normal;'
	const weightNormal = mainBold ? weightBold : weightRegular
	const padding = 'padding: 0 2px 0 2px;'
	const paddingBg = 'padding: 1px 3px 1px 3px;'
	const rounded = 'border-radius: 3px;'
	const opaque = mainOpaque ?? config.colors.opaque ?? { color: dcolors.white, bg: dcolors.alert }
	const mainRgb = hexToRgb(mainColor)
	const dimColor = `rgba(${mainRgb[0]},${mainRgb[1]},${mainRgb[2]},${dcolors.dim})`
	return {
		normal: `${weightNormal} color: ${mainColor}`,
		accent: `${weightBold} ${paddingBg} ${rounded} color: ${dcolors.accent}; background: ${dcolors.accentBg}`,
		bold: `${weightBold} color: ${mainColor}`,
		params: `${weightBold} ${padding} color: ${dcolors.name}`,
		colored: `${weightBold} ${paddingBg} ${rounded} color: ${dcolors.colored}; background: ${dcolors.coloredBg}`,
		opaque: `${weightBold} ${paddingBg} ${rounded} color: ${opaque.color}; background: ${opaque.bg}`,
		dim: `${weightRegular} ${padding} ${rounded} color: ${dimColor}`,
	}
}

const tokenFormat = (t) => `${t}%c`

function parseWithColors(message, colors) {
	const { normal, bold, params, accent, colored, opaque, dim } = colors ?? getColors()
	const { a, b, c, d, p, o } = _markers // accented, bold, colored, dim, param, opaque
	let isComplete = true
	let format = '%c'
	const items = [normal]
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
	return isNil(val) || isBoolean(val) || isString(val) || isNumber(val) || isDate(val)
}

function isCompactType(val) {
	return isSimpleType(val) || (isObject(val) && keys(val).length < compactKeysCount)
}

function changedKeys(next, prev, allKeys = false) {
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
	if (allKeys) return concat(updated, removed)
	// 'added' keys will also be included in 'updated', so we exclude them
	return [
		difference(updated, added),
		isEmpty(added) ? null : added,
		isEmpty(removed) ? null : removed,
	]
}

function cloneValue(value) {
	// do nothing for null & undefined
	if (isNil(value)) return value
	// first try with lodash 'cloneDeepWith'
	const nodeCloner = (value) => (isElement(value) ? value.cloneNode(true) : undefined)
	const cloned = cloneDeepWith(value, nodeCloner)
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

function logAddedRemoved(added, removed, name = null) {
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
	if (message) logAsOneString(name ? `${name} ${message}` : message)
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
		logExpanded(wasValue)
		logAsOneString(
			changed
				? `${_colored('now')} changed for ${_bold('keys')} ${_param(join(changed, ', '))}`
				: `${_colored('now')}`,
		)
		logExpanded(nowValue)
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
				logAddedRemoved(addedKeys, removedKeys, changed.length ? null : message)
				if (changed.length) {
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
				} else if (addedKeys?.length || removedKeys?.length) {
					logWasNow(prevValues[key], value, concat(addedKeys, removedKeys))
				}
			}
		}
	})
}

function onlyChanges(next, prev, updated, parentKey = '', keys = {}) {
	updated = updated ?? { next: {}, prev: {} }
	const isIndex = isArray(next)
	const updatedKeys = []
	// special trick to include 'removed' keys in processing
	// we add 'removed' keys to 'next' with 'undefined' value
	const removedKeys = difference(keys(prev), keys(next))
	if (removedKeys.length) {
		if (isIndex)
			next = map(prev, (item, i) => (includes(removedKeys, String(i)) ? undefined : item))
		else next = transform(removedKeys, (acc, key) => (acc[key] = undefined), { ...prev })
	}
	forEach(next, (val, key) => {
		const prevValue = prev?.[key]
		const updateKey = parentKey ? parentKey + (isIndex ? `[${key}]` : `.${key}`) : key
		if (prevValue !== val) {
			if (anyOf(val, prevValue, [isUndefined, isSimpleType, isFunction])) {
				if (!includes(removedKeys, String(key))) set(updated, `next.${updateKey}`, val)
				set(updated, `prev.${updateKey}`, prevValue)
				if (!includes(updatedKeys, key)) updatedKeys.push(key)
			} else {
				;[updated, keys] = onlyChanges(val, prevValue, updated, updateKey, keys)
			}
		}
	})
	if (!isEmpty(updatedKeys)) {
		const matches = /^([^[|.]+)/.exec(parentKey)
		if (matches) set(keys, matches[1], union(updatedKeys, get(keys, matches[1], [])))
		else set(keys, 'root', updatedKeys)
	}
	return [updated, keys]
}

function anyOf(v1, v2, func) {
	const functions = castArray(func)
	let result = false
	forEach(functions, (f) => {
		if (result) return false
		if (f(v1) || f(v2)) result = true
	})
	return result
}

function testOnlyChanges(next, prev) {
	const [updated, keys] = onlyChanges(next, prev)
	logExpanded(updated.next)
	logExpanded(keys)
}

function fixValue(value, key, set) {
	if (value === '') return '""'
	if (isFunction(value)) return tryFuncName(value)
	if (set && isArray(set[key])) {
		const compacted = compact(value)
		return compacted.length === 1 ? compacted[0] : compacted.length ? compacted : undefined
	}
	return value
}

function tryFuncName(value) {
	const matches = String(value).match(/\s([\w|_]+[^(]+).*$/ms)
	return matches ? `{^function} ${matches[1]}()` : '{^function()}'
}

function caller(name, localMod = true) {
	return name && localMod ? `${_bold(name)}` : ''
}

// Get function & component names from stack ----------------------------------]

function skipFrames(name, prev) {
	const frames = isArray(name) ? name.length : split(name, ',').length
	const prevFrames = isNumber(prev) ? prev : isArray(prev) ? prev.length : split(prev, ',').length
	return prevFrames + frames
}

function componentName(prevFrames = 0, asFuncGetter = false) {
	if (!asFuncGetter && config.withoutCaller) return null
	const [name] = findOnStack(skipFrames('componentName', prevFrames))
	if (asFuncGetter) return name
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

const devHelpers = {
	// get level() {
	// 	return logLevel()
	// },
	// set level(val) {
	// 	logLevel(val)
	// },

	log,
	logVerbose,
	logGroup,
	logReducer,
	logGroupClose,
	logDataWasNow,
	logExpanded,
	warn,
	error,
	onlyChanges,
	testOnlyChanges,
	funcName: componentName,

	data: dataInComponent,
	info: infoInComponent,
}

export default devHelpers

const markers = {
	_accented,
	_bold,
	_colored,
	_dim,
	_param,
	_opaque,
}
export { logNames, isSimpleType, markers }
