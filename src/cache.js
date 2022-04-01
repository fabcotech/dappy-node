const redis = require('redis');
const { getConfig } = require('./config');

const { startJobExpiredRecords } = require('./jobs/deleteExpiredRecords');
const { log } = require('./log');
const { getStore } = require('./store');

/*
 Clean cached results from exlore-deploy and explore-deploy-x
 every 30 seconds
*/
function startJobClearExpiredExploreDeploys() {
  const store = getStore();
  const config = getConfig();

  setInterval(async () => {
    const cacheEpoch = Math.round(new Date().getTime() / (1000 * config.dappyNodeCaching));
    const edKeys = await store.redisClient.keys('cache:ed:*');
    const edxKeys = await store.redisClient.keys('cache:edx:*');
    const old = edKeys
      .concat(edxKeys)
      .filter((k) => parseInt(k.split(':')[3], 10) < cacheEpoch);
    if (old.length) {
      store.redisClient.del(...old, (err) => {
        if (err) {
          log(err, 'error');
        }
      });
    }
  }, 30000);
}

async function startRedisClient() {
  const config = getConfig();
  const store = getStore();

  if (!config.dappyNodeCaching) {
    return;
  }

  store.redisClient = redis.createClient({
    database: config.redisDb,
    socket: {
      host: config.redisHost,
      port: config.redisPort,
    },
  });

  await store.redisClient.connect();

  store.redisClient.on('error', (err) => {
    log(`error : redis error ${err}`);
  });
}

async function initCache() {
  await startRedisClient();
  startJobClearExpiredExploreDeploys();
  startJobExpiredRecords();
}

module.exports = {
  initCache,
};
