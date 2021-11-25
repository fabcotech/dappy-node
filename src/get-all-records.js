const redisHgetall = require('./utils').redisHgetall;
const redisKeys = require('./utils').redisKeys;

module.exports.getAllRecordsWsHandler = async (redisClient) => {
  try {
    const keys = await redisKeys(redisClient, `record:*`);
    const records = await Promise.all(
      keys.map((k) => redisHgetall(redisClient, k))
    );

    return records;
  } catch (err) {
    return {
      success: false,
      error: { message: err },
    };
  }
};
