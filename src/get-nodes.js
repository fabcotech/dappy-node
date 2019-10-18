const Ajv = require("ajv");
const rchainToolkit = require("rchain-toolkit");

const log = require("../utils").log;

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

module.exports.getNodesWsHandler = (body, rnodeClient) => {
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

    rchainToolkit.grpc
      .listenForDataAtName(
        {
          name: {
            unforgeables: [
              {
                g_private_body: {
                  id: Buffer.from(
                    process.env.DAPPY_NODES_UNFORGEABLE_NAME_ID,
                    "hex"
                  )
                }
              }
            ]
          }
        },
        rnodeClient
      )
      .then(listenForDataAtNameResponse => {
        if (listenForDataAtNameResponse.error) {
          resolve({
            success: false,
            error: { message: listenForDataAtNameResponse.error.messages }
          });
        } else {
          let data;
          try {
            data = rchainToolkit.utils.getValueFromBlocks(
              listenForDataAtNameResponse.payload.blockInfo
            );

            resolve({
              success: true,
              data: data
            });
          } catch (err) {
            reject({
              success: false,
              error: { message: err.message }
            });
          }
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
