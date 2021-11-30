// WordPress dependencies

const _ = lodash;
const { useEffect, useRef } = wp.element;
const { usePrevious } = wp.compose;

import zuPackage from './../../../package.json';

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
//      Zubug.data({images, action})    - output data {name: value}

//      Zubug.useTraceWithId(props);    - trace the changes of the props when there is 'clientId' among the props

//      Zubug.data({images, action})    - output data (name: value)
//      Zubug.info('text', {id, links}) - output data with text label
//      Zubug.akaMount()                - output information when a component has been mounted or unmounted
//      Zubug.renderWithId(clientId)    - output information when the component was rendered
//      Zubug.log(message, ...data)     - output message with data
//
// Ajax helpers:
//      Zubug.request(route, options)   - output Ajax request information
//      Zubug.response(route, data)     - output Ajax response information

// Модификаторы цвета и шрифта (первый символ сообщения для log() и info()):
//      '!' - console.info, bold, '#cc0096'
//      '?' - bold, '#ff2020'
//      '>' - начать группу
//      '#' - bold, '#ffffff' на фоне '#e50039' в окружении ★★★

// some internal vars
const config = {
    version: zuPackage.version || 'unknown',
    level: 'default',
    simplify: true,         // когда установлено, то пытается упростить вывод
                            //  - например, заменяет вывод массива с одним элементом на
                            //  на вывод element[0] как объекта и т.д.
    mods: {
        ignoreNext: false,  // do not output next error
        consoleDir: false,  // use console.dir to output values
        forseNil: false,    // forse output even value is null or undefined
    },
    colors: {
        same: false,
        trace: false,
        info: false,
        data: false,
        render: false,
        mount: false,
    },
    markers: {
        accented: '*',
        bold: '_',
        colored: '~',
        param: ['[', ']'],
        opaque: ['{', '}'],
    },
    timing: false,
};

let shortenMarkers = _.transform(config.markers, (a, v,k) => a[`_${k[0]}`] = v);


let dcolors = {
    basic: '#a79635',
    name: '#e56a17',

    alert: '#ff2020',
    render: '#1f993f',
    mount: '#cc0096',
    info: '#0070c9',
    data: '#a79635',
    trace: '#1f993f',

    white: '#ffffff',
    bold: '#cc0096',
    boldBg: '#fff3d9',
    colored: '#0f5d9a',
    coloredBg: '#ecffe5',




    attn: '#cc0096',
    attnBg: '#ffbfee',
    _data: '#00b3b0',

    grey: '#cccccc',
    bright: '#ffd580',

    menu: '#00b3b0',
    player: '#0070c9',
    keypoint1: '#008000',
    keypoint2: '#c00000',
    handler: '#8600b3',
    framework: '#e50039',
    maybe: '#ff2020',

    ajaxInit: ['#444', '#8600b3', '#ffdf80'],
    ajaxResponse: ['#444', '#8600b3', '#DAFFCC'],
    ajaxError: ['#c00000', '#8600b3', '#ff9999'],

    // ajaxBg1: '#ffdf80',
    // ajaxBg2: '#DAFFCC',
    // ajaxBg3: '#ff9999',
    // ajaxColor1: '#444',
    // ajaxColor2: '#000'
};

const arrowSymbol = ' ~⇢~ ';
const compactKeysCount = 6;

function logLevel(newLevel = '') {

    if(newLevel) {
        if(_.includes(['short', 1], newLevel)) config.level = 1;
        else if(_.includes(['default', 'normal', 2], newLevel)) config.level = 2;
        else if(_.includes(['verbose', 'full', 3], newLevel)) config.level = 3;
        else if(_.includes(['none', 0], newLevel)) config.level = 0;
    }

    return config.level;
}

function canIlog(message, isData = false) {
    let permission = /level defaults|ready\(\)/ig.test(message) && config.level == 1 ? false : true;
    permission = isData ? (config.level < 3 ? false : true) : permission;
    return config.level == 0 ? false : permission;
}

function maybeForce(message) {
    return _.endsWith(message, '!') || _.endsWith(message, '?');
}

/* eslint-disable no-console */
function logMaybeNode(node) {
    if(_.isFunction(node)) return;
    const cloned = cloneValue(node);
    node instanceof Node ? console.dirxml(node) : (node instanceof Error ? console.log(node) : console.dir(cloned));
}

