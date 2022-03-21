const { Router } = require('express');
const bodyParser = require('body-parser');

const { getNodes } = require('./get-nodes');
const { ping } = require('./ping');
const { dnsQuery } = require('../../ZoneProviders/memory/dns-query');

function getRouter(store) {
  const router = Router();

  router.post('/ping', ping);
  router.post('/get-nodes', getNodes(store));


  return router;
}

module.exports = {
  getRouter,
};
