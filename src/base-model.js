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
