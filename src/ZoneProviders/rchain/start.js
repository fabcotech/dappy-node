const http = require('http');
const https = require('https');

const { pickRandomReadOnly } = require('./pickRandomReadOnly');
const { health } = require('./jobs/health');
const { getLastFinalizedBlockNumber } = require('./jobs/last-block');
const { getPurseZeroPrice } = require('./jobs/purse-zero-price');
const { start: startJobCacheContractLogs } = require('./jobs/cache-contract-logs');

const { log } = require('../../log');
const { getStore } = require('../../store');
const { getConfig } = require('../../config');

const initJobs = async () => {
  const store = getStore();
  const config = getConfig();

  try {
    const blockNumber = getLastFinalizedBlockNumber(pickRandomReadOnly());
    store.lastFinalizedBlockNumber = blockNumber.lastFinalizedBlockNumber;
  } catch (err) {
    log('failed to get last finalized block height');
    log(err);
  }
  if (config.dappyNamesMasterRegistryUri && config.dappyNamesContractId) {
    try {
      const pursePrice = await getPurseZeroPrice(pickRandomReadOnly());
      store.namePrice = pursePrice.namePrice;
    } catch (err) {
      log('failed to get purse zero price');
      log(err);
    }
  }

  setInterval(() => {
    health(pickRandomReadOnly());
  }, 30000);

  setInterval(async () => {
    const blockNumber = await getLastFinalizedBlockNumber(pickRandomReadOnly());
    try {
      store.lastFinalizedBlockNumber = blockNumber.lastFinalizedBlockNumber;
    } catch (err) {
      log('failed to get last finalized block height');
      log(err);
    }
    if (config.dappyNamesMasterRegistryUri && config.dappyNamesContractId) {
      try {
        const pursePrice = await getPurseZeroPrice(pickRandomReadOnly());
        store.namePrice = pursePrice.namePrice;
      } catch (err) {
        log('failed to get purse zero price');
        log(err);
      }
    }
  }, config.dappyNodeLastBlockJobInterval);
};

const startWhenRNodeIsReady = () =>
  new Promise((resolve, reject) => {
    const store = getStore();
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
                    initJobs();
                    clearInterval(intervalHandler);
                    resolve();
                  }
                });
                resp2.on('error', (err) => {
                  reject(err);
                });
              }
            );

            req2.end();
            req2.on('error', (err) => {
              log(err);
              log(
                'rnode observer blocks api not ready (2), will try again in 10s'
              );
            });
          });
          resp.on('error', (err) => {
            reject(err);
          });
        }
      );
      req.end();
      req.on('error', () => {
        log('rnode observer not ready, will try again in 10s');
      });
    }, 10000);
  });

function initRChainConfiguration() {
  const store = getStore();
  const config = getConfig();

  if (!/^https?:\/\//.test(config.rchainValidator)) {
    log(
      'rchain node validator url must start with http:// or https://',
      'error'
    );
    process.exit();
  }

  store.httpUrlValidator = config.rchainValidator.includes(',')
    ? config.rchainValidator.split(',')
    : [config.rchainValidator];

  store.httpUrlReadOnly = config.rchainReadOnly.includes(',')
    ? config.rchainReadOnly.split(',')
    : [config.rchainReadOnly];

  log(`host (read-only):                   ${config.rchainReadOnly}`);
  log(`host (validator):                   ${config.rchainValidator}`);
}

async function start() {
  const config = getConfig();
  initRChainConfiguration();
  await startWhenRNodeIsReady();
  if (config.dappyNodeStartJobs) {
    startJobCacheContractLogs();
  }
}

module.exports = {
  start,
};
