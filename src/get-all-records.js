const redisHgetall = require('./utils').redisHgetall;

module.exports.getAllRecordsWsHandler = async (redisClient) => {
  try {
    const keys = await redisClient.keys(`record:*`);
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
