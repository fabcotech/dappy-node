const rchainToolkit = require("rchain-toolkit");

const log = require("../utils").log;
const redisKeys = require("../utils").redisKeys;

const storeNamesInRedis = async (redisClient, records) => {
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

module.exports.getDappyNamesAndSaveToDb = async (httpUrl, redisClient) => {
  let dataAtNameResponse;
  try {
    dataAtNameResponse = await rchainToolkit.http.exploreDeploy(httpUrl, {
      term: `new return, nodesCh, lookup(\`rho:registry:lookup\`), stdout(\`rho:io:stdout\`) in {
        lookup!(\`rho:id:${process.env.RCHAIN_NAMES_REGISTRY_URI}\`, *nodesCh) |
        for(nodes <- nodesCh) {
          return!(*nodes)
        }
      }`
    });
  } catch (err) {
    log("Could not get data at name " + err, "error");
    return;
  }

  const parsedResponse = JSON.parse(dataAtNameResponse);
  if (
    !parsedResponse.exprs ||
    !parsedResponse.exprs[0] ||
    !parsedResponse.exprs[0].expr
  ) {
    log(
      "Could not get .exprs[0].expr, make sure that the Dappy records contract has been deployed, value:",
      "error"
    );
    console.log(parsedResponse);
    return;
  }

  let data;
  try {
    data = rchainToolkit.utils.rhoValToJs(parsedResponse.exprs[0].expr);
  } catch (err) {
    log("Something went wrong when querying the node, value:", "error");
    console.log(err);
    return;
  }

  const a = new Date().getTime();
  try {
    const recordsProcessed = await storeNamesInRedis(redisClient, data);

    const s = Math.round((100 * (new Date().getTime() - a)) / 1000) / 100;
    log(
      `== successfully stored ${recordsProcessed ||
        0} names from the blockchain, it took ${s} seconds`
    );
  } catch (err) {
    log("Something went wrong when initialized the storing of names", "error");
    console.log(err);
  }
};
