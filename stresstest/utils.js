const rchainToolkit = require('rchain-toolkit');

module.exports.prepareDeploy = async (
  httpUrlReadOnly,
  publicKey,
  timestamp
) => {
  let prepareDeployResponse;
  try {
    prepareDeployResponse = await rchainToolkit.http.prepareDeploy(
      httpUrlReadOnly,
      {
        deployer: publicKey,
        timestamp: timestamp,
        nameQty: 1,
      }
    );
  } catch (err) {
    console.log(err);
    throw new Error('Unable to prepare deploy');
  }

  return prepareDeployResponse;
};

module.exports.validAfterBlockNumber = async (httpUrlReadOnly) => {
  let validAfterBlockNumberResponse;
  try {
    validAfterBlockNumberResponse = JSON.parse(
      await rchainToolkit.http.blocks(httpUrlReadOnly, {
        position: 1,
      })
    )[0].blockNumber;
  } catch (err) {
    log('Unable to get last finalized block', 'error');
    console.log(err);
    throw new Error();
  }
  return validAfterBlockNumberResponse;
};

module.exports.waitForUnforgeable = (validator, name) => {
  return new Promise((resolve, reject) => {
    let dataAtNameResponse;
    const interval = setInterval(() => {
      try {
        rchainToolkit.http
          .dataAtName(validator, {
            name: {
              UnforgPrivate: { data: name },
            },
            depth: 3,
          })
          .then((dan) => {
            dataAtNameResponse = dan;
            if (
              dataAtNameResponse &&
              JSON.parse(dataAtNameResponse) &&
              JSON.parse(dataAtNameResponse).exprs &&
              JSON.parse(dataAtNameResponse).exprs.length
            ) {
              resolve(
                rchainToolkit.utils.rhoValToJs(
                  JSON.parse(dataAtNameResponse).exprs[0].expr
                )
              );
              clearInterval(interval);
            }
          })
          .catch((err) => {
            console.log(1);
            console.log(dataAtNameResponse);
            console.log(err);
            //throw new Error('wait for unforgeable name');
          });
      } catch (err) {
        console.log(2);
        console.log(err);
        //throw new Error('wait for unforgeable name');
      }
    }, 4000);
  });
};
