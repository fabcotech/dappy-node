const rchainToolkit = require('@fabcotech/rchain-toolkit');

const { readPursesTerm } = require('@fabcotech/rchain-token');
const { log } = require('../../../log');
const { getConfig } = require('../../../config');

module.exports.getPurseZeroPrice = async (urlOrOptions) => {
  let exploreDeployResult;
  const config = getConfig();

  try {
    exploreDeployResult = await rchainToolkit.http.exploreDeploy(urlOrOptions, {
      term: readPursesTerm({
        masterRegistryUri: config.dappyNamesMasterRegistryUri,
        contractId: config.dappyNamesContractId,
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
