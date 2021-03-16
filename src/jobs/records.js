const rchainToolkit = require('rchain-toolkit');
const Ajv = require('ajv');
require('dotenv').config();
const { log } = require('../utils');
const {
  readPursesIdsTerm,
  readPursesDataTerm,
  readPursesTerm,
} = require('rchain-token');

const { redisKeys, getManyBagsDataTerm } = require('../utils');

const ajv = new Ajv();
const schema = {
  schemaId: 'dappy-record',
  type: 'object',
  properties: {
    address: {
      type: 'string',
    },
    publicKey: {
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
const validate = ajv.compile(schema);

const storeRecord = async (id, record, redisClient) => {
  const valid = validate(record);
  if (!valid) {
    log('invalid record ' + id);
    console.log(validate.errors);
    return;
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
            return rej(err);
          }
          res(resp);
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
            return rej(err);
          }
          res(resp);
        }
      }
    );
  });
};

const storeRecordsInRedis = async (
  pursesIds,
  redisClient,
  httpUrlReadOnly,
  special
) => {
  const nameKeys = await redisKeys(
    redisClient,
    `name:${process.env.REDIS_DB}:*`
  );
  if (nameKeys.length) {
    await new Promise((res, rej) => {
      redisClient.del(...nameKeys, (err, resp) => {
        if (err) {
          return rej(err);
        }
        res(resp);
      });
    });
  }
  const publickeyKeys = await redisKeys(
    redisClient,
    `publicKey:${process.env.REDIS_DB}:*`
  );
  if (publickeyKeys.length) {
    await new Promise((res, rej) => {
      redisClient.del(...publickeyKeys, (err, resp) => {
        if (err) {
          return rej(err);
        }
        res(resp);
      });
    });
  }

  return new Promise(async (resolve, reject) => {
    const validKeys = pursesIds.filter((name) => /^[a-z][a-z0-9]*$/.test(name));

    let specialNames = 0;
    // a special name is special1,name1,name2,name3 for example
    if (special) {
      specialNames = pursesIds.filter((name) => {
        return name.startsWith(special.name) && /^[a-z][a-z0-9,]*$/.test(name);
      }).length;
    }

    const l = validKeys.length;
    let i = 0;
    let successes = 0;
    const retrieveRecord = async () => {
      const k = validKeys[i];
      if (!k) {
        if (i === l - 1 || l === 0 || i >= l) {
          resolve([successes, l, specialNames]);
        } else {
          i += 1;
          await retrieveRecord();
        }
        return;
      }

      const recordsToProcess = [];
      // 100 by 100
      for (let j = 0; j < 100; j += 1) {
        if (validKeys[i + j]) {
          recordsToProcess.push(validKeys[i + j]);
        }
      }
      log(
        'indexing from rank ' +
          i +
          ' to rank ' +
          (i + recordsToProcess.length - 1)
      );

      const n = recordsToProcess.length;
      let tt = new Date().getTime();

      let exploreDeployResponse;
      let exploreDeployResponseData;
      try {
        exploreDeployResponse = await rchainToolkit.http.exploreDeploy(
          httpUrlReadOnly,
          {
            term: readPursesTerm(process.env.RCHAIN_NAMES_REGISTRY_URI, {
              pursesIds: recordsToProcess,
            }),
          }
        );
        exploreDeployResponseData = await rchainToolkit.http.exploreDeploy(
          httpUrlReadOnly,
          {
            term: readPursesDataTerm(process.env.RCHAIN_NAMES_REGISTRY_URI, {
              pursesIds: recordsToProcess,
            }),
          }
        );
      } catch (err) {
        log('Name ' + k + ': could not explore-deploy ' + err, 'error');
        if (i === l - n) {
          resolve([successes, l, specialNames]);
        } else {
          i += n;
          await retrieveRecord();
        }
        return;
      }

      const pursesData = rchainToolkit.utils.rhoValToJs(
        JSON.parse(exploreDeployResponseData).expr[0]
      );
      const purses = rchainToolkit.utils.rhoValToJs(
        JSON.parse(exploreDeployResponse).expr[0]
      );

      const dataKeys = Object.keys(pursesData);

      if (dataKeys.length === 0) {
        if (i === l - n) {
          resolve([successes, l, specialNames]);
        } else {
          i += n;
          await retrieveRecord();
        }
        return;
      }
      for (let j = 0; j < dataKeys.length; j += 1) {
        let record = undefined;
        try {
          record = JSON.parse(
            Buffer.from(pursesData[dataKeys[j]], 'hex').toString('utf8')
          );
          const completeRecord = {
            ...record,
            name: dataKeys[j],
            publicKey: purses[dataKeys[j]].publicKey,
          };
          // redis cannot store undefined as value
          if (typeof purses[dataKeys[j]].price === 'number') {
            completeRecord.price = purses[dataKeys[j]].price;
          }
          if (!completeRecord.address) {
            delete completeRecord.address;
          }

          try {
            await storeRecord(dataKeys[j], completeRecord, redisClient);
            successes += 1;
          } catch (err) {
            log('redis error', 'error');
            reject(err);
            return;
          }
        } catch (err) {
          log('failed to parse record ' + validKeys[i + j], 'warning');
          console.log(err);
        }
      }

      if (i === l - n) {
        resolve([successes, l, specialNames]);
      } else {
        i += n;
        await retrieveRecord();
      }
    };

    await retrieveRecord();
  });
};

module.exports.getDappyRecordsAndSaveToDb = async (
  redisClient,
  httpUrlReadOnly,
  special
) => {
  log('==== START started names job');

  try {
    exploreDeployResponse = await rchainToolkit.http.exploreDeploy(
      httpUrlReadOnly,
      {
        term: readPursesIdsTerm(process.env.RCHAIN_NAMES_REGISTRY_URI),
      }
    );
  } catch (err) {
    log('Could not get data at name ' + err, 'error');
    return;
  }

  let parsedResponse;
  try {
    parsedResponse = JSON.parse(exploreDeployResponse);
  } catch (err) {
    log('Could parse explore-deploy response as JSON', 'error');
    console.log(exploreDeployResponse);
    return;
  }

  if (!parsedResponse.expr || !parsedResponse.expr[0]) {
    log(
      'Could not get .expr[0], make sure that the Dappy records contract has been deployed, value:',
      'error'
    );
    console.log(parsedResponse);
    return;
  }

  let pursesIds;
  try {
    pursesIds = rchainToolkit.utils.rhoValToJs(parsedResponse.expr[0]);
  } catch (err) {
    log('Something went wrong when querying the node, value:', 'error');
    console.log(err);
    return;
  }
  pursesIds = pursesIds.filter((a) => a !== '0');

  const a = new Date().getTime();
  try {
    const recordsProcessed = await storeRecordsInRedis(
      pursesIds,
      redisClient,
      httpUrlReadOnly,
      special
    );

    const s = Math.round((100 * (new Date().getTime() - a)) / 1000) / 100;
    log(
      `==== END successfully stored ${recordsProcessed[0]} (valid) / ${recordsProcessed[1]} (total) records from the blockchain, in ${s} seconds`
    );
    if (special) {
      log(
        `==== END ${recordsProcessed[2]} special keys for special operation ${special.name}`
      );
    }
    return recordsProcessed;
  } catch (err) {
    log(
      'Something went wrong when initialized the storing of records',
      'error'
    );
    log(err);
    log('KILL records job process');
    return;
  }
};
