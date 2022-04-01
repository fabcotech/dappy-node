#!/usr/bin/env node

/* eslint-disable no-console */
const {
  deployMaster, deployBox, deploy, createPurse, updatePursePrice,
} = require('rchain-token/cli/api');

const { setEnvValue, mustBeUrl, mustBeNotEmptyString, createConfigFileIfNotExists, DAPPY_CONFIG_FILE_NAME } = require('./utils');

const getArgsMap = (
  args,
) => {
  return args.reduce((acc, arg) => {
    const [key, value] = arg.split('=');
    acc[key.replace(/^--/, '')] = value || true;
    return acc;
  }, {});
};

const DEFAULT_VALIDATOR = 'http://localhost:40403';
const DEFAULT_PRIVATEKEY = '28a5c9ac133b4449ca38e9bdf7cacdce31079ef6b3ac2f0a080af83ecff98b36';
const DEFAULT_BOXID = 'boxns';
const DEFAULT_CONTRACTID = 'contractns';

const getConfig = () => {
  const { validator, privatekey, boxid, contractid } = getArgsMap(process.argv.slice(2));

  return {
    validatorHost: mustBeUrl(validator || DEFAULT_VALIDATOR, '--validator must be a valid url'),
    privateKey: mustBeNotEmptyString(privatekey || DEFAULT_PRIVATEKEY, '--privatekey must be provided'),
    boxId: mustBeNotEmptyString(boxid || DEFAULT_BOXID, '--boxid must be provided'),
    contractId: mustBeNotEmptyString(contractid || DEFAULT_CONTRACTID, '--contractid must be provided'),
  }
}

async function deployNameSystem() {
  const { validatorHost, privateKey, boxId, contractId } = getConfig();

  console.log(`Dappy name system deployment started`);
  console.log('');
  const masterRegistryUri = await deployMaster({
    validatorHost,
    privateKey,
  });
  createConfigFileIfNotExists(masterRegistryUri);
  setEnvValue('DAPPY_NAMES_MASTER_REGISTRY_URI', masterRegistryUri);
  console.log(`✓ Master deployed at ${masterRegistryUri}`);

  const rBoxId = await deployBox({
    validatorHost,
    masterRegistryUri,
    privateKey,
    boxId,
  });
  setEnvValue('DAPPY_NAMES_BOX_ID', rBoxId);
  console.log(`✓ Box ${rBoxId} deployed`);

  const rContractId = await deploy({
    validatorHost,
    masterRegistryUri,
    privateKey,
    boxId: rBoxId,
    contractId,
    fungible: false,
  });
  setEnvValue('DAPPY_NAMES_CONTRACT_ID', rContractId);
  console.log(`✓ Contract ${rContractId} deployed`);

  await createPurse({
    validatorHost,
    masterRegistryUri,
    privateKey,
    contractId: rContractId,
    purses: {
      purse1: {
        id: '0', price: null, boxId: rBoxId, quantity: 100000000,
      },
    },
    pursesData: { purse1: null },
  });
  console.log('✓ Purse 0 created');

  await updatePursePrice({
    masterRegistryUri,
    validatorHost,
    privateKey,
    contractId: rContractId,
    boxId: rBoxId,
    purseId: '0',
    price: ['rev', 50000000],
  });
  console.log('✓ Purse 0 price updated to 50000000');
  console.log(''); 
  console.log(`Name system deployed, dappy node configuration is saved into ./${DAPPY_CONFIG_FILE_NAME} file`);
}

deployNameSystem();
