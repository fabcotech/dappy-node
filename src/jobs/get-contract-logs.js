const fs = require('fs');
const rchainToolkit = require('rchain-toolkit');
const { readLogsTerm, logs } = require('rchain-token');
const redis = require('redis');

function formatLogMessage(msg) {
  return `${new Date().toISOString()} - ${msg}`;
}

function logInfo(msg) {
  console.log(formatLogMessage(msg));
}

function logError(msg) {
  console.error(formatLogMessage(msg));
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
  if (!path) return;

  return fs.readFileSync(process.env.READ_ONLY_CERTIFICATE_PATH, 'utf8');
}

function initConfig(env = {}) {
  return {
    logsInteval: 10000, //parseInt(env.LOGS_INTERVAL) || 10 * 1000,
    masterRegistryUri: mandatory(
      'MASTER_REGISTRY_URI',
      env.MASTER_REGISTRY_URI
    ),
    contracts: parseArray(mandatory('CONTRACTS', env.CONTRACTS)),
    rnodeUri: mandatory('READ_ONLY', env.READ_ONLY),
    redisUrl: parseRedisUrl(mandatory('REDIS_URL', env.REDIS_URL)),
    caCertificate: getFileContent(env.READ_ONLY_CERTIFICATE_PATH),
  };
}

async function initClientRedis(redisUrl) {
  const redisClient = redis.createClient({
     url: redisUrl
  });
  await redisClient.connect();
  return redisClient;
}


function parseLogTs(l) {
  return parseInt(l.match(/^[^,]+,(\d+),/)[1]);
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
  { masterRegistryUri, rnodeUri, caCertificate }
) {
  const result = await exploreDeploy(
    {
      url: rnodeUri,
      ...(caCertificate ? { ca: [caCertificate] } : {}),
    },
    {
      term: readLogsTerm({
        masterRegistryUri: masterRegistryUri,
        contractId: contract,
      }),
    }
  );

  const parsed = JSON.parse(result);
  if (!parsed.expr || !parsed.expr[0]) {
    throw new Error('Logs not found, contract does not exist or no purchases yet')
  }

  return parseLogs(rchainToolkit.utils.rhoValToJs(parsed.expr[0]));
}

async function saveToSortedSetsInRedis(zAdd, contract, logs) {
  if (!logs.length) return;

  const nbEntries = await zAdd(
    `logs:${contract}`,
    ...logs.map((l) => [l.ts, l.msg]).flat(),
  );

  if (nbEntries) {
    logInfo(`Added ${nbEntries} entries`);
  }
}

async function saveContractLogs(exploreDeploy, zAdd, config) {
  for (let contract of config.contracts) {
    try {
      const logs = await queryLogs(exploreDeploy, contract, config);
      await saveToSortedSetsInRedis(zAdd, contract, logs);
    } catch (err) {
      logError(err);
    }
  }
}

function waitDuration(milliseconds) {
  return new Promise((res) => setTimeout(() => res(), milliseconds));
}

async function startJob() {
  const config = initConfig(process.env);
  const redisClient = await initClientRedis(config.redisUrl);
  const zAdd = redisClient.zAdd.bind(redisClient);

  logInfo('get contract logs started');

  while (true) {
    await saveContractLogs(rchainToolkit.http.exploreDeploy, zAdd, config);
    await waitDuration(config.logsInteval);
  }
}

parseBool(process.env.START_JOB) && startJob();

module.exports = {
  parseArray,
  parseBool,
  parseRedisUrl,
  saveContractLogs,
  saveToSortedSetsInRedis,
  queryLogs,
  initConfig,
};
