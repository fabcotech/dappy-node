import { SecureVersion } from 'tls';
import http from 'http';
import https from 'https';
import path from 'path';
import fs from 'fs';
import express, { Router } from 'express';

import { getRouter } from './routes';
import { initSentry } from './sentry';
import { addZoneProviderRoutes } from '../ZoneProviders';
import {
  incRequestMetricsMiddleware,
  initRequestMetrics,
} from '../requestMetrics';

import { log } from '../log';

const initRoutes = (app: Router, store: any) => {
  initSentry(app);

  app.use('/', getRouter(store));

  addZoneProviderRoutes(app, store);
};

export const startHttpServers = (store: any) => {
  const app = express();

  if (process.env.DAPPY_NODE_ENABLE_REQUEST_METRICS) {
    initRequestMetrics();
    app.use(incRequestMetricsMiddleware);
  }
  initRoutes(app, store);

  log(
    `Listening for HTTP on address 127.0.0.1:${
      process.env.DAPPY_NODE_HTTP_PORT || 3001
    } !`
  );
  const serverHttp = http.createServer(app);
  serverHttp.listen(process.env.DAPPY_NODE_HTTP_PORT);

  if (process.env.DAPPY_NODE_HTTPS_PORT) {
    log(
      `Listening for HTTP+TLS on address 127.0.0.1:${process.env.DAPPY_NODE_HTTPS_PORT} ! (TLS handled by nodeJS)`
    );
    const key = fs.readFileSync(path.join(process.cwd(), './dappynode.key'));
    const cert = fs.readFileSync(path.join(process.cwd(), './dappynode.crt'));
    const options = {
      key,
      cert,
      minVersion: 'TLSv1.3' as SecureVersion,
      cipher: 'TLS_AES_256_GCM_SHA384',
    };
    const serverHttps = https.createServer(options, app);

    serverHttps.listen(process.env.DAPPY_NODE_HTTPS_PORT);
  }
};
