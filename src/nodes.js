const path = require('path');
const fs = require('fs');

const { log } = require('./log');

function initNodes(store) {
  try {
    if (process.env.NODES_FILE) {
      store.nodes = JSON.parse(
        fs
          .readFileSync(path.join('./', process.env.NODES_FILE))
          .toString('utf8'),
      );
    } else {
      log('ignoring NODES_FILE', 'warning');
    }
  } catch (err) {
    log(`could not parse nodes file : ${process.env.NODES_FILE}`, 'error');
  }
}

module.exports = {
  initNodes,
};
