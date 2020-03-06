/**
 * Base class for model classes.
 *
 * Can extend this and add helper functions for the models.
 */
export default class BaseModel {
    /**
     * Instantiate the model.
     *
     * @param {object} fields
     */
    constructor(fields) {
        Object.assign(this, fields);
    }

    /**
     * Allows nuxt/devalue to transfer this model from SSR to client side
     * without warnings.
     *
     * @returns {object}
     */
    toJSON() {
        const fields = Object.keys(this).reduce((obj, key) => ({
            ...obj,
            [key]: this[key],
        }), {});

        return JSON.stringify(fields);
    }
}
