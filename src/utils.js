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

const getValueFromCache = (client, cacheId) => {
  return new Promise((res, rej) => {
    redisGet(client, cacheId)
      .then((data) => {
        if (data === null) {
          rej(null);
        } else {
          res(data);
        }
      })
      .catch((err) => {
        rej(err);
        console.log(err);
        log('redis error get keys for ' + n, 'error');
      });
  });
};

const redisKeys = (client, pattern) => {
  return new Promise((resolve, reject) => {
    client.keys(pattern, (err, res) => {
      if (err) {
        log('error : ' + err);
      }
      resolve(res);
    });
  });
};

const redisGet = (client, pattern) => {
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

const redisSmembers = (client, pattern) => {
  return new Promise((resolve, reject) => {
    client.smembers(pattern, (err, res) => {
      if (err) {
        log('error : ' + err);
      }
      resolve(res);
    });
  });
};

const redisHgetall = (client, pattern) => {
  return new Promise((resolve, reject) => {
    client.hgetall(pattern, (err, res) => {
      if (err) {
        log('error : ' + err);
      }
      resolve(res);
    });
  });
};

const redisSMembers = (client, pattern) => {
  return new Promise((resolve, reject) => {
    client.smembers(pattern, (err, res) => {
      if (err) {
        log('error : ' + err);
      }
      resolve(res);
    });
  });
};

const getManyBagsDataTerm = (registryUri, ids) => {
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
};

// Careful, it is different than the function that build
// the unforgeable query for dappy-node
const buildUnforgeableNameQuery = (unforgeableName) => {
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

module.exports = {
  log,
  buildUnforgeableNameQuery,
  getManyBagsDataTerm,
  redisGet,
  getValueFromCache,
  redisKeys,
  redisSmembers,
  redisHgetall,
  redisSMembers,
}