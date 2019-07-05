const log = require("./utils").log;
const rchainToolkit = require("rchain-toolkit");
const redisKeys = require("./utils").redisKeys;

const storeNamesInRedis = async (redisClient, names) => {
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
  const publickeyKeys = await redisKeys(redisClient, "publickey:*");
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
    log("== " + names.length + " name(s) to store");
    let i = 0;
    const storeName = async () => {
      if (i % 20 === 0 || i === names.length - 1) {
        log("== processing name at index " + i);
      }
      const kv = names[i];
      if (!kv) {
        return resolve();
      }
      const name = kv.key.exprs[0].g_string;
      const record = rchainToolkit.utils.rholangMapToJsObject(
        kv.value.exprs[0].e_map_body
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
        redisClient.sadd(`publickey:${record.publickey}`, name, (err, resp) => {
          if (err) {
            return rej(err);
          }
          res(resp);
        });
      });

      if (i === names.length - 1) {
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

  const nameByteArray = Buffer.from(
    process.env.RCHAIN_NAMES_UNFORGEABLE_NAME_ID,
    "hex"
  );
  const nameRequest = { ids: [{ id: Array.from(nameByteArray) }] };

  let listenDataAtNameResponse;
  try {
    listenDataAtNameResponse = await rchainToolkit.grpc.listenForDataAtName(
      {
        name: nameRequest,
        depth: 90
      },
      rnodeClient
    );
  } catch (err) {
    log("error : Could not get data at name " + err);
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
    await storeNamesInRedis(redisClient, data.exprs[0].e_map_body.kvs);

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
