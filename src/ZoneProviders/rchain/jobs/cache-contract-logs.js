const fs = require('fs');
const rchainToolkit = require('@fabcotech/rchain-toolkit');
const { readLogsTerm, logs } = require('@fabcotech/rchain-token');
const redis = require('redis');

const { getConfig } = require('../../../config');

function formatLogMessage(msg) {
  return `${new Date().toISOString()} - ${msg}`;
}

function logInfo(msg) {
  console.log(formatLogMessage(msg));
}

function logError(msg) {
  console.error(formatLogMessage(msg), 'error');
}

function mandatory(varName, value) {
  if (value === undefined) {
    throw new Error(`${varName} env var is not defined`);
  }
  return value;
}

function parseBool(str) {
  return /^true$/i.test(str);
}

function parseArray(contractStr) {
  return (contractStr || '')
    .split(',')
    .filter((s) => !!s.length)
    .map((s) => s.trim());
}

function parseRedisUrl(value) {
  if (!/^redis:\/\/[a-zA-Z0-9._]+(:[0-9]{1,5})?\/[0-9]$/.test(value)) {
    throw new Error(`${value} is not a redis url`);
  }
  return value;
}

function getFileContent(path) {
  if (!path) return undefined;

  return fs.readFileSync(path, 'utf8');
}

function initConfig(env = {}) {
  return {
    logsInteval: parseInt(env.DAPPY_JOBS_LOGS_INTERVAL || '', 10) || 10 * 1000,
    masterRegistryUri: mandatory(
      'DAPPY_NAMES_MASTER_REGISTRY_URI',
      env.DAPPY_NAMES_MASTER_REGISTRY_URI,
    ),
    contracts: parseArray(mandatory('DAPPY_JOBS_LOGS_CONTRACTS', env.DAPPY_JOBS_LOGS_CONTRACTS)),
    rnodeUri: mandatory('DAPPY_RCHAIN_READ_ONLY', env.DAPPY_RCHAIN_READ_ONLY),
    redisUrl: parseRedisUrl(mandatory('DAPPY_JOBS_REDIS_URL', env.DAPPY_JOBS_REDIS_URL)),
    caCertificate: getFileContent(env.DAPPY_RCHAIN_READ_ONLY_CERTIFICATE_FILENAME),
  };
}

async function initClientRedis(redisUrl) {
  const redisClient = redis.createClient({
    url: redisUrl,
  });
  await redisClient.connect();
  return redisClient;
}

function parseLogTs(l) {
  return parseInt(l.match(/^[^,]+,(\d+),/)[1], 10);
}

function parseLogs(rawLogs) {
  return rawLogs
    .split(';')
    .filter((l) => l.length)
    .filter((l) => {
      try {
        logs.checkLine(l);
        return true;
      } catch (err) {
        return false;
      }
    })
    .map((l) => ({
      ts: parseLogTs(l),
      msg: l,
    }));
}

async function queryLogs(
  exploreDeploy,
  contract,
  { masterRegistryUri, rnodeUri, caCertificate },
) {
  const result = await exploreDeploy(
    {
      url: rnodeUri,
      ...(caCertificate ? { ca: [caCertificate] } : {}),
    },
    {
      term: readLogsTerm({
        masterRegistryUri,
        contractId: contract,
      }),
    },
  );

  const parsed = JSON.parse(result);
  if (!parsed.expr || !parsed.expr[0]) {
    throw new Error('Logs not found, contract does not exist or no purchases yet');
  }

  return parseLogs(rchainToolkit.utils.rhoValToJs(parsed.expr[0]));
}

async function saveToSortedSetsInRedis(zAdd, contract, contractLogs) {
  if (!contractLogs.length) return;

  const nbEntries = await zAdd(
    `logs:${contract}`,
    ...contractLogs.map((l) => [l.ts, l.msg]).flat(),
  );

  if (nbEntries) {
    logInfo(`Added ${nbEntries} entries`);
  }
}

async function saveContractLogs(exploreDeploy, zAdd, config) {
  for (const contract of config.contracts) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const contractLogs = await queryLogs(exploreDeploy, contract, config);
      // eslint-disable-next-line no-await-in-loop
      await saveToSortedSetsInRedis(zAdd, contract, contractLogs);
    } catch (err) {
      logError(err);
    }
  }
}

function waitDuration(milliseconds) {
  return new Promise((res) => {
    setTimeout(() => res(), milliseconds);
  });
}

async function start() {
  const config = initConfig(process.env);
  const redisClient = await initClientRedis(config.redisUrl);
  const zAdd = redisClient.zAdd.bind(redisClient);

  logInfo('cache contract logs started');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    await saveContractLogs(rchainToolkit.http.exploreDeploy, zAdd, config);
    // eslint-disable-next-line no-await-in-loop
    await waitDuration(config.logsInteval);
  }
}

if (parseBool(process.env.DAPPY_NODE_START_JOBS)) {
  start();
}

module.exports = {
  parseArray,
  parseBool,
  parseRedisUrl,
  saveContractLogs,
  saveToSortedSetsInRedis,
  queryLogs,
  initConfig,
  start,
};
