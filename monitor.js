const rchainToolkit = require('rchain-toolkit');
const https = require('https');

const { readTerm, readPursesTerm, readPursesIdsTerm } = require('rchain-token');

const dappyNodeIp = '127.0.0.1';
const dappyNodePort = '3004';
const dappyNodeHost = 'd1.dappy.tech';

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
        path: `/status`,
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
    req.end('');
  });
};

const main = async () => {
  let length = 0;
  setInterval(() => {
    doRequest().then((a) => {
      length = Object.keys(JSON.parse(a)).length + 2;
      process.stdout.write(a);
    });
  }, 5000);
};

main();