function logWithColors(messages, messageColors,  ...data) {

    let [message1, message2 = '', message3 = ''] = messages;
    let [color1, color2 = '', background = null] = messageColors;
    let func = config.colors.info ? console.info : console.log;
    let groupFunc = false;

    // if starts with '>' - then make it as collapsed group
    if(message1.startsWith('>')) {
        message1 = message1.replace(/^>/, '');
        func = console.groupCollapsed;
        groupFunc = true;
    }

    if(message1.startsWith('?')) color1 = dcolors.maybe;
    if(message1.startsWith('!')) color1 = /application|framework/ig.test(message1) ? dcolors.framework : dcolors.attn;

    // special colors for selected messages
    if(message1.startsWith('#')) {
        background = dcolors.framework;
        color2 = dcolors.bright;
        color1 = dcolors.white;
    }

    // if var color is the same as the message color
    if(config.colors.same) color2 = color1;

    let colors1 = background ?
        `font-weight: normal; padding: 3px 0 3px 3px; background: ${background}; color: ${color1}`
        : `font-weight: normal; color: ${color1}`;
    let colors2 = background ?
        `font-weight: bold; padding: 3px 0 3px 3px; background: ${background}; color: ${color2}`
        : `font-weight: bold; color: ${color2}`;
    let colors3 = background ?
        `font-weight: normal; padding: 3px 10px 3px 0; background: ${background}; color: ${color1}`
        : `font-weight: normal; color: ${color1}`;

    message1 = background ? message1.trim() : message1;
    message2 = background ? message2.trim() : message2;
    message3 = background ? message3.trim() : message3;

    // if starts with '!' - then make it BOLD and change console function
    if(message1.startsWith('!')) {
        message1 = message1.replace(/^!/, '');
        colors1 = colors1.replace('normal', 'bold');
        colors3 = colors3.replace('normal', 'bold');
        func = groupFunc ? console.groupCollapsed : console.info;
    }
    // if starts with '?' - then make it BOLD
    if(message1.startsWith('?')) {
        message1 = message1.replace(/^\?/, '');
        colors1 = colors1.replace('normal', 'bold');
        colors3 = colors3.replace('normal', 'bold');
    }
    // if starts with '#' - then make it BOLD
    if(message1.startsWith('#')) {
        message1 = message1.replace(/^#/, ' ★★★ ').replace(/[.]+$/, '');
        colors1 = colors1.replace('normal', 'bold');
        colors3 = colors3.replace('normal', 'bold');
        if(!message2) message1 += ' ★★★ ';
        else if(message3) message3 += ' ★★★ ';
    }

    const [firstData, ...rest] = data;
    if(config.mods.forseNil || firstData !== undefined) {
        if(config.mods.consoleDir) {
            if(message2 && color2) func(
                '%c%s%c%s%c%s%c',
                colors1,
                message1,
                colors2,
                message2,
                colors1,
                message3,
                background ? colors3 : ''
            );
            else func('%c%s ', colors1, message1);
            console.dir(firstData, ...rest);
        } else {
            if(message2 && color2) func(
                '%c%s%c%s%c%s%c',
                colors1,
                message1,
                colors2, message2,
                colors1,
                message3,
                background ? colors3 : '',
                firstData,
                ...rest
            );
            else func('%c%s ', colors1, message1, firstData, ...rest);
        }
    } else {
        if(message2 && color2) func(
            '%c%s%c%s%c%s%c',
            colors1,
            message1,
            colors2,
            message2,
            colors1,
            message3,
            background ? colors3 : ''
        );
        else func('%c%s ', colors1, message1);
    }

    // reset all modifiers
    config.colors = _.mapValues(config.colors, () => false);
    config.mods = _.mapValues(config.mods, () => false);
}

function logWithColors2(message, ...data) {
    const func = config.colors.info ? console.info : console.log;
    const colors = getColors(colorBy(message));

    let { format, items } = parseWithColors(message, colors);
    if(!_.isEmpty(data)) format = format + '  ';
    _.forEach(data, item => {
        if(_.isString(item)) {
            const { format: newFormat, items: newItems } = parseWithColors(item, colors);
            format = format + newFormat;
            items.push(...newItems);
        } else {
            format = format + '%o';
            items.push(item);
        }
    });
    func(format, ...items);
    config.colors = _.mapValues(config.colors, () => false);
}

function log(message, ...data) {

    if(!canIlog(message)) return;

    let loglevel = logLevel();

    if(loglevel == 0) return;

    if(message) {
        message = message.trim();

        let colors = [ colorBy(message),  dcolors.name, null ];
        let param_regex = /\[\s*([^\]]+)]/i;
        // let color2 = /loading =|ver /ig.test(message) ? dcolors.navigate : dcolors.name;

        if(param_regex.test(message)) {
            let matches = param_regex.exec(message);

            if(/ajax\s*\w*\s*request/ig.test(message)) colors = dcolors.ajaxInit;
            else if(/ajax\s*\w*\s*response/ig.test(message)) colors = dcolors.ajaxResponse;
            else if(/ajax\s*\w*\s*error/ig.test(message)) colors = dcolors.ajaxError;

            const messages = [message.replace(matches[0], '[ '), matches[1], ' ]'];
            logWithColors(messages, colors, ...data);
        } else {
            logWithColors([message], colors, ...data);
        }
    }
}

