const log = require("./utils").log;
const rchainToolkit = require("rchain-toolkit");
const redisKeys = require("./utils").redisKeys;

const storeNamesInRedis = async (redisClient, eMapBody) => {
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
    log("== " + eMapBody.kvs.length + " name(s) to store");
    let i = 0;
    const storeName = async () => {
      if (i % 20 === 0 || i === eMapBody.kvs.length - 1) {
        log("== processing name at index " + i);
      }
      const kv = eMapBody.kvs[i];
      if (!kv) {
        return resolve();
      }
      const name = kv.key.exprs[0].gString;
      const record = rchainToolkit.utils.rholangMapToJsObject(
        kv.value.exprs[0].eMapBody
      );
      const redisSetValues = [];
      for (key of Object.keys(record)) {
        redisSetValues.push(key);
        redisSetValues.push(record[key]);
      }

      await new Promise((res, rej) => {
        redisClient.hmset(`name:${name}`, ...redisSetValues, (err, resp) => {
          if (err) {
            return rej(err);
          }
          res(resp);
        });
      });
      await new Promise((res, rej) => {
        redisClient.sadd(
          `public_key:${record.public_key}`,
          name,
          (err, resp) => {
            if (err) {
              return rej(err);
            }
            res(resp);
          }
        );
      });

      if (i === eMapBody.kvs.length - 1) {
        resolve();
      } else {
        i += 1;
        await storeName();
      }
    };

    await storeName();
  });
};

module.exports.getDappyNamesAndSaveToDb = async (rnodeClient, redisClient) => {
  log("names job initiated");
  log("== requesting the blockchain to get all names");

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
    !listenDataAtNameResponse ||
    !listenDataAtNameResponse.blockResults ||
    listenDataAtNameResponse.blockResults.length === 0
  ) {
    log(
      "error : could not find the records ressource on the blockchain, make sure that the Dappy records contract has been deployed"
    );
    return;
  }

  let data;
  try {
    data = rchainToolkit.utils.getValueFromBlocks(
      listenDataAtNameResponse.blockResults
    );
  } catch (err) {
    log("error : something went wrong when querying the node");
    log(err);
    return;
  }

  log("== beginning storing of names in db");
  const a = new Date().getTime();
  try {
    await storeNamesInRedis(redisClient, data.exprs[0].eMapBody);

    const s = Math.round((100 * (new Date().getTime() - a)) / 1000) / 100;
    log(
      "== successfully re-stored all names from the blockchain, it took " +
        s +
        " seconds"
    );
  } catch (err) {
    log("error: something went wrong when initialized the storing of names");
    log(err);
  }
};
