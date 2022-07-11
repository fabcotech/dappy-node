import { NameZone } from './NameZone';
import { NamePacket, ReturnCode, PacketType } from './NamePacket';

import { mergeDeep } from '../utils/mergeDeep';
import { RRA, RRAAAA, RRCERT, RRCSP, RRTXT } from './ResourceRecords';

export const fakeSelfSignedCert = Buffer.from(
  `-----BEGIN CERTIFICATE-----
MIIEZzCCAs+gAwIBAgIRAKOiJf1OO3+OOR+peyH8HsQwDQYJKoZIhvcNAQELBQAw
gZsxHjAcBgNVBAoTFW1rY2VydCBkZXZlbG9wbWVudCBDQTE4MDYGA1UECwwvcGF1
bG11c3NvQG1hY2Jvb2stcHJvLWRlLXBhdWwuaG9tZSAoUGF1bCBNdXNzbykxPzA9
BgNVBAMMNm1rY2VydCBwYXVsbXVzc29AbWFjYm9vay1wcm8tZGUtcGF1bC5ob21l
IChQYXVsIE11c3NvKTAeFw0xOTA2MDEwMDAwMDBaFw0zMjAxMjEwNzUxMTFaMFQx
JzAlBgNVBAoTHm1rY2VydCBkZXZlbG9wbWVudCBjZXJ0aWZpY2F0ZTEpMCcGA1UE
CwwgcGF1bG11c3NvQHBhdWxtdXNzbyAoUGF1bCBNdXNzbykwggEiMA0GCSqGSIb3
DQEBAQUAA4IBDwAwggEKAoIBAQCvtXVLZMG1STKBsP0CyghD29zd1tzKjfDEJntv
3dsToaUssI0UTwYJayCV4KxPTZCOediw3+bW8Ir9P51YtPBah9tykUK/ScNYGKdC
IE+wJ66IhVbM3lWbNBXTsyN4gnZ9C6+ff7CZe+Uf7wFBjVdbi9nWq+LlkOxFvNN5
dIBOIRokuAjHBv4/6fUlQcuRL3O2v4BxKQdgBhWCGFfMydqdR2lGevo7VK8TbOsl
j2+lXFqt/DsyI96qg/TF0S2yOdhHaj/9tjvJAtCQT5KQTPCZChXkzRqdOfo9J2cc
Fiy/75VQbAsKVu7VpE1NUCuFV0ey/6sBZoN4mDta9CJGrdStAgMBAAGjbDBqMA4G
A1UdDwEB/wQEAwIFoDATBgNVHSUEDDAKBggrBgEFBQcDATAMBgNVHRMBAf8EAjAA
MB8GA1UdIwQYMBaAFBU2h1vbv73nbFmEw18jbc+2bbOqMBQGA1UdEQQNMAuCCWxv
Y2FsaG9zdDANBgkqhkiG9w0BAQsFAAOCAYEAn6O3w9r32ap3R5497QvaJjyyzcZ3
FcQjmXGEELUXETCmv8EwN2b+foO6wWtmgV7GwF1wWeqLtf8FnP0m9X5kBcNDXbtm
Ojyq9sL3l3uXPQFZ/2oJunT9F2ZR227VNvXCh3IaKknMVs1aNjNztsofKyqe/n+D
GrGNY9dfwvWJ+5rBOW9ahI5kVs1Fv0imUwYN3YbbkUkiuemPi5fbQ+5wn0keoScf
Kdj/gbMk7iJOuxMBF/p6+yJYuClMeHq23DF0PFnvon5JbRY1EueUyQ88xkp11Yfm
F6ed6qYuzR2MJARBvvrdTVoqDryyuIaoyhBfTwvRFiwHZO2wyxysPcmj3yy3PPgP
fDQl9eM6cTrZentozYhB+UkyuNeZJLAm7MhiCEx3f7FVYXBZEg8SVGVDZ2tibzSk
G72GCuXuXPANhMpPHbn3ht3p8yt9kB5WEOHuM4B189iExrzugmNDp2yXisrlrKxf
FdKAoYx5XTW11Yd8GoEhlWNAAf0YhZCAi5WU
-----END CERTIFICATE-----`,
  'ascii'
).toString('base64');

const fakeCSP = "default-src 'self' *.source-sure.example.net";

export const createRRA = (rra: Partial<RRA> = {}): RRA => {
  return mergeDeep(
    {
      name: '@',
      type: 'A',
      data: '127.0.0.1',
    },
    rra
  );
};

export const createRRAAAA = (rraaaa: Partial<RRAAAA> = {}): RRAAAA => {
  return mergeDeep(
    {
      name: '@',
      type: 'AAAA',
      data: '::1',
    },
    rraaaa
  );
};

export const createRRTXT = (rrtxt: Partial<RRTXT> = {}): RRTXT => {
  return mergeDeep(
    {
      name: '@',
      type: 'TXT',
      data: 'label=value',
    },
    rrtxt
  );
};

export const createRRCERT = (rrcert: Partial<RRCERT> = {}): RRCERT => {
  return mergeDeep(
    {
      name: '@',
      type: 'CERT',
      data: fakeSelfSignedCert,
    },
    rrcert
  );
};

export const createRRCSP = (rrcsp: Partial<RRCSP> = {}): RRCSP => {
  return mergeDeep(
    {
      name: '@',
      type: 'CSP',
      data: fakeCSP,
    },
    rrcsp
  );
};

export const createNameZone = (zone: Partial<NameZone> = {}): NameZone => {
  return mergeDeep(
    {
      origin: 'example',
      ttl: 3600,
      records: [
        createRRA(),
        createRRAAAA(),
        createRRCERT(),
        createRRTXT(),
        createRRCSP(),
        createRRA({ name: 'foo' }),
        createRRAAAA({ name: 'foo' }),
        createRRCERT({ name: 'foo' }),
        createRRTXT({ name: 'foo' }),
        createRRCSP({ name: 'foo' }),
      ],
    },
    zone
  );
};

export const createNamePacketQuery = (
  packet: Partial<NamePacket> = {}
): NamePacket => {
  return mergeDeep(
    {
      type: PacketType.QUERY,
      rcode: ReturnCode.NOERROR,
      id: 0,
      flags: 0,
      questions: [
        {
          name: 'example.d',
          type: 'A',
          class: 'IN',
        },
      ],
    },
    packet
  );
};

export const createNamePacketSuccessResponse = (
  packet: Partial<NamePacket> = {}
): NamePacket => {
  return mergeDeep(
    {
      type: PacketType.RESPONSE,
      rcode: ReturnCode.NOERROR,
      id: 0,
      flags: 0,
      questions: [
        {
          name: 'example.d',
          type: 'A',
          class: 'IN',
        },
      ],
      answers: [
        {
          name: 'example.d',
          type: 'A',
          class: 'IN',
          ttl: 60,
          data: '127.0.0.1',
        },
      ],
    },
    packet
  );
};

export const createNamePacketErrorResponse = (
  packet: Partial<NamePacket> = {}
): NamePacket => {
  return mergeDeep(
    {
      type: PacketType.RESPONSE,
      rcode: ReturnCode.SERVFAIL,
      id: 0,
      flags: 0,
      questions: [
        {
          name: 'example.d',
          type: 'A',
          class: 'IN',
        },
      ],
      answers: [],
    },
    packet
  );
};
