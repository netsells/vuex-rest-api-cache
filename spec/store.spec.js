import Vuex from 'vuex';
import Vue from 'vue';
import axios from 'axios';

import Vrac from '~/index';

Vue.use(Vuex);

describe('store', () => {
    let vrac;
    let store;

    beforeEach(() => {
        jest.spyOn(axios, 'request');

        vrac = new Vrac({
            baseUrl: 'http://localhost:3000',
            children: {
                posts: {
                    baseUrl: 'http://localhost:3000/posts',
                    children: {
                        comments: new Vrac({ baseUrl: 'http://localhost:3000/posts/:post_id/comments' })
                    },
                }
            },
        });
        store = new Vuex.Store(vrac.store);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('sets the state', () => {
        expect(store.state).toEqual(expect.objectContaining({
            index: [],
        }));
    });

    describe('children', () => {
        it('sets the childrens state', () => {
            expect(store.state).toEqual({
                index: [],
                posts: {
                    index: [],
                    comments: {
                        index: [],
                    },
                },
            });
        });
        describe('index', () => {
            describe('when called with id', () => {
                it('throws an error', async () => {
                    await expect(store.dispatch('posts/index', { fields: { id: 1 } })).rejects.toEqual(
                        new Error("The 'index' action can not be used with the 'fields.id' option")
                    );
                });
            });

            describe('when called without a parent id', () => {
                it('throws an error', async () => {
                    await expect(store.dispatch('posts/comments/index')).rejects.toEqual(
                        new Error("You must pass the 'post_id' field")
                    );
                });
            });

            describe('when called properly', () => {
                let models;
                let responseModels;

                beforeEach(async () => {
                    responseModels = [{
                        id: 1,
                        name: 'Comment 1',
                    }, {
                        id: 2,
                        name: 'Comment 2',
                    }];

                    models = await store.dispatch('posts/comments/index', {
                        fields: {
                            post_id: 2,
                        },
                    });
                });

                it('returns the indexed items', () => {
                    expect(models).toEqual(responseModels);
                });

                it('caches the items in the store', () => {
                    expect(store.state.posts.comments.index).toEqual(responseModels);
                });

                describe('when called a second time', () => {
                    beforeEach(async () => {
                        models = await store.dispatch('posts/comments/index', {
                            fields: {
                                post_id: 2,
                            },
                        });
                    });

                    it('returns the models', () => {
                        expect(models).toEqual(responseModels);
                    });

                    it('updates the cache to the same models', () => {
                        expect(store.state.posts.comments.index).toEqual(responseModels);
                    });

                    it('submits a new request', () => {
                        expect(axios.request.mock.calls.length).toEqual(2);
                    });
                });

                describe('when calling read', () => {
                    let model;

                    beforeEach(async () => {
                        model = await store.dispatch('posts/comments/read', {
                            fields: {
                                post_id: 2,
                                id: 2,
                            },
                        });
                    });

                    it('returns the model', () => {
                        expect(model).toEqual(responseModels[1]);
                    });

                    it('does not submit a new request', () => {
                        expect(axios.request.mock.calls.length).toEqual(1);
                    });
                });
            });
        });
    });

    describe('custom calls', () => {
        describe('cachable index', () => {
            beforeEach(() => {
                vrac.createCall('cachableIndex', {
                    readCache: true,
                });

                store = new Vuex.Store(vrac.store);
            });

            describe('when called with id', () => {
                it('throws an error', async () => {
                    await expect(store.dispatch('cachableIndex', { fields: { id: 1 } })).rejects.toEqual(
                        new Error("The 'cachableIndex' action can not be used with the 'fields.id' option")
                    );
                });
            });

            describe('when called properly', () => {
                let models;
                let responseModels;

                beforeEach(async () => {
                    responseModels = [{ id: 5, name: 'foo' }];
                    store.state.index = responseModels;

                    models = await store.dispatch('cachableIndex');
                });

                it('returns the cached items', () => {
                    expect(models).toEqual(responseModels);
                });

                it('does not submit a new request', () => {
                    expect(axios.request.mock.calls.length).toEqual(0);
                });
            });
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
                let responseModels;

                beforeEach(async () => {
                    responseModels = [{
                        id: 1,
                        name: 'Thing 1',
                    }, {
                        id: 2,
                        name: 'Stuff 2',
                    }];

                    models = await store.dispatch('index');
                });

                it('returns the indexed items', () => {
                    expect(models).toEqual(responseModels);
                });

                it('caches the items in the store', () => {
                    expect(store.state.index).toEqual(responseModels);
                });

                describe('when called a second time', () => {
                    beforeEach(async () => {
                        models = await store.dispatch('index');
                    });

                    it('returns the models', () => {
                        expect(models).toEqual(responseModels);
                    });

                    it('updates the cache to the same models', () => {
                        expect(store.state.index).toEqual(responseModels);
                    });

                    it('submits a new request', () => {
                        expect(axios.request.mock.calls.length).toEqual(2);
                    });
                });

                describe('when calling read', () => {
                    let model;

                    beforeEach(async () => {
                        model = await store.dispatch('read', {
                            fields: {
                                id: 2,
                            },
                        });
                    });

                    it('returns the model', () => {
                        expect(model).toEqual(responseModels[1]);
                    });

                    it('does not submit a new request', () => {
                        expect(axios.request.mock.calls.length).toEqual(1);
                    });
                });
            });
        });

        describe('read', () => {
            describe('when called without id', () => {
                it('throws an error', async () => {
                    await expect(store.dispatch('read')).rejects.toEqual(
                        new Error("The 'read' action requires a 'fields.id' option")
                    );
                });
            });

            describe('when called properly', () => {
                let model;
                let responseModel;

                beforeEach(async () => {
                    responseModel = {
                        id: 2,
                        name: 'Stuff 2',
                    };

                    model = await store.dispatch('read', { fields: { id: 2 } });
                });

                it('returns the model', () => {
                    expect(model).toEqual(responseModel);
                });

                it('caches the item in the store', () => {
                    expect(store.state.index).toEqual([responseModel]);
                });

                it('does not send the fields as data', () => {
                    expect(axios.request).toHaveBeenCalledWith(expect.objectContaining({
                        data: undefined,
                    }));
                });

                describe('when called a second time', () => {
                    beforeEach(async () => {
                        model = await store.dispatch('read', { fields: { id: 2 } });
                    });

                    it('returns the model', () => {
                        expect(model).toEqual(responseModel);
                    });

                    it('does not submit a new request', () => {
                        expect(axios.request.mock.calls.length).toEqual(1);
                    });
                });
            });
        });

        describe('update', () => {
            describe('when called without id', () => {
                it('throws an error', async () => {
                    await expect(store.dispatch('update')).rejects.toEqual(
                        new Error("The 'update' action requires a 'fields.id' option")
                    );
                });
            });

            describe('when called properly', () => {
                let model;
                let responseModel;

                beforeEach(async () => {
                    responseModel = {
                        id: 2,
                        name: 'Updated stuff',
                    };

                    model = await store.dispatch('update', { fields: { id: 2, name: 'Updated stuff' } });
                });

                it('sends the fields as data with the request except the identifier', () => {
                    expect(axios.request).toHaveBeenCalledWith(expect.objectContaining({
                        data: { id: 2, name: 'Updated stuff' },
                    }));
                });

                it('returns the model', () => {
                    expect(model).toEqual(responseModel);
                });

                it('caches the item in the store', () => {
                    expect(store.state.index).toEqual([responseModel]);
                });

                describe('when calling read for same model', () => {
                    beforeEach(async () => {
                        model = await store.dispatch('read', { fields: { id: 2 } });
                    });

                    it('returns the model', () => {
                        expect(model).toEqual(responseModel);
                    });

                    it('does not submit a new request', () => {
                        expect(axios.request.mock.calls.length).toEqual(1);
                    });
                });
            });

            describe('when called with method', () => {
                let model;
                let responseModel;

                beforeEach(async () => {
                    responseModel = {
                        id: 2,
                        name: 'Updated stuff',
                    };

                    model = await store.dispatch('update', {
                        fields: {
                            id: 2,
                            name: 'Updated stuff'
                        },
                        method: 'PUT'
                    });
                });

                it('sends the fields as data with the request except the identifier', () => {
                    expect(axios.request).toHaveBeenCalledWith(expect.objectContaining({
                        data: { id: 2, name: 'Updated stuff' },
                    }));
                });
            });
        });

        describe('create', () => {
            describe('when called with an id', () => {
                it('throws an error', async () => {
                    await expect(store.dispatch('create', { fields: { id: 4 } })).rejects.toEqual(
                        new Error("The 'create' action can not be used with the 'fields.id' option")
                    );
                });
            });

            describe('when called properly', () => {
                let model;
                let responseModel;

                beforeEach(async () => {
                    responseModel = {
                        id: 3,
                        name: 'New stuff',
                    };

                    model = await store.dispatch('create', { fields: { name: 'New stuff' } });
                });

                it('sends the fields as data with the request', () => {
                    expect(axios.request).toHaveBeenCalledWith(expect.objectContaining({
                        data: { name: 'New stuff' },
                    }));
                });

                it('returns the model', () => {
                    expect(model).toEqual(responseModel);
                });

                it('caches the item in the store', () => {
                    expect(store.state.index).toEqual([responseModel]);
                });

                describe('when calling read for same model', () => {
                    beforeEach(async () => {
                        model = await store.dispatch('read', { fields: { id: 3 } });
                    });

                    it('returns the model', () => {
                        expect(model).toEqual(responseModel);
                    });

                    it('does not submit a new request', () => {
                        expect(axios.request.mock.calls.length).toEqual(1);
                    });
                });
            });
        });

        describe('destroy', () => {
            let model;
            let responseModel;

            beforeEach(() => {
                responseModel = {
                    id: 2,
                    name: 'Stuff 2',
                };
            });

            describe('when called without id', () => {
                it('throws an error', async () => {
                    await expect(store.dispatch('destroy')).rejects.toEqual(
                        new Error("The 'destroy' action requires a 'fields.id' option")
                    );
                });
            });

            describe('when called properly', () => {
                beforeEach(async () => {
                    model = await store.dispatch('destroy', { fields: { id: 2 } });
                });

                it('returns the model', () => {
                    expect(model).toEqual(responseModel);
                });

                it('does not cache the item in the store', () => {
                    expect(store.state.index).toEqual([]);
                });
            });

            describe('when api does not return model', () => {
                beforeEach(async () => {
                    model = await store.dispatch('destroy', { fields: { id: 2 }, params: { noModel: 1 } });
                });

                it('returns the fields only', () => {
                    expect(model).toEqual({ id: 2 });
                });

                it('does not cache the item in the store', () => {
                    expect(store.state.index).toEqual([]);
                });
            });

            describe('when calling index first', () => {
                let otherModel;

                beforeEach(async () => {
                    [otherModel] = await store.dispatch('index');
                });

                it('caches the item in the store', () => {
                    expect(store.state.index).toEqual([otherModel, responseModel]);
                });

                describe('when calling destroy', () => {
                    beforeEach(async () => {
                        model = await store.dispatch('destroy', { fields: { id: 2 } });
                    });

                    it('returns the model', () => {
                        expect(model).toEqual(responseModel);
                    });

                    it('removes item from the store', () => {
                        expect(store.state.index).toEqual([otherModel]);
                    });
                });
            });
        });
    });
});
