const Ajv = require('ajv');

const { log } = require('../../utils');

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

  await new Promise((r) => {
    setTimeout(r, 5000);
  });

  if (body.publicKeys.length > 5) {
    return {
      success: false,
      error: { message: 'max 5 public keys' },
    };
  }

  try {
    const results = await Promise.all(
      body.publicKeys.map(
        (n) => new Promise((res) => {
          redisClient.keys(`publicKey:${n}`)
            .then((keys) => {
              const key = keys.find((k) => k === `publicKey:${n}`);
              if (typeof key === 'string') {
                redisClient.sMembers(key).then((names) => {
                  Promise.all(
                    names.map((name) => new Promise((res2) => {
                      redisClient.keys(`record:${name}`)
                        .then((keys2) => {
                          const key2 = keys2.find(
                            (k) => k === `record:${name}`,
                          );
                          if (typeof key2 === 'string') {
                            redisClient.hGetAll(key2).then((record) => {
                              res2(record);
                            });
                          } else {
                            res2(null);
                          }
                        })
                        .catch(() => {
                          log(`redis error get keys for ${n}`, 'error');
                        });
                    })),
                  ).then((a) => {
                    res(a);
                  });
                });
              } else {
                res([]);
              }
            })
            .catch(() => {
              log(`redis error get keys for ${n}`, 'error');
            });
        }),
      ),
    );

    let records = [];
    results.forEach((r) => {
      records = records.concat(r.filter((a) => !!a));
    });

    return { records, success: true };
  } catch (err) {
    log(err);
    return {
      success: false,
      error: { message: err },
    };
  }
};
