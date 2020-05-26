import axios from 'axios';

import {
    parseSingle as parseSingleDefault,
    parseMultiple as parseMultipleDefault,
    parseBinary as parseBinaryDefault,
} from './parsers/index';

/**
 * Vra class initilisation options.
 *
 * @typedef {object} VraOptions
 * @property {string} baseUrl - URL of the endpoint, without the models ID.
 * @property {Array<string>|string} only - Which actions to create for this model.
 * @property {Array<string>|string} except - Which actions not to create for this model.
 * @property {string} identifier - The identifier field, e.g. `id`.
 * @property {object} children - Children for this module.
 * @property {boolean} singleton - Whether this is a singleton endpoint or not - i.e. Only `read` and `update` calls.
 * @property {Function} toModel - Convert API data to a model.
 * @property {object} customCalls - Custom and extra API calls to add to this model.
 *
 * @property {Function} parseSingle - Function to parse a single item returned from the API.
 * @property {Function} parseMultiple - Function to parse a multiple items returned from the API.
 * @property {Function} parseBinary - Function to parse a binary item returned from the API.
 */

/**
 * Vuex Rest API class.
 *
 * Generates Vuex stores based on the supplied config. The stores have actions
 * for fetching and returning the API data,.
 */
class Vra {
    /**
     * Allows you to change the request function to something else (e.g. To add
     * authorization headers) or to use a different HTTP library entirely. The
     * function context (`this`) is set to the same of the Vuex action.
     *
     * @param {object} requestParams - Request params for `axios.request`.
     * @returns {Promise<object>} - The result of the request.
     */
    static requestAdapter(requestParams) {
        return axios.request(requestParams);
    }

    /**
     * Sugar for creating lots of modules.
     *
     * @param {object} modules - Object of module configs.
     * @returns {object} - Namespaced Vuex modules.
     */
    static createModules(modules) {
        const Klass = this;
        const generated = {};

        Object.keys(modules).forEach(name => {
            generated[name] = new Klass(modules[name]).store;
        });

        return generated;
    }

    /**
     * Instantiate the class.
     *
     * @param {VraOptions} options
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
        toModel = data => data,
        customCalls = {},

        parseSingle = parseSingleDefault,
        parseMultiple = parseMultipleDefault,
        parseBinary = parseBinaryDefault,
    } = {}) {
        this.baseUrl = baseUrl;
        this.identifier = identifier;
        this.calls = [];
        this.children = {};
        this.toModel = toModel;

        this.parseSingle = parseSingle;
        this.parseMultiple = parseMultiple;
        this.parseBinary = parseBinary;

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
                identified: false,
            });
        }

        if (includeCalls.includes('read')) {
            this.createCall('read', {
                parser: parseSingle,
                identified: !singleton,
            });
        }

        if (includeCalls.includes('update')) {
            this.createCall('update', {
                method: 'patch',
                parser: parseSingle,
                identified: !singleton,
            });
        }

        if (includeCalls.includes('destroy')) {
            this.createCall('destroy', {
                method: 'delete',
                parser: parseSingle,
                identified: !singleton,
            });
        }

        Object.keys(customCalls).forEach(name => {
            this.createCall(name, customCalls[name]);
        });
    }

    /**
     * Get the URL using the baseUrl and the supplied fields.
     *
     * @param {object} fields
     * @param {string} path
     * @returns {string} Endpoint.
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

        if (![null, undefined].includes(fields[this.identifier])) {
            if (url.slice(-1)[0] !== '/') {
                url += '/';
            }

            url += fields[this.identifier];
        }

        return `${ url }${ path }`;
    }

    /**
     * Add a child module to this model.
     *
     * @param {string} name - Name of the child model.
     * @param {object|Vra} child - Vra constructor options or Vra instance.
     */
    child(name, child) {
        this.children[name]
            = child instanceof this.constructor
                ? child
                : new this.constructor(child);
    }

