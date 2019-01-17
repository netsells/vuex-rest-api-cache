/**
 * Parse the data from the API to get the model
 *
 * @param {Object} data - Data from the API
 * @param {Object} fields - Fields used to read/create/update the model
 * @returns {Object} model
 */
export default function({ data }, fields) {
    return data || fields;
}
