const rchainToolkit = require("rchain-toolkit");

const log = require("../utils").log;
const getRecordsTerm = require("../utils").getRecordsTerm;

module.exports.getLastFinalizedBlockNumber = async (httpUrlReadOnly) => {
  let validAfterBlockNumber;
  try {
    validAfterBlockNumber = JSON.parse(
      await rchainToolkit.http.blocks(httpUrlReadOnly, {
        position: 1,
      })
    )[0].blockNumber;
  } catch (err) {
    log("Unable to get last finalized block", "error");
    throw new Error(err);
  }

  const intWithOffset = Math.floor(validAfterBlockNumber / 12) * 12;

  let exploreDeployResult;
  try {
    exploreDeployResult = await rchainToolkit.http.exploreDeploy(
      httpUrlReadOnly,
      {
        term: getRecordsTerm(process.env.RCHAIN_NAMES_REGISTRY_URI),
      }
    );
  } catch (err) {
    log("Unable to explore-deploy for name price", "error");
    throw new Error(err);
  }

  try {
    namePrice = rchainToolkit.utils.rhoValToJs(
      JSON.parse(exploreDeployResult).expr[0]
    ).price;
  } catch (err) {
    log(
      "Unable to parse explore-deploy result as JSON for name price",
      "error"
    );
    console.log(exploreDeployResult);
    throw new Error(err);
  }

  log(
    `Finalized block height : ${intWithOffset} (base 12 rounding), name price : ${
      namePrice / 100000000
    } REVs`
  );

  return {
    lastFinalizedBlockNumber: intWithOffset,
    namePrice: namePrice,
  };
};
