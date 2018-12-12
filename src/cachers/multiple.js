import single from './single';

export default function(context, models) {
    models.forEach(model => single(context, model));
}
