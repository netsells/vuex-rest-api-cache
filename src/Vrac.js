import axios from 'axios';

import {
    parseSingle as parseSingleDefault,
    parseMultiple as parseMultipleDefault,
    parseBinary as parseBinaryDefault,

    cacheMultiple as cacheMultipleDefault,
    cacheSingle as cacheSingleDefault,
    cacheDestroy as cacheDestroyDefault,
    cacheBinary as cacheBinaryDefault,

    BaseModel,
} from '~/index';

/**
 * Vuex Rest API Cacher class
 *
 * Generates Vuex stores based on the supplied config. The stores have actions
 * for fetching API data, mutators for caching them and getters for accessing
 * the cache.
 */
class Vrac {
    /**
     * Allows you to change the request function to something else (e.g. to add
     * authorization headers) or to use a different HTTP library entirely. The
     * function context (`this`) is set to the same of the Vuex action.
     *
     * @param {Object} requestParams - Request params for `axios.request`
     * @param {Object} context - Context of the Vuex action
     * @returns {Promise<Object>} - The result of the request
     */
    static requestAdapter(requestParams) {
        return axios.request(requestParams);
    }

    /**
     * Sugar for creating lots of modules
     *
     * @param {Object} modules - Object of module configs
     * @returns {Object} - Namespaced Vuex modules
     */
    static createModules(modules) {
        const generated = {};

        Object.keys(modules).forEach(name => {
            generated[name] = new Vrac(modules[name]).store;
        });

        return generated;
    }

    /**
     * Instantiate the class
     *
     * @param {Object} options
     * @param {String} options.baseUrl - URL of the endpoint, without the models ID
     * @param {Array<String>|String} options.only - Which actions to create for this model
     * @param {Array<String>|String} options.except - Which actions not to create for this model
     * @param {String} options.identifier - The identifier field, e.g. `id`
     * @param {Object} options.children - Children for this module
     * @param {Boolean} options.singleton - Whether this is a singleton endpoint or not - i.e. only `read` and `update` calls
     * @param {Class} options.Model - Model class to use for the returned items
     * @param {Object} options.customCalls - Custom and extra API calls to add to this model
     *
     * @param {Function} options.parseSingle - Function to parse a single item returned from the API
     * @param {Function} options.parseMultiple - Function to parse a multiple items returned from the API
     * @param {Function} options.parseBinary - Function to parse a binary item returned from the API
     *
     * @param {Function} options.cacheSingle - Function to cache a single item returned from the API
     * @param {Function} options.cacheMultiple - Function to cache multiple items returned from the API
     * @param {Function} options.cacheDestroy - Function to remove an item from the cache after a `destroy` call
     * @param {Function} options.cacheBinary - Function to cache cache a binary item returned from the API
     */
    constructor({
        baseUrl = '/',
        singleton = false,
        only = singleton
            ? ['read', 'update']
            : ['index', 'create', 'read', 'update', 'destroy'],
        except = [],
        identifier = 'id',
        children = {},
        Model = BaseModel,
        customCalls = {},

        parseSingle = parseSingleDefault,
        parseMultiple = parseMultipleDefault,
        parseBinary = parseBinaryDefault,

        cacheMultiple = cacheMultipleDefault,
        cacheSingle = cacheSingleDefault,
        cacheDestroy = cacheDestroyDefault,
        cacheBinary = cacheBinaryDefault,
    } = {}) {
        this.baseUrl = baseUrl;
        this.identifier = identifier;
        this.calls = [];
        this.children = {};
        this.Model = Model;

        this.parseSingle = parseSingle;
        this.parseMultiple = parseMultiple;
        this.parseBinary = parseBinary;

        this.cacheMultiple = cacheMultiple;
        this.cacheSingle = cacheSingle;
        this.cacheDestroy = cacheDestroy;
        this.cacheBinary = cacheBinary;

        Object.keys(children).forEach(c => this.child(c, children[c]));

        const onlyCalls = Array.isArray(only) ? only : [only];
        const includeCalls = onlyCalls.filter(n => !except.includes(n));

        if (includeCalls.includes('index')) {
            this.createCall('index');
        }

        if (includeCalls.includes('create')) {
            this.createCall('create', {
                method: 'post',
                parser: parseSingle,
                cacher: cacheSingle,
                identified: false,
            });
        }

        if (includeCalls.includes('read')) {
            this.createCall('read', {
                parser: parseSingle,
                cacher: cacheSingle,
                identified: !singleton,
                readCache: !singleton,
            });
        }

        if (includeCalls.includes('update')) {
            this.createCall('update', {
                method: 'patch',
                parser: parseSingle,
                cacher: cacheSingle,
                identified: !singleton,
            });
        }

        if (includeCalls.includes('destroy')) {
            this.createCall('destroy', {
                method: 'delete',
                parser: parseSingle,
                cacher: cacheDestroy,
                identified: !singleton,
            });
        }

        Object.keys(customCalls).forEach(name => {
            this.createCall(name, customCalls[name]);
        });
    }

