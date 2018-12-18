/**
 * Base class for model classes
 *
 * Can extend this and add helper functions for the models
 */
export default class BaseModel {
    /**
     * Instantiate the model
     *
     * @param {Object} fields
     */
    constructor(fields) {
        Object.assign(this, fields);
    }
}
