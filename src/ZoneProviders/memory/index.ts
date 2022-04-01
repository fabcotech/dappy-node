import { getZones } from './getZones';
import { getRoutes } from './routes';

import { log } from '../../log';

function start() {
  log('memory provider started');
  return Promise.resolve();
}

export const memoryZoneProvider = {
  getZones,
  start,
  getRoutes,
};
