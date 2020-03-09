const rchainToolkit = require("rchain-toolkit");
const Ajv = require("ajv");
require("dotenv").config();
const redis = require("redis");

const { log, redisKeys, getRecordsTerm, getRecordTerm } = require("../utils");

let httpUrlReadOnly = `${process.env.READ_ONLY_HOST}:${process.env.READ_ONLY_HTTP_PORT}`;
if (!process.env.READ_ONLY_HTTP_PORT) {
  httpUrlReadOnly = process.env.READ_ONLY_HOST;
}

const redisClient = redis.createClient({
  db: 1,
  host: process.env.REDIS_HOST
});

const ajv = new Ajv();
const schema = {
  schemaId: "dappy-record",
  type: "object",
  properties: {
    name: {
      type: "string"
    },
    publicKey: {
      type: "string"
    },
    address: {
      type: "string"
    },
    nonce: {
      type: "string"
    },
    signature: {
      type: "string"
    },
    servers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ip: {
            type: "string"
          },
          host: {
            type: "string"
          },
          cert: {
            type: "string"
          },
          primary: {
            type: "boolean"
          }
        },
        required: ["ip", "host", "cert"]
      }
    }
  },
  required: ["name", "publicKey", "servers", "nonce"]
};
module.exports.schema = schema;

ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-06.json"));
const validate = ajv.compile(schema);

const storeRecordsInRedis = async records => {
  const nameKeys = await redisKeys(redisClient, "name:*");
  if (nameKeys.length) {
    await new Promise((res, rej) => {
      redisClient.del(...nameKeys, (err, resp) => {
        if (err) {
          return rej(err);
        }
        res(resp);
      });
    });
  }
  const publickeyKeys = await redisKeys(redisClient, "publicKey:*");
  if (publickeyKeys.length) {
    await new Promise((res, rej) => {
      redisClient.del(...publickeyKeys, (err, resp) => {
        if (err) {
          return rej(err);
        }
        res(resp);
      });
    });
  }

  return new Promise(async (resolve, reject) => {
    const keys = Object.keys(records);
    const l = keys.length;
    let i = 0;
    const storeName = async () => {
      const k = keys[i];
      if (!k) {
        return resolve();
      }
      const registryUri = records[k];

      try {
        exploreDeployResponse = await rchainToolkit.http.exploreDeploy(
          httpUrlReadOnly,
          {
            term: getRecordTerm(registryUri)
          }
        );
      } catch (err) {
        log("Name " + k + ": could not explore-deploy " + err, "error");
        if (i === l - 1) {
          resolve(l);
        } else {
          i += 1;
          await storeName();
        }
        return;
      }

      const record = rchainToolkit.utils.rhoValToJs(
        JSON.parse(exploreDeployResponse).expr[0]
      );

      const valid = validate(record);

      if (!valid) {
        log("invalid record " + k, "warning");
        console.log(validate.errors);
        if (i === l - 1) {
          resolve(l);
        } else {
          i += 1;
          await storeName();
        }
        return;
      }
      const redisSetValues = [];
      for (key of Object.keys(record)) {
        redisSetValues.push(key);
        if (key === "servers") {
          redisSetValues.push(JSON.stringify(record[key]));
        } else {
          redisSetValues.push(record[key]);
        }
      }

      await new Promise((res, rej) => {
        redisClient.hmset(
          `name:${record.name}`,
          ...redisSetValues,
          (err, resp) => {
            if (err) {
              return rej(err);
            }
            res(resp);
          }
        );
      });
      await new Promise((res, rej) => {
        redisClient.sadd(
          `publicKey:${record.publicKey}`,
          record.name,
          (err, resp) => {
            if (err) {
              return rej(err);
            }
            res(resp);
          }
        );
      });

      if (i === l - 1) {
        resolve(l);
      } else {
        i += 1;
        await storeName();
      }
    };

    await storeName();
  });
};

const getDappyRecordsAndSaveToDb = async () => {
  log("started names job");

  try {
    dataAtNameResponse = await rchainToolkit.http.exploreDeploy(
      httpUrlReadOnly,
      {
        term: getRecordsTerm(process.env.RCHAIN_NAMES_REGISTRY_URI)
      }
    );
  } catch (err) {
    log("Could not get data at name " + err, "error");
    return;
  }

  const parsedResponse = JSON.parse(dataAtNameResponse);
  if (!parsedResponse.expr || !parsedResponse.expr[0]) {
    log(
      "Could not get .expr[0], make sure that the Dappy records contract has been deployed, value:",
      "error"
    );
    console.log(parsedResponse);
    return;
  }

  let data;
  try {
    data = rchainToolkit.utils.rhoValToJs(parsedResponse.expr[0]).records;
  } catch (err) {
    log("Something went wrong when querying the node, value:", "error");
    console.log(err);
    return;
  }

  const a = new Date().getTime();
  try {
    const recordsProcessed = await storeRecordsInRedis(data);

    const s = Math.round((100 * (new Date().getTime() - a)) / 1000) / 100;
    log(
      `== successfully stored ${recordsProcessed ||
        0} records from the blockchain, it took ${s} seconds`
    );
    log("KILL records job process");
    return;
  } catch (err) {
    log(
      "Something went wrong when initialized the storing of records",
      "error"
    );
    console.log(err);
    log("KILL records job process");
    return;
  }
};

return getDappyRecordsAndSaveToDb();
