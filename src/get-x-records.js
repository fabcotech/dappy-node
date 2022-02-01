const Ajv = require('ajv');
const rchainToolkit = require('rchain-toolkit');
const {
  readPursesDataTerm,
  readPursesTerm,
  readBoxTerm,
} = require('rchain-token');

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
  if (valid ===  null) {
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
      redisSetValues.push([key, record[key]]);
    } else if (!!record[key] && record[key].constructor === Array) {
      redisSetValues.push([key, JSON.stringify(record[key])]);
    } else if (!!record[key] && record[key].constructor === Object) {
      redisSetValues.push([key, JSON.stringify(record[key])]);
    }
  }

  await Promise.all(redisSetValues.map(([k, v]) => 
    redisClient.hSet(`record:${record.id}`, k, v)));

  await redisClient.sAdd(`publicKey:${record.publicKey.publicKey}`, record.id);

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

const validateXRecordsArgs = (args) => {
  const valid = validate(args);

  if (!valid) {
    return {
      message: validate.errors.map((e) => `body${e.dataPath} ${e.message}`),
    };
  }

  if (args.names.length > 5) {
    return {
      message: 'max 5 names',
    }
  }

  return;
}

const fetchRchainBox = async (boxId, {
  redisClient,
  log,
  urlOrOptions,
  exploreDeploy
}) => {
  try {
    const exploreDeployResponseBox = await exploreDeploy(urlOrOptions, {
      term: readBoxTerm({
        masterRegistryUri:
          process.env.RCHAIN_NAMES_MASTER_REGISTRY_URI,
        boxId,
      }),
    });

    const boxConfig = rchainToolkit.utils.rhoValToJs(
      JSON.parse(exploreDeployResponseBox).expr[0]
    );

    await redisClient.hSet(
      `box:${boxId}`,
      'values',
      JSON.stringify(boxConfig)
    );
    return boxConfig;
  } catch (err) {
    log('could not get box ' + names.join(', ') + '', 'error');
    // it simply means that none have been found
    return;
  }
}

const parsePurseData = (purseData) => {
  const buf = Buffer.from(purseData, 'hex');
  if (buf.length > 16184) {
    log('ignoring record ' + k + ' : length > 16184', 'warning');
    return;
  }
  return JSON.parse(buf.toString('utf8'));
}

const getRchainBox = async (boxId, {
  redisClient,
  log,
  urlOrOptions,
  exploreDeploy 
}) => {
  const hg = await redisClient.hGetAll(`box:${boxId}`);

  if (Object.keys(hg).length) {
    return JSON.parse(hg.values);
  }

  return fetchRchainBox(boxId, {
    redisClient,
    log,
    urlOrOptions,
    exploreDeploy 
  });
}

const cacheRecords = async (records, redisClient) => {
  return Promise.all(
    records.map(
      record => storeRecord(record, redisClient)));
}

