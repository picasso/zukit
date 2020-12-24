import { blocksSet as fetch } from './fetch.js';
import { blocksSet as utils }  from './utils.js';
import * as jq from './jquery-helpers.js';
import * as components from './components/blocks-index.js';
import * as data from './data/use-store.js';

wp.zukit = {
    fetch,
    utils,
    jq,
    components,
    data,
};
