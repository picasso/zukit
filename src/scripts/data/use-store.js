import {
	defaults,
	forEach,
	isEmpty,
	isFunction,
	isNil,
	isPlainObject,
	isUndefined,
	reduce,
	some,
} from 'lodash-es'

// wordpress dependencies
import { useDispatch, useSelect } from '@wordpress/data'
import { useCallback, useReducer, useRef, useState } from '@wordpress/element'

// internal dependencies
import { useCoreDataGeneric, useSvgFromFileGeneric } from './core-store.js'
import { setupStore } from './generic-store.js'

// custom hooks -----------------------------------------------------------------------------------]

export function useForceUpdater() {
	const [, forceUpdate] = useReducer((z) => z + 1, 0)
	return forceUpdate
}

export function useRefInit(func, params = null) {
	const ref = useRef(null)
	if (ref.current === null && isFunction(func)) ref.current = func(params)
	return ref
}

export function useRefDefaults(params, defaultValues = {}) {
	const ref = useRef(null)
	if (ref.current === null && params) {
		const value = isPlainObject(params) ? defaults({}, params, defaultValues) : params
		ref.current = value
	}
	return ref
}

// setup and re-export Zukit Core store -----------------------------------------------------------]

export function setupCoreStore(router) {
	return {
		useSvgFromFile: (name, folder = 'images/') => useSvgFromFileGeneric(name, folder, router),
		useCoreData: (key, params) => useCoreDataGeneric(key, { ...params, router }),
	}
}

// re-export all named imports
export * from './core-store.js'

// setup but do not register Zukit Options store (router needed!) ---------------------------------]

function mergeWithPrevious(values) {
	return (prevOptions) => {
		if (!values) return prevOptions
		const updated = { ...prevOptions }
		forEach(values, (value, key) => {
			updated[key] = value
		})
		return updated
	}
}

export function setupOptionsStore(router) {
	const ZUKIT_OPTIONS_STORE = `zukit/${router}`

	const { register: registerOptionsStore } = setupStore({
		name: ZUKIT_OPTIONS_STORE,
		stateKey: 'options',
		routes: { get: 'option', update: 'options' },
		router,
	})

	// Get/Set/Update Options ---------------------------------------------------------------------]

	const getAndConvert = (key, getValue) => {
		const response = getValue?.(key)
		const { scalar } = response ?? {}
		// wordpress return single value as `{ scalar: value }`
		return isEmpty(response) ? undefined : (scalar ?? response[key])
	}

	// custom hook which returns `option` by `key`
	const useGetOption = (key, defaultValue = null) => {
		const value = useSelect((select) => {
			const { getValue } = select(ZUKIT_OPTIONS_STORE)
			return getAndConvert(key, getValue)
		}, [])
		return isNil(value) ? defaultValue : value
	}

	// custom hook that returns all the `options` that were passed in the `optionKeys` array
	// if `waitAll` is `true` - hook returns `null` as long as
	// there is at least one key with a value of `null`
	const useGetOptions = (optionKeys, waitAll = false, setter = null) => {
		const [options, setOptions] = useState(() =>
			reduce(
				optionKeys,
				(acc, key) => {
					acc[key] = undefined
					return acc
				},
				{},
			),
		)
		const [synced, setSynced] = useState(false)

		useSelect(
			(select) => {
				if (isEmpty(options) || some(options, isUndefined)) {
					const { getValue } = select(ZUKIT_OPTIONS_STORE)
					forEach(options, (value, key) => {
						if (value === undefined) {
							const newValue = getAndConvert(key, getValue)
							if (newValue !== undefined) {
								setOptions(mergeWithPrevious({ [key]: newValue }))
							}
						}
					})
				}
			},
			[optionKeys, options],
		)
		if (waitAll && some(options, isUndefined)) return null
		if (!isEmpty(options)) {
			if (!synced) {
				setSynced(true)
				dev.info('{!SYNC}')
				setter?.(mergeWithPrevious(options))
			}
			return options
		}
		// if an object is empty, then always return `null`
		return null
	}

	// internal helper
	const useUpdateProxy = (setter) => {
		const { updateValues } = useDispatch(ZUKIT_OPTIONS_STORE)
		return (options) => {
			updateValues(options).then((result) => {
				setter?.(mergeWithPrevious(result?.values))
			})
		}
	}
	// custom hook which set `option` by `key`
	const useSetOption = () => {
		const update = useUpdateProxy()
		return (key, value) => update({ [key]: value })
	}

	// custom hook which update `option` by `key`
	const useUpdateOptions = () => {
		return useUpdateProxy()
	}

	// custom hook which returns synced `options`
	const useOptions = (initialKeys = null, waitAll = false) => {
		const [options, setOptions] = useState(waitAll ? null : {})
		useGetOptions(initialKeys, waitAll, setOptions)
		const proxy = useUpdateProxy(setOptions)
		const updateOptions = useCallback((update) => proxy(update), [proxy])
		return [options, updateOptions]
	}

	return {
		registerOptionsStore,
		useOptions,
		useGetOption,
		useGetOptions,
		useSetOption,
		useUpdateOptions,
	}
}

// re-export all named imports for creating Custom Store ------------------------------------------]

export * from './generic-store.js'
