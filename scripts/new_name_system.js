// # VALIDATOR_HOST
// # PRIVATE_KEY
// node ./node_modules/rchain-token/cli deploy-master

const { deployMaster, deployBox, deploy } = require('rchain-token/cli/api');

const { setEnvValue } = require('./env');

async function deployNameSystem() {
  const validatorHost = process.env.VALIDATOR;
  const privateKey = process.env.PRIVATE_KEY;
  const boxId = process.env.BOX_ID;
  const contractId = process.env.CONTRACT_ID;

  const masterRegistryUri = await deployMaster({
    validatorHost,
    privateKey,
  });
  setEnvValue('RCHAIN_NAMES_MASTER_REGISTRY_URI', masterRegistryUri);
  console.log(`✓ Master deployed at ${masterRegistryUri}`);

  const rBoxId = await deployBox({
    validatorHost,
    masterRegistryUri,
    privateKey,
    boxId,
  });
  console.log(`✓ Box ${rBoxId} deployed`);

  const rContractId = await deploy({
    validatorHost,
    masterRegistryUri,
    privateKey,
    boxId: rBoxId,
    contractId,
    fungible: false
  });
  setEnvValue('RCHAIN_NAMES_CONTRACT_ID', masterRegistryUri);
  console.log(`✓ Contract ${rContractId} deployed`);
}

deployNameSystem();