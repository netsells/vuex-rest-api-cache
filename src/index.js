import Vrac from '~/Vrac';
import parseMultiple from '~/parsers/multiple';
import parseSingle from '~/parsers/single';

import cacheMultiple from '~/cachers/multiple';
import cacheSingle from '~/cachers/single';
import cacheDestroy from '~/cachers/destroy';

import BaseModel from '~/base-model';

export default Vrac;
export {
    parseSingle,
    parseMultiple,
    cacheMultiple,
    cacheSingle,
    cacheDestroy,
    BaseModel,
};
