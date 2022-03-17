const http = require('http');
const https = require('https');

const { pickRandomReadOnly } = require('./pickRandomReadOnly');
const { health } = require('./jobs/health');
const { getLastFinalizedBlockNumber } = require('./jobs/last-block');
const { getPurseZeroPrice } = require('./jobs/purse-zero-price');
const { start: startJobCacheContractLogs } = require('./jobs/cache-contract-logs');

const { log } = require('../../utils');

const initJobs = async (store) => {
  try {
    const blockNumber = getLastFinalizedBlockNumber(pickRandomReadOnly(store));
    store.lastFinalizedBlockNumber = blockNumber.lastFinalizedBlockNumber;
  } catch (err) {
    log('failed to get last finalized block height');
    log(err);
  }
  if (
    process.env.RCHAIN_NAMES_MASTER_REGISTRY_URI
    && process.env.RCHAIN_NAMES_CONTRACT_ID
  ) {
    try {
      const pursePrice = await getPurseZeroPrice(pickRandomReadOnly(store));
      store.namePrice = pursePrice.namePrice;
    } catch (err) {
      log('failed to get purse zero price');
      log(err);
    }
  }

  setInterval(() => {
    health(pickRandomReadOnly(store));
  }, 30000);

  setInterval(async () => {
    const blockNumber = await getLastFinalizedBlockNumber(pickRandomReadOnly(store));
    try {
      store.lastFinalizedBlockNumber = blockNumber.lastFinalizedBlockNumber;
    } catch (err) {
      log('failed to get last finalized block height');
      log(err);
    }
    if (
      process.env.RCHAIN_NAMES_MASTER_REGISTRY_URI
      && process.env.RCHAIN_NAMES_CONTRACT_ID
    ) {
      try {
        const pursePrice = await getPurseZeroPrice(pickRandomReadOnly(store));
        store.namePrice = pursePrice.namePrice;
      } catch (err) {
        log('failed to get purse zero price');
        log(err);
      }
    }
  }, process.env.LAST_BLOCK_JOB_INTERVAL || 40000);
};

const startWhenRNodeIsReady = (store) => new Promise((resolve, reject) => {
  const intervalHandler = setInterval(() => {
    const randomOptionsReadOnly = pickRandomReadOnly(store);

    const req = (
      randomOptionsReadOnly.url.startsWith('https://') ? https : http
    ).get(
      `${randomOptionsReadOnly.url}/version`,
      randomOptionsReadOnly,
      (resp) => {
        if (resp.statusCode !== 200) {
          log('Status code different from 200', 'error');
          log(resp.statusCode);
          reject(new Error('Status code different from 200'));
        }

        resp.setEncoding('utf8');
        let rawData = '';
        resp.on('data', (chunk) => {
          rawData += chunk;
        });

        resp.on('end', () => {
          store.rnodeVersion = rawData;
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
                  initJobs(store);
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
            log(err);
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
    req.on('error', () => {
      log('rnode observer not ready, will try again in 10s');
    });
  }, 10000);
});

function initRChainConfiguration(store) {
  if (
    !process.env.VALIDATOR.startsWith('https://')
    && !process.env.VALIDATOR.startsWith('http://')
  ) {
    log('VALIDATOR must start with http:// or https://', 'error');
    process.exit();
  }

  store.httpUrlValidator = process.env.VALIDATOR.includes(',')
    ? process.env.VALIDATOR.split(',')
    : [process.env.VALIDATOR];

  store.httpUrlReadOnly = process.env.READ_ONLY.includes(',')
    ? process.env.READ_ONLY.split(',')
    : [process.env.READ_ONLY];

  store.rchainNamesMasterRegistryUri = process.env.RCHAIN_NAMES_MASTER_REGISTRY_URI || 'notconfigured';
  store.rchainNamesContractId = process.env.RCHAIN_NAMES_CONTRACT_ID || 'notconfigured';
  store.rchainNetwork = process.env.RCHAIN_NETWORK;

  log(`host (read-only):                   ${store.httpUrlReadOnly}`);
  log(`host (validator):                   ${process.env.VALIDATOR}`);
}

async function start(store) {
  initRChainConfiguration(store);
  await startWhenRNodeIsReady(store);
  startJobCacheContractLogs();
}

module.exports = {
  start,
};
