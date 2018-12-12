import axios from 'axios';

import {
    parseNone,
    parseSingle,
    parseMultiple,
    cacheMultiple,
    cacheSingle,
    cacheNone,
    cacheDestroy,
} from '~/index';

class Vrac {
    constructor({
        baseUrl = '/',
        only = ['index', 'create', 'read', 'update', 'destroy'],
        except = [],
        identifier = 'id',
    } = {}) {
        this.baseUrl = baseUrl;
        this.identifier = identifier;
        this.calls = [];

        const onlyCalls = Array.isArray(only) ? only : [only];
        const includeCalls = onlyCalls.filter(n => !except.includes(n));

        if (includeCalls.includes('index')) {
            this.createCall('index', {
                parser: parseMultiple,
                cacher: cacheMultiple,
                identified: false,
            });
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
                parser: parseNone,
                cacher: cacheDestroy,
                identified: true,
            });
        }
    }

    getUrl(fields = {}) {
        let url = this.baseUrl;
        const reqFields = (url.match(/\:([a-z,_]+)/gi) || []).map(s => s.slice(1));

        reqFields.forEach(field => {
            if (fields[field] === undefined) {
                throw new Error(`You must pass the '${field}' field`);
            }

            url = url.replace(`:${field}`, fields[field]);
        })

        if (fields[this.identifier]) {
            if (url.slice(-1)[0] !== '/') {
                url += '/';
            }

            url += fields[this.identifier];
        }

        return url;
    }

    createCall(name, {
        method = 'get',
        parser = parseSingle,
        cacher = cacheSingle,
        identified = false,
    }) {
        this.calls.push({
            name,
            method,
            parser,
            cacher,
            identified,
        });
    }

    get modules() {
        return {};
    }

    get state() {
        return {
            index: [],
        };
    }

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
        };
    }

    get getters() {
        return {
            index: (state) => state.index,

            read: (state, getters) => identifier => getters.index.find(
                m => m[this.identifier] === identifier
            ),
        };
    }

    get actions() {
        const actions = {};

        this.calls.forEach(call => {
            actions[call.name] = async (context, {
                fields = {},
                params = {},
            } = {}) => {
                if (call.identified) {
                    if (!fields[this.identifier]) {
                        throw new Error(`The '${call.name}' action requires a 'fields.${this.identifier}' option`);
                    }

                    const model = context.getters.read(fields[this.identifier]);

                    if (model) return model;
                } else if (fields[this.identifier]) {
                    throw new Error(`The '${call.name}' action can not be used with the 'fields.${this.identifier}' option`);
                }

                const response = await axios.request({
                    method: call.method,
                    url: this.getUrl(fields),
                    data: ['post', 'put', 'patch'].includes(call.method.toLowerCase()) ? fields : undefined,
                    params,
                });

                const parsed = call.parser(response.data);

                call.cacher(context, parsed);

                return parsed;
            };
        });

        return actions;
    }

    get store() {
        const { actions, getters, mutations, state, modules } = this;

        return { actions, getters, mutations, state, modules };
    }
}

export default Vrac;
