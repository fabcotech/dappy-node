import { getZones } from './getZones';
import { start } from './start';
import { getRoutes } from './routes';

export const zoneProvider = {
  getZones,
  start,
  getRoutes,
  saveZone: () => Promise.reject(new Error('not implemented')),
};
