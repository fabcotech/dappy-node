import { Router } from 'express';

import { log } from '../log';

import { rchainZoneProvider } from './rchain';
import { memoryZoneProvider } from './memory';
import { getConfig } from '../config';

interface ZoneProvider {
  getZones: (names: string[]) => Promise<any>;
  start(): Promise<void>;
  getRoutes(): Router;
}

const providers: Record<string, ZoneProvider> = {
  rchain: rchainZoneProvider,
  memory: memoryZoneProvider,
};

export function getCurrentZoneProvider() {
  const config = getConfig();
  const provider = providers[config.dappyNodeZoneProvider];
  if (!provider) {
    log(`Zone provider ${provider} not found`, 'error');
    process.exit(1);
  }
  return provider;
}

export function startZoneProvider() {
  const zoneProvider = getCurrentZoneProvider();
  return zoneProvider.start();
}

export function addZoneProviderRoutes(app: Router) {
  const zoneProvider = getCurrentZoneProvider();
  const routes = zoneProvider.getRoutes();

  app.use('/', routes);
}
