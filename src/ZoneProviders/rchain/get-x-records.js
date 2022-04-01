const Ajv = require('ajv');
const rchainToolkit = require('rchain-toolkit');

const {
  readPursesDataTerm,
  readPursesTerm,
  readBoxTerm,
} = require('rchain-token');
const { getConfig } = require('../../config');
const { configureScope } = require('@sentry/node');

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
            required: ['ip', 'host'],
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
  const redisSetValues = [];
  for (const key of Object.keys(record)) {
    if (
      typeof record[key] === 'string' ||
      typeof record[key] === 'number' ||
      typeof record[key] === 'boolean' ||
      record[key] === null
    ) {
      redisSetValues.push([key, record[key]]);
    } else if (!!record[key] && record[key].constructor === Array) {
      redisSetValues.push([key, JSON.stringify(record[key])]);
    } else if (!!record[key] && record[key].constructor === Object) {
      redisSetValues.push([key, JSON.stringify(record[key])]);
    }
  }

  await Promise.all(
    redisSetValues.map(([k, v]) =>
      redisClient.hSet(`record:${record.id}`, k, v)
    )
  );

  await redisClient.sAdd(`publicKey:${record.publicKey}`, record.id);

  // just like if it came out from redis
  if (record.data) {
    record.data = JSON.stringify(record.data);
  }
  return record;
};

const cacheNegativeRecords = (hset) => async (names) =>
  Promise.all(names.map((name) => hset(`record:${name}`, 'notfound', 'true')));

function validateXRecordsArgs(args) {
  const valid = validate(args);

  if (!valid) {
    return {
      message: validate.errors.map((e) => `body${e.dataPath} ${e.message}`),
    };
  }

  if (args.names.length > 5) {
    return {
      message: 'max 5 names',
    };
  }
  return undefined;
}

const fetchRchainBox = async (
  boxId,
  { redisClient, log, urlOrOptions, exploreDeploy }
) => {
  const config = getConfig();
  try {
    const exploreDeployResponseBox = await exploreDeploy(urlOrOptions, {
      term: readBoxTerm({
        masterRegistryUri: config.dappyNamesMasterRegistryUri,
        boxId,
      }),
    });

    const boxConfig = rchainToolkit.utils.rhoValToJs(
      JSON.parse(exploreDeployResponseBox).expr[0]
    );

    await redisClient.hSet(`box:${boxId}`, 'values', JSON.stringify(boxConfig));
    return boxConfig;
  } catch (err) {
    log(`could not get box ${boxId}`, 'error');
    throw err;
    // it simply means that none have been found
  }
};

const parsePurseData = (purseData, log) => {
  const buf = Buffer.from(purseData, 'hex');
  if (buf.length > 16184) {
    log('ignoring record: length > 16184', 'warning');
    throw new Error('record too long');
  }
  return JSON.parse(buf.toString('utf8'));
};

const getRchainBox = async (
  boxId,
  { redisClient, log, urlOrOptions, exploreDeploy }
) => {
  const hg = await redisClient.hGetAll(`box:${boxId}`);

  if (Object.keys(hg).length) {
    return JSON.parse(hg.values);
  }

  return fetchRchainBox(boxId, {
    redisClient,
    log,
    urlOrOptions,
    exploreDeploy,
  });
};

const cacheRecords = async (records, redisClient) =>
  Promise.all(records.map((record) => storeRecord(record, redisClient)));

const makeRecords = async (
  purses,
  pursesData,
  { redisClient, log, urlOrOptions, exploreDeploy }
) =>
  Promise.all(
    Object.keys(purses).map(async (k) => {
      if (!pursesData[k]) {
        return undefined;
      }
      try {
        const rchainBox = await getRchainBox(purses[k].boxId, {
          redisClient,
          log,
          urlOrOptions,
          exploreDeploy,
        });
        const completeRecord = {
          // rchain-token purse
          id: k,
          publicKey: rchainBox.publicKey,
          boxId: purses[k].boxId,

          // rchain-token data
          data: parsePurseData(pursesData[k], log),
        };
        // redis cannot store undefined as value
        // price will be stored in redis, and sent back to client as string
        if (
          typeof purses[k].price === 'number' &&
          !Number.isNaN(purses[k].price)
        ) {
          completeRecord.price = purses[k].price;
        }
        if (
          typeof purses[k].expires === 'number' &&
          !Number.isNaN(purses[k].expires)
        ) {
          completeRecord.expires = purses[k].expires;
        }

        const valid = validateRecord(completeRecord);
        if (!valid) {
          log(`invalid record ${completeRecord.id}`);
          log(validate.errors);
          return undefined;
        }
        const match = completeRecord.id.match(/[a-z]([A-Za-z0-9]*)*/g);
        if (
          !match ||
          (match.length !== 1 && match[0].length !== completeRecord.id.length)
        ) {
          log(`invalid record (regexp) ${completeRecord.id}`);
          return undefined;
        }

        return completeRecord;
      } catch (err) {
        log(err);
        log(`failed to parse record ${k}`, 'warning');
        throw err;
      }
    })
  );

