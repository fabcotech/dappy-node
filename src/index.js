const http = require('http');
const https = require('https');
const redis = require('redis');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const express = require('express');
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');

// will not override the env variables in docker-compose
require('dotenv').config();

const { logs } = require("./routes");
const { initRequestMetrics, incRequestMetricsMiddleware, incRequestMetric } = require('./requestMetrics');
const { listenForDataAtNameWsHandler } = require('./listen-for-data-at-name');
const {
  listenForDataAtNameXWsHandler,
} = require('./listen-for-data-at-name-x');
const { deployWsHandler } = require('./deploy');
const { exploreDeployWsHandler } = require('./explore-deploy');
const { exploreDeployXWsHandler } = require('./explore-deploy-x');
const { prepareDeployWsHandler } = require('./prepare-deploy');
const { getAllRecordsWsHandler } = require('./get-all-records');
const { getXRecordsWsHandler } = require('./get-x-records');
const {
  getXRecordsByPublicKeyWsHandler,
} = require('./get-x-records-by-public-key');
const { health } = require('./jobs/health');
const { generateMonitor } = require('./jobs/generateMonitor');
const { getDappyRecordsAndSaveToDb } = require('./jobs/records');
const { getLastFinalizedBlockNumber } = require('./jobs/last-block');

const { log, getRedisMethod, redisKeys } = require('./utils');

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  require('dotenv').config();
}

const DAPPY_NODE_VERSION = '0.2.8';

let rnodeVersion = undefined;
let lastFinalizedBlockNumber = undefined;
let namePrice = undefined;
let nodes = undefined;
try {
  if (process.env.NODES_FILE) {
    nodes = JSON.parse(
      fs.readFileSync(path.join('./', process.env.NODES_FILE)).toString('utf8')
    );
  } else {
    log('ignoring NODES_FILE', 'warning');
  }
} catch (err) {
  log('could not parse nodes file : ' + process.env.NODES_FILE, 'error');
}

let special;

const redisClient = redis.createClient({
  db: process.env.REDIS_DB,
  host: process.env.REDIS_SERVICE_HOST,
  port: process.env.REDIS_SERVICE_PORT || 6379,
});

redisClient.on('error', (err) => {
  log('error : redis error ' + err);
});

let recordsJobRunning = false;
const runRecordsChildProcessJob = async (quarter) => {
  if (recordsJobRunning) {
    return;
  }
  recordsJobRunning = true;
  // remove 1/4 of the names every 15 minutes
  const result = await getDappyRecordsAndSaveToDb(redisClient, quarter);

  /* if (result && special) {
    special = {
      ...special,
      current: result[2],
    };
  } */
  //clearTimeout(t);
  recordsJobRunning = false;
};

const initJobs = () => {
  getLastFinalizedBlockNumber(pickRandomReadOnly())
    .then((a) => {
      lastFinalizedBlockNumber = a.lastFinalizedBlockNumber;
      namePrice = a.namePrice;
    })
    .catch((err) => {
      log('failed to get last finalized block height');
      console.log(err);
    });
  setInterval(() => {
    if (new Date().getMinutes() % 15 === 0) {
      log(
        'will clean records/names cache: ' +
          new Date().getMinutes() +
          ' minutes % 15 === 0'
      );
      runRecordsChildProcessJob(new Date().getMinutes() / 15);
    }
  }, 1000 * 60);

  setInterval(() => {
    health(pickRandomReadOnly());
    generateMonitor();
  }, 30000);

  setInterval(() => {
    getLastFinalizedBlockNumber(pickRandomReadOnly())
      .then((a) => {
        lastFinalizedBlockNumber = a.lastFinalizedBlockNumber;
        namePrice = a.namePrice;
      })
      .catch((err) => {
        log('failed to get last finalized block height', 'error');
        console.log(err);
      });
  }, process.env.LAST_BLOCK_JOB_INTERVAL);
};

if (process.env.SPECIAL) {
  try {
    const split = process.env.SPECIAL.split(',');
    if (
      typeof split[0] === 'string' &&
      typeof parseInt(split[1], 10) === 'number'
    ) {
      log(
        'SPECIAL OPERATION ACTIVATED, name: ' + split[0] + ', max: ' + split[1]
      );
      special = {
        name: split[0],
        current: -1, // -1 so it is invalid until first runRecordsChildProcessJob() execution
        max: parseInt(split[1], 10),
      };
    }
  } catch (e) {
    console.log(e);
  }
}

if (
  !process.env.VALIDATOR.startsWith('https://') &&
  !process.env.VALIDATOR.startsWith('http://')
) {
  log('VALIDATOR must start with http:// or https://', 'error');
  process.exit();
}

let httpUrlValidator = process.env.VALIDATOR.includes(',')
  ? process.env.VALIDATOR.split(',')
  : [process.env.VALIDATOR];

