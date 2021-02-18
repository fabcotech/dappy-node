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

let protobufsLoaded = false;
let appReady = false;
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
  getLastFinalizedBlockNumber(httpUrlReadOnly, httpUrlValidator)
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
    getLastFinalizedBlockNumber(httpUrlReadOnly, httpUrlValidator)
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
  !process.env.READ_ONLY_HOST.startsWith('https://') &&
  !process.env.READ_ONLY_HOST.startsWith('http://')
) {
  log('READ_ONLY_HOST must start with http:// or https://', 'error');
  process.exit();
}
if (
  !process.env.VALIDATOR_HOST.startsWith('https://') &&
  !process.env.VALIDATOR_HOST.startsWith('http://')
) {
  log('VALIDATOR_HOST must start with http:// or https://', 'error');
  process.exit();
}
log('host (read-only):                   ' + process.env.READ_ONLY_HOST);
log('host (read-only) HTTP port:         ' + process.env.READ_ONLY_HTTP_PORT);
log('host (validator):                   ' + process.env.VALIDATOR_HOST);
log('host (validator) HTTP port:         ' + process.env.VALIDATOR_HTTP_PORT);
log(
  'host (validator) GRPC propose port: ' +
    process.env.VALIDATOR_GRPC_PROPOSE_PORT
);

let httpUrlReadOnly = `${process.env.READ_ONLY_HOST}:${process.env.READ_ONLY_HTTP_PORT}`;
if (!process.env.READ_ONLY_HTTP_PORT) {
  httpUrlReadOnly = process.env.READ_ONLY_HOST;
}
let httpUrlValidator = `${process.env.VALIDATOR_HOST}:${process.env.VALIDATOR_HTTP_PORT}`;
if (!process.env.VALIDATOR_HTTP_PORT) {
  httpUrlValidator = process.env.VALIDATOR_HOST;
}
const grpcUrlValidator = `${process.env.VALIDATOR_HOST}:${process.env.VALIDATOR_GRPC_PROPOSE_PORT}`;

const loadClient = async () => {
  rnodeProposeClient = await rchainToolkit.grpc.getGrpcProposeClient(
    grpcUrlValidator,
    grpc,
    protoLoader
  );

  protobufsLoaded = true;
  if (appReady) {
    initJobs();
  }
};
loadClient();

// HTTP endpoint

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

app.post('/ping', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.write(JSON.stringify({ data: 'pong' }));
  res.end();
});
app.post('/info', (req, res) => {
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
  const data = await deployWsHandler(req.body, httpUrlValidator);
  res.write(JSON.stringify(data));
  res.end();
});
app.post('/api/prepare-deploy', async (req, res) => {
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
app.post('/api/explore-deploy', async (req, res) => {
  const data = await exploreDeployWsHandler(req.body, httpUrlReadOnly);
  if (data.success) {
    res.write(JSON.stringify(data));
    res.end();
  } else {
    res.write(JSON.stringify(data));
    res.status(400);
    res.end();
  }
});
app.post('/explore-deploy-x', async (req, res) => {
  const data = await exploreDeployXWsHandler(req.body, httpUrlReadOnly);
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
      appReady = true;
      if (protobufsLoaded) {
        initJobs();
      }
      return;
    });

    resp.on('error', (err) => {
      log('error: ' + err);
      process.exit();
    });
  }
);
