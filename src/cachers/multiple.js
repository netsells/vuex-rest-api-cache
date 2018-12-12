import single from './single';

/**
 * Add the models to the cache
 *
 * @param {Object} context
 * @param {Array<Object>} models
 */
export default function(context, models) {
    models.forEach(model => single(context, model));
}
