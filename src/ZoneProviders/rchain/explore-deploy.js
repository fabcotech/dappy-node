const rchainToolkit = require('@fabcotech/rchain-toolkit');
const Ajv = require('ajv');
const { blake2b } = require('blakejs');

const { log } = require('../../log');

const ajv = new Ajv();
const schema = {
  schemaId: 'deploy',
  type: 'object',
  properties: {
    term: {
      type: 'string',
    },
  },
  required: ['term'],
};
module.exports.schema = schema;

ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));

const validate = ajv.compile(schema);

module.exports.exploreDeployWsHandler = async (
  body,
  urlOrOptions,
  redisClient,
  useCache,
  caching,
) => {
  log('explore-deploy');

  const valid = validate(body);

  if (!valid) {
    return {
      success: false,
      error: {
        message: validate.errors.map((e) => `body${e.dataPath} ${e.message}`),
      },
    };
  }

  let cacheId;
  let foundInCache;
  if (useCache) {
    const uInt8Array = new Uint8Array(Buffer.from(body.term));
    const blake2bHash = blake2b(uInt8Array, 0, 32);

    const cacheEpoch = Math.round(new Date().getTime() / (1000 * caching));
    cacheId = `cache:ed:${Buffer.from(blake2bHash).toString(
      'hex',
    )}:${cacheEpoch}`;
    try {
      const cached = await redisClient.get(cacheId);
      foundInCache = cached;
    } catch (err) {
      // not found in cache
    }
  }

  const exploreDeployResponse = foundInCache
  || await rchainToolkit.http.exploreDeploy(urlOrOptions, {
    term: body.term,
  });

  // put in cache only if it comes from explore-deploy request
  if (!foundInCache && useCache) {
    await redisClient.set(cacheId, exploreDeployResponse);
  }

  if (exploreDeployResponse.startsWith('"Error')) {
    return {
      success: false,
      error: { message: exploreDeployResponse },
    };
  }
  return {
    success: true,
    data: exploreDeployResponse,
  };
};
