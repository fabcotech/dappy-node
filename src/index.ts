import 'dotenv/config';

import { initNodes } from './nodes';
import { startZoneProvider } from './ZoneProviders';
import { initCache } from './cache';
import { startHttpServers } from './server';
import { initStore } from './store';
import { initConfig } from './config';

async function start() {
  const config = initConfig();
  initStore();

  if (config.dappyNodeCaching) {
    initCache();
  }

  initNodes();

  await startZoneProvider();
  startHttpServers();
}

start();
