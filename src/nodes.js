const path = require('path');
const fs = require('fs');

const { log } = require('./log');
const { getStore } = require('./store');
const { getConfig } = require('./config');

function initNodes() {
  const store = getStore();
  const config = getConfig();

  try {
    if (config.dappyNodeFiles) {
      store.nodes = JSON.parse(
        fs.readFileSync(path.join('./', config.dappyNodeFiles)).toString('utf8')
      );
    } else {
      log('ignoring NODES_FILE', 'warning');
    }
  } catch (err) {
    log(`could not parse nodes file : ${config.dappyNodeFiles}`, 'error');
  }
}

module.exports = {
  initNodes,
};
