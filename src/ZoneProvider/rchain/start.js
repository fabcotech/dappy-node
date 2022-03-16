const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');

const { deleteRecords } = require('./jobs/deleteRecords');
const { health } = require('./jobs/health');
const { getLastFinalizedBlockNumber } = require('./jobs/last-block');
const { getPurseZeroPrice } = require('./jobs/purse-zero-price');

const { log } = require('../../utils');

let recordsJobRunning = false;
const runRecordsChildProcessJob = async (quarter) => {
  if (recordsJobRunning) {
    return;
  }
  recordsJobRunning = true;
  // remove 1/4 of the names every 15 minutes
  await deleteRecords(redisClient, quarter);

  recordsJobRunning = false;
};

const initJobs = () => {
  getLastFinalizedBlockNumber(pickRandomReadOnly())
    .then((a) => {
      lastFinalizedBlockNumber = a.lastFinalizedBlockNumber;
    })
    .catch((err) => {
      log('failed to get last finalized block height');
      console.log(err);
    });

  if (
    process.env.RCHAIN_NAMES_MASTER_REGISTRY_URI
    && process.env.RCHAIN_NAMES_CONTRACT_ID
  ) {
    getPurseZeroPrice(pickRandomReadOnly())
      .then((a) => {
        namePrice = a.namePrice;
      })
      .catch((err) => {
        log('failed to get purse zero price');
        console.log(err);
      });
  }
  setInterval(() => {
    if (new Date().getMinutes() % 15 === 0) {
      log(
        `will clean records/names cache: ${
          new Date().getMinutes()
        } minutes % 15 === 0`,
      );
      runRecordsChildProcessJob(new Date().getMinutes() / 15);
    }
  }, 1000 * 60);

  setInterval(() => {
    health(pickRandomReadOnly());
  }, 30000);

  setInterval(() => {
    getLastFinalizedBlockNumber(pickRandomReadOnly())
      .then((a) => {
        lastFinalizedBlockNumber = a.lastFinalizedBlockNumber;
      })
      .catch((err) => {
        log('failed to get last finalized block height');
        console.log(err);
      });

    if (
      process.env.RCHAIN_NAMES_MASTER_REGISTRY_URI
      && process.env.RCHAIN_NAMES_CONTRACT_ID
    ) {
      getPurseZeroPrice(pickRandomReadOnly())
        .then((a) => {
          namePrice = a.namePrice;
        })
        .catch((err) => {
          log('failed to get purse zero price');
          console.log(err);
        });
    }
  }, process.env.LAST_BLOCK_JOB_INTERVAL || 40000);
};

const startWhenRNodeIsReady = () => new Promise((resolve, reject) => {
  const intervalHandler = setInterval(() => {
    const randomOptionsReadOnly = pickRandomReadOnly();

    const req = (
      randomOptionsReadOnly.url.startsWith('https://') ? https : http
    ).get(
      `${randomOptionsReadOnly.url}/version`,
      randomOptionsReadOnly,
      (resp) => {
        if (resp.statusCode !== 200) {
          log('Status code different from 200', 'error');
          console.log(resp.statusCode);
          reject(new Error('Status code different from 200'));
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
          ).get(
            `${randomOptionsReadOnly.url}/api/blocks/1`,
            randomOptionsReadOnly,
            (resp2) => {
              if (resp2.statusCode !== 200) {
                log(
                  'rnode observer blocks api not ready (1), will try again in 10s',
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
                    `RChain node responding at ${randomOptionsReadOnly.url}/version and /api/blocks/1`,
                  );
                  initJobs();
                  clearInterval(intervalHandler);
                  resolve();
                }
              });
              resp2.on('error', (err) => {
                reject(err);
              });
            },
          );

          req2.end();
          req2.on('error', (err) => {
            console.log(err);
            log(
              'rnode observer blocks api not ready (2), will try again in 10s',
            );
          });
        });
        resp.on('error', (err) => {
          reject(err);
        });
      },
    );
    req.end();
    req.on('error', (err) => {
      log('rnode observer not ready, will try again in 10s');
    });
  }, 10000);
});

let nodes;

function initNodes() {
  try {
    if (process.env.NODES_FILE) {
      nodes = JSON.parse(
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

let httpUrlValidator;
let httpUrlReadOnly;

function checkConfiguration() {
  if (
    !process.env.VALIDATOR.startsWith('https://')
    && !process.env.VALIDATOR.startsWith('http://')
  ) {
    log('VALIDATOR must start with http:// or https://', 'error');
    process.exit();
  }

  httpUrlValidator = process.env.VALIDATOR.includes(',')
    ? process.env.VALIDATOR.split(',')
    : [process.env.VALIDATOR];

  httpUrlReadOnly = process.env.READ_ONLY.includes(',')
    ? process.env.READ_ONLY.split(',')
    : [process.env.READ_ONLY];

  log(`host (read-only):                   ${httpUrlReadOnly}`);
  log(`host (validator):                   ${process.env.VALIDATOR}`);
}

const readOnlyOptions = {};

const pickRandomReadOnly = () => {
  const r = httpUrlReadOnly[Math.floor(Math.random() * httpUrlReadOnly.length)];
  if (readOnlyOptions[r]) {
    return readOnlyOptions[r];
  }
  readOnlyOptions[r] = {
    url: r,
  };

  if (r.startsWith('https://') && process.env.READ_ONLY_CERTIFICATE_PATH) {
    const cert = fs.readFileSync(
      process.env.READ_ONLY_CERTIFICATE_PATH,
      'utf8',
    );
    readOnlyOptions[r].ca = [cert];
  }
  return readOnlyOptions[r];
};

async function start() {
  checkConfiguration();
  await startWhenRNodeIsReady();
  initNodes();
}

module.exports = {
  start,
};
