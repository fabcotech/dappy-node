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

module.exports = function(req, res, rnodeClient) {
  console.log(req.body);
  console.log(typeof req.body);
  const valid = validate(req.body);
  console.log(valid);

  if (!valid) {
    res
      .status(400)
      .json(validate.errors.map(e => `body${e.dataPath} ${e.message}`));
    return;
  }

  if (req.body.network !== process.env.DAPPY_NETWORK) {
    res
      .status(404)
      .json([
        `This nodes runs on the ${
          process.env.DAPPY_NETWORK
        } network, could not get names for ${req.body.network} network`
      ]);
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
      let data;
      try {
        data = rchainToolkit.utils.getValueFromBlocks(
          listenForDataAtNameResponse.blockResults
        );
        console.log("data", data);
        res.append("Content-Type", "text/plain; charset=UTF-8");
        res.send({
          success: true,
          data: data
        });
      } catch (err) {
        res.status(200).json({
          success: false,
          error: { message: err.message }
        });
      }
    })
    .catch(err => {
      log("error : communication error with the node (GRPC endpoint)");
      log(err);
      res.status(500).json("Unable to communicate with the GRPC endpoint");
    });
};