let httpUrlReadOnly = process.env.READ_ONLY.includes(',')
  ? process.env.READ_ONLY.split(',')
  : [process.env.READ_ONLY];

log(`host (read-only):                   ${httpUrlReadOnly}`);
log('host (validator):                   ' + process.env.VALIDATOR);

const pickRandomValidator = () => {
  return {
    url: httpUrlValidator[Math.floor(Math.random() * httpUrlValidator.length)],
  };
};

const readOnlyOptions = {};
const pickRandomReadOnly = () => {
  const r = httpUrlReadOnly[Math.floor(Math.random() * httpUrlReadOnly.length)];
  if (readOnlyOptions[r]) {
    return readOnlyOptions[r];
  } else {
    readOnlyOptions[r] = {
      url: r,
    };

    if (r.startsWith('https://') && process.env.READ_ONLY_CERTIFICATE_PATH) {
      const cert = fs.readFileSync(
        process.env.READ_ONLY_CERTIFICATE_PATH,
        'utf8'
      );
      readOnlyOptions[r].ca = [cert];
    }
    return readOnlyOptions[r];
  }
};

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

/*
 Clean cached results from exlore-deploy and explore-deploy-x
 every 30 seconds
*/
const caching = parseInt(process.env.CACHING);
const useCache = caching && caching !== 0 && typeof caching === 'number';

if (useCache) {
  setInterval(async () => {
    const cacheEpoch = Math.round(new Date().getTime() / (1000 * caching));
    const edKeys = await redisKeys(redisClient, `cache:ed:*`);
    const edxKeys = await redisKeys(redisClient, `cache:edx:*`);
    const old = edKeys.concat(edxKeys).filter((k) => {
      return parseInt(k.split(':')[3]) < cacheEpoch;
    });
    if (old.length) {
      redisClient.del(...old, (err, resp) => {
        if (err) {
          log(err, 'error');
        }
      });
    }
  }, 30000);
}

app.post('/ping', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.write(JSON.stringify({ data: 'pong' }));
  res.end();
});
app.get('/monitor', (req, res) => {
  try {
    const html = fs.readFileSync('./www/monitor.html', 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
  } catch (err) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('not found');
  }
});

app.post('/info', (req, res) => {
  const data = {
    dappyNodeVersion: DAPPY_NODE_VERSION,
    lastFinalizedBlockNumber: lastFinalizedBlockNumber,
    rnodeVersion: rnodeVersion,
    rchainNamesMasterRegistryUri: process.env.RCHAIN_NAMES_MASTER_REGISTRY_URI,
    rchainNamesContractId: process.env.RCHAIN_NAMES_CONTRACT_ID,
    rchainNetwork: process.env.RCHAIN_NETWORK,
    namePrice: namePrice,
  };
  if (
    special &&
    typeof special.current === 'number' &&
    special.current > -1 &&
    special.current !== special.max
  ) {
    data.special = special;
  }
  res.setHeader('Content-Type', 'application/json');
  res.write(
    JSON.stringify({
      data: data,
      success: true,
    })
  );
  res.end();
});
app.post('/last-finalized-block-number', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.write(
    JSON.stringify({
      data: lastFinalizedBlockNumber,
      success: true,
    })
  );
  res.end();
});
app.post('/api/deploy', async (req, res) => {
  const data = await deployWsHandler(req.body, pickRandomValidator());
  res.write(JSON.stringify(data));
  res.end();
});
app.post('/api/prepare-deploy', async (req, res) => {
  const data = await prepareDeployWsHandler(req.body, pickRandomReadOnly());
  if (data.success) {
    res.write(JSON.stringify(data));
    res.end();
  } else {
    res.write(JSON.stringify(data));
    res.status(400);
    res.end();
  }
});

const edFromCachePlusOne = () => {
  requests['/explore-deploy-from-cache'] += 1;
};
app.post('/api/explore-deploy', async (req, res) => {
  const data = await exploreDeployWsHandler(
    req.body,
    pickRandomReadOnly(),
    redisClient,
    useCache,
    caching,
    edFromCachePlusOne
  );
  if (data.success) {
    res.write(JSON.stringify(data));
    res.end();
  } else {
    res.write(JSON.stringify(data));
    res.status(400);
    res.end();
  }
});

