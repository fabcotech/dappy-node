const getInfo = (store) => (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const rchainNamesMasterRegistryUri = process.env.RCHAIN_NAMES_MASTER_REGISTRY_URI || 'notconfigured';
  let wrappedRevContractId = 'notconfigured';
  if (rchainNamesMasterRegistryUri !== 'notconfigured') {
    wrappedRevContractId = `${rchainNamesMasterRegistryUri.slice(0, 3)}rev`;
  }

  res.json({
    success: true,
    data: {
      dappyNodeVersion: DAPPY_NODE_VERSION,
      lastFinalizedBlockNumber,
      rnodeVersion,
      dappyBrowserMinVersion: process.env.DAPPY_BROWSER_MIN_VERSION,
      dappyBrowserDownloadLink: process.env.DAPPY_BROWSER_DOWNLOAD_LINK,
      rchainNamesMasterRegistryUri:
        process.env.RCHAIN_NAMES_MASTER_REGISTRY_URI || 'notconfigured',
      rchainNamesContractId:
        process.env.RCHAIN_NAMES_CONTRACT_ID || 'notconfigured',
      wrappedRevContractId,
      rchainNetwork: process.env.RCHAIN_NETWORK,
      namePrice,
    },
  });
};

const getLastFinalizedBlockNumber = (store) => (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    data: lastFinalizedBlockNumber,
    success: true,
  });
};

const deploy = () => async (req, res) => {
  const data = await deployWsHandler(req.body, pickRandomValidator());
  res.json(data);
};

const prepareDeploy = () => async (req, res) => {
  const data = await prepareDeployWsHandler(req.body, pickRandomReadOnly());
  if (data.success) {
    res.json(data);
  } else {
    res.status(400).json(data);
  }
};

const exploreDeploy = () => async (req, res) => {
  const data = await exploreDeployWsHandler(
    req.body,
    pickRandomReadOnly(),
    redisClient,
    useCache,
    caching,
  );
  if (data.success) {
    res.json(data);
  } else {
    res.status(400).json(data);
  }
};

const exploreDeployX = () => async (req, res) => {
  const data = await exploreDeployXWsHandler(
    req.body,
    pickRandomReadOnly(),
    redisClient,
    useCache,
    caching,
  );
  if (data.success) {
    res.json(data);
  } else {
    res.status(400).json(data);
  }
};

const listenForDataAtName = () => async (req, res) => {
  const data = await listenForDataAtNameWsHandler(
    req.body,
    pickRandomReadOnly(),
  );
  if (data.success) {
    res.json(data);
  } else {
    res.status(400).json(data);
  }
};

const listenForDataAtNameX = () => async (req, res) => {
  const data = await listenForDataAtNameXWsHandler(
    req.body,
    pickRandomReadOnly(),
  );
  if (data.success) {
    res.json(data);
  } else {
    res.status(400).json(data);
  }
};

const getXRecords = () => async (req, res) => {
  const data = await getXRecordsWsHandler(req.body, {
    redisClient,
    urlOrOptions: pickRandomReadOnly(),
  });
  if (data.success) {
    res.json(data);
  } else {
    res.status(400).json(data);
  }
};

const getXRecordsByPublicKey = () => async (req, res) => {
  const data = await getXRecordsByPublicKeyWsHandler(req.body, redisClient);
  if (data.success) {
    res.json(data);
  } else {
    res.status(400).json(data);
  }
};

const getNodes = () => (req, res) => {
  if (nodes) {
    res.json({
      data: nodes,
    });
  } else {
    res.status(404).end();
  }
};

const getContractLogs = () => (req, res) => {
  logs(redisClient.zRange.bind(redisClient), log)(req.body, res);
};

function getRoutes() {
  return () => [
    ['get', '/info', getInfo],
    ['post', '/info', getInfo],
    ['post', '/last-finalized-block-number', getLastFinalizedBlockNumber],
    ['post', '/explore-deploy-x', exploreDeployX],
    ['post', '/listen-for-data-at-name-x', listenForDataAtNameX],
    ['post', '/get-x-records', getXRecords],
    ['post', '/get-x-records-by-public-key', getXRecordsByPublicKey],
    ['post', '/get-nodes', getNodes],
    ['post', '/get-contract-logs', getContractLogs],
    ['post', '/api/deploy', deploy],
    ['post', '/api/prepare-deploy', prepareDeploy],
    ['post', '/api/explore-deploy', exploreDeploy],
    ['post', '/api/listen-for-data-at-name', listenForDataAtName],
  ];
}

module.exports = {
  getRoutes,
};
