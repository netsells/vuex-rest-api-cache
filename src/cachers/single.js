/**
 * Add the model to the cache.
 *
 * @param {object} context
 * @param {object} model
 */
export default function({ commit }, model) {
    commit('createOrUpdate', model);
}