function logVerbose(message, data, more) {
    if(logLevel() === 3) log(message, data, more);
}

function logGroup(obj, groupName = '', withoutNil = false, verboseOnly = false) {
    if(verboseOnly && logLevel() < 2) {
        console.groupEnd();
        return;
    }

    let closeMore = false;
    if(groupName && _.isPlainObject(obj)) {
        console.groupCollapsed(
            '%c%s',
            `font-weight: bold; color: ${dcolors.name}; padding: 3px;`,
            groupName.trim()
        );
        closeMore = true;
    }

    for(let key in obj) {
        if(withoutNil && _.isNil(obj[key])) continue; // › »
        let keyName = groupName && _.isArray(obj) ? `${groupName}[${key}]` : key;
        if(_.isFunction(obj[key])) {
            console.dir(obj);
            break;
        } else console.log(
            '%c%s%c ⇢ %o',
            `font-weight: bold; color: ${dcolors.name}`,
            keyName,
            `font-weight: normal; color: ${dcolors.navigate}`,
            obj[key]
        );
    }
    console.groupEnd();
    if(closeMore) console.groupEnd();
    // reset all modifiers
    config.colors = _.mapValues(config.colors, () => false);
    config.mods = _.mapValues(config.mods, () => false);
}

function logExpanded(...data) {
    console.dir(...data);
}

function logColapsed(...data) {
    console.log(...data);
}

function logSmart(value, len) {
    const length = len ?? _.keys(value).length;
    if(length < compactKeysCount) logColapsed(value);
    else logExpanded(value);
}

function warn(message, data, more) {
    if(logLevel() == 0) return;
    if(!canIlog(message)) return;
    if(message) {
        console.warn(message.replace(/^[!|?]/, ''));
        if(data && maybeForce(message) && logLevel() == 1) logMaybeNode(data);
    }
    if(!_.isUndefined(data) && canIlog(message, true)) logMaybeNode(data);
    if(!_.isUndefined(more) && canIlog(message, true)) logMaybeNode(more);
    if(canIlog(message, true)) {
        console.trace();
    }
}

function error(message, data) {
    // ignore errors when requested
    if(config.mods.ignoreNext) return;

    if(_.isUndefined(data)) console.error(message);
    else {
        console.error(message);
        console.info('Error data:', data);
    }
}

// log ajax request and its options
function logRequestResponse(type, route, options, response, method = 'GET') {
    const messages = {
        request: ` «« Initiating Ajax ${method} request with route [${route}]`,
        error: ` »» Ajax ${method} error received from [${route}]`,
        response: ` »» Ajax ${method} response received from [${route}]`,
    };
    let message = _.get(messages, type) || `? Ajax ${type}`;
    let logData = response ? response : options;
    if(response) {
        logData = _.merge(logData, { timestamp: (new Date().toString()) });
        if(_.isEmpty(response)) {
            message += ` : response is empty `;
        }
    }
    // Log request URL and its data (options or response) if presented
    if(_.isEmpty(logData)) {
        log(message);
    } else {
        log(`>${message}`);
        logGroup(logData);
    }
    // start/stop timing if was set in defaults
    if(config.timing) {
        if(response) console.timeEnd(route);
        else console.time(route);
    }
}

