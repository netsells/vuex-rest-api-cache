import Vuex from 'vuex';
import Vue from 'vue';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

import Vrac, { BaseModel } from '~/index';

Vue.use(Vuex);

describe('store', () => {
    let vrac;
    let store;

    /**
     * Example model class to test BaseModel
     */
    class CommentModel extends BaseModel {
        /**
         * Get the upper case name
         *
         * @returns {String}
         */
        toUpper() {
            return this.name.toUpperCase();
        }

        /**
         * Get the ID and name
         *
         * @returns {String}
         */
        get idName() {
            return `${ this.id }/${ this.name }`;
        }
    }

    beforeEach(() => {
        jest.spyOn(axios, 'request');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('singleton', () => {
        beforeEach(() => {
            const modules = Vrac.createModules({
                foobar: {
                    baseUrl: 'http://localhost:3000/singleton',
                    singleton: true,
                },
            });
            store = new Vuex.Store({ modules });
        });

        describe('when calling read', () => {
            let model;

            beforeEach(async() => {
                model = await store.dispatch('foobar/read');
            });

            it('returns the model', () => {
                expect(model).toEqual({ name: 'single stuff' });
            });

            it('submits a new request', () => {
                expect(axios.request.mock.calls.length).toEqual(1);
            });
        });

        describe('when calling update', () => {
            let model;

            beforeEach(async() => {
                model = await store.dispatch('foobar/update', {
                    fields: { name: 'Updated singleton' },
                });
            });

            it('returns the updated model', () => {
                expect(model).toEqual({ name: 'Updated singleton' });
            });

            it('submits a new request', () => {
                expect(axios.request.mock.calls.length).toEqual(1);
            });
        });
    });

    describe('multiple', () => {
        beforeEach(() => {
            vrac = new Vrac({
                baseUrl: 'http://localhost:3000',
                children: {
                    posts: {
                        baseUrl: 'http://localhost:3000/posts',
                        children: {
                            comments: new Vrac({
                                baseUrl: 'http://localhost:3000/posts/:post_id/comments',
                                Model: CommentModel,
                            }),
                        },
                        customCalls: {
                            bar: { method: 'post', path: '/bar', identified: true },
                            foo: { method: 'get', path: '/foo' },
                            export: { method: 'get', path: '/export', binary: true },
                        },
                    },
                },
            });
            store = new Vuex.Store(vrac.store);
        });

        it('sets the state', () => {
            expect(store.state).toEqual(expect.objectContaining({
                index: [],
            }));
        });

        describe('customCalls', () => {
            describe('when identified', () => {
                describe('when called properly', () => {
                    let model;
                    let responseModels;

                    beforeEach(async() => {
                        responseModels = { ok: 'bar' };

                        model = await store.dispatch('posts/bar', {
                            fields: {
                                id: 2,
                            },
                        });
                    });

                    it('returns the item', () => {
                        expect(model).toEqual(responseModels);
                    });

                    it('returns an instance of BaseModel', () => {
                        expect(model).toBeInstanceOf(BaseModel);
                    });
                });
            });

            describe('when not identified', () => {
                describe('when called properly', () => {
                    let models;
                    let responseModels;

                    beforeEach(async() => {
                        responseModels = [
                            { ok: 'foo' },
                            { ok: 'foo2' },
                        ];

                        models = await store.dispatch('posts/foo');
                    });

                    it('returns the items', () => {
                        expect(models).toEqual(responseModels);
                    });
                });
            });

            describe('when binary type', () => {
                describe('when called properly', () => {
                    let models;
                    let responseModels;

                    beforeEach(async() => {
                        responseModels = await new Promise((resolve, reject) => {
                            const fileName = path.join(__dirname, 'netsells.ico');

                            fs.readFile(fileName, (err, data) => {
                                if (err) {
                                    return reject(err);
                                }

                                resolve(data.toString());
                            });
                        });

                        models = await store.dispatch('posts/export');
                    });

                    it('returns the raw blob', () => {
                        expect(models).toEqual(responseModels);
                    });
                });
            });
        });

        describe('children', () => {
            it('sets the childrens state', () => {
                expect(store.state).toEqual({
                    index: [],
                    actionsLoading: {},
                    posts: {
                        index: [],
                        actionsLoading: {},
                        comments: {
                            index: [],
                            actionsLoading: {},
                        },
                    },
                });
            });

            describe('index', () => {
                describe('when called with id', () => {
                    it('throws an error', async() => {
                        await expect(store.dispatch('posts/index', { fields: { id: 1 } })).rejects.toEqual(
                            new Error('The \'index\' action can not be used with the \'fields.id\' option')
                        );
                    });
                });

                describe('when called without a parent id', () => {
                    it('throws an error', async() => {
                        await expect(store.dispatch('posts/comments/index')).rejects.toEqual(
                            new Error('You must pass the \'post_id\' field')
                        );
                    });
                });

                describe('when called properly', () => {
                    let models;
                    let responseModels;

                    beforeEach(async() => {
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

                    it('returns instances of BaseModel', () => {
                        models.forEach((model) => {
                            expect(model).toBeInstanceOf(BaseModel);
                        });
                    });

                    it('caches the items in the store', () => {
                        expect(store.state.posts.comments.index).toEqual(responseModels);
                    });

                    describe('when called a second time', () => {
                        beforeEach(async() => {
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

                        beforeEach(async() => {
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

                        it('returns an instance of CommentModel', () => {
                            expect(model).toBeInstanceOf(CommentModel);
                        });

                        it('does not submit a new request', () => {
                            expect(axios.request.mock.calls.length).toEqual(1);
                        });

                        it('supports the model class function', () => {
                            expect(model.toUpper()).toEqual('COMMENT 2');
                        });

                        it('supports the model class getter', () => {
                            expect(model.idName).toEqual('2/Comment 2');
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
                    it('throws an error', async() => {
                        await expect(store.dispatch('cachableIndex', { fields: { id: 1 } })).rejects.toEqual(
                            new Error('The \'cachableIndex\' action can not be used with the \'fields.id\' option')
                        );
                    });
                });

                describe('when called properly', () => {
                    let models;
                    let responseModels;

                    beforeEach(async() => {
                        responseModels = [{ id: 1, name: 'Thing 1' }, { id: 2, name: 'Stuff 2' }];

                        models = await store.dispatch('cachableIndex');
                    });

                    it('returns the fetched items items', () => {
                        expect(models).toEqual(responseModels);
                    });

                    it('submits a new request', () => {
                        expect(axios.request.mock.calls.length).toEqual(1);
                    });

                    describe('when called again', () => {
                        beforeEach(async() => {
                            models = await store.dispatch('cachableIndex');
                        });

                        it('returns the fetched items items', () => {
                            expect(models).toEqual(responseModels);
                        });

                        it('does not submit a new request', () => {
                            expect(axios.request.mock.calls.length).toEqual(1);
                        });
                    });
                });
            });
        });

        describe('state', () => {
            describe('actionsLoading', () => {
                it('is an empty object by default', () => {
                    expect(store.state.actionsLoading).toEqual({});
                });

                it('sets the key to the number of actions loading', done => {
                    store.dispatch('index').then(() => {
                        expect(store.state.actionsLoading).toEqual({ index: 0 });

                        done();
                    });

                    expect(store.state.actionsLoading).toEqual({ index: 1 });
                });

                it('keeps increasing the index as actions are triggered', done => {
                    const promises = [];

                    promises.push(store.dispatch('index'));
                    expect(store.state.actionsLoading).toEqual({ index: 1 });

                    promises.push(store.dispatch('index'));
                    expect(store.state.actionsLoading).toEqual({ index: 2 });

                    Promise.all(promises).then(() => done());
                });
            });
        });

        describe('getters', () => {
            describe('loading', () => {
                it('is false by default', () => {
                    expect(store.getters.loading).toEqual(false);
                });

                it('is true while something is loading', done => {
                    store.dispatch('index').then(() => {
                        expect(store.getters.loading).toEqual(false);

                        done();
                    });

                    expect(store.getters.loading).toEqual(true);
                });
            });
        });

        describe('actions', () => {
            describe('index', () => {
                describe('when called with id', () => {
                    it('throws an error', async() => {
                        await expect(store.dispatch('index', { fields: { id: 1 } })).rejects.toEqual(
                            new Error('The \'index\' action can not be used with the \'fields.id\' option')
                        );
                    });
                });

                describe('when called properly', () => {
                    let models;
                    let responseModels;

                    beforeEach(async() => {
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
                        beforeEach(async() => {
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

                        beforeEach(async() => {
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

                    describe('when calling read with readCache set to false', () => {
                        let model;

                        beforeEach(async() => {
                            model = await store.dispatch('read', {
                                fields: {
                                    id: 2,
                                },
                                readCache: false,
                            });
                        });

                        it('returns the model', () => {
                            expect(model).toEqual(responseModels[1]);
                        });

                        it('submits a new request', () => {
                            expect(axios.request.mock.calls.length).toEqual(2);
                        });
                    });
                });
            });

            describe('read', () => {
                describe('when called without id', () => {
                    it('throws an error', async() => {
                        await expect(store.dispatch('read')).rejects.toEqual(
                            new Error('The \'read\' action requires a \'fields.id\' option')
                        );
                    });
                });

                describe('when called properly', () => {
                    let model;
                    let responseModel;

                    beforeEach(async() => {
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
                        beforeEach(async() => {
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
                    it('throws an error', async() => {
                        await expect(store.dispatch('update')).rejects.toEqual(
                            new Error('The \'update\' action requires a \'fields.id\' option')
                        );
                    });
                });

                describe('when called properly', () => {
                    let model;
                    let responseModel;

                    beforeEach(async() => {
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
                        beforeEach(async() => {
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
                    beforeEach(async() => {
                        await store.dispatch('update', {
                            fields: {
                                id: 2,
                                name: 'Updated stuff',
                            },
                            method: 'PUT',
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
                    it('throws an error', async() => {
                        await expect(store.dispatch('create', { fields: { id: 4 } })).rejects.toEqual(
                            new Error('The \'create\' action can not be used with the \'fields.id\' option')
                        );
                    });
                });

                describe('when called properly', () => {
                    let model;
                    let responseModel;

                    beforeEach(async() => {
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
                        beforeEach(async() => {
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
                    it('throws an error', async() => {
                        await expect(store.dispatch('destroy')).rejects.toEqual(
                            new Error('The \'destroy\' action requires a \'fields.id\' option')
                        );
                    });
                });

                describe('when called properly', () => {
                    beforeEach(async() => {
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
                    beforeEach(async() => {
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

                    beforeEach(async() => {
                        [otherModel] = await store.dispatch('index');
                    });

                    it('caches the item in the store', () => {
                        expect(store.state.index).toEqual([otherModel, responseModel]);
                    });

                    describe('when calling destroy', () => {
                        beforeEach(async() => {
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
});
