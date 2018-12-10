import Vrac from '~/index';

describe('index', () => {
    it('exports Vrac', () => {
        expect(Vrac).toBeDefined();
        expect(Vrac.name).toBe('Vrac');
    });
});
