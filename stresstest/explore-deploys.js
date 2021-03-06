const rchainToolkit = require('rchain-toolkit');
const https = require('https');

const { readTerm, readPursesTerm, readPursesIdsTerm } = require('rchain-token');

const registryUri = '1rjuqxchdg85n38x3i9syez6ingq8nbreex5ajz1tf9i53rji9iksz';
const dappyNodeIp = '51.159.114.136';
const dappyNodePort = '443';
const dappyNodeHost = 't1.dappy.tech';

// n is the number of  blockchain read operations you want to do each time
// 1 read operation = 2 explore-deploys
// if n = 4 it does 8 explore-deploys each time
const n = 2;

const doRequest = (term) => {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: dappyNodeIp,
        port: dappyNodePort,
        path: `/api/explore-deploy`,
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
      }
    );
    req.end(
      JSON.stringify({
        term: term,
      })
    );
  });
};
const main = async () => {
  const performNRequests = async () => {
    let d = new Date().getTime();
    let a = [];
    for (let i = 0; i < n; i += 1) {
      a.push(i);
    }
    const resp = await Promise.all(
      a.map(() => doRequest(readPursesIdsTerm(registryUri)))
    );
    let data;
    let ids;
    try {
      data = JSON.parse(resp[0]);
      ids = rchainToolkit.utils.rhoValToJs(JSON.parse(data.data).expr[0]);
    } catch (err) {
      console.warn('probably ddos protection stoping the stress test');
      console.log(resp[0]);
      console.log(err);
    }
    console.log(ids);
    const resp2 = await Promise.all(
      a.map(() =>
        doRequest(
          readPursesTerm(registryUri, {
            pursesIds: ids.slice(0, 30),
          })
        )
      )
    );
    const data2 = JSON.parse(resp2[0]);

    console.log(
      ids.length +
        ' NFT ids and 30 ' +
        'purses recovered (' +
        n +
        ' parallel requests) in ' +
        Math.round((new Date().getTime() - d) / 1000) +
        ' second(s)'
    );
    await performNRequests();
  };

  await performNRequests();
  return;

  if (data.body) {
    req.end(JSON.stringify(data.body));
  } else {
    req.end();
  }

  req.on('error', (err) => {
    console.log(err);
    reject(err);
  });
};

main();
