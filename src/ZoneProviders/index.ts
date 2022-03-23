import { Express } from 'express';

const { log } = require('../log');

const RChainZoneProvider = require('./rchain');
const MemoryZoneProvider = require('./memory');

interface ZoneProvider {
  createGetZones(store: any): (names: string[]) => Promise<any>;
  start(store: any): Promise<void>;
  getRoutes(store: any): Express;
}

const providers: Record<string, ZoneProvider> = {
  rchain: RChainZoneProvider,
  memory: MemoryZoneProvider,
};

export function getCurrentZoneProvider() {
  const provider = providers[process.env.DAPPY_NODE_ZONE_PROVIDER || 'rchain'];
  if (!provider) {
    log(`Zone provider ${provider} not found`, 'error');
    process.exit(1);
  }
  return provider;
}

export function startZoneProvider(store: any) {
  const zoneProvider = getCurrentZoneProvider();
  return zoneProvider.start(store);
}

export function addZoneProviderRoutes(app: Express, store: any) {
  const zoneProvider = getCurrentZoneProvider();
  const routes = zoneProvider.getRoutes(store);

  app.use('/', routes);
}