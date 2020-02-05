const Ajv = require("ajv");
const rchainToolkit = require("rchain-toolkit");

const log = require("./utils").log;

const ajv = new Ajv();
const schema = {
  schemaId: "listen-data-at-name",
  type: "object",
  properties: {
    name: {
      type: "object",
      properties: {
        UnforgPrivate: {
          type: "object",
          properties: {
            data: {
              type: "string"
            }
          },
          require: ["data"]
        }
      },
      required: ["UnforgPrivate"]
    },
    depth: { type: "number" }
  },
  required: ["name", "depth"]
};
module.exports.schema = schema;

ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-06.json"));
const validate = ajv.compile(schema);

module.exports.listenForDataAtNameWsHandler = (body, httpUrl) => {
  log("listen-data-at-name");

  return new Promise((resolve, reject) => {
    const valid = validate(body);

    if (!valid) {
      resolve({
        success: false,
        error: {
          message: validate.errors.map(e => `body${e.dataPath} ${e.message}`)
        }
      });
      return;
    }

    rchainToolkit.http
      .dataAtName(httpUrl, body)
      .then(dataAtNameResponse => {
        const parsedResponse = JSON.parse(dataAtNameResponse);

        resolve({
          success: true,
          data: parsedResponse.exprs[parsedResponse.exprs.length - 1]
        });
        return;
      })
      .catch(err => {
        log("error : communication error with the node (GRPC endpoint)");
        log(err);
        reject({
          success: false,
          error: { message: err.message || err }
        });
      });
  });
};
