const rchainToolkit = require('rchain-toolkit');
const Ajv = require('ajv');

const log = require('./utils').log;

const ajv = new Ajv();
const schema = {
  schemaId: 'deploy',
  type: 'object',
  properties: {
    data: {
      type: 'object',
      properties: {
        timestamp: {
          type: 'number',
        },
        phloPrice: {
          type: 'number',
        },
        phloLimit: {
          type: 'number',
        },
        validAfterBlockNumber: {
          type: 'number',
        },
        term: {
          type: 'string',
        },
      },
      required: [
        'timestamp',
        'phloPrice',
        'phloLimit',
        'validAfterBlockNumber',
        'term',
      ],
    },
    deployer: {
      type: 'string',
    },
    signature: {
      type: 'string',
    },
    sigAlgorithm: {
      type: 'string',
      const: 'secp256k1',
    },
  },
  required: ['deployer', 'signature', 'sigAlgorithm'],
};

ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
const validate = ajv.compile(schema);

module.exports.deployWsHandler = async (body, httpUrl) => {
  log('deploy');

  const valid = validate(body);

  if (!valid) {
    return {
      success: false,
      error: {
        message: validate.errors.map((e) => `body${e.dataPath} ${e.message}`),
      },
    };
  }

  const deployResponse = await rchainToolkit.http.deploy(httpUrl, body);
  if (!deployResponse.startsWith('"Success')) {
    return {
      success: false,
      error: { message: deployResponse },
    };
  } else {
    return {
      success: true,
      data: deployResponse,
    };
  }
};
