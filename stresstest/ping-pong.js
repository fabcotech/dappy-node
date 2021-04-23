const fs = require('fs');
const https = require('https');
const http = require('http');

const dappyNodeIp = '192.168.49.2';
const dappyNodePortHttp = '30074';
const dappyNodePortHttps = '31875';
const dappyNodeHost = 't1.dappy.tech';
const certificate = fs.readFileSync('./nginx-selfsigned-t1.crt', 'utf8');

// n is the number of  blockchain read operations you want to do each time
// 1 read operation = 2 explore-deploys
// if n = 4 it does 8 explore-deploys each time
const n = 2;

const doRequestHttp = (term) => {
  return new Promise((resolve, reject) => {
    console.log({
      hostname: dappyNodeIp,
      port: dappyNodePortHttp,
      path: `/ping`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Host: dappyNodeHost,
      },
    });
    const req = http.request(
      {
        hostname: dappyNodeIp,
        port: dappyNodePortHttp,
        path: `/ping`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Host: dappyNodeHost,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          console.log(chunk.toString('utf8'));
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
const doRequestHttps = () => {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: dappyNodeIp,
        port: dappyNodePortHttps,
        path: `/ping`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Host: dappyNodeHost,
        },
        // cert does not have to be signed by CA (self-signed)
        rejectUnauthorized: false,
        // only origin user can have invalid cert
        cert: certificate,
        minVersion: 'TLSv1.2',
        ca: [],
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          console.log(chunk.toString('utf8'));
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
  const a = await doRequestHttps();
  console.log('https response: ', a);
  const b = await doRequestHttp();
  console.log('http response: ', b);
  process.exit();
};

main();
