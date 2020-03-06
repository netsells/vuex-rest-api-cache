import axios from 'axios';
import { Vra } from '~/index';

describe('Vra', () => {
    let instance;

    it('exports Vra', () => {
        expect(Vra).toBeDefined();
        expect(Vra.name).toBe('Vra');
    });

    describe('createModules', () => {
        let modules;

        beforeEach(() => {
            modules = Vra.createModules({
                foo: {
                    baseUrl: '/foo',
                },
                bar: {
                    baseUrl: '/bar',
                },
            });
        });

        it('returns namespaced Vuex modules', () => {
            expect(modules).toEqual(expect.objectContaining({
                foo: expect.objectContaining({
                    namespaced: true,
                }),
                bar: expect.objectContaining({
                    namespaced: true,
                }),
            }));
        });
    });

    describe('requestAdapter', () => {
        beforeEach(() => {
            jest.spyOn(axios, 'request').mockImplementation(() => Promise.resolve({}));
        });

        it('calls axios with the passed params', () => {
            const requestParams = { foo: 'bar' };
            Vra.requestAdapter(requestParams);
            expect(axios.request).toHaveBeenCalledWith(requestParams);
        });

        describe('when instantiated', () => {
            beforeEach(() => {
                instance = new Vra({
                    baseUrl: '/',
                });
            });

            describe('when requestAdapter changed', () => {
                let self;
                let called;
                let oldRequestAdapter;

                beforeEach(() => {
                    called = false;
                    oldRequestAdapter = Vra.requestAdapter;

                    Vra.requestAdapter = function() {
                        called = true;
                        self = this;

                        return Promise.resolve({
                            data: [],
                        });
                    };

                    jest.spyOn(Vra, 'requestAdapter');
                });

                afterEach(() => {
                    Vra.requestAdapter = oldRequestAdapter;
                });

                describe('when index called', () => {
                    let storeContext;
                    let jsContext;

                    beforeEach(() => {
                        storeContext = { commit: () => ({}) };
                        jsContext = { js: 'context' };

                        instance.actions.index.call(jsContext, storeContext);
                    });

                    it('calls the new requestAdapter', () => {
                        expect(called).toBe(true);
                    });

                    it('calls the new requestAdapter with the store context', () => {
                        expect(Vra.requestAdapter)
                            .toHaveBeenCalledWith(expect.any(Object), storeContext);
                    });

                    it('calls the new requestAdapter with the store function context', () => {
                        expect(self).toBe(jsContext);
                    });
                });
            });
        });
    });

    describe('custom calls', () => {
        beforeEach(() => {
            instance = new Vra({
                customCalls: {
                    foo: { method: 'patch' },
                    bar: { method: 'post', path: '/bar' },
                },
            });
        });

        it('creates the custom call', () => {
            const call = instance.calls.find(({ name }) => name === 'foo');

            expect(call).toEqual(expect.objectContaining({
                name: 'foo',
                method: 'patch',
            }));
        });

        it('can create the custom call with a custom path', () => {
            const call = instance.calls.find(({ name }) => name === 'bar');

            expect(call).toEqual(expect.objectContaining({
                name: 'bar',
                method: 'post',
                path: '/bar',
            }));
        });
    });

    describe('only index', () => {
        beforeEach(() => {
            instance = new Vra({
                only: ['index'],
            });
        });

        it('creates the index call only', () => {
            expect(instance.calls.length).toBe(1);

            const names = instance.calls.map(({ name }) => name);

            expect(names).toContain('index');
        });

        it('sets the method to get', () => {
            expect(instance.calls[0].method).toBe('get');
        });
    });

    describe('only read no array', () => {
        beforeEach(() => {
            instance = new Vra({
                only: 'read',
            });
        });

        it('creates the read call only', () => {
            expect(instance.calls.length).toBe(1);

            const names = instance.calls.map(({ name }) => name);

            expect(names).toContain('read');
        });
    });

    describe('except create', () => {
        beforeEach(() => {
            instance = new Vra({
                except: ['create'],
            });
        });

        it('creates the defaults calls except create', () => {
            expect(instance.calls.length).toBe(4);

            const names = instance.calls.map(({ name }) => name);

            expect(names).toContain('index');
            expect(names).toContain('read');
            expect(names).toContain('update');
            expect(names).toContain('destroy');
        });
    });

    describe('standard instance', () => {
        beforeEach(() => {
            instance = new Vra();
        });

        it('sets the default baseUrl', () => {
            expect(instance.baseUrl).toBe('/');
        });

        it('sets the default identifier', () => {
            expect(instance.identifier).toBe('id');
        });

        it('creates the default calls', () => {
            expect(instance.calls.length).toBe(5);

            const names = instance.calls.map(({ name }) => name);

            expect(names).toContain('index');
            expect(names).toContain('create');
            expect(names).toContain('read');
            expect(names).toContain('update');
            expect(names).toContain('destroy');
        });

        describe('getUrl', () => {
            it('returns the baseUrl', () => {
                expect(instance.getUrl()).toBe('/');
            });

            describe('when passed random field', () => {
                it('returns the baseUrl', () => {
                    expect(instance.getUrl({ foo: 'bar' })).toBe('/');
                });
            });

            describe('when passed id', () => {
                it('returns the URL with the ID appended', () => {
                    expect(instance.getUrl({ id: 'foo' })).toBe('/foo');
                });
            });

            describe('when passed falsy id', () => {
                it('returns the URL with the ID appended', () => {
                    expect(instance.getUrl({ id: 0 })).toBe('/0');
                });
            });
        });

        describe('actions', () => {
            let actions;

            beforeEach(() => {
                actions = instance.actions;
            });

            it('exports all the calls as actions', () => {
                const names = Object.keys(actions);

                expect(names.length).toBe(5);
                expect(names).toContain('index');
                expect(names).toContain('create');
                expect(names).toContain('read');
                expect(names).toContain('update');
                expect(names).toContain('destroy');
            });
        });
    });

    describe('child instance', () => {
        beforeEach(() => {
            instance = new Vra({
                baseUrl: '/post/:post_id/comment',
            });
        });

        it('sets the default baseUrl', () => {
            expect(instance.baseUrl).toBe('/post/:post_id/comment');
        });

        describe('getUrl', () => {
            it('throws an error', () => {
                expect(() => instance.getUrl()).toThrow(new Error('You must pass the \'post_id\' field'));
            });

            describe('when passed the needed field', () => {
                it('returns the URL with the field applied', () => {
                    expect(instance.getUrl({ post_id: 45 })).toBe('/post/45/comment');
                });
            });

            describe('when passed a falsy but present ID', () => {
                it('returns the URL with the field applied', () => {
                    expect(instance.getUrl({ post_id: 0 })).toBe('/post/0/comment');
                });
            });

            describe('when passed the needed field and an id', () => {
                it('returns the URL with the field applied and id appended', () => {
                    expect(instance.getUrl({ post_id: 45, id: 3 })).toBe('/post/45/comment/3');
                });
            });
        });
    });
});
