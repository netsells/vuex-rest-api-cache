import single from './single';

/**
 * Add the models to the cache.
 *
 * @param {object} context
 * @param {Array<object>} models
 */
export default function(context, models) {
    models.forEach(model => single(context, model));
}
