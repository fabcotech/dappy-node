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
  return (/^true$/i.test(str));
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

function initConfig(env = {}){
  return {
    logsInteval: parseInt(env.LOGS_INTERVAL) || 10 * 1000,
    masterRegistryUri: mandatory('MASTER_REGISTRY_URI', env.MASTER_REGISTRY_URI),
    contracts: parseArray(mandatory('CONTRACTS', env.CONTRACTS)),
    rnodeUri: mandatory('RNODE_URI', env.RNODE_URI),
    redisUrl: parseRedisUrl(mandatory('REDIS_URL', env.REDIS_URL)),
  }
} 

function initClientRedis(redisUrl) {
  return redis.createClient(redisUrl);
}

function getZAdd(client) {
  return args => new Promise((resolve, reject) => {
    client.zadd(args, (errors, results) => {
      if (errors) reject(errors);
      else resolve(results);
    });
  });
}  

function parseLogTs(l) {
  return parseInt(l.match(/^[^,]+,(\d+),/)[1]);
}

function parseLogs(rawLogs) {
  return rawLogs
    .split(';')
    .filter(l => l.length)
    .filter(l => {
      try {
        logs.checkLine(l);
        return true;
      } catch (err) {
        logInfo(l);
        logError(err);
        return false; 
      }
    })
    .map(l => ({
      ts: parseLogTs(l),
      msg: logs.formatLine(l).trim()
    }));
}

async function queryLogs(exploreDeploy, masterRegistryUri, rnodeUri, contractId) {
  const result = await exploreDeploy(
    rnodeUri,
    {
      term: readLogsTerm({
        masterRegistryUri: masterRegistryUri,
        contractId: contractId,
      })
    }
  );

  return parseLogs(rchainToolkit.utils.rhoValToJs(
    JSON.parse(result).expr[0]
  ));
}

async function saveToSortedSetsInRedis(zAdd, contract, logs) {
  if (!logs.length) return;

  const nbEntries = await zAdd([
    contract, 
    ...logs.map(l => [l.ts, l.msg]).flat()
  ]);

  if (nbEntries) {
    logInfo(`Added ${nbEntries} entries`);
  }
}

async function saveContractLogs(exploreDeploy, zAdd, { masterRegistryUri, rnodeUri, contracts }) {
  for (let contract of contracts) {
    try {
      const logs = await queryLogs(exploreDeploy, masterRegistryUri, rnodeUri, contract)
      await saveToSortedSetsInRedis(zAdd, contract, logs);
    }
    catch (err) {
      logError(err);
    }
  }
}

function waitDuration(milliseconds) {
  return new Promise((res) => setTimeout(() => res(), milliseconds));
}

async function startJob() {
  const config = initConfig(process.env);
  const redisClient = initClientRedis(config.redisUrl);
  const zAdd = getZAdd(redisClient);

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
