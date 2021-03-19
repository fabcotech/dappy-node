const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const http = require('http');
const https = require('https');
const redis = require('redis');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const express = require('express');

// will not override the env variables in docker-compose
require('dotenv').config();

const rchainToolkit = require('rchain-toolkit');

const { listenForDataAtNameWsHandler } = require('./listen-for-data-at-name');
const {
  listenForDataAtNameXWsHandler,
} = require('./listen-for-data-at-name-x');
const { deployWsHandler } = require('./deploy');
const { exploreDeployWsHandler } = require('./explore-deploy');
const { exploreDeployXWsHandler } = require('./explore-deploy-x');
const { prepareDeployWsHandler } = require('./prepare-deploy');
const { getAllRecordsWsHandler } = require('./get-all-records');
const { getOneRecordWsHandler } = require('./get-one-record');
const { getXRecordsWsHandler } = require('./get-x-records');
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
  nodes = JSON.parse(
    fs.readFileSync(path.join('./', process.env.NODES_FILE)).toString('utf8')
  );
} catch (err) {
  log('could not parse nodes file : ' + process.env.NODES_FILE, 'error');
}

let special;

const redisClient = redis.createClient({
  db: 1,
  host: process.env.REDIS_HOST,
});

redisClient.on('error', (err) => {
  log('error : redis error ' + err);
});

let recordsJobRunning = false;
const runRecordsChildProcessJob = async () => {
  if (recordsJobRunning) {
    return;
  }
  recordsJobRunning = true;
  const t = setTimeout(() => {
    recordsJobRunning = false;
  }, 1000 * 120);
  const result = await getDappyRecordsAndSaveToDb(
    redisClient,
    httpUrlReadOnly,
    special
  );

  if (result && special) {
    special = {
      ...special,
      current: result[2],
    };
  }
  clearTimeout(t);
  recordsJobRunning = false;
};

const initJobs = () => {
  getLastFinalizedBlockNumber(httpUrlReadOnly, pickRandomValidator())
    .then((a) => {
      lastFinalizedBlockNumber = a.lastFinalizedBlockNumber;
      namePrice = a.namePrice;
    })
    .catch((err) => {
      log('failed to get last finalized block height');
      console.log(err);
    });
  setInterval(() => {
    if (
      new Date().getMinutes() % 10 ===
      parseInt(process.env.CRON_JOBS_NAMES_MODULO, 10)
    ) {
      log(
        'launching records job: ' +
          new Date().getMinutes() +
          'minutes % 10 === ' +
          process.env.CRON_JOBS_NAMES_MODULO
      );
      runRecordsChildProcessJob();
    }
  }, 1000 * 60);
  runRecordsChildProcessJob();

  setInterval(() => {
    getLastFinalizedBlockNumber(httpUrlReadOnly, pickRandomValidator())
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
/* app.get("/get-records-for-publickey", async (req, res) => {
  if (!req.query.publickey) {
    res.status(400).send("Missing query attribute publickey");
  }
  const keys = await redisSmembers(
    redisClient,
    `publicKey:${req.query.publickey}`
  );
  const records = await Promise.all(
    keys.map(k => redisHgetall(redisClient, `name:${k}`))
  );
  res.send(records);
}); */

/* app.get("/get-all-records", async (req, res) => {
  const keys = await redisKeys(redisClient, `name:*`);
  const records = await Promise.all(
    keys.map(k => redisHgetall(redisClient, k))
  );
  res.send(records);
});

app.get("/get-record", async (req, res) => {
  if (!req.query.name) {
    res.status(400).send("Missing query attribute name");
  }
  const record = await redisHgetall(redisClient, `name:${req.query.name}`);
  res.send(record);
});
 */

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

let httpUrlReadOnly = process.env.READ_ONLY;
let httpUrlValidator = process.env.VALIDATOR.includes(',')
  ? process.env.VALIDATOR.split(',')
  : [process.env.VALIDATOR];

const pickRandomValidator = () => {
  return httpUrlValidator[Math.floor(Math.random() * httpUrlValidator.length)];
};

log(
  `Listening for HTTP traffic on address ${process.env.HTTP_HOST}:${process.env.HTTP_PORT} !`
);

const serverHttp = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/info') {
    res.setHeader('Content-Type', 'application/json');
    res.write(
      JSON.stringify({
        dappyNodeVersion: DAPPY_NODE_VERSION,
        lastFinalizedBlockNumber: lastFinalizedBlockNumber,
        rnodeVersion: rnodeVersion,
        rchainNamesRegistryUri: process.env.RCHAIN_NAMES_REGISTRY_URI,
        rchainNetwork: process.env.RCHAIN_NETWORK,
        namePrice: namePrice,
      })
    );
    res.end();
  } else if (req.method === 'GET' && req.url.startsWith('/get-nodes')) {
    /*     const io = req.url.indexOf('?network=');

    if (io === -1) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Bad Request please provide "network" url parameter');
      return;
    }
    const network = req.url.substr(io + 9, 1000); */

    if (nodes) {
      res.setHeader('Content-Type', 'application/json');
      res.write(JSON.stringify(nodes));
      res.end();
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('unknown nodes resource');
    }
  }
});

serverHttp.listen(process.env.HTTP_PORT);

// TLS endpoint

let serverHttps;

const app = express();
app.use(bodyParser.json());

const requests = {
  total: 0,
  '/get-all-records': 0,
  '/get-x-records': 0,
  '/get-one-record': 0,
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
let requestsJson = JSON.stringify(requests, null, 2);
const start = new Date().getTime();
setInterval(() => {
  const perSecond = {};
  const secondsElapsed = (new Date().getTime() - start) / 1000;
  Object.keys(requests).forEach((r) => {
    perSecond[r] = Math.round((100 * requests[r]) / secondsElapsed) / 100;
  });
  requestsJson = JSON.stringify(perSecond, null, 2);
}, 10000);

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
  const data = await prepareDeployWsHandler(req.body, httpUrlReadOnly);
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
    httpUrlReadOnly,
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
    httpUrlReadOnly,
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
  const data = await listenForDataAtNameWsHandler(req.body, httpUrlReadOnly);
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
  const data = await listenForDataAtNameXWsHandler(req.body, httpUrlReadOnly);
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
app.post('/get-one-record', async (req, res) => {
  requests.total += 1;
  requests['/get-one-record'] += 1;
  const data = await getOneRecordWsHandler(req.body, redisClient);
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
  const data = await getXRecordsWsHandler(req.body, redisClient);
  if (data.success) {
    res.write(JSON.stringify(data));
    res.end();
  } else {
    res.write(JSON.stringify(data));
    res.status(400);
    res.end();
  }
});

app.post('/status', (req, res) => {
  res.write(requestsJson);
  res.end();
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

if (process.argv.includes('--ssl')) {
  log(
    `Listening for HTTP+TLS on address ${process.env.HTTP_HOST}:${process.env.HTTPS_PORT} ! (TLS handled by nodeJS)`
  );
  const options = {
    key: fs.readFileSync(path.join(__dirname, '../server-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../server-crt.pem')),
  };
  serverHttps = https.createServer(options, app);
} else {
  log(
    `Listening for HTTP on address ${process.env.HTTP_HOST}:${process.env.HTTPS_PORT} ! (TLS not handled by nodeJS)`
  );
  serverHttps = http.createServer(app);
}

serverHttps.listen(process.env.HTTPS_PORT);

(httpUrlReadOnly.startsWith('https://') ? https : http).get(
  `${httpUrlReadOnly}/version`,
  (resp) => {
    log(`RChain node responding at ${httpUrlReadOnly}/version`);

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
