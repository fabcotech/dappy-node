const rchainToolkit = require("rchain-toolkit");
const Ajv = require("ajv");

const log = require("./utils").log;

const ajv = new Ajv();
const schema = {
  schemaId: "prepare-deploy",
  type: "object",
  properties: {
    deployer: {
      type: "string"
    },
    timestamp: {
      type: "number"
    },
    nameQty: {
      type: "number"
    }
  },
  required: ["deployer", "timestamp", "nameQty"]
};

ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-06.json"));
const validate = ajv.compile(schema);

module.exports.prepareDeployWsHandler = (body, httpUrl) => {
  log("prepare-deploy");

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

    try {
      const prepareDeployResponse = await rchainToolkit.http.prepareDeploy(
        httpUrl,
        body
      );

      resolve({
        success: true,
        data: prepareDeployResponse
      });
    } catch (err) {
      log("error : communication error with the node (GRPC endpoint)");
      log(err);
      reject(err.message);
    }
  });
};
