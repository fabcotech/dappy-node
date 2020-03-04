const Ajv = require("ajv");
const rchainToolkit = require("rchain-toolkit");

const { log, getRecordsTerm } = require("./utils");

const ajv = new Ajv();
const schema = {
  schemaId: "get-nodes",
  type: "object",
  properties: {
    network: {
      type: "string"
    }
  },
  required: ["network"]
};

ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-06.json"));
const validate = ajv.compile(schema);

module.exports.getNodesWsHandler = (body, httpUrl) => {
  log("get-nodes");

  return new Promise((resolve, reject) => {
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

    if (body.network !== process.env.DAPPY_NETWORK) {
      reject({
        success: false,
        error: {
          message: `This nodes runs on the ${process.env.DAPPY_NETWORK} network, could not get names for ${body.network} network`
        }
      });
      return;
    }

    rchainToolkit.http
      .exploreDeploy(httpUrl, {
        term: getRecordsTerm(process.env.DAPPY_NODES_REGISTRY_URI)
      })
      .then(dataAtNameResponse => {
        const parsedResponse = JSON.parse(dataAtNameResponse);

        if (!parsedResponse.expr.length) {
          reject({
            success: false,
            error: { message: "nodes resource not found on the blockchain" }
          });
          return;
        }

        const jsObject = rchainToolkit.utils.rhoValToJs(parsedResponse.expr[0]);

        resolve({
          success: true,
          data: jsObject
        });
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
