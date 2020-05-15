const Ajv = require("ajv");

const redisHgetall = require("./utils").redisHgetall;
const redisKeys = require("./utils").redisKeys;

const log = require("./utils").log;

const ajv = new Ajv();
const schema = {
  schemaId: "get-one-record",
  type: "object",
  properties: {
    name: {
      type: "string",
    },
  },
  required: ["name"],
};
module.exports.schema = schema;

ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-06.json"));
const validate = ajv.compile(schema);

module.exports.getOneRecordWsHandler = async (body, redisClient) => {
  log("get-one-record");
  const valid = validate(body);

  if (!valid) {
    return {
      success: false,
      error: {
        message: validate.errors.map((e) => `body${e.dataPath} ${e.message}`),
      },
    };
  }

  try {
    const keys = await redisKeys(
      redisClient,
      `name:${process.env.REDIS_DB}:${body.name}`
    );
    const key = keys.find(
      (k) => k === `name:${process.env.REDIS_DB}:${body.name}`
    );
    if (!key) {
      return {
        success: false,
        error: { message: "name not found" },
      };
    }

    const record = await redisHgetall(redisClient, key);

    return record;
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: { message: err },
    };
  }
};