    /**
     * Get the default parser.
     *
     * @param {object} options
     * @param {boolean} options.identified - Whether this is a parser for an identified API call or not.
     * @param {boolean} options.binary - Whether this is a parser for a binary API call or not.
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
     * Create an action for an endpoint.
     *
     * @param {string} name - Name of the action.
     * @param {object} options
     * @param {string} options.method - HTTP method for the call.
     * @param {Function} options.parser - Function used to parse the data from the API response.
     * @param {boolean} options.identified - Whether this endpoint needs an identifier field or not, e.g. `id`.
     * @param {string} options.path - Path for this callback, appended to baseUrl.
     * @param {boolean} options.binary - Whether this is a binary model or not.
     * @param {string} options.responseType - Override responseType, by default this is `undefined` for normal models, and `arraybuffer` for binary models.
     */
    createCall(name, {
        method = 'get',
        identified = false,
        path = '',
        binary = false,
        responseType = binary ? 'arraybuffer' : undefined,
        parser = this.getParser({ identified, binary }),
        ...rest
    } = {}) {
        this.calls.push({
            name,
            method,
            parser,
            identified,
            path,
            responseType,
            binary,
            ...rest,
        });
    }

    /**
     * Get a calls options.
     *
     * @param {string} name - Name of the action.
     * @returns {object|null}
     */
    getCall(name) {
        return this.calls.find(c => c.name === name);
    }

    /**
     * Modify an action for an endpoint.
     *
     * @param {string} name - Name of the action.
     * @param {object} options
     */
    modifyCall(name, options) {
        const call = this.getCall(name);

        if (!call) {
            return;
        }

        Object.assign(call, options);
    }

    /**
     * Instantiate a model class using the helpers if they exist.
     *
     * @param {object} fieldsOrData
     * @param {object} options
     * @param {boolean} options.binary - Whether this is a binary model or not.
     *
     * @returns {object} Model.
     */
    createModel(fieldsOrData, { binary }) {
        if (binary) {
            return fieldsOrData;
        }

        return this.toModel(fieldsOrData);
    }

    /**
     * Get child modules for this store.
     *
     * @returns {object} Modules.
     */
    get modules() {
        const modules = {};

        Object.keys(this.children).forEach(name => {
            modules[name] = this.children[name].store;
        });

        return modules;
    }

    /**
     * Get the actions for this module.
     *
     * @returns {object} Actions.
     */
    get actions() {
        const actions = {};
        const self = this;

        this.calls.forEach(call => {
            actions[call.name] = async function(context, {
                fields = {},
                params = {},
                method = call.method,
                path = call.path,
                responseType = call.responseType,
            } = {}) {
                if (call.identified) {
                    if ([null, undefined].includes(fields[self.identifier])) {
                        throw new Error(`The '${ call.name }' action requires a 'fields.${ self.identifier }' option`);
                    }
                } else if (fields[self.identifier]) {
                    throw new Error(`The '${ call.name }' action can not be used with the 'fields.${ self.identifier }' option`);
                }

                let data = undefined;

                if (['post', 'put', 'patch'].includes(method.toLowerCase())) {
                    data = Object.assign({}, fields);
                }

                const response = await self.constructor.requestAdapter.call(this, {
                    url: self.getUrl(fields, path),
                    method,
                    data,
                    params,
                    responseType,
                }, context);

                const parsed = call.parser(response.data, fields);

                if (parsed.models) {
                    const value = parsed.models.map(m => self.createModel(m, call));

                    value.meta = parsed.meta;

                    return value;
                }

                return self.createModel(parsed.model, call);
            };
        });

        return actions;
    }

    /**
     * Get the entire store for this module, for Vuex.
     *
     * @returns {object} Store.
     */
    get store() {
        const { actions, modules } = this;

        return {
            namespaced: true,
            actions,
            modules,
        };
    }
}

export default Vra;
