const { Router } = require('express');
const bodyParser = require('body-parser');

const { getNodes } = require('./get-nodes');
const { ping } = require('./ping');
const { dnsQuery } = require('./dns-query');

function getRouter(store) {
  const router = Router();

  router.post('/ping', ping);
  router.post('/get-nodes', getNodes(store));
  router.post('/dns-query', bodyParser.raw({
    type: 'application/dns-message',
  }), dnsQuery);

  return router;
}

module.exports = {
  getRouter,
};
