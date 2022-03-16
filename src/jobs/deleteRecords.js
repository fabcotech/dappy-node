require('dotenv').config();
const { blake2b } = require('blakejs');

module.exports.deleteRecords = async (redisClient, quarter) => {
  const nameKeys = await redisClient.keys('record:*');
  const boxesKeys = await redisClient.keys('box:*');
  const keysToDelete = nameKeys.concat(boxesKeys).filter((n) => {
    if (n === 'record:0') {
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
