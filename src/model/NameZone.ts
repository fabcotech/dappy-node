import {
  isObjectWith,
  isArrayNotEmptyOf,
  isNumber,
  isOneOf,
  isStringNotEmpty,
} from '../utils/validation';

import {
  isRRA,
  isRRAAAA,
  isRRCERT,
  isRRCSP,
  isRRTXT,
  RR,
} from './ResourceRecords';
import { JSONObject } from '../utils/json';

export type NameZone = {
  origin: string;
  ttl?: number;
  records: RR[];
};

export const isNameZone = (data: JSONObject): data is NameZone => {
  return isObjectWith({
    origin: isStringNotEmpty,
    ttl: isNumber,
    records: isArrayNotEmptyOf(
      isOneOf([isRRA, isRRAAAA, isRRCERT, isRRTXT, isRRCSP])
    ),
  })(data);
};
