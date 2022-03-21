const dnsPacket = require('dns-packet');

const dnsQuery = (req, res) => {
  res.set({
    'content-type': 'application/dns-message',
    'Access-Control-Allow-Origin': '*',
  });

  // TODO: return error if req.body is not a valid dns packet
  // (can't decode, wrong packet structure)
  // TODO: check version of dns packet (should correspond to dappy-node supported version)
  const queryPacket = dnsPacket.decode(req.body);

  console.log(JSON.stringify(queryPacket.questions));

  const packet = dnsPacket.encode({
    version: '1.0.0',
    type: 'response',
    rcode: 0,
    id: 0,
    flags: 0,
    questions: queryPacket.questions,
    answers: [
      {
        name: queryPacket.questions[0].name,
        type: 'A',
        class: 'IN',
        ttl: 60,
        data: '127.0.0.1',
      },
    ],
  });

  res.send(packet);
};

module.exports = {
  dnsQuery,
};
