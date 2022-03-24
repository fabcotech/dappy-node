import { JSONObject } from '../utils/json';
import {
  isArrayNotEmptyOf,
  isNumber,
  isObjectWith,
  isOptional,
  isStringNotEmpty,
  isUndefined,
  match,
  not,
} from '../utils/validation';
import { RecordType, RRData, recordTypeRegExp } from './ResourceRecords';

export type NameClass = 'IN';

export type NameQuestion = {
  type: RecordType;
  class: NameClass;
  name: string;
};

export type NameAnswer = {
  type: RecordType;
  class: NameClass;
  name: string;
  ttl: number;
  data: RRData;
};

// DNS RCODEs in https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml
export enum ReturnCode {
  NOERROR = 'NOERROR', // DNS Query completed successfully
  FORMERR = 'FORMERR', //  DNS Query Format Error
  SERVFAIL = 'SERVFAIL', // Server failed to complete the DNS request
  NXDOMAIN = 'NXDOMAIN', //  Domain name does not exist.
  NOTIMP = 'NOTIMP', //  Function not implemented
  REFUSED = 'REFUSED', // The server refused to answer for the query
  YXDOMAIN = 'YXDOMAIN', //  Name that should not exist, does exist
  XRRSET = 'YXDOMAIN', //  RRset that should not exist, does exist
  NOTAUTH = 'NOTAUTH', //  Server not authoritative for the zone
  NOTZONE = 'NOTZONE', //  Name not in zone
}
export enum PacketType {
  QUERY = 'query',
  RESPONSE = 'response',
}

// As described in https://datatracker.ietf.org/doc/html/rfc1035#section-4.1
export type NamePacket = {
  version: string;
  type: PacketType;
  rcode: ReturnCode;
  id?: number;
  flags: number;
  questions: NameQuestion[];
  answers: NameAnswer[];
  additionals: [];
  authorities: [];
};

export const isNamePacket = (packet: JSONObject): packet is NamePacket =>
  isObjectWith({
    // version: isStringNotEmpty,
    type: match(/^(query|response)$/),
    rcode: isStringNotEmpty,
    id: isOptional(isNumber),
    flags: isNumber,
    questions: isArrayNotEmptyOf(
      isObjectWith({
        type: match(recordTypeRegExp),
        class: match(/^IN$/),
        name: isStringNotEmpty,
      }),
    ),
    answers: isOptional(
      isArrayNotEmptyOf(
        isObjectWith({
          type: match(recordTypeRegExp),
          class: match(/^IN$/),
          name: isStringNotEmpty,
          ttl: isNumber,
          data: not(isUndefined),
        }),
      ),
    ),
  })(packet);
