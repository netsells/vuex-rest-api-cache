import axios from 'axios';

const ParseSingle = {};
const ParseMultiple = {};
const ParseNone = {};

const CacheSingle = {};
const CacheMultiple = {};
const CacheNone = {};
const CacheRemove = {};

export default class Vrac {
    constructor({
        baseUrl: '/',
        only: ['index', 'create', 'read', 'update', 'destroy'],
        identifier: 'id',
    }) {
        this.baseUrl = baseUrl;
        this.identifier = identifier;
        this.calls = [];

        if (only.includes('index')) {
            this.createCall('index', {
                parser: ParseMultiple,
                cacher: CacheMultiple,
            });
        }

        if (only.includes('create')) {
            this.createCall('create', {
                method: 'post',
                parser: ParseSingle,
                cacher: CacheSingle,
            });
        }

        if (only.includes('read')) {
            this.createCall('read', {
                parser: ParseSingle,
                cacher: CacheSingle,
                identified: true,
            });
        }

        if (only.includes('update')) {
            this.createCall('update', {
                method: 'patch',
                parser: ParseSingle,
                cacher: CacheSingle,
                identified: true,
            });
        }

        if (only.includes('destroy')) {
            this.createCall('destroy', {
                method: 'delete',
                parser: ParseNone,
                cacher: CacheRemove,
                identified: true,
            });
        }
    }

    getUrl(fields) {
        let url = this.baseUrl;

        Object.keys(fields).forEach(key => {
            url = url.replace(`[:${key}]`, fields[key]);
        });

        if (fields[this.identifier]) {
            url += `/${fields[this.identifier]}`;
        }

        return url;
    }

    createCall(name, {
        method: 'get',
        parser: ParseSingle,
        cacher: CacheSingle,
        identified: false,
    }) {
        this.calls.push({
            name,
            method,
            parser,
            cacher,
            identified,
        });
    }

    get actions() {
        const actions = {};

        this.calls.forEach(call => {
            actions[call.name] = async (context, {
                fields = {},
                params = {},
            } = {}) => {
                if (call.identified && !fields[this.identifier]) {
                    throw new Error(`This method requires a fields.${this.identifier} option`);
                }

                return await axios({
                    method: call.method,
                    url: this.getUrl(fields),
                    data: ['post', 'put', 'patch'].includes(method.toLowerCase()) ? fields : undefined,
                    params,
                });
            };
        });

        return actions;
    }
}
