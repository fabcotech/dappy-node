import fs from 'fs';
import * as rc from '@fabcotech/rchain-toolkit';

const getProcessArgv = (param: string) => {
  const index = process.argv.findIndex((arg) => arg === param);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
};

async function easyDeploy() {
  const phloPrice = getProcessArgv('--phlo-price') ? parseInt(getProcessArgv('--phlo-price') || '', 10) : 1;
  const phloLimit = getProcessArgv('--phlo-limit') ? parseInt(getProcessArgv('--phlo-limit') || '', 10) : 100000000;
  const privateKey = (getProcessArgv('--private-key') ? getProcessArgv('--private-key') : '28a5c9ac133b4449ca38e9bdf7cacdce31079ef6b3ac2f0a080af83ecff98b36') || '';
  let wait;
  if (process.argv.findIndex((arg) => arg === '--wait') !== -1) {
    wait = getProcessArgv('--wait') ? parseInt(getProcessArgv('--wait') || '40000', 10) : 40000;
  }

  const filePath = process.argv[2];
  let term = 'new x in { x!("hello world !") }';
  try {
    term = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Unable to locate file ${process.argv[2]}`);
  }

  if (wait) {
    const dataAtNameResponse = await rc.http.easyDeploy(
      'http://localhost:40403' || getProcessArgv('--host'),
      term,
      privateKey,
      phloPrice,
      phloLimit,
      wait
    );
    const data = rc.utils.rhoValToJs(
      JSON.parse(dataAtNameResponse).exprs[0].expr
    );
    console.log(data);
  } else {
    const deployResponse = await rc.http.easyDeploy(
      'http://localhost:40403' || getProcessArgv('--host'),
      term,
      privateKey,
      phloPrice,
      phloLimit
    );
    console.log(deployResponse);
  }
}

easyDeploy();
