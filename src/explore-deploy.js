const rchainToolkit = require("rchain-toolkit");
const Ajv = require("ajv");

const log = require("./utils").log;

const ajv = new Ajv();
const schema = {
  schemaId: "deploy",
  type: "object",
  properties: {
    term: {
      type: "string"
    }
  },
  required: ["term"]
};
module.exports.schema = schema;

ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-06.json"));
const validate = ajv.compile(schema);

module.exports.exploreDeployWsHandler = (body, httpUrl) => {
  log("explore-deploy");

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
      const exploreDeployResponse = await rchainToolkit.http.exploreDeploy(
        httpUrl,
        {
          term: body.term
        }
      );

      if (exploreDeployResponse.startsWith('"Error')) {
        resolve({
          success: false,
          error: { message: exploreDeployResponse }
        });
      } else {
        resolve({
          success: true,
          data: exploreDeployResponse
        });
      }
    } catch (err) {
      log("error : communication error with the node (HTTP endpoint)");
      log(err);
      reject(err.message);
    }
  });
};
