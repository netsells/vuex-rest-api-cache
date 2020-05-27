/* global VraOptions */

import {
    cacheMultiple as cacheMultipleDefault,
    cacheSingle as cacheSingleDefault,
    cacheDestroy as cacheDestroyDefault,
    cacheBinary as cacheBinaryDefault,
} from './cachers/index';

import Vra from '../Vra/index';

/**
 * Vrac only class initilisation options.
 *
 * @typedef {object} VracOnlyOptions
 * @property {Function} cacheSingle - Function to cache a single item returned from the API.
 * @property {Function} cacheMultiple - Function to cache multiple items returned from the API.
 * @property {Function} cacheDestroy - Function to remove an item from the cache after a `destroy` call.
 * @property {Function} cacheBinary - Function to cache cache a binary item returned from the API.
 * @property {boolean} singleton - Whether this is a singleton endpoint or not.
 */

/**
 * Vrac and Vra combined class initilisation options.
 *
 * @typedef {VracOnlyOptions | VraOptions} VracOptions
 */

/**
 * Vuex Rest API Cacher class.
 *
 * Generates Vuex stores based on the supplied config. The stores have actions
 * for fetching API data, mutators for caching them and getters for accessing
 * the cache.
 */
class Vrac extends Vra {
    /**
     * Instantiate the class.
     *
     * @param {VracOptions} options
     */
    constructor(options = {}) {
        super(options);

        const {
            cacheMultiple = cacheMultipleDefault,
            cacheSingle = cacheSingleDefault,
            cacheDestroy = cacheDestroyDefault,
            cacheBinary = cacheBinaryDefault,
            singleton = false,
        } = options;

        this.cacheMultiple = cacheMultiple;
        this.cacheSingle = cacheSingle;
        this.cacheDestroy = cacheDestroy;
        this.cacheBinary = cacheBinary;

        this.modifyCall('create', {
            cacher: cacheSingle,
        });

        this.modifyCall('read', {
            readCache: !singleton,
            cacher: cacheSingle,
        });

        this.modifyCall('update', {
            cacher: cacheSingle,
        });

        this.modifyCall('destroy', {
            cacher: cacheDestroy,
        });
    }

    /**
     * Get the default cacher.
     *
     * @param {object} options
     * @param {boolean} options.identified - Whether this is a cacher for an identified API call or not.
     * @param {boolean} options.binary - Whether this is a cacher for a binary API call or not.
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
     * Get the default state for this module.
     *
     * @returns {object} State.
     */
    get state() {
        return () => ({
            index: [],
            actionsLoading: {},
        });
    }

    /**
     * Get the mutators for this module.
     *
     * @returns {object} Mutators.
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
                    m => m[this.identifier] !== model[this.identifier],
                );
            },

            loading: (state, action) => {
                state.actionsLoading = Object.assign(
                    {},
                    state.actionsLoading,
                    { [action]: (state.actionsLoading[action] || 0) + 1 },
                );
            },

            loaded: (state, action) => {
                state.actionsLoading = Object.assign(
                    {},
                    state.actionsLoading,
                    { [action]: state.actionsLoading[action] - 1 },
                );
            },
        };
    }

    /**
     * Get the getters for this module.
     *
     * @returns {object} Getters.
     */
    get getters() {
        return {
            index: ({ index }) => index,

            read: (state, getters) => identifier => getters.index.find(
                m => m[this.identifier] === identifier,
            ),

            loading: ({ actionsLoading }) => {
                return Object.keys(actionsLoading).some(k => actionsLoading[k]);
            },
        };
    }

    /**
     * Get the actions for this module.
     *
     * @returns {object} Actions.
     */
    get actions() {
        const actions = super.actions;
        const self = this;

        Object.keys(actions).forEach(name => {
            const call = this.getCall(name);
            const cacher = call.cacher || this.getCacher(call);
            const action = actions[name];

            actions[name] = async function(context, options = {}) {
                const {
                    readCache = call.readCache,
                    fields = {},
                } = options;

                if (call.identified) {
                    if (readCache) {
                        const model = context.getters.read(fields[self.identifier]);

                        if (model) {
                            return self.createModel(model, call);
                        }
                    }
                } else if (readCache) {
                    const cachedModels = context.getters.index;

                    if (cachedModels.length) {
                        return cachedModels.map(m => self.createModel(m, call));
                    }
                }

                try {
                    context.commit('loading', name);

                    const model = await action.call(this, context, options);

                    cacher(context, model);

                    return model;
                } finally {
                    context.commit('loaded', name);
                }
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
        const { getters, mutations, state } = this;

        return {
            ...super.store,
            getters,
            mutations,
            state,
        };
    }
}

export default Vrac;
