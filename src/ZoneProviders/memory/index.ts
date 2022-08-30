import { getZones } from './getZones';
import { saveZone } from './saveZone';
import { getRoutes } from './routes';

import { log } from '../../log';

function start() {
  log('memory provider started');
  return Promise.resolve();
}

export const zoneProvider = {
  getZones,
  start,
  getRoutes,
  saveZone,
};
