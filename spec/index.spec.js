import Vrac from '~/index';

describe('index', () => {
    it('exports Vrac', () => {
        expect(Vrac).toBeDefined();
        expect(Vrac.name).toBe('Vrac');
    });

    describe('instance', () => {
        let instance;

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
    });
});
