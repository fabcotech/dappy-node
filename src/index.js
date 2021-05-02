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

const log = require('./utils').log;
const redisHgetall = require('./utils').redisHgetall;
const redisKeys = require('./utils').redisKeys;

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
  db: 1,
  host: process.env.REDIS_SERVICE_HOST,
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
  getLastFinalizedBlockNumber(pickRandomReadOnly(), pickRandomValidator())
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
    health(httpUrlReadOnly);
    generateMonitor();
  }, 30000);

  setInterval(() => {
    getLastFinalizedBlockNumber(pickRandomReadOnly(), pickRandomValidator())
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
  !process.env.READ_ONLY.startsWith('https://') &&
  !process.env.READ_ONLY.startsWith('http://')
) {
  log('READ_ONLY must start with http:// or https://', 'error');
  process.exit();
}
if (
  !process.env.VALIDATOR.startsWith('https://') &&
  !process.env.VALIDATOR.startsWith('http://')
) {
  log('VALIDATOR must start with http:// or https://', 'error');
  process.exit();
}
log('host (read-only):                   ' + process.env.READ_ONLY);
log('host (validator):                   ' + process.env.VALIDATOR);

let httpUrlReadOnly = process.env.READ_ONLY.includes(',')
  ? process.env.READ_ONLY.split(',')
  : [process.env.READ_ONLY];
let httpUrlValidator = process.env.VALIDATOR.includes(',')
  ? process.env.VALIDATOR.split(',')
  : [process.env.VALIDATOR];

const pickRandomReadOnly = () => {
  return httpUrlReadOnly[Math.floor(Math.random() * httpUrlReadOnly.length)];
};
const pickRandomValidator = () => {
  return httpUrlValidator[Math.floor(Math.random() * httpUrlValidator.length)];
};

log(
  `Listening for HTTP on address 127.0.0.1:${process.env.NODEJS_SERVICE_PORT_3001} !`
);

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

app.use(bodyParser.json());

const requestsDefault = {
  total: 0,
  '/get-all-records': 0,
  '/get-x-records': 0,
  '/get-x-records-by-public-key': 0,
  '/ping': 0,
  '/info': 0,
  ['/last-finalized-block-number']: 0,
  ['/api/deploy']: 0,
  ['/api/prepare-deploy']: 0,
  ['/api/explore-deploy']: 0,
  ['/api/explore-deploy-from-cache']: 0,
  ['/explore-deploy-x']: 0,
  ['/explore-deploy-x-from-cache']: 0,
  '/api/listen-for-data-at-name': 0,
  '/listen-for-data-at-name-x': 0,
};
let requests = { ...requestsDefault };
setInterval(() => {
  let day = new Date().toISOString().slice(0, 10);
  let logs = {};
  try {
    logs = JSON.parse(fs.readFileSync(`./logs/dappy-node-${day}.json`, 'utf8'));
  } catch (err) {}
  logs[new Date().toISOString().slice(11, 19)] = Object.values(requests);
  fs.writeFileSync(
    `./logs/dappy-node-${day}.json`,
    JSON.stringify(logs),
    'utf8'
  );

  requests = { ...requestsDefault };
}, 30000);

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
  requests.total += 1;
  requests['/ping'] += 1;
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
  requests.total += 1;
  requests['/info'] += 1;
  const data = {
    dappyNodeVersion: DAPPY_NODE_VERSION,
    lastFinalizedBlockNumber: lastFinalizedBlockNumber,
    rnodeVersion: rnodeVersion,
    rchainNamesRegistryUri: process.env.RCHAIN_NAMES_REGISTRY_URI,
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
  requests.total += 1;
  requests['/last-finalized-block-number'] += 1;
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
  requests.total += 1;
  requests['/api/deploy'] += 1;
  const data = await deployWsHandler(req.body, pickRandomValidator());
  res.write(JSON.stringify(data));
  res.end();
});
app.post('/api/prepare-deploy', async (req, res) => {
  requests.total += 1;
  requests['/api/prepare-deploy'] += 1;
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
  requests.total += 1;
  requests['/api/explore-deploy'] += 1;
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
  requests.total += 1;
  requests['/explore-deploy-x'] += 1;
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
  requests.total += 1;
  requests['/api/listen-for-data-at-name'] += 1;
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
  requests.total += 1;
  requests['/listen-for-data-at-name-x'] += 1;
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
  requests.total += 1;
  requests['/get-x-records'] += 1;
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
  requests.total += 1;
  requests['/get-x-records-by-public-key'] += 1;
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
  requests.total += 1;
  requests['/get-nodes'] += 1;
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

// Unencrypted HTTP endpoint (3001)
serverHttp = http.createServer(app);
serverHttp.listen(process.env.NODEJS_SERVICE_PORT_3001);

// Encrypted SSL/TLS endpoint (3002), is regular http in PROD (nginx handles TLS), and https in DEV
let serverHttps;
if (process.argv.includes('--ssl')) {
  log(
    `Listening for HTTP+TLS on address 127.0.0.1:${process.env.NODEJS_SERVICE_PORT_3002} ! (TLS handled by nodeJS)`
  );
  const options = {
    key: fs.readFileSync(path.join(__dirname, '../server-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../server-crt.pem')),
  };
  serverHttps = https.createServer(options, app);
} else {
  log(
    `Listening for HTTP on address 127.0.0.1:${process.env.NODEJS_SERVICE_PORT_3002} ! (TLS not handled by nodeJS)`
  );
  serverHttps = http.createServer(app);
}

serverHttps.listen(process.env.NODEJS_SERVICE_PORT_3002);

(httpUrlReadOnly[0].startsWith('https://') ? https : http).get(
  `${httpUrlReadOnly[0]}/version`,
  (resp) => {
    log(`RChain node responding at ${pickRandomReadOnly()}/version`);

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
      log(`${rawData}\n`);
      rnodeVersion = rawData;
      initJobs();
      return;
    });

    resp.on('error', (err) => {
      log('error: ' + err);
      process.exit();
    });
  }
);
