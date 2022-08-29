# API Reference

### Available routes

## POST `/dns-query`

Resolve name query using DNS message format provided by [dns-packet](https://github.com/mafintosh/dns-packet)

- **content-type:** application/dns-message
- **query body format:** raw (encoded with [dns-packet](https://github.com/mafintosh/dns-packet))
- **response format:** dns message in binary format

Example of a decoded dns message (question):
```json
{
  "type": "query",
  "id": 1,
  "flags": 256,
  "questions": [{
    "type": "A",
    "name": "example.dappy"
  }]
}
```

Example of a decoded dns message (answer):
```json
{
  "type": "query",
  "id": 1,
  "flags": 256,
  "questions": [{
    "type": "A",
    "name": "example.dappy"
  }],
  "answers": [{
   "answers": [{
      "type": "A",
      "class": "IN",
      "name": "example",
      "ttl": 3600,
      "data": "1.2.3.4"
  }]
}
```

# POST `/dns-query-extended`

Resolve name query using DNS message in json format.

It is the json format alternative to `/dns-query`, without DNS constraints on record lengths.

- **content-type:** application/json
- **query body format:** json
- **response format:** json

dns message have the same structure as the ones of `/dns-query`

### POST `/get-certificates`

Get certificates for a given list of records / names.

- **content-type:** application/json
- **query body format:** json ({ names: string[]})
- **response format:** dns message in JSON

Query example:
```json
{
   "names": ["example"]
}
```

Response example:
```json
{
   "rcode": 0,
   "type": "response",
   "flags": 0,
   "questions": [{
      "class": "IN",
      "name": "example",
      "type": "CERT"
   }],
   "answers": [{
      "type": "CERT",
      "class": "IN",
      "name": "example",
      "ttl": 3600,
      "data": "..."
   }]
}

```

### POST `/get-zones`

Get zones (string[]) and their records

**content-type:** application/json
**query body format:** string[] 
**response format:** json

Query example:
```json
["apple"]
```

Response example:
```json
{ 
   "result": [{
      "origin": "apple",
      "records": {
         "host": "@",
         "type": "TXT",
         "value": "OWNER=04ea33c48dff95cdff4f4211780a5b151570a9a2fac5e62e5fa545c1aa5be3539c34d426b046f985204815964e10fcd1d87ef88d9bcf43816ad1fa00934cfe4652"
      }
   }]
}

```

### POST `/mint-zone`

Mint a zone

**content-type:** application/json
**query body format:** json 
**response format:** json

Query example:
```json
{
 "data": {
  "zone": {
   "origin": "apple",
   "records": {
    "host": "@",
    "type": "TXT",
    "value": "OWNER=04ea33c48dff95cdff4f4211780a5b151570a9a2fac5e62e5fa545c1aa5be3539c34d426b046f985204815964e10fcd1d87ef88d9bcf43816ad1fa00934cfe4652"
   }
  },
  "date": 1661785885595
 },
 "signature": "304402204d73309c6d9878493da20dbf5137c8a66c90a36815a8d249c9711f83c2f3939b02204366a5b27f0a3e575ff9700db2e3efa4b9f794d00a619c8716016227e2a47299"
}
```

Response example:
```json
{
  "result": "ok" 
}
```

### POST `/update-zone`

Update a zone

**content-type:** application/json
**query body format:** json 
**response format:** json

Query example:
```json
{
 "data": {
  "zone": {
   "origin": "apple",
   "records": {
    "host": "@",
    "type": "TXT",
    "value": "OWNER=04ea33c48dff95cdff4f4211780a5b151570a9a2fac5e62e5fa545c1aa5be3539c34d426b046f985204815964e10fcd1d87ef88d9bcf43816ad1fa00934cfe4652"
   }
  },
  "date": 1661785885595
 },
 "signature": "304402204d73309c6d9878493da20dbf5137c8a66c90a36815a8d249c9711f83c2f3939b02204366a5b27f0a3e575ff9700db2e3efa4b9f794d00a619c8716016227e2a47299"
}
```

Response example:
```json
{
  "result": "ok" 
}
```