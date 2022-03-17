const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const express = require('express');

const { getNodes, ping } = require('./routes');
const { initSentry } = require('./sentry');
const { addZoneProviderRoutes } = require('../ZoneProviders');
const { incRequestMetricsMiddleware } = require('../requestMetrics');

const { log } = require('../log');

const initRoutes = (app, store) => {
  initSentry(app);

  app.post('/ping', ping);
  app.post('/get-nodes', getNodes);

  addZoneProviderRoutes(app, store);
};

const startHttpServers = (store) => {
  const app = express();

  app.use(bodyParser.json());
  app.use(incRequestMetricsMiddleware);
  initRoutes(app, store);

  log(`Listening for HTTP on address 127.0.0.1:${process.env.HTTP_PORT} !`);
  const serverHttp = http.createServer(app);
  serverHttp.listen(process.env.HTTP_PORT);

  if (process.env.HTTPS_PORT) {
    log(
      `Listening for HTTP+TLS on address 127.0.0.1:${process.env.HTTPS_PORT} ! (TLS handled by nodeJS)`,
    );
    const key = fs.readFileSync(path.join(__dirname, '../dappynode.key'));
    const cert = fs.readFileSync(path.join(__dirname, '../dappynode.crt'));
    const options = {
      key,
      cert,
      minVersion: 'TLSv1.3',
      cipher: 'TLS_AES_256_GCM_SHA384',
    };
    const serverHttps = https.createServer(options, app);

    serverHttps.listen(process.env.HTTPS_PORT);
  }
};

module.exports = {
  startHttpServers,
};