function logAsOneString(chunks, ...data) {
    const message = _.isArray(chunks) ? _.join(chunks, ' ') : String(chunks);
    logWithColors2(message.replace(/\s+/g, ' ').replace(/\s*\]/g, ']').replace(/\[\s*/g, '['), ...data);
}

/* eslint-enable no-console */

// Debugging in components ----------------------------------------------------]

function renderComponent(maybeClientId) {
    const { _b, _o } = shortenMarkers;
    const [clientId, clientId2] = _.castArray(maybeClientId);
    const component = componentName(clientId2 ? 'renderComponentWithId,renderComponent' : 'renderComponent');
    const id = (clientId ?? clientId2)  ? ` with ${_b}${shortenId(clientId ?? clientId2)}${_b}` : '';
    config.colors.render = true;
    setOpaqueColors('green');
    logAsOneString(`${_b}${component}${_b}${id} ${_o[0]}render${_o[1]}`);
}

function renderComponentWithId(clientId) {
    renderComponent(clientId);
}

function dataInComponent(data, marker = false) {
    const { _a, _b, _c } = shortenMarkers;
    const component = componentName('dataInComponent');
    const keys = _.keys(data);
    const isSingleKey = keys.length === 1;
    let key = isSingleKey ? _.first(keys) : _.join(keys, `${_a}, ${_a}`);
    let value = isSingleKey ? data[key] : data;
    const altName = marker ? `:${_c}${String(marker)}${_c}` : '';
    const message = `${_b}${component}${_b}${altName} ${arrowSymbol} value for ${_a}${key}${_a}`;
    config.colors.data = true;
    if(isSimpleType(value)) {
        logAsOneString(message, value);
    } else {
        logAsOneString(message);
        logSimplified(value);
    }
}

function infoInComponent(messageData, ...data) {
    const { _b } = shortenMarkers;
    const [message, clientId] = _.castArray(messageData);
    const id = clientId ? ` with ${_b}${shortenId(clientId)}${_b}` : '';
    const component = componentName(clientId ? 'infoInComponentWithId,infoInComponent' : 'infoInComponent');
    const info = `${_b}${component}${_b}${id} ${arrowSymbol} ${message}`;
    config.colors.info = true;
    if(data.length === 0 || (data.length === 1 && isCompactType(data[0]))) {
        logAsOneString(info, ...data);
    } else {
        logAsOneString(info);
        logExpanded(...data);
    }
}

function infoInComponentWithId(clientId, message, ...data) {
    infoInComponent([message, clientId], ...data);
}

// trace changes in Component props and state
function useTraceUpdate(props, state = {}, trackClientId = false) {
    const { _b } = shortenMarkers;
    const ref = useRef({
        key: componentName(trackClientId ? 'useTraceUpdate,useTraceUpdateWithId' : 'useTraceUpdate'),
        id: trackClientId ? ` with ${_b}${shortenId(props)}${_b}` : '',
    });

    const prevProps = usePrevious(props);
    const prevState = usePrevious(state);

    useEffect(() => {
        const { _p } = shortenMarkers;
        const { id, key } = ref.current ?? {};
        const changedPropKeys = changedKeys(props, prevProps);
        const changedStateKeys = changedKeys(state, prevState);

        const hasProps = !!changedPropKeys.length;
        const hasState = !!changedStateKeys.length;

        if(hasProps && !hasState) logAsOneString(`Traced changes${id} ${_p[0]}${key} : props${_p[1]}`);
        if(!hasProps && hasState) logAsOneString(`Traced changes${id} ${_p[0]}${key} : state${_p[1]}`);
        if(hasProps && hasState) logAsOneString(`Traced changes${id} ${_p[0]}${key} : props & state${_p[1]}`);

        if(hasProps) logChanges(changedPropKeys, props, prevProps);
        if(hasState) logChanges(changedStateKeys, state, prevState);
    }, [props, prevProps, state, prevState]);
}

// to trace several instances of one component on the page
function useTraceUpdateWithId(props, state = {}) {
    useTraceUpdate(props, state, true);
}

// to log 'aka' Mounting and Unmounting events
function useMountUnmount() {
    const ref = useRef({
        component: componentName('useMountUnmount'),
    });
    useEffect(() => {
        const { _b, _c, _o } = shortenMarkers;
        const { component } = ref.current ?? {};
        config.colors.mount = true;
        logAsOneString(`${_b}${component}${_b} ${arrowSymbol} ${_c}componentDidMount${_c}`);
        return () => {
            config.colors.mount = true;
            logAsOneString(`${_b}${component}${_b} ${arrowSymbol} ${_o[0]}componentWillUnmount${_o[1]}`);
        }
    }, []);
}

