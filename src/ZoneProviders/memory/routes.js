const { Router } = require('express');
const bodyParser = require('body-parser');

const { dnsQuery } = require('./dns-query');

module.exports = {
  getRoutes: () => {
    const router = Router();

    router.post('/dns-query', bodyParser.raw({
      type: 'application/dns-message',
    }), dnsQuery);

    return router;
  },
};
