import 'dotenv/config';

import { initNodes } from './nodes';
import { startZoneProvider } from './ZoneProviders';
import { initCache } from './cache';
import { startHttpServers } from './http';
import { initStore } from './store';

async function start() {
  const store = initStore();

  if (store.useCache) {
    initCache(store);
  }

  initNodes(store);

  await startZoneProvider(store);
  startHttpServers(store);
}

start();