// Helpers for colored console & components debuging --------------------------]

function colorBy(message) {
    let color = dcolors.basic;
    // first test with var names
    if(config.colors.info) return dcolors.info;
    if(config.colors.data) return dcolors.data;
    if(config.colors.trace) return dcolors.trace;
    if(config.colors.render) return dcolors.render;
    if(config.colors.alert) return dcolors.alert;
    if(config.colors.mount) return dcolors.mount;
    // remove any var names which may lead to false-positive test
    message = message.replace(/\[[^\]]+\]/,'').replace(/"[^"]+"/g, '');
    if(/token|logout|user/ig.test(message)) return /unsuccessful|error/ig.test(message) ? dcolors.keypoint2 : dcolors.keypoint1;
    if(/unsuccessfully|preloading/ig.test(message)) return dcolors.basic;
    if(/loading|launching|ajax/ig.test(message)) return dcolors.framework;
    return color;
}

function getColors(mainColor = dcolors.basic) {
    const weightNormal = 'font-weight: normal;';
    const weightBold = 'font-weight: bold;';
    const padding = 'padding: 0 2px 0 2px;';
    const paddingBg = 'padding: 1px 3px 1px 3px;';
    const rounded = 'border-radius: 3px;';
    const opaque = config.colors.opaque || { color: dcolors.white, bg: dcolors.alert };
    return {
        normal: `${weightNormal} color: ${mainColor}`,
        accent: `${weightBold} ${paddingBg} ${rounded} color: ${dcolors.bold}; background: ${dcolors.boldBg}`,
        bold: `${weightBold} color: ${mainColor}`,
        params: `${weightBold} ${padding} color: ${dcolors.name}`,
        colored: `${weightBold} ${paddingBg} ${rounded} color: ${dcolors.colored}; background: ${dcolors.coloredBg}`,
        opaque: `${weightBold} ${paddingBg} ${rounded} color: ${opaque.color}; background: ${opaque.bg}`,
    };
}

function setOpaqueColors(color) {
    if(color === 'green') config.colors.opaque = { color: dcolors.white, bg: dcolors.render };
    if(color === 'red') config.colors.opaque = { color: dcolors.white, bg: dcolors.alert };
    if(color === 'violet') config.colors.opaque = { color: dcolors.white, bg: dcolors.mount };
    if(color === 'orange') config.colors.opaque = { color: dcolors.white, bg: dcolors.name };
    if(color === 'blue') config.colors.opaque = { color: dcolors.white, bg: dcolors.info };
}

// старая реализация через regex, сохранил тут для идей
// const fixed = { '<':'#1','>':'#2','(':'#3',')':'#4','{':'#5','}':'#6' };
// const inverted = _.invert(fixed);
// const restore = s => s.replace(/(#1|#2|#3|#4|#5|#6)/g, m => inverted[m]);
// replace the characters that will be used for formatting (then we will restore them)
// let string = message.replace(/[<>(){}]/g, m => fixed[m]);
// string = string.replace( /\*([^*]+?)\*/g, '<$1>').replace( /_([^_]+?)_/g, '($1)').replace( /~([^~]+?)~/g, '{$1}');

