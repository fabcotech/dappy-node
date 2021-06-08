require('dotenv').config();
const { blake2b } = require('blakejs');

const { redisKeys } = require('../utils');

module.exports.getDappyRecordsAndSaveToDb = async (redisClient, quarter) => {
  const nameKeys = await redisKeys(
    redisClient,
    `name:${process.env.REDIS_DB}:*`
  );
  const boxesKeys = await redisKeys(
    redisClient,
    `box:${process.env.REDIS_DB}:*`
  );
  const keysToDelete = nameKeys.concat(boxesKeys).filter((n) => {
    if (n === `name:${process.env.REDIS_DB}:0`) {
      return false;
    }
    const arr = Buffer.from(n, 'utf8');
    const blake2bHash = blake2b(arr, 0, 32);
    if (blake2bHash[0] > quarter * 64 && blake2bHash[0] < (quarter + 1) * 64) {
      return true;
    }

    return false;
  });

  if (keysToDelete.length) {
    await new Promise((res, rej) => {
      redisClient.del(...keysToDelete, (err, resp) => {
        if (err) {
          return rej(err);
        }
        res();
      });
    });
  }
};
