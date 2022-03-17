const rchainToolkit = require('rchain-toolkit');

const { readPursesTerm } = require('rchain-token');
const { log } = require('../../../utils');

module.exports.getPurseZeroPrice = async (urlOrOptions) => {
  let exploreDeployResult;
  try {
    exploreDeployResult = await rchainToolkit.http.exploreDeploy(urlOrOptions, {
      term: readPursesTerm({
        masterRegistryUri: process.env.RCHAIN_NAMES_MASTER_REGISTRY_URI,
        contractId: process.env.RCHAIN_NAMES_CONTRACT_ID,
        pursesIds: ['0'],
      }),
    });
  } catch (err) {
    log('Unable to explore-deploy for name price', 'error');
    throw new Error(err);
  }

  let namePrice;
  try {
    namePrice = rchainToolkit.utils.rhoValToJs(
      JSON.parse(exploreDeployResult).expr[0],
    )['0'].price;
    if (namePrice === null) {
      // do nothing
    } else if (
      Array.isArray(namePrice)
      && namePrice.length === 2
    ) {
      if (typeof namePrice[0] === 'string' && typeof namePrice[1] === 'number') {
        // do nothing
      } else if (typeof namePrice[0] === 'string' && typeof namePrice[1] === 'string') {
        // do nothing
      } else {
        throw new Error('Invalid name price');
      }
    } else {
      throw new Error('Invalid name price');
    }
  } catch (err) {
    log(exploreDeployResult);
    log(err);
    log(
      'Unable to parse explore-deploy result as JSON for name price',
      'error',
    );
    throw new Error(err);
  }

  log(`Finalized name price : ${namePrice.join(', ')}`);

  return {
    namePrice,
  };
};
