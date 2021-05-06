const fs = require('fs');
const https = require('https');
const http = require('http');

const rchainNode = '195.154.70.253';
const dappyNodePortHttp = '40403';
const dappyNodeHost = 'rnode-7d8dcc7c48-lt8cp.dappy.tech';

const doRequestHttp = () => {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: `${rchainNode}`,
        port: dappyNodePortHttp,
        path: `/version`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Host: dappyNodeHost,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk.toString('utf8');
        });
        res.on('end', () => {
          resolve(data);
        });
        res.on('error', (e) => {
          reject(e);
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
};
const main = async () => {
  const b = await doRequestHttp();
  console.log(b);
};

main();
