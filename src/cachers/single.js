export default function({ commit }, model) {
    commit('createOrUpdate', model);
};
