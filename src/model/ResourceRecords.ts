import {
  isObjectWith,
  isOptional,
  isStringNotEmpty,
  isNumber,
  match,
} from '../utils/validation';

import { JSONObject } from '../utils/json';

export enum RecordType {
  A = 'A',
  AAAA = 'AAAA',
  CERT = 'CERT',
  TXT = 'TXT',
}

export const recordTypeRegExp = /^(A|AAAA|CERT|TXT)$/;

export type ResourceRecord = {
  name: string;
  ttl?: number;
};

// Simplified version of A RR from RFC 1035
export type RRA = ResourceRecord & {
  data: string;
  type: 'A';
};

export const isRRA = (data: JSONObject): data is RRA =>
  isObjectWith({
    name: isStringNotEmpty,
    ttl: isOptional(isNumber),
    data: isStringNotEmpty,
    type: match(/^A$/),
  })(data);

// Simplified version of AAAA RR from RFC 1035
export type RRAAAA = ResourceRecord & {
  data: string;
  type: 'AAAA';
};

export const isRRAAAA = (data: JSONObject): data is RRAAAA =>
  isObjectWith({
    name: isStringNotEmpty,
    ttl: isOptional(isNumber),
    data: isStringNotEmpty,
    type: match(/^AAAA$/),
  })(data);

export type RRCERT = ResourceRecord & {
  data: string;
  type: 'CERT';
};

export const isRRCERT = (data: JSONObject): data is RRCERT =>
  isObjectWith({
    name: isStringNotEmpty,
    ttl: isOptional(isNumber),
    data: isStringNotEmpty,
    type: match(/^CERT$/),
  })(data);

export type RRTXT = ResourceRecord & {
  data: string;
  type: 'TXT';
};

export const isRRTXT = (data: JSONObject): data is RRTXT =>
  isObjectWith({
    name: isStringNotEmpty,
    ttl: isOptional(isNumber),
    data: isStringNotEmpty,
    type: match(/^TXT$/),
  })(data);

export type RR = RRA | RRAAAA | RRCERT | RRTXT;

export type RRAData = string;
export type RRAAAAData = string;
export type RRCERTData = string;
export type RRTXTData = string;

export type RRData = RRAData | RRAAAAData | RRCERTData | RRTXTData;
