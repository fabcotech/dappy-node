const { log } = require('../log');

const RChainZoneProvider = require('./rchain');
const MemoryZoneProvider = require('./memory');

const providers = {
  rchain: RChainZoneProvider,
  memory: MemoryZoneProvider,
};

function getCurrentZoneProvider() {
  const provider = providers[process.env.DAPPY_NODE_ZONE_PROVIDER || 'rchain'];
  if (!provider) {
    log(`Zone provider ${provider} not found`, 'error');
    process.exit(1);
  }
  return provider;
}

function startZoneProvider(store) {
  const zoneProvider = getCurrentZoneProvider();
  return zoneProvider.start(store);
}

function addZoneProviderRoutes(app, store) {
  const zoneProvider = getCurrentZoneProvider();
  const routes = zoneProvider.getRoutes(store);

  app.use('/', routes);
}

module.exports = {
  startZoneProvider,
  addZoneProviderRoutes,
};
