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
        ids: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {
                type: "array",
                items: { type: "number" }
              }
            },
            required: ["id"]
          }
        }
      },
      required: ["ids"]
    },
    depth: { type: "number" }
  },
  required: ["name", "depth"]
};
ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-06.json"));
const validate = ajv.compile(schema);

module.exports = function(req, res, rnodeClient) {
  const valid = validate(req.body);
  if (!valid) {
    res
      .status(400)
      .json(validate.errors.map(e => `body${e.dataPath} ${e.message}`));
    return;
  }

  rchainToolkit.grpc
    .listenForDataAtName(req.body, rnodeClient)
    .then(listenForDataAtNameResponse => {
      let data;
      try {
        data = rchainToolkit.utils.getValueFromBlocks(
          listenForDataAtNameResponse.blockResults
        );
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
