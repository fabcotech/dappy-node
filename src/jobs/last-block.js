const rchainToolkit = require("rchain-toolkit");

const log = require("../utils").log;
const getRecordsTerm = require("../utils").getRecordsTerm;

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

  try {
    namePrice = rchainToolkit.utils.rhoValToJs(
      JSON.parse(
        await rchainToolkit.http.exploreDeploy(httpUrlReadOnly, {
          term: getRecordsTerm(process.env.RCHAIN_NAMES_REGISTRY_URI)
        })
      ).expr[0]
    ).price;
  } catch (err) {
    log("Unable to get name price", "error");
    throw new Error(err);
  }

  log(
    `Finalized block height : ${intWithOffset} (base 12 rounding), name price : ${namePrice /
      100000000} REVs`
  );

  return {
    lastFinalizedBlockNumber: intWithOffset,
    namePrice: namePrice
  };
};
