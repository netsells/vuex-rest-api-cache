/**
 * Remove the model from the cache.
 *
 * @param {object} context
 * @param {object} model
 */
export default function({ commit }, model) {
    commit('destroy', model);
}
