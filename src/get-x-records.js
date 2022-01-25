const Ajv = require('ajv');
const rchainToolkit = require('rchain-toolkit');
const {
  readPursesDataTerm,
  readPursesTerm,
  readBoxTerm,
} = require('rchain-token');

const { 
  redisHgetall,
  redisKeys,
} = require('./utils');

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

const recordSchema = {
  schemaId: 'dappy-record',
  type: 'object',
  properties: {
    // rchain-token properties
    id: {
      type: 'string',
    },
    publicKey: {
      type: 'string',
    },
    boxId: {
      type: 'string',
    },
    expires: {
      type: 'number',
    },
    price: {
      type: 'number',
    },

    // not rchain-token properties
    data: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
        },
        csp: {
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
    },
  },
  required: ['id', 'publicKey', 'boxId', 'data'],
};

ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));

const validateRecord = ajv.compile(recordSchema);

const validate = ajv.compile(schema);

const storeRecord = async (record, redisClient) => {
  const valid = validateRecord(record);
  if (valid === null) {
    log('invalid record ' + record.id);
    console.log(validate.errors);
    throw new Error('');
  }
  const match = record.id.match(/[a-z]([A-Za-z0-9]*)*/g);
  if (!match || (match.length !== 1 && match[0].length !== record.id.length)) {
    log('invalid record (regexp) ' + record.id);
    throw new Error('');
  }
  const redisSetValues = [];
  for (key of Object.keys(record)) {
    if (
      typeof record[key] === 'string' ||
      typeof record[key] === 'number' ||
      typeof record[key] === 'boolean' ||
      record[key] === null
    ) {
      redisSetValues.push(key);
      redisSetValues.push(record[key]);
    } else if (!!record[key] && record[key].constructor === Array) {
      redisSetValues.push(key);
      redisSetValues.push(JSON.stringify(record[key]));
    } else if (!!record[key] && record[key].constructor === Object) {
      redisSetValues.push(key);
      redisSetValues.push(JSON.stringify(record[key]));
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
    redisClient.hmset(`record:${record.id}`, ...redisSetValues, (err, resp) => {
      if (!over) {
        over = true;
        if (err) {
          log(err, 'error');
          return rej(err);
        }
        res();
      }
    });
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
      `publicKey:${record.publicKey}`,
      record.id,
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

  // just like if it came out from redis
  if (record.data) {
    record.data = JSON.stringify(record.data);
  }
  return record;
};

const cacheNegativeRecords = hset => async (names) => {
  return Promise.all(
    names.map(
      name => hset(`record:${name}`, 'notfound', 'true')
    )
  );
}

const getXRecordsWsHandler = async (
  body,
  redisClient,
  urlOrOptions
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
            redisKeys(redisClient, `record:${n}`)
              .then((keys) => {
                const key = keys.find((k) => k === `record:${n}`);
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
          urlOrOptions,
          {
            term: readPursesTerm({
              masterRegistryUri: process.env.RCHAIN_NAMES_MASTER_REGISTRY_URI,
              contractId: process.env.RCHAIN_NAMES_CONTRACT_ID,
              pursesIds: missings,
            }),
          }
        );
        exploreDeployResponseData = await rchainToolkit.http.exploreDeploy(
          urlOrOptions,
          {
            term: readPursesDataTerm({
              masterRegistryUri: process.env.RCHAIN_NAMES_MASTER_REGISTRY_URI,
              contractId: process.env.RCHAIN_NAMES_CONTRACT_ID,
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

      if (Object.keys(purses).length === 0) {
        await cacheNegativeRecords(redisClient.hset.bind(redisClient))(body.names);
      }

      const completeRecords = await Promise.all(
        Object.keys(purses).map((k) => {
          return new Promise(async (resolve) => {
            if (!pursesData[k]) {
              resolve(null);
              return;
            }
            let boxConfig;
            try {
              const boxKeys = await redisKeys(
                redisClient,
                `box:${purses[k].boxId}`
              );
              const boxKey = boxKeys.find(
                (bk) => bk === `box:${purses[k].boxId}`
              );
              if (typeof boxKey === 'string') {
                const hg = await redisHgetall(redisClient, boxKey);
                boxConfig = JSON.parse(hg.values);
              } else {
                const exploreDeployResponseBox =
                  await rchainToolkit.http.exploreDeploy(urlOrOptions, {
                    term: readBoxTerm({
                      masterRegistryUri:
                        process.env.RCHAIN_NAMES_MASTER_REGISTRY_URI,
                      boxId: purses[k].boxId,
                    }),
                  });
                try {
                  boxConfig = rchainToolkit.utils.rhoValToJs(
                    JSON.parse(exploreDeployResponseBox).expr[0]
                  );
                } catch (err) {
                  log('could not get box ' + missings.join(', ') + '', 'error');
                  // it simply means that none have been found
                  resolve(null);
                  return;
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
                    `box:${purses[k].boxId}`,
                    'values',
                    JSON.stringify(boxConfig),
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
              }

              const buf = Buffer.from(pursesData[k], 'hex');
              if (buf.length > 16184) {
                log('ignoring record ' + k + ' : length > 16184', 'warning');
                resolve(null);
                return;
              }
              const data = JSON.parse(buf.toString('utf8'));
              const completeRecord = {
                // rchain-token purse
                id: k,
                publicKey: boxConfig.publicKey,
                boxId: purses[k].boxId,

                // rchain-token data
                data: data,
              };
              // redis cannot store undefined as value
              // price will be stored in redis, and sent back to client as string
              if (
                typeof purses[k].price === 'number' &&
                !isNaN(purses[k].price)
              ) {
                completeRecord.price = purses[k].price;
              }
              if (
                typeof purses[k].expires === 'number' &&
                !isNaN(purses[k].expires)
              ) {
                completeRecord.expires = purses[k].expires;
              }

              storeRecord(completeRecord, redisClient)
                .then((result) => resolve(result))
                .catch((err) => resolve(null));
            } catch (err) {
              console.log(err);
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
}

module.exports = {
  schema,
  getXRecordsWsHandler,
  cacheNegativeRecords,
};