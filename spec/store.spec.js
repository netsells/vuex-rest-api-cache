import Vuex from 'vuex';
import Vue from 'vue';

import Vrac from '~/index';

Vue.use(Vuex);

describe('store', () => {
    let vrac;
    let store;

    beforeEach(() => {
        vrac = new Vrac({
            baseUrl: 'http://localhost:3000',
        });
        store = new Vuex.Store(vrac.store);
    });

    it('sets the state', () => {
        expect(store.state).toEqual({
            index: [],
        });
    });

    describe('actions', () => {
        describe('index', () => {
            describe('when called with id', () => {
                it('throws an error', async () => {
                    await expect(store.dispatch('index', { fields: { id: 1 } })).rejects.toEqual(
                        new Error("The 'index' action can not be used with the 'fields.id' option")
                    );
                });
            });

            describe('when called properly', () => {
                let models;

                beforeEach(() => {
                    models = store.dispatch('index');
                });

                it('returns the indexed items', () => {
                    expect(models).toEqual([{
                        id: 1,
                        name: 'Thing 1',
                    }, {
                        id: 1,
                        name: 'Stuff 2',
                    }]);
                });
            });
        });
    });
});
