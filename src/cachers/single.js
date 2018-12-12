/**
 * Add the model to the cache
 *
 * @param {Object} context
 * @param {Object} model
 */
export default function({ commit }, model) {
    commit('createOrUpdate', model);
}
