const rchainToolkit = require('rchain-toolkit');

const { readPursesTerm } = require('rchain-token');
const log = require('../utils').log;

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

  let namePrice = undefined;
  try {
    namePrice = rchainToolkit.utils.rhoValToJs(
      JSON.parse(exploreDeployResult).expr[0]
    )['0'].price;
    if (typeof namePrice !== 'number') {
      throw new Error('Not a number');
    }
  } catch (err) {
    console.log(exploreDeployResult);
    console.log(err);
    log(
      'Unable to parse explore-deploy result as JSON for name price',
      'error'
    );
    throw new Error(err);
  }

  log(`Finalized name price : ${namePrice / 100000000} REVs`);

  return {
    namePrice: namePrice,
  };
};
