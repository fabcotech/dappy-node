import { Router } from 'express';

import { log } from '../log';

import { rchainZoneProvider } from './rchain';
import { memoryZoneProvider } from './memory';

interface ZoneProvider {
  createGetZones(store: any): (names: string[]) => Promise<any>;
  start(store: any): Promise<void>;
  getRoutes(store: any): Router;
}

const providers: Record<string, ZoneProvider> = {
  rchain: rchainZoneProvider,
  memory: memoryZoneProvider,
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

export function addZoneProviderRoutes(app: Router, store: any) {
  const zoneProvider = getCurrentZoneProvider();
  const routes = zoneProvider.getRoutes(store);

  app.use('/', routes);
}
