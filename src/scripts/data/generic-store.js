// WordPress dependencies
// https://developer.wordpress.org/block-editor/packages/packages-data/

const { keys, get } = lodash;
const { registerStore } = wp.data;
const { apiFetch } = wp;

// Internal dependencies

import { requestURL } from './../fetch.js';

const GET_VALUE = 'GET_VALUE';
const SET_VALUE = 'SET_VALUE';
const UPDATE_VALUES = 'UPDATE_VALUES';

// An empty object indicates that no value was found for option,
// or something went wrong during the option update
const isNull = val => Object.keys(val).length === 0 && val.constructor === Object;

function getReadOnlyActions() {
    return {
        getValue(path) {
            return {
                type: GET_VALUE,
                path,
            };
        },
        setValue(key, value, params = {}) {
            return {
                type: SET_VALUE,
                key,
                value,
                ...params,
            };
        },
    };
}

export function getActions(route, router) {
    const readOnly = getReadOnlyActions();
    return {
        ...readOnly,
        * updateValues(values) {
            const path = requestURL(route);
            const data = { router, keys: keys(values), values: values };
            const result = yield apiFetch({ path, method: 'POST', data });

            return isNull(result) ? undefined : {
                type: UPDATE_VALUES,
                values,
            };
        },
    };
}

export function defaultGetter(state, stateKey, key) {
    return get(state, [stateKey, key]);
}

export function getSelectors(stateKey, stateGetter = null) {
    const getter = stateGetter || defaultGetter;
    return {
        getValue(state, key, params = {}) {
            return getter(state, stateKey, key, params);
        },
    };
}

export function getControls() {
    return {
        GET_VALUE(action) {
            return apiFetch({ path: action.path });
        },
    };
}

export function getResolvers(route, router, actions) {
    return {
        * getValue(key, params = {}) {
            const path = requestURL(route, { key, ...params }, router);
            const value = yield actions.getValue(path);
            return actions.setValue(key, isNull(value) ? undefined : value, params);
        },
    };
}

export function defaultSetValueMerger(prevState, stateKey, action) {
    return {
        ...prevState,
        [stateKey]: {
            ...prevState[stateKey],
            [action.key]: action.value,
        },
    };
}

function getReducer(stateKey, initialState, setValueMerger = null) {

    const merger = setValueMerger || defaultSetValueMerger;

    return (state = initialState, action) => {

        switch(action.type) {
            case SET_VALUE: return merger(state, stateKey, action);

            case UPDATE_VALUES: return {
                ...state,
                [stateKey]: {
                    ...state[stateKey],
                    ...action.values,
                },
            };
        }
        return state;
    };
}

export function setupStore(
    store, key, routes, router, withSetters = true, defaultState = null, setValueMerger = null, stateGetter = null) {

    const initialState = defaultState || { [key]: {}, };
    const getRoute = get(routes, 'get', routes);
    const updateRoute = get(routes, 'update', routes);
    const actions = withSetters ? getActions(updateRoute, router) : getReadOnlyActions();

    return {
        register: () => registerStore(store, {
            reducer: getReducer(key, initialState, setValueMerger),
            actions,
            selectors: getSelectors(key, stateGetter),
            controls: getControls(),
            resolvers: getResolvers(getRoute, router, actions),
        }),
    };
}
