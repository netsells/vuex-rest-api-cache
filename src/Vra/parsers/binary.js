/**
 * Parse the data from the API to get the binary data.
 *
 * @param {object} data - Data from the API.
 * @returns {object}
 */
export default function(data) {
    return {
        model: data,
        meta: {},
    };
}
