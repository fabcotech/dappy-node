import { Router } from 'express';
import knex from 'knex';
import type { Knex } from 'knex';
import { log } from '../../log';
import { NameZone } from '../../model/NameZone';
import { ZoneProvider } from '../ZoneProvider';
import * as knexConfig from './knex';

let connection: Knex<any, unknown>;

function start() {
  connection = knex(knexConfig);
  log('postgresql provider started');
  return Promise.resolve();
}

interface NameZoneResult {
  id: number;
  domain: string;
  zone: NameZone;
}

export const zoneProvider: ZoneProvider = {
  getZones: async (): Promise<NameZone[]> => {
    const result = await connection<NameZoneResult>('zones').select({
      zone: 'zone',
    });
    return result.map((r) => r.zone);
  },
  start,
  getRoutes: () => {
    return Router();
  },
  saveZone: async (zone: NameZone) => {
    await connection('zones').insert({ domain: zone.origin, zone });
  },
};
