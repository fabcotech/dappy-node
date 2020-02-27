const rchainToolkit = require("rchain-toolkit");

const log = require("../utils").log;

module.exports.getLastFinalizedBlockNumber = async httpUrlReadOnly => {
  let validAfterBlockNumber;
  try {
    validAfterBlockNumber = JSON.parse(
      await rchainToolkit.http.blocks(httpUrlReadOnly, {
        position: 1
      })
    )[0].blockNumber;
  } catch (err) {
    log("Unable to get last finalized block", "error");
    throw new Error(err);
  }

  const intWithOffset = Math.floor(validAfterBlockNumber / 12) * 12;
  log(
    `got last finalized block height at ${validAfterBlockNumber}, rounded it to ${intWithOffset} (base 12)`
  );

  return intWithOffset;
};
