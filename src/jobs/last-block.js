const rchainToolkit = require('rchain-toolkit');

const log = require('../utils').log;

module.exports.getLastFinalizedBlockNumber = async (urlOrOptions) => {
  let validAfterBlockNumber;
  try {
    validAfterBlockNumber = JSON.parse(
      await rchainToolkit.http.blocks(urlOrOptions, {
        position: 1,
      })
    )[0].blockNumber;
  } catch (err) {
    log('Unable to get last finalized block', 'error');
    throw new Error(err);
  }

  const intWithOffset = Math.floor(validAfterBlockNumber / 12) * 12;

  if (typeof intWithOffset !== 'number') {
    throw new Error('Not a number');
  }

  log(`Finalized block height : ${intWithOffset} (base 12 rounding) REVs`);

  return {
    lastFinalizedBlockNumber: intWithOffset,
  };
};
