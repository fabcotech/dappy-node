const rchainToolkit = require('rchain-toolkit');
const Ajv = require('ajv');
require('dotenv').config();
const { log } = require('../utils');
const { readBagsTerm } = require('rchain-token-files');

const { redisKeys, getManyBagsDataTerm } = require('../utils');

const ajv = new Ajv();
const schema = {
  schemaId: 'dappy-record',
  type: 'object',
  properties: {
    publicKey: {
      type: 'string',
    },
    address: {
      type: 'string',
    },
    nonce: {
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
  required: ['name', 'publicKey', 'servers', 'nonce'],
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
  bags,
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
    const keys = Object.keys(bags);
    const validKeys = keys.filter((name) => /^[a-z][a-z0-9]*$/.test(name));

    let specialNames = 0;
    // a special name is special1,name1,name2,name3 for example
    if (special) {
      specialNames = keys.filter((name) => {
        return name.startsWith(special.name) && /^[a-z][a-z0-9,]*$/.test(name);
      }).length;
    }

    const l = validKeys.length;
    let i = 0;
    let successes = 0;
    const retrieveRecord = async () => {
      const k = validKeys[i];
      if (!k) {
        if (i === l - 1 || l === 0) {
          resolve([successes, l, specialNames]);
        } else {
          i += 1;
          await retrieveRecord();
        }
        return;
      }
      if (i !== 0 && i % 20 === 0) {
        log('processing name no ' + i);
      }

      const recordsToProcess = [];
      recordsToProcess.push(k);
      // ten by ten
      [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((j) => {
        if (validKeys[i + j]) {
          recordsToProcess.push(validKeys[i + j]);
        }
      });
      const n = recordsToProcess.length;
      let tt = new Date().getTime();

      try {
        exploreDeployResponse = await rchainToolkit.http.exploreDeploy(
          httpUrlReadOnly,
          {
            term: getManyBagsDataTerm(
              process.env.RCHAIN_NAMES_REGISTRY_URI,
              recordsToProcess
            ),
          }
        );
      } catch (err) {
        log('Name ' + k + ': could not explore-deploy ' + err, 'error');
        if (i === l - n) {
          resolve([success, l, specialNames]);
        } else {
          i += n;
          await retrieveRecord();
        }
        return;
      }

      const bagsData = rchainToolkit.utils.rhoValToJs(
        JSON.parse(exploreDeployResponse).expr[0]
      );

      for (let j = 0; j < bagsData.length; j += 1) {
        let record = undefined;
        try {
          record = JSON.parse(Buffer.from(bagsData[j], 'hex').toString('utf8'));
          const completeRecord = {
            ...record,
            publicKey: bags[validKeys[i + j]].publicKey,
            nonce: bags[validKeys[i + j]].nonce,
            name: validKeys[i + j],
          };
          // redis cannot store undefined as value
          if (typeof bags[validKeys[i + j]].price === 'number') {
            completeRecord.price = bags[validKeys[i + j]].price;
          }
          if (!completeRecord.address) {
            delete completeRecord.address;
          }

          try {
            await storeRecord(validKeys[i + j], completeRecord, redisClient);
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
        resolve([successes, keys.length, specialNames]);
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
        term: readBagsTerm(process.env.RCHAIN_NAMES_REGISTRY_URI),
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

  let bags;
  try {
    bags = rchainToolkit.utils.rhoValToJs(parsedResponse.expr[0]);
  } catch (err) {
    log('Something went wrong when querying the node, value:', 'error');
    console.log(err);
    return;
  }
  delete bags['0'];

  const a = new Date().getTime();
  try {
    const recordsProcessed = await storeRecordsInRedis(
      bags,
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
