const log = require("./utils").log;
const getValueFromBlocks = require("./rchain").getValueFromBlocks;
const listenForDataAtName = require("./rchain").listenForDataAtName;
const rholangMapToJsObject = require("./rchain").rholangMapToJsObject;
const parseEitherListeningNameData = require("./rchain")
  .parseEitherListeningNameData;
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
      const record = rholangMapToJsObject(kv.value.exprs[0].e_map_body);
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

module.exports.getDappyNamesAndSaveToDb = (rnodeClient, redisClient) => {
  log("names job initiated");
  log("== requesting the blockchain to get all names");

  const nameByteArray = new Buffer(
    process.env.RCHAIN_NAMES_UNFORGEABLE_NAME_ID,
    "hex"
  );
  const nameRequest = { ids: [{ id: Array.from(nameByteArray) }] };

  listenForDataAtName(
    {
      depth: 1000,
      name: nameRequest
    },
    rnodeClient
  )
    .then(either => {
      let blocks;
      try {
        blocks = parseEitherListeningNameData(either);
      } catch (err) {
        log("error : something went wrong when parsing the result from node");
        log(err);
        return;
      }

      let data;
      try {
        data = getValueFromBlocks(blocks);
      } catch (err) {
        log("error : something went wrong when querying the node");
        log(err);
        return;
      }

      log("== beginning storing of names in db");
      const a = new Date().getTime();
      try {
        storeNamesInRedis(redisClient, data.exprs[0].e_map_body.kvs)
          .then(() => {
            const s =
              Math.round((100 * (new Date().getTime() - a)) / 1000) / 100;
            log(
              "== successfully re-stored all names from the blockchain, it took " +
                s +
                " seconds"
            );
          })
          .catch(err => {
            log("error: something went wrong when storing names");
            log(err);
          });
      } catch (err) {
        log(
          "error: something went wrong when initialized the storing of names"
        );
        log(err);
      }
    })
    .catch(err => {
      log("error : communication error with the node (GRPC endpoint)");
      log(err);
    });
};
