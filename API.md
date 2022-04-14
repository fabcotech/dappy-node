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