const makeRecords = async (purses, pursesData, {
  redisClient,
  log,
  urlOrOptions,
  exploreDeploy
}) => {
  return Promise.all(Object.keys(purses).map( 
    async (k) => {
      if (!pursesData[k]) {
        return;
      }
      try {
        const completeRecord = {
          // rchain-token purse
          id: k,
          publicKey: await getRchainBox(purses[k].boxId, {
            redisClient,
            log,
            urlOrOptions,
            exploreDeploy              
          }),
          boxId: purses[k].boxId,

          // rchain-token data
          data: parsePurseData(pursesData[k]),
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

        return completeRecord;
      } catch (err) {
        log(err);
        log('failed to parse record ' + k, 'warning');
      }
    }
  ));
}

const fetchRchainPurses = async (names, {
  log,
  urlOrOptions,
  exploreDeploy
}) => {
  let exploreDeployResponse; 
  try {
    exploreDeployResponse = await exploreDeploy(
      urlOrOptions,
      {
        term: readPursesTerm({
          masterRegistryUri: process.env.RCHAIN_NAMES_MASTER_REGISTRY_URI,
          contractId: process.env.RCHAIN_NAMES_CONTRACT_ID,
          pursesIds: names,
        }),
      }
    );
  }
  catch (err) {
    log('Names ' + args.names.join(' ') + ': could not explore-deploy ' + err, 'error');
    throw new Error('explore-deploy request to the blockchain failed');
  }
 
  try {
    return rchainToolkit.utils.rhoValToJs(
      JSON.parse(exploreDeployResponse).expr[0]
    );
  } catch (err) {
    log('get-x-records could not parse purses ' + err, 'error');
    throw new Error('parsing rchain-token purses failed')
  }
};

const fetchRchainPursesData = async (names, {
  log,
  urlOrOptions,
  exploreDeploy
}) => {
  let exploreDeployResponseData;
  try {
    exploreDeployResponseData = await exploreDeploy(
      urlOrOptions,
      {
        term: readPursesDataTerm({
          masterRegistryUri: process.env.RCHAIN_NAMES_MASTER_REGISTRY_URI,
          contractId: process.env.RCHAIN_NAMES_CONTRACT_ID,
          pursesIds: names,
        }),
      }
    );
  } catch (err) {
    log('Names ' + args.names.join(' ') + ': could not explore-deploy ' + err, 'error');
    throw new Error('explore-deploy request to the blockchain failed');
  }

  try {
    return rchainToolkit.utils.rhoValToJs(
      JSON.parse(exploreDeployResponseData).expr[0]
    );  
  } catch (err) {
    log(
      'did not found records ' +
        names.join(', ') +
        ' a new explore-deploy will be done next request',
      'warning'
    );
    // it simply means that none have been found
    // return { success: true, records: cacheResults };
    return [];
  }
}

const fetchRchainRecords = async (names, {
  redisClient,
  log,
  urlOrOptions,
  exploreDeploy
}) => {
  if (!names.length) {
    return [];
  }

  const purses = await fetchRchainPurses(names, {
    log,
    urlOrOptions,
    exploreDeploy
  });

  const pursesData = await fetchRchainPursesData(names, {
    log,
    urlOrOptions,
    exploreDeploy
  });

  const missingRecords = names.filter(name => !Object.keys(purses).includes(name));

  if (missingRecords.length > 0) {
    await cacheNegativeRecords(redisClient.hSet.bind(redisClient))(missingRecords);
  }

  const records = (await makeRecords(purses, pursesData, {
    redisClient,
    log,
    urlOrOptions,
    exploreDeploy 
  })).filter(record => !!record);

  try {
    await cacheRecords(records, redisClient);
  }
  catch (err) {
    log(err);
  }

  return [
    ...records,
    ...missingRecords.map(r => ({ id: r, 'notfound': 'true' })),
  ];
}

const mergeCacheAndRchainRecords = (cacheRecords, rchainRecords) =>
  Object.entries(cacheRecords)
        .map(([recordName, record]) => ({
          ...record || {},
          ...rchainRecords.find(r => r.id === recordName)
        }));

const getXRecordsWsHandler = async (
  args,
  {
    redisClient,
    log = require('./utils').log,
    urlOrOptions,
    exploreDeploy = rchainToolkit.http.exploreDeploy
  }
) => {
  try {
    const validationErrors = validateXRecordsArgs(args);

    if (validationErrors) {
      return {
        success: false,
        error: validationErrors
      };
    }

    const cacheRecords = Object.fromEntries(await Promise.all(
      args.names.map(async (name) => {
        const recordCache = await redisClient.hGetAll(`record:${name}`);
        return [name, Object.keys(recordCache).length ? {
          id: name,
          ...recordCache,
        }: undefined];
      })
    ));

    const cacheMissingRecords = args.names
      .filter(name => cacheRecords[name] === undefined);

    const rchainRecords = await fetchRchainRecords(cacheMissingRecords, {
      redisClient,
      log,
      urlOrOptions,
      exploreDeploy   
    });

    return {
      success: true,
      records: mergeCacheAndRchainRecords(cacheRecords, rchainRecords),
    };

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