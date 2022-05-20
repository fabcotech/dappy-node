import { SecureVersion } from 'tls';
import http from 'http';
import https from 'https';
import dnsPacket, { Packet } from 'dns-packet';
import udp from 'dgram';
import fs from 'fs';
import express, { Router } from 'express';
import pem from 'pem';

import { getRouter } from './routes';
import { initSentry } from './sentry';
import {
  addZoneProviderRoutes,
  getCurrentZoneProvider,
} from '../ZoneProviders';

import { log } from '../log';
import { getConfig } from '../config';
import { initMetrics } from './metrics';
import { createFetchNameAnswers } from './routes/dns-query';
import { NamePacket, PacketType, ReturnCode } from '../model/NamePacket';

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
      return;
    }

    pem.createCertificate(
      {
        days: SELF_SIGNED_CERTIFICATE_DURATION,
        selfSigned: true,
        commonName: 'dappynode',
        altNames: ['localhost', 'dappynode'],
        config: `
        [v3_req]
        basicConstraints = critical,CA:TRUE
        `,
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

export const isDappyTLD = (query: NamePacket) => {
  return (
    query.questions &&
    query.questions.length >= 1 &&
    query.questions[0].name.endsWith('.dappy')
  );
};

export const startDnsServer = async () => {
  const config = getConfig();

  if (!config.dappyNodeDnsPort) {
    return;
  }

  const { getZones } = getCurrentZoneProvider();
  const server = udp.createSocket('udp4');

  server.on('message', async (msg: any, info: any) => {
    const queryPacket = dnsPacket.decode(msg) as NamePacket;
    if (!isDappyTLD(queryPacket)) {
      server.send(
        dnsPacket.encode({
          flags: ReturnCode.NXDOMAIN,
          type: PacketType.RESPONSE,
          id: queryPacket.id || 0,
          questions: queryPacket.questions as any,
          answers: [],
          additionals: [],
          authorities: [],
        }),
        info.port,
        'localhost',
        () => {}
      );
      return;
    }
    const response = (await createFetchNameAnswers(getZones)(
      queryPacket
    )) as Packet;
    server.send(dnsPacket.encode(response), info.port, 'localhost', () => {});
  });

  server.bind(config.dappyNodeDnsPort);

  log(`Listening for DNS on address 127.0.0.1:${config.dappyNodeDnsPort} !`);
};
