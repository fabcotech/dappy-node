const redis = require("redis");

const log = require("./utils").log;
const getValueFromBlocks = require("./rchain").getValueFromBlocks;
const listenForDataAtName = require("./rchain").listenForDataAtName;
const rholangMapToJsObject = require("./rchain").rholangMapToJsObject;
const redisKeys = require("./utils").redisKeys;

const storeNamesInRedis = async (redisClient, names) => {
  const command = redisClient.multi();

  const nameKeys = await redisKeys(redisClient, "name:*");
  command.del(...nameKeys);
  const publickeyKeys = await redisKeys(redisClient, "publickey:*");
  command.del(...publickeyKeys);

  return new Promise((resolve, reject) => {
    log("== " + names.length + " name(s) to store");
    let i = 0;
    const storeName = () => {
      if (i % 20 === 0 || i === names.length - 1) {
        log("== processing name at index " + i);
      }
      const kv = names[i];
      const name = kv.key.exprs[0].g_string;
      const record = rholangMapToJsObject(kv.value.exprs[0].e_map_body);
      const redisSetValues = [];
      for (key of Object.keys(record)) {
        redisSetValues.push(key);
        redisSetValues.push(record[key]);
      }
      command.hmset(`name:${name}`, ...redisSetValues);
      command.sadd(`publickey:${record.publickey}`, name);

      if (i === names.length - 1) {
        log("== exetuing all commands in batch");
        command.exec((err, replies) => {
          resolve();
        });
      } else {
        i += 1;
        storeName();
      }
    };
    storeName();
  });
};

module.exports.getDappyNamesAndSaveToDb = (rnodeClient, redisClient) => {
  log("names job initiated");
  log("== requesting the blockchain to get all names");
  const nameByteArray = new Buffer(
    process.env.RCHAIN_NAMES_UNFORGEABLE_NAME_ID,
    "hex"
  );
  const channelRequest = { ids: [{ id: Array.from(nameByteArray) }] };
  listenForDataAtName(
    {
      depth: 20,
      name: channelRequest
    },
    rnodeClient
  )
    .then(blocks => {
      getValueFromBlocks(blocks)
        .then(data => {
          log("== beginning storing of names in db");
          const a = new Date().getTime();
          storeNamesInRedis(redisClient, data.e_map_body.kvs).then(() => {
            const s =
              Math.round((100 * (new Date().getTime() - a)) / 1000) / 100;
            log(
              "== successfully re-stored all names from the blockchain, it took " +
                s +
                " seconds"
            );
          });
        })
        .catch(err => {
          log("error : something went wrong when querying the node");
          log(err);
        });
    })
    .catch(err => {
      log("error : communication error with the node (GRPC endpoint)");
      log(err);
    });
};
