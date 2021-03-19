const Ajv = require('ajv');
const rchainToolkit = require('rchain-toolkit');
const { blake2b } = require('blakejs');

const { getValueFromCache } = require('./utils');

const log = require('./utils').log;

const ajv = new Ajv();
const schema = {
  schemaId: 'deploy',
  type: 'object',
  properties: {
    terms: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['terms'],
};
ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
const validate = ajv.compile(schema);

module.exports.exploreDeployXWsHandler = async (
  body,
  httpUrl,
  redisClient,
  useCache,
  caching,
  edxFromCachePlusOne
) => {
  log('explore-deploy-x');

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
    const uInt8Array = new Uint8Array(Buffer.from(JSON.stringify(body)));
    const blake2bHash = blake2b(uInt8Array, 0, 32);

    const cacheEpoch = Math.round(new Date().getTime() / (1000 * caching));
    cacheId = `cache:edx:${Buffer.from(blake2bHash).toString(
      'hex'
    )}:${cacheEpoch}`;
    try {
      const cached = await getValueFromCache(redisClient, cacheId);
      foundInCache = cached;
      if (foundInCache) {
        edxFromCachePlusOne();
      }
    } catch (err) {
      // not found in cache
    }
  }

  const exploreDeployResponses = !!foundInCache
    ? JSON.parse(foundInCache).results
    : await Promise.all(
        body.terms.map((b) =>
          rchainToolkit.http.exploreDeploy(httpUrl, { term: b })
        )
      );

  // put in cache only if it comes from explore-deploy request
  if (!foundInCache && useCache) {
    redisClient.set(
      cacheId,
      JSON.stringify({ results: exploreDeployResponses }),
      (err, resp) => {
        if (err) {
          log(err, 'error');
        }
      }
    );
  }

  const data = exploreDeployResponses.map((r) => {
    return {
      success: true,
      data: r,
    };
  });

  return {
    success: true,
    data: { results: data },
  };
};
