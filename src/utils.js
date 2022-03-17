/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const log = (a, level = 'info') => {
  if (level === 'warning') {
    console.log('\x1b[33m%s\x1b[0m', `${new Date().toISOString()} [WARN] ${a}`);
    let warnings = '';
    try {
      warnings = fs.readFileSync(
        path.join(__dirname, '../logs/warnings.txt'),
        'utf8',
      );
    } catch (err) {
      // do nothing
    }
    warnings += `${new Date().toISOString()} ${a}\n`;
    fs.writeFileSync(
      path.join(__dirname, '../logs/warnings.txt'),
      warnings,
      'utf8',
    );
  } else if (level === 'error') {
    let errors = '';
    try {
      errors = fs.readFileSync(
        path.join(__dirname, '../logs/errors.txt'),
        'utf8',
      );
    } catch (err) {
      // do nothing
    }
    errors += `${new Date().toISOString()} ${a}\n`;
    fs.writeFileSync(
      path.join(__dirname, '../logs/errors.txt'),
      errors,
      'utf8',
    );
    console.log(
      '\x1b[31m%s\x1b[0m',
      `${new Date().toISOString()} [ERROR] ${a}`,
    );
  } else {
    console.log(new Date().toISOString(), a);
  }
};

const getManyBagsDataTerm = (registryUri, ids) => `new return, entryCh, readCh, lookup(\`rho:registry:lookup\`) in {
    lookup!(\`rho:id:${registryUri}\`, *entryCh) |
    for(entry <- entryCh) {
      new x in {
        entry!({ "type": "READ_BAGS_DATA" }, *x) |
        for (y <- x) {
          return!([
            ${ids
    .map((b) => `*y.get("${b}")`)
    .join(',\n')}
          ])
        }
      }
    }
  }`;

// Careful, it is different than the function that build
// the unforgeable query for dappy-node
const buildUnforgeableNameQuery = (unforgeableName) => ({
  unforgeables: [
    {
      g_private_body: {
        id: Buffer.from(unforgeableName, 'hex'),
      },
    },
  ],
});

module.exports = {
  log,
  buildUnforgeableNameQuery,
  getManyBagsDataTerm,
};
