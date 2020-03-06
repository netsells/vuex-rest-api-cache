/**
 * Parse the data from the API to get the model.
 *
 * @param {object} data - Data from the API.
 * @param {object} fields - Fields used to read/create/update the model.
 * @returns {object} Model.
 */
export default function({ data }, fields) {
    return {
        model: data || fields,
        meta: {},
    };
}