function parseWithColors(message, colors) {
    const { normal, bold, params, accent, colored, opaque } = colors ?? getColors();
    const { _a, _b, _c, _p, _o } = shortenMarkers;
    let isComplete = true;
    let format = '%c';
    let items = [normal];
    let token = '';
    // *text* as 'accented'
    // _text_ as 'bold'
    // ~text~ as 'colored'
    // [text] as 'param'
    // {text} as 'opaque'
    _.forEach(message, char => {
        if(char === _a) {
            if(isComplete) {
                format += '%s%c';
                items.push(token);
                items.push(accent);
                token = '';
                isComplete = false;
            } else {
                format += '%s%c';
                items.push(token);
                items.push(normal);
                token = '';
                isComplete = true;
            }
        } else if(char === _c) {
            if(isComplete) {
                format += '%s%c';
                items.push(token);
                items.push(colored);
                token = '';
                isComplete = false;
            } else {
                format += '%s%c';
                items.push(token);
                items.push(normal);
                token = '';
                isComplete = true;
            }
        } else if(char === _b) {
            if(isComplete) {
                format += '%s%c';
                items.push(token);
                items.push(bold);
                token = '';
                isComplete = false;
            } else {
                format += '%s%c';
                items.push(token);
                items.push(normal);
                token = '';
                isComplete = true;
            }
        } else if(char === _p[0]) {
            format += '%s%c';
            items.push(`${token}${_p[0]}`);
            items.push(params);
            token = '';
        } else if(char === _p[1]) {
            format += '%s%c';
            items.push(token);
            items.push(normal);
            token = _p[1];
        } else if(char === _o[0]) {
            format += '%s%c';
            items.push(token);
            items.push(opaque);
            token = '';
        } else if(char === _o[1]) {
            format += '%s%c';
            items.push(token);
            items.push(normal);
            token = '';
        } else {
            token += char;
        }
    });
    format += '%s';
    items.push(token);
    return { format, items };
}

function isSimpleType(val) {
    return _.isNil(val) || _.isBoolean(val) || _.isString(val) || _.isNumber(val);
}

function isCompactType(val) {
    return isSimpleType(val) || (_.isObject(val) && _.keys(val).length < compactKeysCount);
}

function changedKeys(next, prev) {
    const keys = [];
    _.forEach(next, (val, key) => {
        if(prev && prev[key] !== val) {
            keys.push(key);
        }
    });
    return keys;
}

function shortenId(props, forStorage = false) {
    const shortened = (props && props.clientId) ? props.clientId.slice(-4) : 0;
    return forStorage ? shortened : (shortened === 0 ? '?' : `✷✷✷-${shortened}`);
}

function cloneValue(value) {
    // do nothing for null & undefined
    if(_.isNil(value)) return value;
    // first try with lodash 'cloneDeepWith'
    const nodeCloner = value => _.isElement(value) ? value.cloneNode(true) : undefined;
    let cloned = _.cloneDeepWith(value, nodeCloner);
    if(!_.isEmpty(cloned)) return cloned;
    // try with JSON if 'cloneDeepWith' failed
    const seen = new WeakSet();
    const circularReplacer = (_key, value) => {
        if(typeof value === 'object' && value !== null) {
            if(seen.has(value)) return;
            seen.add(value);
        }
        return _.isUndefined(value) ? '__undefined' : value;
    };
    return JSON.parse(JSON.stringify(value, circularReplacer));
}

function logSimplified(val) {
    if(config.simplify) {
        const { _a, _p } = shortenMarkers;
        const keys = _.keys(val);
        const firstKey = _.first(keys);
        const value = keys.length === 1 ? val[firstKey] : val;

        if(keys.length === 1) {
            const kind = _.isArray(val) ? `at ${_a}index${_a}` : `for ${_a}key${_a}`;
            const message = [`value ${kind} ${_p[0]}${firstKey}${_p[1]}`];
            if(isSimpleType(value)) {
                logAsOneString(message, value);
            } else {
                logAsOneString(message);
                logSimplified(value);
            }
        } else {
            logSmart(val, keys.length);
        }
    } else {
        logSmart(val);
    }
}

function logWasNow(was, now, keys) {
    const { _b, _c, _p, _o } = shortenMarkers;
    const firstKey = _.first(keys);
    const wasValue = keys.length === 1 ? was[firstKey] : was;
    const nowValue = keys.length === 1 ? now[firstKey] : now;
    const changed = keys.length === 1 ? changedKeys(wasValue, nowValue) : false;

    if(changed && changed.length === 1) {
        const firstСhanged = _.first(changed);
        const message = [`changed for ${_b}key${_b} ${_p[0]}${firstСhanged}${_p[1]}`];
        if(isSimpleType(nowValue[firstСhanged])) {
            logAsOneString(message, wasValue[firstСhanged], arrowSymbol, nowValue[firstСhanged]);
        } else {
            logAsOneString(message);
            logWasNow(wasValue, nowValue, changed);
        }
    } else {
        logAsOneString(`${_c}was${_c}`);
        logSmart(wasValue);
        logAsOneString([changed ?
            `${_c}now${_c} changed for ${_b}keys${_b} ${_p[0]}${_.join(changed, ', ')}${_p[1]}` :
            `${_c}now${_c}`]
        );
        logSmart(wasValue);
        if(_.isEqual(wasValue, nowValue)) {
            logAsOneString([`${_o[0]}Attention!${_o[1]} ${_b}they are equal!${_b}`]);
        }
    }
}

