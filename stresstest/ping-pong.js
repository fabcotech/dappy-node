const fs = require('fs');
const https = require('https');
const http = require('http');

const dappyNodeIp = '51.159.114.136';
const dappyNodePortHttp = '80';
const dappyNodePortHttps = '443';
const dappyNodeHost = 'testnetwork';
const certificate = fs.readFileSync('./dappynode.crt', 'utf8');

const doRequestHttp = () => new Promise((resolve, reject) => {
  const req = http.request(
    {
      host: `${dappyNodeIp}`,
      port: dappyNodePortHttp,
      path: '/ping',
      method: 'POST',
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
    },
  );
  req.on('error', reject);
  req.end();
});
const doRequestHttps = () => new Promise((resolve, reject) => {
  const req = https.request(
    {
      hostname: dappyNodeIp,
      port: dappyNodePortHttps,
      path: '/ping',
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
        data += chunk.toString('utf8');
      });
      res.on('end', () => {
        resolve(data);
      });
      res.on('error', (e) => {
        reject(e);
      });
    },
  );
  req.on('error', reject);
  req.end();
});
const main = async () => {
  const a = await doRequestHttps();
  if (JSON.parse(a).data === 'pong') {
    console.log(
      `https response: pong ✓ http://${dappyNodeIp}:${dappyNodePortHttps}`,
    );
  } else {
    console.log(a);
    throw new Error(
      `https server ${dappyNodeIp}:${dappyNodePortHttps} did not reply "pong"`,
    );
  }
  const b = await doRequestHttp();
  if (JSON.parse(b).data === 'pong') {
    console.log(
      `http  response: pong ✓ http://${dappyNodeIp}:${dappyNodePortHttp}`,
    );
  } else {
    console.log(a);
    throw new Error(
      `http server ${dappyNodeIp}:${dappyNodePortHttp} did not reply "pong"`,
    );
  }
  process.exit();
};

main();
