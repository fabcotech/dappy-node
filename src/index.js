const { initNodes } = require('./nodes');
const { startZoneProvider } = require('./ZoneProviders');
const { initCache } = require('./cache');
const { startHttpServers } = require('./http');
const { initStore } = require('./store');

// will not override the env variables in docker-compose
require('dotenv').config();

const {
  initRequestMetrics,
} = require('./requestMetrics');

async function start() {
  const store = initStore();

  if (store.useCache) {
    initCache(store);
  }

  initNodes(store);

  await startZoneProvider(store);
  startHttpServers(store);

  initRequestMetrics();
}

start();
