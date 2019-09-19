const Ajv = require("ajv");
const rchainToolkit = require("rchain-toolkit");

const log = require("../utils").log;

const ajv = new Ajv();
const schema = {
  schemaId: "listen-data-at-name",
  type: "object",
  properties: {
    name: {
      type: "object",
      properties: {
        unforgeables: {
          type: "array",
          items: {
            type: "object",
            properties: {
              g_private_body: {
                type: "object",
                properties: {
                  id: {
                    type: "array",
                    items: { type: "number" }
                  }
                },
                required: ["id"]
              }
            },
            required: ["g_private_body"]
          }
        }
      },
      required: ["unforgeables"]
    },
    depth: { type: "number" }
  },
  required: ["name", "depth"]
};
ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-06.json"));
const validate = ajv.compile(schema);

module.exports.listenForDataAtNameWsHandler = (body, rnodeClient) => {
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

    if (
      body.name.unforgeables[0] &&
      body.name.unforgeables[0].g_private_body.id
    ) {
      body.name.unforgeables[0].g_private_body.id = Buffer.from(
        new Uint8Array(body.name.unforgeables[0].g_private_body.id)
      );
    }

    rchainToolkit.grpc
      .listenForDataAtName(body, rnodeClient)
      .then(listenForDataAtNameResponse => {
        let data;
        try {
          data = rchainToolkit.utils.getValueFromBlocks(
            listenForDataAtNameResponse.blockResults
          );
          resolve({
            success: true,
            data: data
          });
        } catch (err) {
          resolve({
            success: false,
            error: { message: err.message }
          });
        }
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
