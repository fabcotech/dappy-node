const rchainToolkit = require('rchain-toolkit');
const Ajv = require('ajv');

const log = require('./utils').log;

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

module.exports.exploreDeployWsHandler = async (body, httpUrl) => {
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

  const exploreDeployResponse = await rchainToolkit.http.exploreDeploy(
    httpUrl,
    {
      term: body.term,
    }
  );
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
