const fs = require('fs');
const path = require('path');

const log = (a, level = 'info') => {
  if (level === 'warning') {
    console.log('\x1b[33m%s\x1b[0m', new Date().toISOString() + ' [WARN] ' + a);
    let warnings = '';
    try {
      warnings = fs.readFileSync(
        path.join(__dirname, '../logs/warnings.txt'),
        'utf8'
      );
    } catch (err) {}
    warnings += `${new Date().toISOString()} ${a}\n`;
    fs.writeFileSync(
      path.join(__dirname, '../logs/warnings.txt'),
      warnings,
      'utf8'
    );
  } else if (level === 'error') {
    let errors = '';
    try {
      errors = fs.readFileSync(
        path.join(__dirname, '../logs/errors.txt'),
        'utf8'
      );
    } catch (err) {}
    errors += `${new Date().toISOString()} ${a}\n`;
    fs.writeFileSync(
      path.join(__dirname, '../logs/errors.txt'),
      errors,
      'utf8'
    );
    console.log(
      '\x1b[31m%s\x1b[0m',
      new Date().toISOString() + ' [ERROR] ' + a
    );
  } else {
    console.log(new Date().toISOString(), a);
  }
};

module.exports.log = log;

module.exports.getManyBagsDataTerm = (registryUri, ids) => {
  return `new return, entryCh, readCh, lookup(\`rho:registry:lookup\`) in {
    lookup!(\`rho:id:${registryUri}\`, *entryCh) |
    for(entry <- entryCh) {
      new x in {
        entry!({ "type": "READ_BAGS_DATA" }, *x) |
        for (y <- x) {
          return!([
            ${ids
              .map((b) => {
                return `*y.get("${b}")`;
              })
              .join(',\n')}
          ])
        }
      }
    }
  }`;

  return `new return, ${registryUris.map((r, i) => `r${i}`).join(', ')},
    ${registryUris
      .map((r, i) => `s${i}`)
      .join(', ')}, recordCh, readCh, lookup(\`rho:registry:lookup\`) in {
    ${registryUris
      .map(
        (r, i) => `
      lookup!(\`${r}\`, *r${i}) |
      for(record <- r${i}) {
        s${i}!(*record)
      }`
      )
      .join(' |\n')} |

    for (${registryUris.map((r, i) => `@v${i} <- s${i}`).join(' ;')}) {
      return!([
        ${registryUris.map((r, i) => `v${i}`).join(',')}
      ])
    }
  }`;
};

module.exports.redisKeys = (client, pattern) => {
  return new Promise((resolve, reject) => {
    client.keys(pattern, (err, res) => {
      if (err) {
        log('error : ' + err);
      }
      resolve(res);
    });
  });
};

module.exports.redisGet = (client, pattern) => {
  return new Promise((resolve, reject) => {
    console.log('get pattern', pattern);
    client.get(pattern, (err, res) => {
      if (err) {
        log('error : ' + err);
      }
      console.log('GET', err);
      resolve(res);
    });
  });
};

module.exports.redisSmembers = (client, pattern) => {
  return new Promise((resolve, reject) => {
    client.smembers(pattern, (err, res) => {
      if (err) {
        log('error : ' + err);
      }
      resolve(res);
    });
  });
};

module.exports.redisHgetall = (client, pattern) => {
  return new Promise((resolve, reject) => {
    client.hgetall(pattern, (err, res) => {
      if (err) {
        log('error : ' + err);
      }
      resolve(res);
    });
  });
};

// Careful, it is different than the function that build
// the unforgeable query for dappy-node
module.exports.buildUnforgeableNameQuery = (unforgeableName) => {
  return {
    unforgeables: [
      {
        g_private_body: {
          id: Buffer.from(unforgeableName, 'hex'),
        },
      },
    ],
  };
};
