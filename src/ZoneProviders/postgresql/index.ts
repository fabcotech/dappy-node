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

interface NameZoneTable {
  id: number;
  domain: string;
  zone: NameZone;
}

export const zoneProvider: ZoneProvider = {
  getZones: async (names: string[]): Promise<NameZone[]> => {
    const result = await connection<NameZoneTable>('zones')
      .select({
        zone: 'zone',
      })
      .whereIn('domain', names);
    return result.map((r) => r.zone);
  },
  start,
  getRoutes: () => {
    return Router();
  },
  saveZone: async (zone: NameZone) => {
    await connection<NameZoneTable>('zones').insert({
      domain: zone.origin,
      zone,
    });
  },
};
