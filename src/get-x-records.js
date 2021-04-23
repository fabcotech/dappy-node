const Ajv = require('ajv');
const rchainToolkit = require('rchain-toolkit');
const {
  readAllPursesTerm,
  readPursesDataTerm,
  readPursesTerm,
} = require('rchain-token');

const redisHgetall = require('./utils').redisHgetall;
const redisKeys = require('./utils').redisKeys;

const log = require('./utils').log;

const ajv = new Ajv();
const schema = {
  schemaId: 'get-x-records',
  type: 'object',
  properties: {
    names: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
  required: ['names'],
};
module.exports.schema = schema;

const recordSchema = {
  schemaId: 'dappy-record',
  type: 'object',
  properties: {
    address: {
      type: 'string',
    },
    publicKey: {
      type: 'string',
    },
    box: {
      type: 'string',
    },
    badges: {
      type: 'object',
    },
    servers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ip: {
            type: 'string',
          },
          host: {
            type: 'string',
          },
          cert: {
            type: 'string',
          },
          primary: {
            type: 'boolean',
          },
        },
        required: ['ip', 'host', 'cert'],
      },
    },
  },
  required: ['name', 'publicKey', 'servers'],
};
module.exports.schema = schema;

ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));

const validateRecord = ajv.compile(recordSchema);

const validate = ajv.compile(schema);

const storeRecord = async (id, record, redisClient) => {
  const valid = validateRecord(record);
  if (!valid) {
    log('invalid record ' + id);
    console.log(validate.errors);
    throw new Error('');
  }
  const redisSetValues = [];
  for (key of Object.keys(record)) {
    redisSetValues.push(key);
    if (key === 'servers') {
      redisSetValues.push(JSON.stringify(record[key]));
    } else if (key === 'badges') {
      redisSetValues.push(JSON.stringify(record[key]));
    } else {
      redisSetValues.push(record[key]);
    }
  }

  await new Promise((res, rej) => {
    let over = false;
    setTimeout(() => {
      if (!over) {
        over = true;
        rej('redis timeout error 1');
      }
    }, 5000);
    redisClient.hmset(
      `name:${process.env.REDIS_DB}:${record.name}`,
      ...redisSetValues,
      (err, resp) => {
        if (!over) {
          over = true;
          if (err) {
            log(err, 'error');
            return rej(err);
          }
          res();
        }
      }
    );
  });
  await new Promise((res, rej) => {
    let over = false;
    setTimeout(() => {
      if (!over) {
        over = true;
        rej('redis timeout error 2');
      }
    }, 5000);
    redisClient.sadd(
      `publicKey:${process.env.REDIS_DB}:${record.publicKey}`,
      record.name,
      (err, resp) => {
        if (!over) {
          over = true;
          if (err) {
            log(err, 'error');
            return rej(err);
          }
          res();
        }
      }
    );
  });
  // do that before resolving
  if (record.servers) {
    record.servers = JSON.stringify(record.servers);
  }
  if (record.badges) {
    record.badges = JSON.stringify(record.badges);
  }
  return record;
};

module.exports.getXRecordsWsHandler = async (
  body,
  redisClient,
  httpUrlReadOnly
) => {
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

  const missings = [];
  try {
    let results = await Promise.all(
      body.names.map(
        (n) =>
          new Promise((res, rej) => {
            redisKeys(redisClient, `name:${process.env.REDIS_DB}:${n}`)
              .then((keys) => {
                const key = keys.find(
                  (k) => k === `name:${process.env.REDIS_DB}:${n}`
                );
                if (typeof key === 'string') {
                  redisHgetall(redisClient, key).then((record) => {
                    res(record);
                  });
                } else {
                  missings.push(n);
                  res(null);
                }
              })
              .catch((err) => {
                log('redis error get keys for ' + n, 'error');
              });
          })
      )
    );

    if (missings.length) {
      let exploreDeployResponse;
      let exploreDeployResponseData;
      try {
        exploreDeployResponse = await rchainToolkit.http.exploreDeploy(
          httpUrlReadOnly,
          {
            term: readPursesTerm(process.env.RCHAIN_NAMES_REGISTRY_URI, {
              pursesIds: missings,
            }),
          }
        );
        exploreDeployResponseData = await rchainToolkit.http.exploreDeploy(
          httpUrlReadOnly,
          {
            term: readPursesDataTerm(process.env.RCHAIN_NAMES_REGISTRY_URI, {
              pursesIds: missings,
            }),
          }
        );
      } catch (err) {
        log('Name ' + body.name + ': could not explore-deploy ' + err, 'error');
        return {
          success: false,
          error: { message: 'explore-deploy request to the blockchain failed' },
        };
      }

      let pursesData;
      try {
        pursesData = rchainToolkit.utils.rhoValToJs(
          JSON.parse(exploreDeployResponseData).expr[0]
        );
      } catch (err) {
        log(
          'did not found records ' +
            missings.join(', ') +
            ' a new explore-deploy will be done next request',
          'warning'
        );
        // it simply means that none have been found
        return { success: true, records: results };
      }

      let purses;
      try {
        purses = rchainToolkit.utils.rhoValToJs(
          JSON.parse(exploreDeployResponse).expr[0]
        );
      } catch (err) {
        log('get-x-records could not parse purses ' + err, 'error');
        return {
          success: false,
          error: { message: 'parsing rchain-token purses failed' },
        };
      }

      const completeRecords = await Promise.all(
        Object.keys(purses).map((k) => {
          return new Promise((resolve) => {
            if (!pursesData[k]) {
              resolve(null);
              return;
            }
            try {
              record = JSON.parse(
                Buffer.from(pursesData[k], 'hex').toString('utf8')
              );
              const completeRecord = {
                ...record,
                name: k,
                publicKey: purses[k].publicKey,
                box: purses[k].box,
              };
              // redis cannot store undefined as value
              if (typeof purses[k].price === 'number') {
                completeRecord.price = purses[k].price;
              }
              if (!completeRecord.address) {
                delete completeRecord.address;
              }

              storeRecord(k, completeRecord, redisClient)
                .then((result) => resolve(result))
                .catch(() => resolve(null));
            } catch (err) {
              log('failed to parse record ' + k, 'warning');
              resolve(null);
            }
          });
        })
      );

      results = results.map((r, i) => {
        if (r === null) {
          const name = body.names[i];
          const missingIndex = missings.findIndex((n) => n === name);
          if (completeRecords[missingIndex]) {
            return completeRecords[missingIndex];
          } else {
            log(
              'did not found record ' +
                name +
                ' a new explore-deploy will be done next request',
              'warning'
            );
          }
          return r;
        }
        return r;
      });
    }

    return { success: true, records: results };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: { message: err },
    };
  }
};
