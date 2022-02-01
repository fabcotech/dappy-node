const Ajv = require('ajv');

const redisHgetall = require('./utils').redisHgetall;
const redisSMembers = require('./utils').redisSMembers;

const log = require('./utils').log;

const ajv = new Ajv();
const schema = {
  schemaId: 'get-x-records-by-public-key',
  type: 'object',
  properties: {
    publicKeys: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
  required: ['publicKeys'],
};
module.exports.schema = schema;

ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
const validate = ajv.compile(schema);

module.exports.getXRecordsByPublicKeyWsHandler = async (body, redisClient) => {
  log('get-x-records-by-public-key');
  const valid = validate(body);

  if (!valid) {
    return {
      success: false,
      error: {
        message: validate.errors.map((e) => `body${e.dataPath} ${e.message}`),
      },
    };
  }

  await new Promise((r) => setTimeout(r, 5000));

  if (body.publicKeys.length > 5) {
    return {
      success: false,
      error: { message: 'max 5 public keys' },
    };
  }

  try {
    const results = await Promise.all(
      body.publicKeys.map(
        (n) =>
          new Promise((res) => {
            redisClient.keys(`publicKey:${n}`)
              .then((keys) => {
                const key = keys.find((k) => k === `publicKey:${n}`);
                if (typeof key === 'string') {
                  redisSMembers(redisClient, key).then((names) => {
                    Promise.all(
                      names.map((name) => {
                        return new Promise((res2) => {
                          redisClient.keys(`record:${name}`)
                            .then((keys2) => {
                              const key2 = keys2.find(
                                (k) => k === `record:${name}`
                              );
                              if (typeof key2 === 'string') {
                                redisHgetall(redisClient, key2).then(
                                  (record) => {
                                    res2(record);
                                  }
                                );
                              } else {
                                res2(null);
                              }
                            })
                            .catch((err) => {
                              log('redis error get keys for ' + n, 'error');
                            });
                        });
                      })
                    ).then((a) => {
                      res(a);
                    });
                  });
                } else {
                  res([]);
                }
              })
              .catch((err) => {
                log('redis error get keys for ' + n, 'error');
              });
          })
      )
    );

    let records = [];
    results.forEach((r) => {
      records = records.concat(r.filter((a) => !!a));
    });

    return { records: records, success: true };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: { message: err },
    };
  }
};
