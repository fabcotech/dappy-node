const rchainToolkit = require("rchain-toolkit");
const Ajv = require("ajv");

const log = require("../utils").log;

const ajv = new Ajv();
const schema = {
  schemaId: "preview-private-names",
  type: "object",
  properties: {
    timestamp: {
      type: "number"
    },
    nameQty: {
      type: "number"
    },
    user: {
      type: "object",
      properties: {
        type: {
          type: "string"
        },
        data: {
          type: "array",
          items: {
            type: "number"
          }
        }
      },
      required: ["type", "data"]
    }
  },
  required: ["user", "timestamp", "nameQty"]
};

ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-06.json"));
const validate = ajv.compile(schema);

module.exports.previewPrivateNamesWsHandler = (body, rnodeClient) => {
  log("preview-private-name");

  return new Promise(async (resolve, reject) => {
    const valid = validate(body);

    if (!valid) {
      reject({
        success: false,
        error: {
          message: validate.errors.map(e => `body${e.dataPath} ${e.message}`)
        }
      });
      return;
    }

    if (body.user && body.user.data) {
      body.user = Buffer.from(new Uint8Array(body.user.data));
    }

    try {
      privateNames = await rchainToolkit.grpc.previewPrivateNames(
        body,
        rnodeClient
      );
      resolve({
        success: true,
        data: privateNames.ids.map(id => Array.from(new Uint8Array(id)))
      });
    } catch (err) {
      log("error : communication error with the node (GRPC endpoint)");
      log(err);
      reject({
        success: false,
        error: { message: err.message }
      });
    }
  });
};
