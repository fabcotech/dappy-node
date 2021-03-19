const rchainToolkit = require('rchain-toolkit');
const Ajv = require('ajv');
const { blake2b } = require('blakejs');

const log = require('./utils').log;
const { getValueFromCache } = require('./utils');

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
  httpUrl,
  redisClient,
  useCache,
  caching,
  edFromCachePlusOne
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
      'hex'
    )}:${cacheEpoch}`;
    try {
      const cached = await getValueFromCache(redisClient, cacheId);
      foundInCache = cached;
      if (foundInCache) {
        console.log('found in cache ed');
        edFromCachePlusOne();
      }
    } catch (err) {
      // not found in cache
    }
  }

  const exploreDeployResponse = !!foundInCache
    ? foundInCache
    : await rchainToolkit.http.exploreDeploy(httpUrl, {
        term: body.term,
      });

  // put in cache only if it comes from explore-deploy request
  if (!foundInCache && useCache) {
    redisClient.set(cacheId, exploreDeployResponse, (err, resp) => {
      if (err) {
        log(err, 'error');
      }
    });
  }

  if (exploreDeployResponse.startsWith('"Error')) {
    return {
      success: false,
      error: { message: exploreDeployResponse },
    };
  } else {
    return {
      success: true,
      data: exploreDeployResponse,
    };
  }
};
