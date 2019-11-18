const rchainToolkit = require("rchain-toolkit");

const log = require("../utils").log;

module.exports.getLastFinalizedBlockNumber = async rnodeDeployClient => {
  let getBlocksResponse;

  try {
    getBlocksResponse = await rchainToolkit.grpc.lastFinalizedBlock(
      rnodeDeployClient
    );
  } catch (err) {
    throw new Error("Could not get last finalized block");
  }

  if (
    !getBlocksResponse.blockInfo ||
    !getBlocksResponse.blockInfo.blockNumber
  ) {
    throw new Error("could not find the last block on the blockchain");
  }

  const int = parseInt(getBlocksResponse.blockInfo.blockNumber, 10);
  const intWithOffset = Math.floor(int / 12) * 12;
  log(
    `got last finalized block height at ${int}, rounded it to ${intWithOffset} (base 12)`
  );

  return intWithOffset;
};
