import { Router } from 'express';
import bodyParser from 'body-parser';

import { getNodes } from './get-nodes';
import { ping } from './ping';
import { createDnsQuery } from './dns-query';
import { getCurrentZoneProvider } from '../../ZoneProviders';
import { createGetCertificates } from './get-certificates';

export function getRouter(store: any) {
  const router = Router();

  const getZones = getCurrentZoneProvider().createGetZones(store);

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
    '/get-certificates',
    bodyParser.json(),
    createGetCertificates(getZones)
  );

  return router;
}
