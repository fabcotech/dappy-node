const Ajv = require('ajv');
const rchainToolkit = require('rchain-toolkit');

const exploreDeployBodySchema = require('./explore-deploy').schema;

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

module.exports.exploreDeployXWsHandler = async (body, httpUrl) => {
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

  const exploreDeployResponses = await Promise.all(
    body.terms.map((b) =>
      rchainToolkit.http.exploreDeploy(httpUrl, { term: b })
    )
  );

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
