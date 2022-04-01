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
import { getConfig } from '../config';

const initRoutes = (app: Router) => {
  initSentry(app);

  app.use('/', getRouter());

  addZoneProviderRoutes(app);
};

export const startHttpServers = () => {
  const app = express();
  const config = getConfig();

  if (config.dappyNodeEnableRequestMetrics) {
    initRequestMetrics();
    app.use(incRequestMetricsMiddleware);
  }
  initRoutes(app);

  log(`Listening for HTTP on address 127.0.0.1:${config.dappyNodeHttpPort} !`);
  const serverHttp = http.createServer(app);
  serverHttp.listen(config.dappyNodeHttpPort);

  if (config.dappyNodeHttpsPort) {
    log(
      `Listening for HTTP+TLS on address 127.0.0.1:${config.dappyNodeHttpsPort} ! (TLS handled by nodeJS)`
    );
    const key = fs.readFileSync(
      path.join(process.cwd(), `./${config.dappyNodePrivateKeyFilename}`)
    );
    const cert = fs.readFileSync(
      path.join(process.cwd(), `./${config.dappyNodeCertificateFilename}`)
    );
    const options = {
      key,
      cert,
      minVersion: 'TLSv1.3' as SecureVersion,
      cipher: 'TLS_AES_256_GCM_SHA384',
    };
    const serverHttps = https.createServer(options, app);

    serverHttps.listen(config.dappyNodeHttpsPort);
  }
};
