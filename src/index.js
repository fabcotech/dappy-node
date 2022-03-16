const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const express = require('express');
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');

const RChainZoneProvider = require('./ZoneProvider/rchain');
const MemoryZoneProvider = require('./ZoneProvider/memory');

// will not override the env variables in docker-compose
require('dotenv').config();

const { logs } = require('./routes');
const {
  initRequestMetrics,
  incRequestMetricsMiddleware,
} = require('./requestMetrics');
const { listenForDataAtNameWsHandler } = require('./listen-for-data-at-name');
const {
  listenForDataAtNameXWsHandler,
} = require('./listen-for-data-at-name-x');
const { deployWsHandler } = require('./deploy');
const { exploreDeployWsHandler } = require('./explore-deploy');
const { exploreDeployXWsHandler } = require('./explore-deploy-x');
const { prepareDeployWsHandler } = require('./prepare-deploy');
const { getXRecordsWsHandler } = require('./get-x-records');
const {
  getXRecordsByPublicKeyWsHandler,
} = require('./get-x-records-by-public-key');
require('./jobs/get-contract-logs');

const { log } = require('./utils');

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  require('dotenv').config();
}

const DAPPY_NODE_VERSION = '0.2.8';

const rnodeVersion = undefined;
const lastFinalizedBlockNumber = undefined;
const namePrice = null;

const pickRandomValidator = () => ({
  url: httpUrlValidator[Math.floor(Math.random() * httpUrlValidator.length)],
});

const app = express();
if (process.env.SENTRY) {
  Sentry.init({
    dsn: process.env.SENTRY,
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // enable Express.js middleware tracing
      new Tracing.Integrations.Express({ app }),
    ],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
  });
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
  app.use(Sentry.Handlers.errorHandler());
}

initRequestMetrics();

app.use(bodyParser.json());
app.use(incRequestMetricsMiddleware);

app.post('/ping', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.write(JSON.stringify({ data: 'pong' }));
  res.end();
});

const startHttpServers = () => {
  log(`Listening for HTTP on address 127.0.0.1:${process.env.HTTP_PORT} !`);
  serverHttp = http.createServer(app);
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
    serverHttps = https.createServer(options, app);

    serverHttps.listen(process.env.HTTPS_PORT);
  }
};

const providers = {
  rchain: RChainZoneProvider,
  memory: MemoryZoneProvider,
};

function getCurrentZoneProvider() {
  const provider = providers[process.env.ZONE_PROVIDER] || 'rchain';
  if (!provider) {
    log(`Zone provider ${zoneProvider} not found`, 'error');
    process.exit(1);
  }
  return provider;
}

function startZoneProvider() {
  const zoneProvider = getCurrentZoneProvider();
  return zoneProvider.start();
}

/*
 Clean cached results from exlore-deploy and explore-deploy-x
 every 30 seconds
*/

function startJobClearExpiredKeys() {
  setInterval(async () => {
    const cacheEpoch = Math.round(new Date().getTime() / (1000 * caching));
    const edKeys = await redisClient.keys('cache:ed:*');
    const edxKeys = await redisClient.keys('cache:edx:*');
    const old = edKeys.concat(edxKeys).filter((k) => parseInt(k.split(':')[3]) < cacheEpoch);
    if (old.length) {
      redisClient.del(...old, (err, resp) => {
        if (err) {
          log(err, 'error');
        }
      });
    }
  }, 30000);
}

let redisClient;

async function startRedisClient() {
  if (!process.env.DAPPY_NODE_CACHING) {
    return;
  }

  redisClient = redis.createClient({
    database: process.env.REDIS_DB,
    socket: {
      host: process.env.REDIS_SERVICE_HOST,
      port: process.env.REDIS_SERVICE_PORT || 6379,
    },
  });

  await redisClient.connect();

  redisClient.on('error', (err) => {
    log(`error : redis error ${err}`);
  });
}

function addZoneProviderRoutes(store) {
  const zoneProvider = getCurrentZoneProvider();
  const routes = zoneProvider.getRoutes();

  routes.forEach(([method, path, createHandler]) => {
    app[method](path, createHandler(store));
  });
}

async function start() {
  const store = {};
  const useCache = !!parseInt(process.env.CACHING);

  if (useCache) {
    await startRedisClient();
    startJobClearExpiredKeys();
  }

  await startZoneProvider(store);
  startHttpServers();
  addZoneProviderRoutes(store);
}

start();
