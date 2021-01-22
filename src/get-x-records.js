const Ajv = require('ajv');

const redisHgetall = require('./utils').redisHgetall;
const redisKeys = require('./utils').redisKeys;

const log = require('./utils').log;

const ajv = new Ajv();
const schema = {
  schemaId: 'get-x-records',
  type: 'object',
  properties: {
    name: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
  required: ['names'],
};
module.exports.schema = schema;

ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
const validate = ajv.compile(schema);

module.exports.getXRecordsWsHandler = async (body, redisClient) => {
  log('get-x-records');
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

  if (body.names.length > 5) {
    return {
      success: false,
      error: { message: 'max 5 names' },
    };
  }

  try {
    const results = await Promise.all(
      body.names.map(
        (n) =>
          new Promise((res, rej) => {
            redisKeys(redisClient, `name:${process.env.REDIS_DB}:${n}`)
              .then((keys) => {
                const key = keys.find(
                  (k) => k === `name:${process.env.REDIS_DB}:${body.name}`
                );
                res(typeof key === 'string' ? key : null);
              })
              .catch((err) => {
                log('redis error get keys for ' + n, 'error');
              });
          })
      )
    );

    return { records: results };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: { message: err },
    };
  }
};
