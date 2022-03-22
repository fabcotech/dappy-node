type ValuePredicat = (v: any) => boolean;

export const not = (fn: ValuePredicat) => (v: any) => !fn(v);

export const isUndefined = (v: any) => v === undefined;

export function isStringNotEmpty(v: string) {
  return typeof v === 'string' && v.length > 0;
}

export function isNumber(v: number) {
  return typeof v === 'number';
}

export const urlRegExp = /^(.+):\/\/([\w\\.]+)(?::(\d+))?$/;

export function isProtocolUrl(protocol: string) {
  return (v: string) => {
    if (!isStringNotEmpty(v)) return false;
    const match = v.match(urlRegExp) || [];
    if (!match) {
      return false;
    }
    const [, scheme] = match;
    return scheme === protocol;
  };
}

export const isHttpUrl = isProtocolUrl('http');

export const isHttpsUrl = isProtocolUrl('https');

export function isBoolean(v: any) {
  return typeof v === 'boolean';
}

export const match = (regExp: RegExp) => (v: string) => {
  return isStringNotEmpty(v) && regExp.test(v);
};

const ipv4Regex = /\b((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.|$)){4}\b/;
export function isIPv4(v: string) {
  return match(ipv4Regex)(v);
}

const ipv6Regex =
  /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/;
export function isIPv6(v: string) {
  return match(ipv6Regex)(v);
}

export function isIP(v: string) {
  return isIPv4(v) || isIPv6(v);
}

const base64Regex =
  /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
export function isBase64String(v: string) {
  return match(base64Regex)(v);
}

export const isOptional = (fn: ValuePredicat) => (v: any) => {
  return v === undefined || fn(v);
};

export const isObjectWith =
  (schema: { [key: string]: ValuePredicat }) => (v: any) => {
    if (typeof v !== 'object') {
      return false;
    }

    return Object.keys(schema).every((key) => schema[key](v[key]));
  };

export const isArrayNotEmptyOf = (predicat: ValuePredicat) => (v: any) => {
  if (!Array.isArray(v)) {
    return false;
  }

  return v.every(predicat);
};

export const isOneOf = (predicats: ValuePredicat[]) => (v: any) => {
  return predicats.some((predicat) => predicat(v));
};
