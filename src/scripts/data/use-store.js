// WordPress dependencies

const { isNil, isArray, isEmpty, get, some, reduce } = lodash;
const { createHigherOrderComponent } = wp.compose;
const { withSelect, useSelect, useDispatch } = wp.data;

// Internal dependencies

import ZU_STORE from './store.js';
import { isNum } from './../utils.js';

const emptyArray = [];

// Get Albums -----------------------------------------------------------------]

// Higher-order component which add 'albums' to the original component
export const withAlbums = createHigherOrderComponent(
	withSelect((select) => {
		return {
			albums: select(ZU_STORE).getZuData('albums') || null,
		}
	}),
	'withAlbums',
);

// Custom hook which returns 'albums'
export const useAlbums = () => {
	const { albums = null } = useSelect((select) => {
		return { albums: select(ZU_STORE).getZuData('albums') };
	}, []);

	// если пустой массив, то всегда возвращаем один и тот же объект
	return isEmpty(albums) ? emptyArray : albums;
};

// Get Loaders ----------------------------------------------------------------]

// Higher-order component which add 'loaderHTML' to the original component
export const withLoader = createHigherOrderComponent(
	withSelect((select, { loader, shape }) => {
		const loaders = select(ZU_STORE).getZuData('loaders') || null;
		const loaderIndex = isNum(loader) ? loader : shape;
		return {
			loaderHTML: isEmpty(loaders) ? null : (get(loaders, loaderIndex) || null),
		}
	}),
	'withLoader',
);

// Custom hook which returns 'loader' by 'index'
export const useLoader = (index) => {
	const { loaders = null } = useSelect((select) => {
		return { loaders: select(ZU_STORE).getZuData('loaders') };
	}, []);

	// если пустой массив или неправильный 'index', то возвращаем null
	return isEmpty(loaders) ? null : (index === -1 ? loaders : get(loaders, index) || null);
};

// Custom hook which returns all 'loaders'
export const useLoaders = () => {
	return useLoader(-1);
}

// Get/Update Options ---------------------------------------------------------]

// Custom hook which returns 'option' by 'key'
export const useGetOption = (key, defaultValue = null) => {
	const { value = null } = useSelect((select) => {
		return { value: select(ZU_STORE).getOption(key) };
	}, []);
	return isNil(value) ? defaultValue : value;
};

// Custom hook that returns all the 'options' that were passed in the 'keys' array
// if 'waitAll' is true - hook returns 'null' as long as there is at least one key with a value of 'null'
export const useGetOptions = (keys, waitAll = false) => {
	const optionKeys = isArray(keys) ? keys : emptyArray;
	const { gotOptions = null } = useSelect((select) => {
		const { getOption } = select(ZU_STORE);
		const reduced = reduce(optionKeys, (values, key) => {
			values[key] = isNil(key) ? null : getOption(key);
			return values;
		}, {});
		return { gotOptions: reduced };
	}, [optionKeys]);

	if(waitAll && some(gotOptions, isNil)) return null;
	// если пустой объект, то всегда возвращаем null
	return isEmpty(gotOptions) ? null : gotOptions;
};

// Custom hook which update 'option' by 'key'
export const useUpdateOptions = () => {
	const { updateOptions } = useDispatch(ZU_STORE);
	return updateOptions;
};
