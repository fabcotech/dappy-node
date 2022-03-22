const dnsPacket = require('dns-packet');

const { getXRecordsWsHandler } = require('./get-x-records');
const { pickRandomReadOnly } = require('./pickRandomReadOnly');
const { log } = require('../../log');

const getAnswers = (questions, zone) => undefined;
  // questions
  //   .filter((q) => q.type !== 'CERT')
  //   .map(({ type, name }) => zone.records.find((record) => record.type === queriedType).data);

const dnsQuery = (store) => async (req, res) => {
  res.set({
    'content-type': 'application/dns-message',
    'Access-Control-Allow-Origin': '*',
  });

  // TODO: return error if req.body is not a valid dns packet
  // (can't decode, wrong packet structure)
  // TODO: check version of dns packet (should correspond to dappy-node supported version)
  const queryPacket = dnsPacket.decode(req.body);

  console.log(JSON.stringify(queryPacket.questions));
  const queriedType = queryPacket.questions[0].type;

  const r = await getXRecordsWsHandler(
    {
      names: queryPacket.questions.map((q) => q.name.replace(/\.dappy$/, '')),
    },
    {
      redisClient: store.redisClient,
      log,
      urlOrOptions: pickRandomReadOnly(store),
    },
  );

  let zone;
  try {
    zone = JSON.parse(r.records[0].data);
  } catch {
    zone = {
      records: [
        {
          ip: '192.168.0.1',
        },
      ],
    };
  }

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
        type: queriedType,
        class: 'IN',
        ttl: 60,
        data: zone.records.find((record) => record.type === queriedType).data,
      },
    ],
  });

  res.send(packet);
};

module.exports = {
  dnsQuery,
  getAnswers,
};
