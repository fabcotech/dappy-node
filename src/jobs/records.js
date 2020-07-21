const rchainToolkit = require("rchain-toolkit");
const Ajv = require("ajv");
require("dotenv").config();
const redis = require("redis");

const {
  log,
  redisKeys,
  getRecordsTerm,
  getRecordTerm,
  getManyRecordsTerm,
} = require("../utils");

let httpUrlReadOnly = `${process.env.READ_ONLY_HOST}:${process.env.READ_ONLY_HTTP_PORT}`;
if (!process.env.READ_ONLY_HTTP_PORT) {
  httpUrlReadOnly = process.env.READ_ONLY_HOST;
}

const redisClient = redis.createClient({
  db: 1,
  host: process.env.REDIS_HOST,
});

const ajv = new Ajv();
const schema = {
  schemaId: "dappy-record",
  type: "object",
  properties: {
    name: {
      type: "string",
    },
    publicKey: {
      type: "string",
    },
    address: {
      type: "string",
    },
    nonce: {
      type: "string",
    },
    signature: {
      type: "string",
    },
    badges: {
      type: "object",
    },
    servers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ip: {
            type: "string",
          },
          host: {
            type: "string",
          },
          cert: {
            type: "string",
          },
          primary: {
            type: "boolean",
          },
        },
        required: ["ip", "host", "cert"],
      },
    },
  },
  required: ["name", "publicKey", "servers", "nonce"],
};
module.exports.schema = schema;

ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-06.json"));
const validate = ajv.compile(schema);

const storeRecordsInRedis = async (records) => {
  const nameKeys = await redisKeys(
    redisClient,
    `name:${process.env.REDIS_DB}:*`
  );
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
  const publickeyKeys = await redisKeys(
    redisClient,
    `publicKey:${process.env.REDIS_DB}:*`
  );
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
        if (i === l - 1 || l === 0) {
          resolve(l);
        } else {
          i += 1;
          await storeName();
        }
        return;
      }
      if (i !== 0 && i % 20 === 0) {
        log("processing name no " + i);
      }

      const recordsToProcess = [];
      recordsToProcess.push(records[k]);
      // ten by ten
      [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((j) => {
        if (keys[i + j]) {
          recordsToProcess.push(records[keys[i + j]]);
        }
      });
      const n = recordsToProcess.length;

      try {
        exploreDeployResponse = await rchainToolkit.http.exploreDeploy(
          httpUrlReadOnly,
          {
            term: getManyRecordsTerm(recordsToProcess),
          }
        );
      } catch (err) {
        log("Name " + k + ": could not explore-deploy " + err, "error");
        if (i === l - n) {
          resolve(l);
        } else {
          i += n;
          await storeName();
        }
        return;
      }

      const recordsFromTheBlockchain = rchainToolkit.utils.rhoValToJs(
        JSON.parse(exploreDeployResponse).expr[0]
      );

      const storeRecord = async (record) => {
        const valid = validate(record);

        if (!valid) {
          log("invalid record " + k, "warning");
          console.log(validate.errors);
          return;
        }
        const redisSetValues = [];
        for (key of Object.keys(record)) {
          redisSetValues.push(key);
          if (key === "servers") {
            redisSetValues.push(JSON.stringify(record[key]));
          } else if (key === "badges") {
            redisSetValues.push(JSON.stringify(record[key]));
          } else {
            redisSetValues.push(record[key]);
          }
        }

        await new Promise((res, rej) => {
          redisClient.hmset(
            `name:${process.env.REDIS_DB}:${record.name}`,
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
            `publicKey:${process.env.REDIS_DB}:${record.publicKey}`,
            record.name,
            (err, resp) => {
              if (err) {
                return rej(err);
              }
              res(resp);
            }
          );
        });
      };

      await Promise.all(recordsFromTheBlockchain.map((a) => storeRecord(a)));

      if (i === l - n) {
        resolve(l);
      } else {
        i += n;
        await storeName();
      }
    };

    await storeName();
  });
};

module.exports.getDappyRecordsAndSaveToDb = async () => {
  log("started names job");

  try {
    exploreDeployResponse = await rchainToolkit.http.exploreDeploy(
      httpUrlReadOnly,
      {
        term: getRecordsTerm(process.env.RCHAIN_NAMES_REGISTRY_URI),
      }
    );
  } catch (err) {
    log("Could not get data at name " + err, "error");
    return;
  }

  let parsedResponse;
  try {
    parsedResponse = JSON.parse(exploreDeployResponse);
  } catch (err) {
    log("Could parse explore-deploy response as JSON", "error");
    console.log(exploreDeployResponse);
    return;
  }

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
      `== successfully stored ${
        recordsProcessed || 0
      } records from the blockchain, it took ${s} seconds`
    );
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
