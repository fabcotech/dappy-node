import { SecureVersion } from 'tls';
import http from 'http';
import https from 'https';
import fs from 'fs';
import express, { Router } from 'express';
import pem from 'pem';

import { getRouter } from './routes';
import { initSentry } from './sentry';
import { addZoneProviderRoutes } from '../ZoneProviders';

import { log } from '../log';
import { getConfig } from '../config';
import { initMetrics } from './metrics';

const SELF_SIGNED_CERTIFICATE_DURATION = 365 * 20; // 20 years

const initRoutes = (app: Router) => {
  initSentry(app);

  app.use('/', getRouter());

  addZoneProviderRoutes(app);
};

const getOrCreateCertificate = (
  certificatePath: string,
  privateKeyPath: string
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(certificatePath) && fs.existsSync(privateKeyPath)) {
      resolve([
        fs.readFileSync(certificatePath, 'utf8'),
        fs.readFileSync(privateKeyPath, 'utf8'),
      ]);
    }

    pem.createCertificate(
      {
        days: SELF_SIGNED_CERTIFICATE_DURATION,
        selfSigned: true,
        altNames: ['localhost'],
      },
      (err, certificate) => {
        if (err) {
          reject(err);
        }

        fs.writeFileSync(certificatePath, certificate.certificate);
        fs.writeFileSync(privateKeyPath, certificate.serviceKey);

        resolve([certificate.certificate, certificate.serviceKey]);
      }
    );
  });
};

export const startHttpServers = async () => {
  const app = express();
  const config = getConfig();

  initMetrics(app);
  initRoutes(app);

  log(`Listening for HTTP on address 127.0.0.1:${config.dappyNodeHttpPort} !`);
  const serverHttp = http.createServer(app);
  serverHttp.listen(config.dappyNodeHttpPort);

  if (config.dappyNodeHttpsPort) {
    log(
      `Listening for HTTP+TLS on address 127.0.0.1:${config.dappyNodeHttpsPort} ! (TLS handled by nodeJS)`
    );
    const [cert, key] = await getOrCreateCertificate(
      config.dappyNodeCertificateFilename,
      config.dappyNodePrivateKeyFilename
    );

    const options = {
      key,
      cert,
      minVersion: 'TLSv1.3' as SecureVersion,
      cipher: 'TLS_AES_256_GCM_SHA384',
    };
    const serverHttps = https.createServer(options, app);

    serverHttps.listen(config.dappyNodeHttpsPort);
  }
};
