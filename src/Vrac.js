import axios from 'axios';
import parseMultiple from './parsers/multiple';
import parseSingle from './parsers/single';
import parseNone from './parsers/none';

import cacheMultiple from './cachers/multiple';
import cacheSingle from './cachers/single';
import cacheNone from './cachers/none';
import cacheDestroy from './cachers/destroy';

class Vrac {
    constructor({
        baseUrl = '/',
        only = ['index', 'create', 'read', 'update', 'destroy'],
        identifier = 'id',
    }) {
        this.baseUrl = baseUrl;
        this.identifier = identifier;
        this.calls = [];

        if (only.includes('index')) {
            this.createCall('index', {
                parser: parseMultiple,
                cacher: cacheMultiple,
                identified: false,
            });
        }

        if (only.includes('create')) {
            this.createCall('create', {
                method: 'post',
                parser: parseSingle,
                cacher: cacheSingle,
                identified: false,
            });
        }

        if (only.includes('read')) {
            this.createCall('read', {
                parser: parseSingle,
                cacher: cacheSingle,
                identified: true,
            });
        }

        if (only.includes('update')) {
            this.createCall('update', {
                method: 'patch',
                parser: parseSingle,
                cacher: cacheSingle,
                identified: true,
            });
        }

        if (only.includes('destroy')) {
            this.createCall('destroy', {
                method: 'delete',
                parser: parseNone,
                cacher: cacheDestroy,
                identified: true,
            });
        }
    }

    getUrl(fields) {
        let url = this.baseUrl;
        const reqFields = url.match(/\:([a-z,_]+)/gi).map(s => s.slice(1));

        Object.keys(reqFields).forEach(field => {
            if (fields[field] === undefined) {
                throw new Error(`You must pass the ${field} field`);
            }

            url = url.replace(`:${field}`, fields[field]);
        })

        if (fields[this.identifier]) {
            url += `/${fields[this.identifier]}`;
        }

        return url;
    }

    createCall(name, {
        method = 'get',
        parser = parseSingle,
        cacher = cacheSingle,
        identified = true,
    }) {
        this.calls.push({
            name,
            method,
            parser,
            cacher,
            identified,
        });
    }

    get state() {
        return {
            index: [],
        };
    }

    get mutations() {
        return {
            createOrUpdate(state, model) {
                state.index = [
                    ...state.index.filter(m => m[this.identifier] !== model[this.identifier]),
                    model,
                ];
            },

            destroy(state, model) {
                state.index = state.index.filter(
                    m => m[this.identifier] !== model[this.identifier]
                );
            },
        };
    }

    get getters() {
        return {
            index(state) {
                return state.index;
            },

            read(state, getters) {
                return identifier => getters.index.find(
                    m => m[this.identifier] === identifier
                );
            },
        };
    }

    get actions() {
        const actions = {};

        this.calls.forEach(call => {
            actions[call.name] = async (context, {
                fields = {},
                params = {},
            } = {}) => {

                if (call.identified && !fields[this.identifier]) {
                    throw new Error(`The '${call.name}' action requires a 'fields.${this.identifier}' option`);
                }

                const response = await axios({
                    method: call.method,
                    url: this.getUrl(fields),
                    data: ['post', 'put', 'patch'].includes(method.toLowerCase()) ? fields : undefined,
                    params,
                });

                const parsed = call.parser(response.data);

                call.cacher(context, parsed);

                return parsed;
            };
        });

        return actions;
    }
}

export default Vrac;
