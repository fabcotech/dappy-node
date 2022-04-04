const rchainToolkit = require('@fabcotech/rchain-toolkit');
const https = require('https');

const {
  readPursesTerm,
  readAllPursesTerm,
  decodePurses,
} = require('@fabcotech/rchain-token');

const masterRegistryUri = 'zjfa7r7aqdg1weao6ozk6s3fhyiw5wo6pytrggaxkeqhsfw4rrd8yg';
const contractId = 'dappynamesystem';
const dappyNodeIp = '195.154.71.146';
const dappyNodePort = '443';
const dappyNodeHost = 'gammanetwork';

// n is the number of  blockchain read operations you want to do each time
// 1 read operation = 2 explore-deploys
// if n = 4 it does 8 explore-deploys each time
const n = 1;

const doRequest = (term) => new Promise((resolve, reject) => {
  const req = https.request(
    {
      hostname: dappyNodeIp,
      port: dappyNodePort,
      path: '/api/explore-deploy',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Host: dappyNodeHost,
      },
      // cert does not have to be signed by CA (self-signed)
      rejectUnauthorized: false,
      // only origin user can have invalid cert
      cert: undefined,
      ca: [],
    },
    (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
      res.on('error', (e) => {
        reject(e);
      });
    },
  );
  req.end(
    JSON.stringify({
      term,
    }),
  );
});
const main = async () => {
  const performNRequests = async () => {
    const d = new Date().getTime();
    const a = [];
    for (let i = 0; i < n; i += 1) {
      a.push(i);
    }
    const resp = await Promise.all(
      a.map(() => doRequest(
        readAllPursesTerm({
          masterRegistryUri,
          contractId,
          depth: 2,
        }),
      )),
    );
    let data;
    let ids;
    let purses;
    try {
      data = JSON.parse(resp[0]);
      const pursesAsBytes = data.expr[0];
      purses = decodePurses(
        pursesAsBytes,
        rchainToolkit.utils.rhoExprToVar,
        rchainToolkit.utils.decodePar,
      );
      console.log(purses);
      ids = Object.keys(purses);
    } catch (err) {
      console.warn('probably ddos protection stoping the stress test');
      console.log(resp[0]);
      console.log(err);
    }
    console.log(ids);
    const resp2 = await Promise.all(
      a.map(() => doRequest(
        readPursesTerm({
          masterRegistryUri,
          contractId,
          pursesIds: ids.slice(0, 30),
        }),
      )),
    );
    const data2 = JSON.parse(resp2[0]);
    console.log(data2);
    console.log(
      `${ids.length
      } NFT ids and 30 `
        + `purses recovered (${
          n
        } parallel requests) in ${
          Math.round((new Date().getTime() - d) / 1000)
        } second(s)`,
    );
    await performNRequests();
  };

  await performNRequests();
};

main();
