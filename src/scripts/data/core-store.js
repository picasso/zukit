import { forEach, get, includes, isEmpty, isNil, repeat, sortBy } from 'lodash-es'

// WordPress dependencies
import { createHigherOrderComponent } from '@wordpress/compose'
import { useSelect, withSelect } from '@wordpress/data'
import { __ } from '@wordpress/i18n'

// Internal dependencies
import { isNum } from '../utils.jsx'
import { defaultGetter, defaultMerger, setupStore } from './generic-store.js'

// create and register Zukit Core Data store ------------------------------------------------------]

const ZUKIT_STORE = 'zukit/core'
const FolderDepthSymbol = '\u00A0'
const FolderDepthShift = 4

// custom Core Data state merger & getter ---------------------------------------------------------]

const basicKeys = ['loaders', 'galleries', 'folders']

function dataMerger(prevState, stateKey, action) {
	const { key, value } = action
	const prevDataState = get(prevState, stateKey, {})
	const prevKeyState = get(prevDataState, key, {})

	if (includes(basicKeys, key)) {
		return defaultMerger(prevState, stateKey, action)
	} else if (key === 'svg') {
		const { name, folder } = action
		const prevFolderState = get(prevKeyState, folder, {})
		return {
			...prevState,
			[stateKey]: {
				...prevDataState,
				svg: {
					...prevKeyState,
					[folder]: {
						...prevFolderState,
						[name]: value,
					},
				},
			},
		}
	}

	return prevState
}

function dataGetter(state, stateKey, key, params) {
	if (includes(basicKeys, key)) {
		return defaultGetter(state, stateKey, key)
	} else if (key === 'svg') {
		const { name, folder } = params
		return get(state, [stateKey, key, folder, name])
	}
	return undefined
}

const { register: registerCoreStore } = setupStore({
	name: ZUKIT_STORE,
	stateKey: 'data',
	routes: 'zudata',
	withSetters: false,
	initialState: {
		data: {
			folders: {},
			loaders: {},
			galleries: {},
			svg: {},
		},
	},
	merger: dataMerger,
	getter: dataGetter,
})

registerCoreStore()

// custom hooks -----------------------------------------------------------------------------------]

// custom hook which returns Generic Core Data
export const useCoreDataGeneric = (key, params) => {
	const { data = null } = useSelect(
		(select) => {
			return { data: select(ZUKIT_STORE).getValue(key, params) }
		},
		[key, params],
	)

	return isEmpty(data) ? null : data
}

// custom hook which returns SVG from file in folder
export const useSvgFromFileGeneric = (name, folder = 'images/', router = null) => {
	const { svg = null } = useSelect(
		(select) => {
			if (isEmpty(name)) return {}
			return { svg: select(ZUKIT_STORE).getValue('svg', { router, name, folder }) }
		},
		[name, folder],
	)

	return isEmpty(svg) ? null : svg
}

// get Folders/Galleries --------------------------------------------------------------------------]

// higher-order component which add 'folders' to the original component
export const withFolders = createHigherOrderComponent(
	withSelect((select) => {
		return {
			folders: select(ZUKIT_STORE).getValue('folders') || null,
		}
	}),
	'withFolders',
)

export const folderOptions = (folders, initialOption = null) => {
	const sortedFolders = sortBy(folders, 'order')
	// const idRefs = transform(folders, (acc, val, i) => { acc[val.id] = toInteger(i) });

	function folderOps(folder, ops, depth, parentId) {
		if (isNil(folder) || folder.parent_id !== parentId) return
		ops.push({
			label: repeat(FolderDepthSymbol, depth * FolderDepthShift) + folder.title,
			value: folder.id,
		})
		forEach(folder.childs, (id) => {
			folderOps(folders[id], ops, ++depth, folder.id)
			--depth
		})
	}

	let folderDepth = 0
	let options = initialOption ? [initialOption] : []
	forEach(sortedFolders, (f) => {
		if (f.parent_id === 0) folderOps(f, options, folderDepth, 0)
	})
	return options
}

// custom hook which returns 'folder/folders' (all folders if folderId is 'null')
export const useFolders = (folderId = null) => {
	const { folders = null } = useSelect((select) => {
		return { folders: select(ZUKIT_STORE).getValue('folders') }
	}, [])

	return isEmpty(folders) ? null : folderId === null ? folders : get(folders, folderId, null)
}

// custom hook which returns array with 'folder options'
const emptyOps = [{ value: 0, label: __('Loading...', 'zukit') }]
const initialOp = { value: 0, label: __('Select folder', 'zukit') }
export const useFolderOptions = (withInitial = initialOp) => {
	const folders = useFolders()
	return isEmpty(folders) ? emptyOps : folderOptions(folders, withInitial)
}

// custom hook which returns 'galleries' (all galleries if postId is 'null')
export const useGalleries = (postId = null) => {
	const { galleries = null } = useSelect((select) => {
		return { galleries: select(ZUKIT_STORE).getValue('galleries') }
	}, [])

	return isEmpty(galleries) ? null : postId === null ? galleries : get(galleries, postId, null)
}

// get Loaders ------------------------------------------------------------------------------------]

// higher-order component which add 'loaderHTML' to the original component
export const withLoaders = createHigherOrderComponent(
	withSelect((select, { loader }) => {
		const loaderIndex = isNum(loader) ? loader : null
		let loaderRaw = null
		if (!isNil(loaderIndex)) {
			loaderRaw = select(ZUKIT_STORE).getValue('loaders', { loaderIndex }) || null
		}
		return {
			loaderHTML: isEmpty(loaderRaw) ? null : loaderRaw,
		}
	}),
	'withLoaders',
)

// custom hook which returns 'loader' by 'index' (all loaders if index is 'null')
export const useLoaders = (index = null, duration = null) => {
	const { loaders = null } = useSelect((select) => {
		return { loaders: select(ZUKIT_STORE).getValue('loaders') }
	}, [])
	if (index && !isEmpty(loaders)) {
		const loader = get(loaders, index, null)
		if (loader && duration !== null) {
			if (duration === 0) return loader.replace(/dur="[^"]*"/gm, `dur="1000000s"`)
			else return loader.replace(/dur="[^"]*"/gm, `dur="${duration}s"`)
		}
		return loader
	}
	return isEmpty(loaders) ? null : loaders
}
