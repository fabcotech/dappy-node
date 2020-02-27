const Ajv = require("ajv");
const rchainToolkit = require("rchain-toolkit");

const exploreDeployBodySchema = require("./explore-deploy").schema;

const log = require("./utils").log;

const ajv = new Ajv();
const schema = {
  schemaId: "explore-deploy-x",
  type: "array",
  items: exploreDeployBodySchema
};

ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-06.json"));
const validate = ajv.compile(schema);

module.exports.exploreDeployXWsHandler = (body, httpUrl) => {
  log("explore-deploy-x");

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

    Promise.all(body.map(b => rchainToolkit.http.exploreDeploy(httpUrl, b)))
      .then(exploreDeployResponses => {
        const data = exploreDeployResponses.map(r => {
          return {
            success: true,
            data: r
          };
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
