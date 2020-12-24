// WordPress dependencies
// https://developer.wordpress.org/block-editor/packages/packages-data/

const { keys, has } = lodash;
const { registerStore } = wp.data;
const { apiFetch } = wp;

// Internal dependencies

import { ZUKIT_STORE, TYPES } from './types.js';
import { requestURL } from './../fetch.js';

const {
    GET_DATA, SET_DATA,
    GET_OPTION, SET_OPTION, UPDATE_OPTIONS
} = TYPES;

const defaultState = {
    zudata: {
        albums: [],
        loaders: [],
    },
    options: {},
};

// An empty object indicates that no value was found for option,
// or something went wrong during the option update
const isNull = val => Object.keys(val).length === 0 && val.constructor === Object;

const actions = {
	setZuData(key, value) {
		return {
			type: SET_DATA,
			key,
			value,
		};
	},
	getZuData(path) {
		return {
			type: GET_DATA,
			path,
		};
	},
    setOption(key, value) {
        return {
            type: SET_OPTION,
            key,
            value,
        };
    },
    getOption(path) {
        return {
            type: GET_OPTION,
            path,
        };
    },
    * updateOptions(options) {
        const path = requestURL('options');
        const data = { keys: keys(options), values: options };
		const result = yield apiFetch({ path, method: 'POST', data });

        return isNull(result) ? undefined : {
            type: UPDATE_OPTIONS,
            options,
        };
    },
};

registerStore(ZUKIT_STORE, {
	reducer(state = defaultState, action) {

		switch(action.type) {
            case SET_DATA: return {
                ...state,
                zudata: {
                    ...state.zudata,
                    [action.key]: action.value,
                },
            };

            case SET_OPTION: return {
                ...state,
                options: {
                    ...state.options,
                    [action.key]: action.value,
                },
            };

            case UPDATE_OPTIONS: return {
                ...state,
                options: {
                    ...state.options,
                    ...action.options,
                },
            };
		}
        return state;
	},

	actions,

	selectors: {
        getZuData(state, key) {
            const { zudata } = state;
            return zudata[key];
        },
        getOption(state, key, defaultValue) {
            const { options } = state;
            return has(options, key) ? options[key] : defaultValue;
        },
    },
	controls: {
		GET_ZUDATA(action) {
			return apiFetch({ path: action.path });
		},
        GET_OPTION(action) {
			return apiFetch({ path: action.path });
		},
	},
	resolvers: {
		* getZuData(key) {
			const path = requestURL('zudata', { key });
			const value = yield actions.getZuData(path);
			return value ? actions.setZuData(key, value) : undefined;
		},
        * getOption(key, defaultValue) {
			const path = requestURL('option', { key });
			const value = yield actions.getOption(path);
			return actions.setOption(key, isNull(value) ? defaultValue : value);
		},
	}
});

export default ZUKIT_STORE;
