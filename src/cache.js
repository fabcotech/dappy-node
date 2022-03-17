const redis = require('redis');

const { startJobExpiredRecords } = require('./jobs/deleteExpiredRecords');
const { log } = require('./log');

/*
 Clean cached results from exlore-deploy and explore-deploy-x
 every 30 seconds
*/
function startJobClearExpiredExploreDeploys(store) {
  setInterval(async () => {
    const cacheEpoch = Math.round(new Date().getTime() / (1000 * store.caching));
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

async function startRedisClient(store) {
  if (!process.env.DAPPY_NODE_CACHING) {
    return;
  }

  store.redisClient = redis.createClient({
    database: process.env.REDIS_DB,
    socket: {
      host: process.env.REDIS_SERVICE_HOST,
      port: process.env.REDIS_SERVICE_PORT || 6379,
    },
  });

  await store.redisClient.connect();

  store.redisClient.on('error', (err) => {
    log(`error : redis error ${err}`);
  });
}

async function initCache(store) {
  await startRedisClient(store);
  startJobClearExpiredExploreDeploys(store);
  startJobExpiredRecords(store);
}

module.exports = {
  initCache,
};
