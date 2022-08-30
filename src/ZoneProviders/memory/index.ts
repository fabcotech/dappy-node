import { Router } from 'express';

import { log } from '../../log';
import { NameZone } from '../../model/NameZone';

import { zones } from './zones';

export const zoneProvider = {
  getZones: async (names: string[]): Promise<NameZone[]> => {
    return Object.entries(zones)
      .filter(([k]) => names.includes(k))
      .map(([, v]) => v);
  },
  start: () => {
    log('memory provider started');
    return Promise.resolve();
  },
  getRoutes: () => {
    return Router();
  },
  saveZone: async (zone: NameZone): Promise<void> => {
    return new Promise((resolve) => {
      zones[zone.origin] = zone;
      resolve();
    });
  },
};
