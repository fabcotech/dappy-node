import { Router } from 'express';

import { log } from '../log';

import { zoneProvider as rchain } from './rchain';
import { zoneProvider as memory } from './memory';
import { zoneProvider as postgresql } from './postgresql';

import { getConfig } from '../config';
import { ZoneProvider } from './ZoneProvider';

const providers: Record<string, ZoneProvider> = {
  rchain,
  memory,
  postgresql,
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
