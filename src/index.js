import Vrac from '~/Vrac';
import parseMultiple from '~/parsers/multiple';
import parseSingle from '~/parsers/single';
import parseNone from '~/parsers/none';

import cacheMultiple from '~/cachers/multiple';
import cacheSingle from '~/cachers/single';
import cacheNone from '~/cachers/none';
import cacheDestroy from '~/cachers/destroy';

export default Vrac;
export {
    parseNone,
    parseSingle,
    parseMultiple,
    cacheMultiple,
    cacheSingle,
    cacheNone,
    cacheDestroy,
};
