const rchainToolkit = require('rchain-toolkit');

const { readBagsTerm } = require('rchain-token-files');
const log = require('../utils').log;
const getRecordsTerm = require('../utils').getRecordsTerm;

module.exports.getLastFinalizedBlockNumber = async (
  httpUrlReadOnly,
  httpUrlValidator
) => {
  let validAfterBlockNumber;
  try {
    validAfterBlockNumber = JSON.parse(
      await rchainToolkit.http.blocks(httpUrlValidator, {
        position: 1,
      })
    )[0].blockNumber;
  } catch (err) {
    log('Unable to get last finalized block', 'error');
    throw new Error(err);
  }

  const intWithOffset = Math.floor(validAfterBlockNumber / 12) * 12;

  let exploreDeployResult;
  try {
    exploreDeployResult = await rchainToolkit.http.exploreDeploy(
      httpUrlReadOnly,
      {
        term: `new return, entryCh, lookup(\`rho:registry:lookup\`) in {
          lookup!(\`rho:id:${process.env.RCHAIN_NAMES_REGISTRY_URI}\`, *entryCh) |
          for(entry <- entryCh) {
            new x in {
              entry!({ "type": "READ_BAGS" }, *x) |
              for (y <- x) {
                return!(*y.get("0"))
              }
            }
          }
        }`,
      }
    );
  } catch (err) {
    log('Unable to explore-deploy for name price', 'error');
    throw new Error(err);
  }

  let namePrice = undefined;
  try {
    namePrice = rchainToolkit.utils.rhoValToJs(
      JSON.parse(exploreDeployResult).expr[0]
    ).price;
    if (typeof namePrice !== 'number') {
      throw new Error('Not a number');
    }
  } catch (err) {
    log(
      'Unable to parse explore-deploy result as JSON for name price',
      'error'
    );
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
