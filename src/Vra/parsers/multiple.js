/**
 * Parse the data from the API to get the models.
 *
 * @param {object} data - Data from the API.
 * @returns {Array<object>} Models.
 */
export default function({ data, meta }) {
    return {
        models: data,
        meta,
    };
}
