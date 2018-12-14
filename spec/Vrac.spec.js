import axios from 'axios';
import Vrac from '~/index';

describe('Vrac', () => {
    let instance;

    it('exports Vrac', () => {
        expect(Vrac).toBeDefined();
        expect(Vrac.name).toBe('Vrac');
    });

    describe('requestAdapter', () => {
        beforeEach(() => {
            jest.spyOn(axios, 'request').mockImplementation(() => Promise.resolve({}));
        });

        it('calls axios with the passed params', () => {
            const requestParams = { foo: 'bar' };
            Vrac.requestAdapter(requestParams);
            expect(axios.request).toHaveBeenCalledWith(requestParams);
        });

        describe('when instantiated', () => {
            beforeEach(() => {
                instance = new Vrac({
                    baseUrl: '/',
                });
            });

            describe('when requestAdapter changed', () => {
                let self;
                let called;
                let oldRequestAdapter;

                beforeEach(() => {
                    called = false;
                    oldRequestAdapter = Vrac.requestAdapter;

                    Vrac.requestAdapter = function(params, context) {
                        called = true;
                        self = this;

                        return Promise.resolve({
                            data: [],
                        });
                    };

                    jest.spyOn(Vrac, 'requestAdapter');
                });

                afterEach(() => {
                    Vrac.requestAdapter = oldRequestAdapter;
                });

                describe('when index called', () => {
                    let storeContext;
                    let jsContext;

                    beforeEach(() => {
                        storeContext = { commit: () => {} };
                        jsContext = { js: 'context' };

                        instance.actions.index.call(jsContext, storeContext);
                    });

                    it('calls the new requestAdapter', () => {
                        expect(called).toBe(true);
                    });

                    it('calls the new requestAdapter with the store context', () => {
                        expect(Vrac.requestAdapter)
                            .toHaveBeenCalledWith(expect.any(Object), storeContext);
                    });

                    it('calls the new requestAdapter with the store function context', () => {
                        expect(self).toBe(jsContext);
                    });
                });
            });
        });
    });

    describe('only index', () => {
        beforeEach(() => {
            instance = new Vrac({
                only: ['index'],
            });
        });

        it('creates the index call only', () => {
            expect(instance.calls.length).toBe(1);

            const names = instance.calls.map(({ name }) => name);

            expect(names).toContain('index');
        });
    });

    describe('only read no array', () => {
        beforeEach(() => {
            instance = new Vrac({
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
            instance = new Vrac({
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
            instance = new Vrac();
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
            instance = new Vrac({
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

            describe('when passed the needed field and an id', () => {
                it('returns the URL with the field applied and id appended', () => {
                    expect(instance.getUrl({ post_id: 45, id: 3 })).toBe('/post/45/comment/3');
                });
            });
        });
    });
});
