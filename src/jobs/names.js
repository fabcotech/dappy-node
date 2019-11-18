const rchainToolkit = require("rchain-toolkit");

const log = require("../utils").log;
const redisKeys = require("../utils").redisKeys;

const storeNamesInRedis = async (redisClient, rhoVal) => {
  const records = rchainToolkit.utils.rhoValToJs(rhoVal);

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
  const publickeyKeys = await redisKeys(redisClient, "public_key:*");
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
      const record = records[k];
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
          `public_key:${record.public_key}`,
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

module.exports.getDappyNamesAndSaveToDb = async (rnodeClient, redisClient) => {
  const unforgeableNameQuery = {
    unforgeables: [
      {
        g_private_body: {
          id: Array.from(
            new Uint8Array(
              Buffer.from(process.env.RCHAIN_NAMES_UNFORGEABLE_NAME_ID, "hex")
            )
          )
        }
      }
    ]
  };

  let listenDataAtNameResponse;
  try {
    listenDataAtNameResponse = await rchainToolkit.grpc.listenForDataAtName(
      {
        name: unforgeableNameQuery,
        depth: 90
      },
      rnodeClient
    );
  } catch (err) {
    log("error : Could not get data at name " + err);
  }

  if (
    !listenDataAtNameResponse.payload ||
    !listenDataAtNameResponse.payload.blockInfo ||
    listenDataAtNameResponse.payload.blockInfo.length === 0
  ) {
    log(
      "error : could not find the records ressource on the blockchain, make sure that the Dappy records contract has been deployed"
    );
    return;
  }

  let data;
  try {
    data = rchainToolkit.utils.getValueFromBlocks(
      listenDataAtNameResponse.payload.blockInfo
    );
  } catch (err) {
    log("error : something went wrong when querying the node");
    log(err);
    return;
  }

  const a = new Date().getTime();
  try {
    const recordsProcessed = await storeNamesInRedis(redisClient, data);

    const s = Math.round((100 * (new Date().getTime() - a)) / 1000) / 100;
    log(
      `== successfully stored ${recordsProcessed} names from the blockchain, it took ${s} seconds`
    );
  } catch (err) {
    log("error: something went wrong when initialized the storing of names");
    log(err);
  }
};