const fetchRchainPurses = async (
  names,
  { log, urlOrOptions, exploreDeploy }
) => {
  debugger; 
  const config = getConfig();
  let exploreDeployResponse;
  try {
    exploreDeployResponse = await exploreDeploy(urlOrOptions, {
      term: readPursesTerm({
        masterRegistryUri: config.dappyNamesMasterRegistryUri,
        contractId: config.dappyNamesContractId,
        pursesIds: names,
      }),
    });
  } catch (err) {
    log(`Names ${names.join(' ')}: could not explore-deploy ${err}`, 'error');
    throw new Error('explore-deploy request to the blockchain failed');
  }

  try {
    return rchainToolkit.utils.rhoValToJs(
      JSON.parse(exploreDeployResponse).expr[0]
    );
  } catch (err) {
    log(`get-x-records could not parse purses ${err}`, 'error');
    throw new Error('parsing rchain-token purses failed');
  }
};

const fetchRchainPursesData = async (names, {
  log,
  urlOrOptions,
  exploreDeploy,
}) => {
  const config = getConfig();
  let exploreDeployResponseData;
  try {
    exploreDeployResponseData = await exploreDeploy(
      urlOrOptions,
      {
        term: readPursesDataTerm({
          masterRegistryUri: config.dappyNamesMasterRegistryUri,
          contractId: config.dappyNamesContractId,
          pursesIds: names,
        }),
      },
    );
  } catch (err) {
    log(`Names ${names.join(' ')}: could not explore-deploy ${err}`, 'error');
    throw new Error('explore-deploy request to the blockchain failed');
  }

  try {
    return rchainToolkit.utils.rhoValToJs(
      JSON.parse(exploreDeployResponseData).expr[0],
    );
  } catch (err) {
    log(
      `did not found records ${
        names.join(', ')
      } a new explore-deploy will be done next request`,
      'warning',
    );
    // it simply means that none have been found
    // return { success: true, records: cacheResults };
    return [];
  }
};

const fetchRchainRecords = async (names, {
  redisClient,
  log,
  urlOrOptions,
  exploreDeploy,
}) => {
  if (!names.length) {
    return [];
  }

  const purses = await fetchRchainPurses(names, {
    log,
    urlOrOptions,
    exploreDeploy,
  });

  const pursesData = await fetchRchainPursesData(names, {
    log,
    urlOrOptions,
    exploreDeploy,
  });

  const records = (await makeRecords(purses, pursesData, {
    redisClient,
    log,
    urlOrOptions,
    exploreDeploy,
  })).filter((record) => !!record);

  const missingRecords = names.filter((name) => !records.map((r) => r.id).includes(name));

  if (missingRecords.length > 0) {
    await cacheNegativeRecords(redisClient.hSet.bind(redisClient))(missingRecords);
  }

  try {
    await cacheRecords(records, redisClient);
  } catch (err) {
    log(err);
  }

  return [
    ...records,
    ...missingRecords.map((r) => ({ id: r, notfound: 'true' })),
  ];
};

const mergeCacheAndRchainRecords = (cachedRecords, rchainRecords) => Object.entries(cachedRecords)
  .map(([recordName, record]) => ({
    ...record || {},
    ...rchainRecords.find((r) => r.id === recordName),
  }));

const getXRecordsWsHandler = async (
  args,
  {
    redisClient,
    log,
    urlOrOptions,
    exploreDeploy = rchainToolkit.http.exploreDeploy,
  },
) => {
  try {
    const validationErrors = validateXRecordsArgs(args);

    if (validationErrors) {
      return {
        success: false,
        error: validationErrors,
      };
    }

    const cachedRecords = Object.fromEntries(await Promise.all(
      args.names.map(async (name) => {
        const recordCache = await redisClient.hGetAll(`record:${name}`);
        return [name, Object.keys(recordCache).length ? {
          id: name,
          ...recordCache,
        } : undefined];
      }),
    ));

    const cacheMissingRecords = args.names
      .filter((name) => cachedRecords[name] === undefined);

    const rchainRecords = await fetchRchainRecords(cacheMissingRecords, {
      redisClient,
      log,
      urlOrOptions,
      exploreDeploy,
    });

    return {
      success: true,
      records: mergeCacheAndRchainRecords(cachedRecords, rchainRecords),
    };
  } catch (err) {
    log(err);
    return {
      success: false,
      error: { message: err },
    };
  }
};

module.exports = {
  schema,
  getXRecordsWsHandler,
  cacheNegativeRecords,
};
