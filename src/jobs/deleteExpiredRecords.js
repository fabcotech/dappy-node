const { blake2b } = require('blakejs');
const { log } = require('../log');
const { getStore } = require('../store');

const deleteRecords = async (redisClient, quarter) => {
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
      redisClient.del(...keysToDelete, (err) => {
        if (err) {
          return rej(err);
        }
        res();
        return undefined;
      });
    });
  }
};

let recordsJobRunning = false;
const runRecordsChildProcessJob = async (quarter, store) => {
  if (recordsJobRunning) {
    return;
  }
  recordsJobRunning = true;
  // remove 1/4 of the names every 15 minutes
  await deleteRecords(store.redisClient, quarter);

  recordsJobRunning = false;
};

function startJobExpiredRecords() {
  const store = getStore();
  setInterval(() => {
    if (new Date().getMinutes() % 15 === 0) {
      log(
        `will clean records/names cache: ${new Date().getMinutes()} minutes % 15 === 0`,
      );
      runRecordsChildProcessJob(new Date().getMinutes() / 15, store);
    }
  }, 1000 * 60);
}

module.exports = {
  startJobExpiredRecords,
};
