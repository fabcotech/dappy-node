import * as rc from '@fabcotech/rchain-toolkit';
import process from 'process';

import { dedent } from '../../utils/dedent';
import { Api } from '../api';
import { Command } from './command';

const getProcessArgv = (param: string) => {
  const index = process.argv.findIndex((arg) => arg === param);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
};

async function easyDeploy(
  filePath: string,
  host: string,
  shardId: string,
  phloPrice: number,
  phloLimit: number,
  privateKey: string,
  wait: number | undefined,
  api: Api
) {
  let term = 'new x in { x!("hello world !") }';
  try {
    term = await api.readFile(filePath);
  } catch (err) {
    throw new Error(`Unable to locate file ${filePath}`);
  }

  if (wait) {
    const dataAtNameResponse = await rc.http.easyDeploy(
      host,
      {
        term,
        privateKey,
        shardId,
        phloPrice,
        phloLimit,
        timeout: wait,
      }
    );
    const data = rc.utils.rhoValToJs(
      JSON.parse(dataAtNameResponse).exprs[0].expr
    );
    api.print('Rholang result:');
    api.print(data);
  } else {
    const deployResponse = await rc.http.easyDeploy(
      host,
      {
        term,
        privateKey,
        phloPrice,
        phloLimit,
        shardId,
        timeout: undefined,
      }
    );
    const prettyResponse = deployResponse
      .replace(/\\n/, '\n')
      .replace(/(^")|("$)/, '');
    api.print(prettyResponse);
  }
}

export const deployCommand: Command = {
  description: dedent`
    Deploy rholang file on a rchain node and is able to wait for result.
    
    Positioned arguments:
      1. rholang file path to deploy (example: ./example.rho)

    Optional arguments:
      --phlo-price (default: 1)
      --phlo-limit (default: 100000000)
      --private-key (default: 28a5c9ac133b4449ca38e9bdf7cacdce31079ef6b3ac2f0a080af83ecff98b36)
      --host (default: http://localhost:40403)
      --wait: if defined, wait for the transaction to be mined before printing the result (default: 40000)

    Examples:
      # deploy a rholang file locally and wait for the transaction to be mined before printing the result 
      easyrnode deploy ./example.rho --wait

      # deploy a rholang file locally and do not wait for the transaction to be mined
      easyrnode deploy ./example.rho

    If you need a rholang file example, create a file with this rholang content:
      new x in { x!("hello world !") }
  `,
  action: async ([...rest], api) => {
    const filepath = process.argv[3];

    if (!filepath) {
      api.print('missing file path');
      return 1;
    }

    api.print(`Deploying command ${filepath}`);
    api.print('');

    const host = getProcessArgv('--host') || 'http://localhost:40403';
    const shardId = getProcessArgv('--shardId') || 'dev';

    const phloPrice = getProcessArgv('--phlo-price')
      ? parseInt(getProcessArgv('--phlo-price') || '', 10)
      : 1;
    const phloLimit = getProcessArgv('--phlo-limit')
      ? parseInt(getProcessArgv('--phlo-limit') || '', 10)
      : 100000000;
    const privateKey =
      (getProcessArgv('--private-key')
        ? getProcessArgv('--private-key')
        : '28a5c9ac133b4449ca38e9bdf7cacdce31079ef6b3ac2f0a080af83ecff98b36') ||
      '';
    let wait;
    if (process.argv.findIndex((arg) => arg === '--wait') !== -1) {
      wait = getProcessArgv('--wait')
        ? parseInt(getProcessArgv('--wait') || '40000', 10)
        : 40000;
    }

    await easyDeploy(
      filepath,
      host,
      shardId,
      phloPrice,
      phloLimit,
      privateKey,
      wait,
      api
    );

    return 0;
  },
};
