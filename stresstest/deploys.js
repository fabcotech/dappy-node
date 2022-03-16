const rchainToolkit = require('rchain-toolkit');

const {
  validAfterBlockNumber,
  prepareDeploy,
  waitForUnforgeable,
} = require('./utils');

const PRIVATE_KEY = 'a2803d16030f83757a5043e5c0e28573685f6d8bf4e358bf1385d82bffa8e698';
const PUBLIC_KEY = rchainToolkit.utils.publicKeyFromPrivateKey(PRIVATE_KEY);
const validators = [
  'https://node0.testnet.rchain-dev.tk',
  'https://node1.testnet.rchain-dev.tk',
  'https://node2.testnet.rchain-dev.tk',
];
const readOnly = 'https://observer.testnet.rchain.coop';

// n is the number of deploys you want to do each time
const n = 6;

const pickRandomValidator = () => validators[Math.floor(Math.random() * validators.length)];

let s = 0;

const deployAndWaitForValue = async (timestamp) => {
  const validator = pickRandomValidator();
  const vab = await validAfterBlockNumber(readOnly);
  const pd = await prepareDeploy(readOnly, PUBLIC_KEY, timestamp);

  const deployOptions = await rchainToolkit.utils.getDeployOptions(
    'secp256k1',
    timestamp,
    'new hello in { hello!("world") }',
    PRIVATE_KEY,
    PUBLIC_KEY,
    1,
    1000000,
    vab || -1,
  );
  try {
    const deployResponse = await rchainToolkit.http.deploy(
      validator,
      deployOptions,
    );
    if (!deployResponse.startsWith('"Success!')) {
      console.log(deployResponse);
      throw new Error('deploy error 01');
    }
  } catch (err) {
    console.log(validator);
    console.log(err);
    throw new Error('deploy error 02');
  }
  s += 1;
  if (s === n) {
    console.log('deployed', n, 'terms, now waiting for value onchain');
  }

  try {
    const stringAtUnforgeable = await waitForUnforgeable(
      validator,
      JSON.parse(pd).names[0],
    );
    if (stringAtUnforgeable !== 'world') {
      console.log(stringAtUnforgeable);
      throw new Error('incorrect value onchain');
    }
  } catch (err) {
    console.log(err);
    throw new Error('could not get value');
  }

  return true;
};

const main = async () => {
  let round = 1;
  const performNRequests = async () => {
    const d = new Date().getTime();
    const a = [];
    for (let i = 0; i < n; i += 1) {
      a.push(i);
    }
    const timestamp = new Date().valueOf();
    s = 0;
    const resp = await Promise.all(
      a.map((i) => deployAndWaitForValue(timestamp + i)),
    );

    console.log(
      `== round ${
        round
      }: it took ${
        Math.round((new Date().getTime() - d) / 1000)
      } seconds to deploy ${
        n
      } times (and wait for value onchain) `
        + `among ${
          validators.length
        } validator nodes\n`,
    );
    round += 1;
    await performNRequests();
  };
  await performNRequests();
};

main();
