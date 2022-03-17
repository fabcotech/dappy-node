const dnsPacket = require('dns-packet');

const dnsQuery = (req, res) => {
  res.set({
    'content-type': 'application/dns-message',
    'Access-Control-Allow-Origin': '*',
  });

  res.send(dnsPacket.encode({
    version: '1.0.0',
    type: 'response',
    rcode: 0,
    id: 0,
    flags: 0,
    questions: [
      {
        name: 'example.dappy',
        type: 'A',
        class: 'IN',
      },
    ],
    answers: [
      {
        name: 'example.dappy',
        type: 'A',
        class: 'IN',
        ttl: 60,
        data: '127.0.0.1',
      },
    ],
  }));
};

module.exports = {
  dnsQuery,
};
