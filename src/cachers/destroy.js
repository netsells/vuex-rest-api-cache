/**
 * Remove the model from the cache
 *
 * @param {Object} context
 * @param {Object} model
 */
export default function({ commit }, model) {
    commit('destroy', model);
}
