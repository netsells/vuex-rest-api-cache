import Vuex from 'vuex';
import Vue from 'vue';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

import { Vra } from '~/index';

/**
 * Example BaseModel.
 */
class BaseModel {
    constructor(fields) {
        Object.assign(this, fields);
    }
}

Vue.use(Vuex);

describe('store', () => {
    let vra;
    let store;

    /**
     * Example model class to test BaseModel.
     */
    class CommentModel extends BaseModel {
        /**
         * Get the upper case name.
         *
         * @returns {string}
         */
        toUpper() {
            return this.name.toUpperCase();
        }

        /**
         * Get the ID and name.
         *
         * @returns {string}
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
            const modules = Vra.createModules({
                foobar: {
                    baseUrl: 'http://localhost:3000/singleton',
                    singleton: true,
                },
            });
            store = new Vuex.Store({ modules });
        });

        describe('when calling read', () => {
            let model;

            beforeEach(async () => {
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

            beforeEach(async () => {
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
            vra = new Vra({
                baseUrl: 'http://localhost:3000',
                children: {
                    posts: {
                        baseUrl: 'http://localhost:3000/posts',
                        children: {
                            comments: new Vra({
                                baseUrl: 'http://localhost:3000/posts/:post_id/comments',
                                toModel: data => new CommentModel(data),
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
            store = new Vuex.Store(vra.store);
        });

        describe('customCalls', () => {
            describe('when identified', () => {
                describe('when called properly', () => {
                    let model;
                    let responseModels;

                    beforeEach(async () => {
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

                    it('returns a standard object', () => {
                        expect(model).not.toBeInstanceOf(BaseModel);
                    });
                });
            });

            describe('when not identified', () => {
                describe('when called properly', () => {
                    let models;
                    let responseModels;

                    beforeEach(async () => {
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

                    beforeEach(async () => {
                        responseModels = await new Promise((resolve, reject) => {
                            const fileName = path.join(__dirname, '../netsells.ico');

                            fs.readFile(fileName, (err, data) => {
                                if (err) {
                                    return reject(err);
                                }

                                resolve(data);
                            });
                        });

                        models = await store.dispatch('posts/export');
                    });

                    it('returns the raw binary blob', () => {
                        expect(models.length).toEqual(responseModels.length);
                        expect(models.toString()).toEqual(responseModels.toString());
                    });
                });
            });
        });

        describe('children', () => {
            describe('index', () => {
                describe('when called with id', () => {
                    it('throws an error', async () => {
                        await expect(store.dispatch('posts/index', { fields: { id: 1 } })).rejects.toEqual(
                            new Error('The \'index\' action can not be used with the \'fields.id\' option'),
                        );
                    });
                });

                describe('when called without a parent id', () => {
                    it('throws an error', async () => {
                        await expect(store.dispatch('posts/comments/index')).rejects.toEqual(
                            new Error('You must pass the \'post_id\' field'),
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

                    it('returns instances of BaseModel', () => {
                        models.forEach((model) => {
                            expect(model).toBeInstanceOf(BaseModel);
                        });
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

                        it('returns an instance of CommentModel', () => {
                            expect(model).toBeInstanceOf(CommentModel);
                        });

                        it('submits a new request', () => {
                            expect(axios.request.mock.calls.length).toEqual(2);
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

        describe('actions', () => {
            describe('index', () => {
                describe('when called with id', () => {
                    it('throws an error', async () => {
                        await expect(store.dispatch('index', { fields: { id: 1 } })).rejects.toEqual(
                            new Error('The \'index\' action can not be used with the \'fields.id\' option'),
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

                    describe('when called a second time', () => {
                        beforeEach(async () => {
                            models = await store.dispatch('index');
                        });

                        it('returns the models', () => {
                            expect(models).toEqual(responseModels);
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
                    });

                    describe('when calling read with readCache set to false', () => {
                        let model;

                        beforeEach(async () => {
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
                    it('throws an error', async () => {
                        await expect(store.dispatch('read')).rejects.toEqual(
                            new Error('The \'read\' action requires a \'fields.id\' option'),
                        );
                    });
                });

                describe('when called with a falsy id', () => {
                    it('does not throw an error', async () => {
                        await expect(store.dispatch('read', { fields: { id: 0 } })).resolves.toEqual(expect.any(Object));
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

                        it('submits a new request', () => {
                            expect(axios.request.mock.calls.length).toEqual(2);
                        });
                    });
                });
            });

            describe('update', () => {
                describe('when called without id', () => {
                    it('throws an error', async () => {
                        await expect(store.dispatch('update')).rejects.toEqual(
                            new Error('The \'update\' action requires a \'fields.id\' option'),
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

                    describe('when calling read for same model', () => {
                        beforeEach(async () => {
                            model = await store.dispatch('read', { fields: { id: 2 } });
                        });

                        it('returns the model', () => {
                            expect(model).toEqual({
                                id: 2,
                                name: 'Stuff 2',
                            });
                        });

                        it('submits a new request', () => {
                            expect(axios.request.mock.calls.length).toEqual(2);
                        });
                    });
                });

                describe('when called with method', () => {
                    beforeEach(async () => {
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
                    it('throws an error', async () => {
                        await expect(store.dispatch('create', { fields: { id: 4 } })).rejects.toEqual(
                            new Error('The \'create\' action can not be used with the \'fields.id\' option'),
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

                    describe('when calling read for same model', () => {
                        beforeEach(async () => {
                            model = await store.dispatch('read', { fields: { id: 3 } });
                        });

                        it('returns the existing model', () => {
                            expect(model).toEqual({
                                id: 3,
                                name: 'New stuff',
                            });
                        });

                        it('submits a new request', () => {
                            expect(axios.request.mock.calls.length).toEqual(2);
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
                            new Error('The \'destroy\' action requires a \'fields.id\' option'),
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
                });

                describe('when api does not return model', () => {
                    beforeEach(async () => {
                        model = await store.dispatch('destroy', { fields: { id: 2 }, params: { noModel: 1 } });
                    });

                    it('returns the fields only', () => {
                        expect(model).toEqual({ id: 2 });
                    });
                });

                describe('when calling index first', () => {
                    let otherModel;

                    beforeEach(async () => {
                        [otherModel] = await store.dispatch('index');
                    });

                    describe('when calling destroy', () => {
                        beforeEach(async () => {
                            model = await store.dispatch('destroy', { fields: { id: 2 } });
                        });

                        it('returns the model', () => {
                            expect(model).toEqual(responseModel);
                        });
                    });
                });
            });
        });
    });
});
