const rchainToolkit = require('rchain-toolkit');
const Ajv = require('ajv');

const { log } = require('../../log');

const ajv = new Ajv();
const schema = {
  schemaId: 'prepare-deploy',
  type: 'object',
  properties: {
    deployer: {
      type: 'string',
    },
    timestamp: {
      type: 'number',
    },
    nameQty: {
      type: 'number',
    },
  },
  required: ['deployer', 'timestamp', 'nameQty'],
};

ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));

const validate = ajv.compile(schema);

module.exports.prepareDeployWsHandler = async (body, urlOrOptions) => {
  log('prepare-deploy');

  const valid = validate(body);

  if (!valid) {
    return {
      success: false,
      error: {
        message: validate.errors.map((e) => `body${e.dataPath} ${e.message}`),
      },
    };
  }

  const prepareDeployResponse = await rchainToolkit.http.prepareDeploy(
    urlOrOptions,
    body,
  );

  return {
    success: true,
    data: prepareDeployResponse,
  };
};