const edxFromCachePlusOne = () => {
  requests['/explore-deploy-x-from-cache'] += 1;
};
app.post('/explore-deploy-x', async (req, res) => {
  const data = await exploreDeployXWsHandler(
    req.body,
    pickRandomReadOnly(),
    redisClient,
    useCache,
    caching,
    edxFromCachePlusOne
  );
  if (data.success) {
    res.write(JSON.stringify(data));
    res.end();
  } else {
    res.write(JSON.stringify(data));
    res.status(400);
    res.end();
  }
});
app.post('/api/listen-for-data-at-name', async (req, res) => {
  const data = await listenForDataAtNameWsHandler(
    req.body,
    pickRandomReadOnly()
  );
  if (data.success) {
    res.write(JSON.stringify(data));
    res.end();
  } else {
    res.write(JSON.stringify(data));
    res.status(400);
    res.end();
  }
});
app.post('/listen-for-data-at-name-x', async (req, res) => {
  const data = await listenForDataAtNameXWsHandler(
    req.body,
    pickRandomReadOnly()
  );
  if (data.success) {
    res.write(JSON.stringify(data));
    res.end();
  } else {
    res.write(JSON.stringify(data));
    res.status(400);
    res.end();
  }
});
app.post('/get-all-records', async (req, res) => {
  const data = await getAllRecordsWsHandler(redisClient);
  if (data.success) {
    res.write(JSON.stringify(data));
    res.end();
  } else {
    res.write(JSON.stringify(data));
    res.status(400);
    res.end();
  }
});

app.post('/get-x-records', async (req, res) => {
  const data = await getXRecordsWsHandler(
    req.body,
    redisClient,
    pickRandomReadOnly()
  );
  if (data.success) {
    res.write(JSON.stringify(data));
    res.end();
  } else {
    res.write(JSON.stringify(data));
    res.status(400);
    res.end();
  }
});
app.post('/get-x-records-by-public-key', async (req, res) => {
  const data = await getXRecordsByPublicKeyWsHandler(req.body, redisClient);
  if (data.success) {
    res.write(JSON.stringify(data));
    res.end();
  } else {
    res.write(JSON.stringify(data));
    res.status(400);
    res.end();
  }
});

app.post('/get-nodes', (req, res) => {
  if (nodes) {
    res.write(
      JSON.stringify({
        data: nodes,
      })
    );
    res.end();
  } else {
    res.status(404).end();
  }
});

app.post('/get-contract-logs', (req, res) => {
  logs(
    getRedisMethod(redisClient, 'zrevrange'),
    log,
  )(req.body, res);
});

const initServers = () => {
  log(
    `Listening for HTTP on address 127.0.0.1:${process.env.HTTP_PORT} !`
  );
  // Unencrypted HTTP endpoint (3001)
  serverHttp = http.createServer(app);
  serverHttp.listen(process.env.HTTP_PORT);

  if (process.env.HTTPS_PORT) {
    log(
      `Listening for HTTP+TLS on address 127.0.0.1:${process.env.HTTPS_PORT} ! (TLS handled by nodeJS)`
    );
    const key = fs.readFileSync(path.join(__dirname, '../dappynode.key'));
    const cert = fs.readFileSync(path.join(__dirname, '../dappynode.crt'));
    const options = {
      key: key,
      cert: cert,
      minVersion: 'TLSv1.3',
      cipher: 'TLS_AES_256_GCM_SHA384',
    };
    serverHttps = https.createServer(options, app);

    serverHttps.listen(process.env.HTTPS_PORT);
    }
};

const interval = setInterval(() => {
  const randomOptionsReadOnly = pickRandomReadOnly();

  const req = (randomOptionsReadOnly.url.startsWith('https://') ? https : http).get(
    `${randomOptionsReadOnly.url}/version`, 
    randomOptionsReadOnly,
    (resp) => {
      if (resp.statusCode !== 200) {
        log('Status code different from 200', 'error');
        console.log(resp.statusCode);
        process.exit();
      }

      resp.setEncoding('utf8');
      let rawData = '';
      resp.on('data', (chunk) => {
        rawData += chunk;
      });

      resp.on('end', () => {
        rnodeVersion = rawData;
        const req2 = (
          randomOptionsReadOnly.url.startsWith('https://') ? https : http
        ).get(`${randomOptionsReadOnly.url}/api/blocks/1`,
        randomOptionsReadOnly, 
        (resp2) => {
          if (resp2.statusCode !== 200) {
            log(
              'rnode observer blocks api not ready (1), will try again in 10s'
            );
            return;
          }

          resp2.setEncoding('utf8');
          let rawData2 = '';
          resp2.on('data', (chunk) => {
            rawData2 += chunk;
          });
          resp2.on('end', () => {
            if (typeof JSON.parse(rawData2)[0].blockHash === 'string') {
              log(`${rawData}\n`);
              log(
                `RChain node responding at ${randomOptionsReadOnly.url}/version and /api/blocks/1`
              );
              initServers();
              initJobs();
              clearInterval(interval);
            }
          });
          resp2.on('error', (err) => {
            throw new Error(err);
          });
        });

        req2.end();
        req2.on('error', (err) => {
          console.log(err);
          log('rnode observer blocks api not ready (2), will try again in 10s');
        });
      });
      resp.on('error', (err) => {
        throw new Error(err);
      });
    }
  );
  req.end();
  req.on('error', (err) => {
    log('rnode observer not ready, will try again in 10s');
  });
}, 10000);
