import { getConfig } from '../../config';
import { getStore } from '../../store';

const { Router } = require('express');
const bodyParser = require('body-parser');

const { listenForDataAtNameWsHandler } = require('./data-at-name');
const {
  dataAtNameXWsHandler,
} = require('./data-at-name-x');
const { deployWsHandler } = require('./deploy');
const { exploreDeployWsHandler } = require('./explore-deploy');
const { exploreDeployXWsHandler } = require('./explore-deploy-x');
const { prepareDeployWsHandler } = require('./prepare-deploy');
const { getXRecordsWsHandler } = require('./get-x-records');
const {
  getXRecordsByPublicKeyWsHandler,
} = require('./get-x-records-by-public-key');
const { pickRandomReadOnly } = require('./pickRandomReadOnly');
const { getContractLogsHandler } = require('./get-contract-logs');
const { log } = require('../../log');

const getInfo = (store) => (req, res) => {
  const config = getConfig();

  res.setHeader('Content-Type', 'application/json');

  const wrappedRevContractId = `${config.dappyNamesMasterRegistryUri.slice(0, 3)}rev`;

  res.json({
    success: true,
    data: {
      dappyNodeVersion: config.dappyNodeVersion,
      dappyBrowserMinVersion: config.dappyBrowserMinVersion,
      dappyBrowserDownloadLink: config.dappyBrowserDownloadLink,
      dappyNetwork: config.dappyNetwork,
      rchainNamesMasterRegistryUri: config.dappyNamesMasterRegistryUri,
      rchainNamesContractId: config.dappyNamesContractId,
      rchainNetwork: config.rchainNetwork,
      rchainShardId: config.rchainShardId,
      wrappedRevContractId,
      lastFinalizedBlockNumber: store.lastFinalizedBlockNumber,
      rnodeVersion: store.rnodeVersion,
      namePrice: store.namePrice,
    },
  });
};

const getLastFinalizedBlockNumber = (store) => (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    data: store.lastFinalizedBlockNumber,
    success: true,
  });
};

const pickRandomValidator = (store) => ({
  url: store.httpUrlValidator[Math.floor(Math.random() * store.httpUrlValidator.length)],
});

const deploy = (store) => async (req, res) => {
  const data = await deployWsHandler(req.body, pickRandomValidator(store));
  res.json(data);
};

const prepareDeploy = (store) => async (req, res) => {
  const data = await prepareDeployWsHandler(req.body, pickRandomReadOnly(store));
  if (data.success) {
    res.json(data);
  } else {
    res.status(400).json(data);
  }
};

const exploreDeploy = (store) => async (req, res) => {
  const config = getConfig();
  const data = await exploreDeployWsHandler(
    req.body,
    pickRandomReadOnly(store),
    store.redisClient,
    !!config.dappyNodeCaching,
    config.dappyNodeCaching,
  );
  if (data.success) {
    res.json(data);
  } else {
    res.status(400).json(data);
  }
};

const exploreDeployX = (store) => async (req, res) => {
  const config = getConfig();
  const data = await exploreDeployXWsHandler(
    req.body,
    pickRandomReadOnly(store),
    store.redisClient,
    !!config.dappyNodeCaching,
    config.dappyNodeCaching,
  );
  if (data.success) {
    res.json(data);
  } else {
    res.status(400).json(data);
  }
};

const listenForDataAtName = (store) => async (req, res) => {
  const data = await listenForDataAtNameWsHandler(
    req.body,
    pickRandomReadOnly(store),
  );
  if (data.success) {
    res.json(data);
  } else {
    res.status(400).json(data);
  }
};

const dataAtNameX = (store) => async (req, res) => {
  const data = await dataAtNameXWsHandler(
    req.body,
    pickRandomReadOnly(store),
  );
  if (data.success) {
    res.json(data);
  } else {
    res.status(400).json(data);
  }
};

const getXRecords = (store) => async (req, res) => {
  const data = await getXRecordsWsHandler(req.body, {
    redisClient: store.redisClient,
    log,
    urlOrOptions: pickRandomReadOnly(store),
  });
  if (data.success) {
    res.json(data);
  } else {
    res.status(400).json(data);
  }
};

const getXRecordsByPublicKey = (store) => async (req, res) => {
  const data = await getXRecordsByPublicKeyWsHandler(req.body, store.redisClient);
  if (data.success) {
    res.json(data);
  } else {
    res.status(400).json(data);
  }
};

const getContractLogs = (store) => (req, res) => {
  getContractLogsHandler(store.redisClient.zRange.bind(store.redisClient), log)(req.body, res);
};

export function getRoutes() {
  const router = Router();
  const store = getStore();

  router.use(bodyParser.json());

  router.get('/info', getInfo(store));
  router.post('/info', getInfo(store));
  router.post('/last-finalized-block-number', getLastFinalizedBlockNumber(store));
  router.post('/explore-deploy-x', exploreDeployX(store));
  router.post('/data-at-name-x', dataAtNameX(store));
  router.post('/get-x-records', getXRecords(store));
  router.post('/get-x-records-by-public-key', getXRecordsByPublicKey(store));
  router.post('/get-contract-logs', getContractLogs(store));
  router.post('/api/deploy', deploy(store));
  router.post('/api/prepare-deploy', prepareDeploy(store));
  router.post('/api/explore-deploy', exploreDeploy(store));
  router.post('/api/data-at-name', listenForDataAtName(store));

  return router;
}