function logChanges(keys, values, prevValues) {
    const { _a, _b, _p } = shortenMarkers;
    _.forEach(keys, key => {
        const value = values[key];
        config.colors.trace = true;
        const message = ` » ${_a}${ key }${_a}`;
        if(isSimpleType(value)) logAsOneString([message], prevValues[key], arrowSymbol, value);
        else {
            if(_.isFunction(value)) {
                logAsOneString([message, `${_p[0]}[function]${_p[1]}`]);
            } else {
                const changed = changedKeys(value, prevValues[key]);
                const firstKey = _.first(changed);
                const keyMsg = `${message} @1@ ${_b}@2@${_b} ${_p[0]}${_.join(changed, ', ')}${_p[1]}`;
                if(_.isArray(value)) {
                    const arrayMsg = keyMsg.replace('@2@', changed.length === 1 ? 'index' : 'indexes').replace('@1@', 'at');
                    if(changed.length === 1 && isSimpleType(value[firstKey])) {
                        logAsOneString(arrayMsg, prevValues[key][firstKey], arrowSymbol, value[firstKey]);
                    } else {
                        logAsOneString(arrayMsg);
                        logWasNow(prevValues[key], value, changed);
                    }
                } else {
                    if(_.has(value, '$$typeof')) {
                        logAsOneString([message, `${_p[0]}React Component${_p[1]}`]);
                    } else {
                        const objMsg = keyMsg.replace('@2@', changed.length === 1 ? 'key' : 'keys').replace('@1@', 'for');
                        if(changed.length === 1 && isSimpleType(value[firstKey])) {
                            logAsOneString(objMsg, prevValues[key][firstKey], arrowSymbol, value[firstKey]);
                        } else {
                            logAsOneString(objMsg);
                            logWasNow(_.pick(prevValues[key], changed), _.pick(value, changed), changed);
                        }
                    }
                }
            }
        }
    });
}

// Get function & component names from stack ----------------------------------]

function skipFrames(name, prev) {
    const frames = _.isArray(name) ? name.length : _.split(name, ',').length;
    const prevFrames = _.isNumber(prev) ? prev : (_.isArray(prev) ? prev.length : _.split(prev, ',').length);
    return prevFrames + frames;
}

function componentName(prevFrames = 0, componentAlt = null) {
    const [name, altName] = findOnStack(skipFrames('componentName', prevFrames));
    // component name should start with UpperCase
    if(name[0] === name[0].toUpperCase()) return name;
    // maybe we have something similar to component name?
    if(_.isString(altName) && altName[0] === altName[0].toUpperCase() && altName.length > 2) componentAlt = altName;
    return componentAlt ? `${componentAlt}.${name}()` : `${name}()`;
}

function findOnStack(prevFrames) {
    const removeFrames = skipFrames('findOnStack', prevFrames);
    const stack = _.slice(_.split((new Error()).stack, '\n'), removeFrames, removeFrames + 2);
    return [funcFromStack(stack, 0), funcFromStack(stack, 1)];
}

function funcFromStack(frames, index = 0) {
    return (_.get(_.split(frames[index], '@'), 0, '?') || '?').replace(/(\/<)/g, '');
}

export default {
    get ver() { return config.version; },

    get level() { return logLevel(); },
    set level(val) { logLevel(val); },

    set ignoreNext(val) { config.mods.ignoreNext = val; },

    log,
    logVerbose,
    logGroup,
    warn,
    error,

    render: renderComponent,
    data: dataInComponent,
    info: infoInComponent,
    useTrace: useTraceUpdate,
    useMU: useMountUnmount,

    useTraceWithId: useTraceUpdateWithId,
    renderWithId: renderComponentWithId,
    infoWithId: infoInComponentWithId,
    // cdata(data, className) { dataInComponent(data, false, className, 'cdata'); },    // for data inside class components

    request(route, options, method) { logRequestResponse('request', route, options, null, method); },
    response(route, data, method) { logRequestResponse('response', route, null, data, method); },
    requestError(route, error, method) { logRequestResponse('error', route, null, error, method); },
};
