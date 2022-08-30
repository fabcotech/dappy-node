import { Router } from 'express';
import knex from 'knex';
import { log } from '../../log';
import { NameZone } from '../../model/NameZone';
import { ZoneProvider } from '../ZoneProvider';

function start() {
  log('memory provider started');
  return Promise.resolve();
}

export const zoneProvider: ZoneProvider = {
  getZones: (): Promise<NameZone[]> => {
    return Promise.reject(new Error('not implemented'));
    // return Promise.resolve([]);
  },
  start,
  getRoutes: () => {
    return Router();
  },
  saveZone: (zone: NameZone) => {
    // knex('zones').
    return Promise.reject(new Error('not implemented'));
  },
};
