const { log } = require('../../log');
const { getRoutes } = require('./routes');

function start() {
  log('memory provider started');
}

module.exports = {
  start,
  getRoutes,
};
