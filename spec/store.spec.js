import Vuex from 'vuex';
import Vue from 'vue';
import Vrac from '~/index';

Vue.use(Vuex);

describe('store', () => {
    let vrac;
    let store;

    beforeEach(() => {
        vrac = new Vrac();
        store = new Vuex.Store(vrac.store);
    });

    it('sets the state', () => {
        expect(store.state).toEqual({
            index: [],
        });
    });
});
