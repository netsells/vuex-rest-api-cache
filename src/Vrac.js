import axios from 'axios';

import {
    parseSingle,
    parseMultiple,
    cacheMultiple,
    cacheSingle,
    cacheDestroy,
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
     * Instantiate the class
     *
     * @param {Object} options
     * @param {String} options.baseUrl - URL of the endpoint, without the models ID
     * @param {Array<String>|String} options.only - Which actions to create for this model
     * @param {Array<String>|String} options.except - Which actions not to create for this model
     * @param {String} options.identifier - The identifier field, e.g. `id`
     * @param {Object} options.children - Children for this module
     */
    constructor({
        baseUrl = '/',
        only = ['index', 'create', 'read', 'update', 'destroy'],
        except = [],
        identifier = 'id',
        children = {},
    } = {}) {
        this.baseUrl = baseUrl;
        this.identifier = identifier;
        this.calls = [];
        this.children = {};

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
                identified: true,
                readCache: true,
            });
        }

        if (includeCalls.includes('update')) {
            this.createCall('update', {
                method: 'patch',
                parser: parseSingle,
                cacher: cacheSingle,
                identified: true,
            });
        }

        if (includeCalls.includes('destroy')) {
            this.createCall('destroy', {
                method: 'delete',
                parser: parseSingle,
                cacher: cacheDestroy,
                identified: true,
            });
        }
    }

    /**
     * Get the URL using the baseUrl and the supplied fields
     *
     * @param {Object} fields
     * @returns {String} endpoint
     */
    getUrl(fields = {}) {
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

        return url;
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
     * Create an action for an endpoint
     *
     * @param {String} name - Name of the action
     * @param {Object} options
     * @param {String} options.method - HTTP method for the call
     * @param {Function} options.parser - Function used to parse the data from the API response
     * @param {Function} options.cacher - Function used to cache the model from the response
     * @param {Boolean} options.identified - Whether this endpoint needs an identifier field or not, e.g. `id`
     * @param {Boolean} options.readCache - Whether this action should return from the cache if the model exists there
     */
    createCall(name, {
        method = '',
        parser = parseMultiple,
        cacher = cacheMultiple,
        identified = false,
        readCache = false,
    } = {}) {
        this.calls.push({
            name,
            method,
            parser,
            cacher,
            identified,
            readCache,
        });
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
            } = {}) {
                if (call.identified) {
                    if (!fields[self.identifier]) {
                        throw new Error(`The '${ call.name }' action requires a 'fields.${ self.identifier }' option`);
                    }

                    if (call.readCache) {
                        const model = context.getters.read(fields[self.identifier]);

                        if (model) {return model;}
                    }
                } else {
                    if (fields[self.identifier]) {
                        throw new Error(`The '${ call.name }' action can not be used with the 'fields.${ self.identifier }' option`);
                    }

                    if (call.readCache) {
                        return context.getters.index;
                    }
                }

                let data = undefined;

                if (['post', 'put', 'patch'].includes(method.toLowerCase())) {
                    data = Object.assign({}, fields);
                }

                context.commit('loading', call.name);

                let response;

                try {
                    response = await self.constructor.requestAdapter.call(this, {
                        url: self.getUrl(fields),
                        method,
                        data,
                        params,
                    }, context);
                } finally {
                    context.commit('loaded', call.name);
                }

                const parsed = call.parser(response.data, fields);

                call.cacher(context, parsed);

                return parsed;
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
