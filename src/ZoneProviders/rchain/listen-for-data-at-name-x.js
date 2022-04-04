const Ajv = require('ajv');
const rchainToolkit = require('@fabcotech/rchain-toolkit');

const listenDataAtNameBodySchema = require('./listen-for-data-at-name').schema;

const { log } = require('../../log');

const ajv = new Ajv();
const schema = {
  schemaId: 'listen-data-at-name-x',
  type: 'array',
  items: listenDataAtNameBodySchema,
};

ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));

const validate = ajv.compile(schema);

module.exports.listenForDataAtNameXWsHandler = (body, urlOrOptions) => {
  log('listen-data-at-name-x');

  return new Promise((resolve, reject) => {
    const valid = validate(body);

    if (!valid) {
      resolve({
        success: false,
        error: {
          message: validate.errors.map((e) => `body${e.dataPath} ${e.message}`),
        },
      });
      return;
    }

    Promise.all(
      body.map((b) => rchainToolkit.http.dataAtName(urlOrOptions, b)),
    )
      .then((dataAtNameResponses) => {
        const data = dataAtNameResponses.map((r) => {
          const parsedResponse = JSON.parse(r);

          return {
            success: true,
            data: parsedResponse.exprs[parsedResponse.exprs.length - 1],
          };
        });

        resolve({
          success: true,
          data: { results: data },
        });
      })
      .catch((err) => {
        log('error : communication error with the node (HTTP endpoint)');
        log(err);
        reject(err);
      });
  });
};
