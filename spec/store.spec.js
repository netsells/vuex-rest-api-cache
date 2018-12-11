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
                let promise;

                beforeEach(() => {
                    promise = store.dispatch('index');
                });

                // it('calls axios', () => {
                //     expect(mockAxios.request).toHaveBeenCalledWith({
                //         method: 'get',
                //         url: '/',
                //         params: {},
                //     });
                // });
            });
        });
    });
});