    /**
     * Get the URL using the baseUrl and the supplied fields
     *
     * @param {Object} fields
     * @param {String} path
     * @returns {String} endpoint
     */
    getUrl(fields = {}, path = '') {
        let url = this.baseUrl;
        const reqFields = (url.match(/:([a-z,_]+)/gi) || []).map(s => s.slice(1));

        reqFields.forEach(field => {
            if (fields[field] === undefined) {
                throw new Error(`You must pass the '${ field }' field`);
            }

            url = url.replace(`:${ field }`, fields[field]);
        });

        if (fields[this.identifier]) {
            if (url.slice(-1)[0] !== '/') {
                url += '/';
            }

            url += fields[this.identifier];
        }

        return `${ url }${ path }`;
    }

    /**
     * Add a child module to this model
     *
     * @param {String} name - Name of the child model
     * @param {Object|Vrac} child - Vrac constructor options or Vrac object
     */
    child(name, child) {
        this.children[name] =
            child instanceof Vrac
                ? child
                : new Vrac(child);
    }

    /**
     * Get the default parser
     *
     * @param {Object} options
     * @param {Boolean} options.identified - Whether this is a parser for an identified API call or not
     * @param {Boolean} options.binary - Whether this is a parser for a binary API call or not
     *
     * @returns {Function}
     */
    getParser({ identified, binary }) {
        if (binary) {
            return this.parseBinary;
        }

        return identified ? this.parseSingle : this.parseMultiple;
    }

    /**
     * Get the default cacher
     *
     * @param {Object} options
     * @param {Boolean} options.identified - Whether this is a cacher for an identified API call or not
     * @param {Boolean} options.binary - Whether this is a cacher for a binary API call or not
     *
     * @returns {Function}
     */
    getCacher({ identified, binary }) {
        if (binary) {
            return this.cacheBinary;
        }

        return identified ? this.cacheSingle : this.cacheMultiple;
    }

    /**
     * Create an action for an endpoint
     *
     * @param {String} name - Name of the action
     * @param {Object} options
     * @param {String} options.method - HTTP method for the call
     * @param {Function} options.parser - Function used to parse the data from the API response
     * @param {Function} options.cacher - Function used to cache the model from the response
     * @param {Boolean} options.identified - Whether this endpoint needs an identifier field or not, e.g. `id`
     * @param {Boolean} options.readCache - Whether this action should return from the cache if the model exists there
     * @param {String} options.path - Path for this callback, appended to baseUrl
     * @param {Boolean} options.binary - Whether this is a binary model or not
     * @param {String} options.responseType - Override responseType, by default this is `undefined` for normal models, and `arraybuffer` for binary models
     */
    createCall(name, {
        method = 'get',
        identified = false,
        readCache = false,
        path = '',
        binary = false,
        responseType = binary ? 'arraybuffer' : undefined,
        parser = this.getParser({ identified, binary }),
        cacher = this.getCacher({ identified, binary }),
    } = {}) {
        this.calls.push({
            name,
            method,
            parser,
            cacher,
            identified,
            readCache,
            path,
            responseType,
            binary,
        });
    }

