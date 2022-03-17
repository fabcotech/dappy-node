const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const express = require('express');
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');
const redis = require('redis');

const { startJobExpiredRecords } = require('./jobs/deleteExpiredRecords');

const RChainZoneProvider = require('./ZoneProvider/rchain');
const MemoryZoneProvider = require('./ZoneProvider/memory');

// will not override the env variables in docker-compose
require('dotenv').config();

const {
  initRequestMetrics,
  incRequestMetricsMiddleware,
} = require('./requestMetrics');

const { log } = require('./utils');

const providers = {
  rchain: RChainZoneProvider,
  memory: MemoryZoneProvider,
};

function getCurrentZoneProvider() {
  const provider = providers[process.env.DAPPY_NODE_ZONE_PROVIDER || 'rchain'];
  if (!provider) {
    log(`Zone provider ${provider} not found`, 'error');
    process.exit(1);
  }
  return provider;
}

function startZoneProvider(store) {
  const zoneProvider = getCurrentZoneProvider();
  return zoneProvider.start(store);
}

function addZoneProviderRoutes(app, store) {
  const zoneProvider = getCurrentZoneProvider();
  const routes = zoneProvider.getRoutes();

  routes.forEach(([method, routePath, createHandler]) => {
    app[method](routePath, createHandler(store));
  });
}

const getNodes = (store) => (req, res) => {
  if (store.nodes) {
    res.json({
      data: store.nodes,
    });
  } else {
    res.status(404).end();
  }
};

const initRoutes = (app, store) => {
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

  app.post('/ping', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.write(JSON.stringify({ data: 'pong' }));
    res.end();
  });

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

/*
 Clean cached results from exlore-deploy and explore-deploy-x
 every 30 seconds
*/
function startJobClearExpiredExploreDeploys(store) {
  setInterval(async () => {
    const cacheEpoch = Math.round(new Date().getTime() / (1000 * store.caching));
    const edKeys = await store.redisClient.keys('cache:ed:*');
    const edxKeys = await store.redisClient.keys('cache:edx:*');
    const old = edKeys
      .concat(edxKeys)
      .filter((k) => parseInt(k.split(':')[3], 10) < cacheEpoch);
    if (old.length) {
      store.redisClient.del(...old, (err) => {
        if (err) {
          log(err, 'error');
        }
      });
    }
  }, 30000);
}

async function startRedisClient(store) {
  if (!process.env.DAPPY_NODE_CACHING) {
    return;
  }

  store.redisClient = redis.createClient({
    database: process.env.REDIS_DB,
    socket: {
      host: process.env.REDIS_SERVICE_HOST,
      port: process.env.REDIS_SERVICE_PORT || 6379,
    },
  });

  await store.redisClient.connect();

  store.redisClient.on('error', (err) => {
    log(`error : redis error ${err}`);
  });
}

const initStore = () => ({
  dappyNodeVersion: '0.2.8',
  dappyBrowserMinVersion: process.env.DAPPY_BROWSER_MIN_VERSION,
  dappyBrowserDownloadLink: process.env.DAPPY_BROWSER_DOWNLOAD_LINK,
  namePrice: null,
  caching: parseInt(process.env.DAPPY_NODE_CACHING, 10),
  useCache: !!parseInt(process.env.DAPPY_NODE_CACHING, 10),
});

function initNodes(store) {
  try {
    if (process.env.NODES_FILE) {
      store.nodes = JSON.parse(
        fs
          .readFileSync(path.join('./', process.env.NODES_FILE))
          .toString('utf8'),
      );
    } else {
      log('ignoring NODES_FILE', 'warning');
    }
  } catch (err) {
    log(`could not parse nodes file : ${process.env.NODES_FILE}`, 'error');
  }
}

async function start() {
  const store = initStore();

  if (store.useCache) {
    await startRedisClient(store);
    startJobClearExpiredExploreDeploys(store);
    startJobExpiredRecords(store);
  }

  initNodes(store);

  await startZoneProvider(store);
  startHttpServers(store);

  initRequestMetrics();
}

start();
