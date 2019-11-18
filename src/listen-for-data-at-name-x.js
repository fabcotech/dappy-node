const Ajv = require("ajv");
const rchainToolkit = require("rchain-toolkit");

const listenDataAtNameBopdySchema = require("./listen-for-data-at-name").schema;

const log = require("./utils").log;

const ajv = new Ajv();
const schema = {
  schemaId: "listen-data-at-name-x",
  type: "array",
  items: listenDataAtNameBopdySchema
};

ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-06.json"));
const validate = ajv.compile(schema);

module.exports.listenForDataAtNameXWsHandler = (body, rnodeClient) => {
  log("listen-data-at-name-x");

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

    const bodyWithBuffers = body.map(b => {
      if (b.name.unforgeables[0] && b.name.unforgeables[0].g_private_body.id) {
        b.name.unforgeables[0].g_private_body.id = Buffer.from(
          new Uint8Array(b.name.unforgeables[0].g_private_body.id)
        );
      }
      return b;
    });

    Promise.all(
      bodyWithBuffers.map(b =>
        rchainToolkit.grpc.listenForDataAtName(b, rnodeClient)
      )
    )
      .then(listenForDataAtNameResponses => {
        const data = listenForDataAtNameResponses.map(r => {
          if (r.error) {
            return {
              success: false,
              error: { message: r.error.messages }
            };
          }
          let d;
          try {
            d = rchainToolkit.utils.getValueFromBlocks(r.payload.blockInfo);
            return {
              success: true,
              data: d
            };
          } catch (err) {
            console.log(err);
            return {
              success: false,
              error: { message: err.message }
            };
          }
        });

        resolve({
          success: true,
          data: { results: data }
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
