const Ajv = require('ajv');
const rchainToolkit = require('rchain-toolkit');

const log = require('./utils').log;

const ajv = new Ajv();
const schema = {
  schemaId: 'listen-data-at-name',
  type: 'object',
  properties: {
    name: {
      type: 'object',
      properties: {
        UnforgPrivate: {
          type: 'object',
          properties: {
            data: {
              type: 'string',
            },
          },
          require: ['data'],
        },
        UnforgDeploy: {
          type: 'object',
          properties: {
            data: {
              type: 'string',
            },
          },
          require: ['data'],
        },
      },
    },
    depth: { type: 'number' },
  },
  required: ['name', 'depth'],
};
module.exports.schema = schema;

ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
const validate = ajv.compile(schema);

module.exports.listenForDataAtNameWsHandler = async (body, urlOrOptions) => {
  log('listen-data-at-name');

  const valid = validate(body);

  if (!valid) {
    return {
      success: false,
      error: {
        message: validate.errors.map((e) => `body${e.dataPath} ${e.message}`),
      },
    };
  }

  const dataAtNameResponse = await rchainToolkit.http.dataAtName(
    urlOrOptions,
    body
  );

  const parsedResponse = JSON.parse(dataAtNameResponse);

  return {
    success: true,
    data: parsedResponse.exprs[parsedResponse.exprs.length - 1],
  };
};
