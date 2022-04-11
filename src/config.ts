import path from 'path';

const DAPPY_CONFIG_FILE_NAME = 'dappyrc';
const DAPPY_BROWSER_MIN_VERSION = '0.5.4';

const numberOr = (defaultValue: any, value: any) => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  return defaultValue;
};

const createMustBeDefined =
  (predicat: () => boolean) => (envVarName: string) => {
    const envValue = process.env[envVarName];
    if (predicat() && (!envValue || envValue.length === 0)) {
      throw new Error(`${envVarName} can't be empty`);
    }
    return envValue;
  };

let config: ReturnType<typeof initConfig> = {} as any;

export const getConfig = () => config;

export function initConfig() {
  // eslint-disable-next-line
  require('dotenv').config({
    path: path.resolve(process.cwd(), DAPPY_CONFIG_FILE_NAME),
  });

  const mustBeDefinedWhenRchain = createMustBeDefined(
    () => process.env.DAPPY_NODE_ZONE_PROVIDER === 'rchain'
  );

  const cfg = {
    dappyBrowserMinVersion: DAPPY_BROWSER_MIN_VERSION,
    dappyBrowserDownloadLink: `https://github.com/fabcotech/dappy/releases/tag/${DAPPY_BROWSER_MIN_VERSION}?warning`,

    dappyNamesMasterRegistryUri: mustBeDefinedWhenRchain(
      'DAPPY_NAMES_MASTER_REGISTRY_URI'
    ),
    dappyNamesContractId: mustBeDefinedWhenRchain('DAPPY_NAMES_CONTRACT_ID'),

    rchainValidator:
      process.env.DAPPY_RCHAIN_VALIDATOR || 'http://localhost:40403',
    rchainReadOnly:
      process.env.DAPPY_RCHAIN_READ_ONLY || 'http://localhost:40403',
    rchainReadOnlyCertificateFilename:
      process.env.DAPPY_RCHAIN_READ_ONLY_CERTIFICATE_FILENAME,
    rchainNetwork: process.env.DAPPY_RCHAIN_NETWORK || 'unknown',

    dappyNodeHttpPort:
      parseInt(process.env.DAPPY_NODE_HTTP_PORT || '', 10) || 3001,
    dappyNodeHttpsPort: parseInt(process.env.DAPPY_NODE_HTTPS_PORT || '', 10),
    dappyNodePrivateKeyFilename:
      process.env.DAPPY_NODE_PRIVATE_KEY_FILENAME || 'dappynode.key',
    dappyNodeCertificateFilename:
      process.env.DAPPY_NODE_CERTIFICATE_FILENAME || 'dappynode.crt',
    dappyNodeVersion: '0.2.8',
    dappyNodeZoneProvider: process.env.DAPPY_NODE_ZONE_PROVIDER || 'rchain',
    dappyNodeCaching: numberOr(
      60,
      parseInt(process.env.DAPPY_NODE_CACHING || '', 10)
    ),
    dappyNodeFiles: process.env.NODES_FILE,
    dappyNodeEnableRequestMetrics:
      process.env.DAPPY_NODE_ENABLE_REQUEST_METRICS === 'true',
    dappyNodeSentryUrl: process.env.DAPPY_NODE_SENTRY_URL,
    dappyNodeLastBlockJobInterval:
      parseInt(process.env.DAPPY_NODE_LAST_BLOCK_JOB_INTERVAL || '', 10) ||
      40000,
    dappyNodeStartJobs: process.env.DAPPY_NODE_START_JOBS === 'true',
    dappyNetwork: process.env.DAPPY_NETWORK || 'unknown',
    dappyLogPath: process.env.DAPPY_LOG_PATH || './logs',

    redisDb: process.env.DAPPY_NODE_REDIS_DB || 1,
    redisHost: process.env.DAPPY_NODE_REDIS_HOST || 'localhost',
    redisPort: parseInt(process.env.DAPPY_NODE_REDIS_PORT || '', 10) || 6379,
  };

  config = cfg;

  return cfg;
}
