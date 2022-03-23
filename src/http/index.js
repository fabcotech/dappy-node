const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const express = require('express');

const { getRouter } = require('./routes');
const { initSentry } = require('./sentry');
const { addZoneProviderRoutes } = require('../ZoneProviders');
const { incRequestMetricsMiddleware, initRequestMetrics } = require('../requestMetrics');

const { log } = require('../log');

const initRoutes = (app, store) => {
  initSentry(app);

  app.use('/', getRouter(store));

  addZoneProviderRoutes(app, store);
};

const startHttpServers = (store) => {
  const app = express();

  if (process.env.DAPPY_NODE_ENABLE_REQUEST_METRICS) {
    initRequestMetrics();
    app.use(incRequestMetricsMiddleware);
  }
  initRoutes(app, store);

  log(`Listening for HTTP on address 127.0.0.1:${process.env.DAPPY_NODE_HTTP_PORT || 3001} !`);
  const serverHttp = http.createServer(app);
  serverHttp.listen(process.env.DAPPY_NODE_HTTP_PORT);

  if (process.env.DAPPY_NODE_HTTPS_PORT) {
    log(
      `Listening for HTTP+TLS on address 127.0.0.1:${process.env.DAPPY_NODE_HTTPS_PORT} ! (TLS handled by nodeJS)`,
    );
    const key = fs.readFileSync(path.join(process.cwd(), './dappynode.key'));
    const cert = fs.readFileSync(path.join(process.cwd(), './dappynode.crt'));
    const options = {
      key,
      cert,
      minVersion: 'TLSv1.3',
      cipher: 'TLS_AES_256_GCM_SHA384',
    };
    const serverHttps = https.createServer(options, app);

    serverHttps.listen(process.env.DAPPY_NODE_HTTPS_PORT);
  }
};

module.exports = {
  startHttpServers,
};
