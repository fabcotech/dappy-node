const { getNodes } = require('./get-nodes');
const { ping } = require('./ping');
const { dnsQuery } = require('./dns-query');

module.exports = {
  getNodes,
  ping,
  dnsQuery,
};