    /**
     * Instantiate a model class using the helpers if they exist
     *
     * @param {Object} fieldsOrData
     * @param {Object} options
     * @param {Boolean} options.binary - Whether this is a binary model or not
     *
     * @returns {Object} model
     */
    createModel(fieldsOrData, { binary }) {
        if (binary) {
            return fieldsOrData;
        }

        return new this.Model(fieldsOrData);
    }

    /**
     * Get child modules for this store
     *
     * @returns {Object} modules
     */
    get modules() {
        const modules = {};

        Object.keys(this.children).forEach(name => {
            modules[name] = this.children[name].store;
        });

        return modules;
    }

    /**
     * Get the default state for this module
     *
     * @returns {Object} state
     */
    get state() {
        return {
            index: [],
            actionsLoading: {},
        };
    }

    /**
     * Get the mutators for this module
     *
     * @returns {Object} mutators
     */
    get mutations() {
        return {
            createOrUpdate: (state, model) => {
                state.index = [
                    ...state.index.filter(m => m[this.identifier] !== model[this.identifier]),
                    model,
                ];
            },

            destroy: (state, model) => {
                state.index = state.index.filter(
                    m => m[this.identifier] !== model[this.identifier]
                );
            },

            loading: (state, action) => {
                state.actionsLoading = Object.assign(
                    {},
                    state.actionsLoading,
                    { [action]: (state.actionsLoading[action] || 0) + 1 }
                );
            },

            loaded: (state, action) => {
                state.actionsLoading = Object.assign(
                    {},
                    state.actionsLoading,
                    { [action]: state.actionsLoading[action] - 1 }
                );
            },
        };
    }

    /**
     * Get the getters for this module
     *
     * @returns {Object} getters
     */
    get getters() {
        return {
            index: ({ index }) => index,

            read: (state, getters) => identifier => getters.index.find(
                m => m[this.identifier] === identifier
            ),

            loading: ({ actionsLoading }) => {
                return Object.keys(actionsLoading).some(k => actionsLoading[k]);
            },
        };
    }

    /**
     * Get the actions for this module
     *
     * @returns {Object} actions
     */
    get actions() {
        const actions = {};
        const self = this;

        this.calls.forEach(call => {
            actions[call.name] = async function(context, {
                    fields = {},
                    params = {},
                    method = call.method,
                    readCache = call.readCache,
                    path = call.path,
                    responseType = call.responseType,
                } = {}) {
                if (call.identified) {
                    if (!fields[self.identifier]) {
                        throw new Error(`The '${ call.name }' action requires a 'fields.${ self.identifier }' option`);
                    }

                    if (readCache) {
                        const model = context.getters.read(fields[self.identifier]);

                        if (model) {
                            return self.createModel(model, call);
                        }
                    }
                } else {
                    if (fields[self.identifier]) {
                        throw new Error(`The '${ call.name }' action can not be used with the 'fields.${ self.identifier }' option`);
                    }

                    if (readCache) {
                        const cachedModels = context.getters.index;

                        if (cachedModels.length) {
                            return cachedModels.map(m => self.createModel(m, call));
                        }
                    }
                }

                let data = undefined;

                if (['post', 'put', 'patch'].includes(method.toLowerCase())) {
                    data = Object.assign({}, fields);
                }

                let response;

                try {
                    context.commit('loading', call.name);

                    response = await self.constructor.requestAdapter.call(this, {
                        url: self.getUrl(fields, path),
                        method,
                        data,
                        params,
                        responseType,
                    }, context);
                } finally {
                    context.commit('loaded', call.name);
                }

                const parsed = call.parser(response.data, fields);

                call.cacher(context, parsed);

                if (Array.isArray(parsed)) {
                    return parsed.map(m => self.createModel(m, call));
                }

                return self.createModel(parsed, call);
            };
        });

        return actions;
    }

    /**
     * Get the entire store for this module, for Vuex
     *
     * @returns {Object} store
     */
    get store() {
        const { actions, getters, mutations, state, modules } = this;

        return {
            namespaced: true,
            actions,
            getters,
            mutations,
            state,
            modules,
        };
    }
}

export default Vrac;
