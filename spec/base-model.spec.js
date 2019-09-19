import { BaseModel } from '~/index';

/**
 * Basic model
 */
class Model extends BaseModel {
    /**
     * Basic method
     * @returns {*}
     */
    something() {
        return 'something';
    }
}

describe('BaseModel', () => {
    describe('when instantiated', () => {
        let model;

        beforeEach(() => {
            model = new Model({ foo: 'bar' });
        });

        describe('toJSON', () => {
            it('returns json version of the model', () => {
                expect(model.toJSON()).toEqual(JSON.stringify({ foo: 'bar' }));
            });
        });
    });
});
