import { Router } from 'express';
import bodyParser from 'body-parser';

import { getNodes } from './get-nodes';
import { ping } from './ping';
import { createDnsQuery, createExtendedDnsQuery } from './dns-query';
import { createMintZone } from './mint-zone';
import { createUpdateZone } from './update-zone';
import { getCurrentZoneProvider } from '../../ZoneProviders';
import { getStore } from '../../store';
import { createGetZones } from './get-zones';

export function getRouter() {
  const router = Router();
  const store = getStore();

  const { getZones, saveZone } = getCurrentZoneProvider();

  router.post('/ping', ping);
  router.post('/get-nodes', getNodes(store));
  router.post(
    '/dns-query',
    bodyParser.raw({
      type: 'application/dns-message',
    }),
    createDnsQuery(getZones)
  );
  router.post(
    '/dns-query-extended',
    bodyParser.json(),
    createExtendedDnsQuery(getZones)
  );

  router.post(
    '/mint-zone',
    bodyParser.json(),
    createMintZone(getZones, saveZone)
  );

  router.post(
    '/update-zone',
    bodyParser.json(),
    createUpdateZone(getZones, saveZone)
  );

  router.post('/get-zones', bodyParser.json(), createGetZones(getZones));

  return router;
}
