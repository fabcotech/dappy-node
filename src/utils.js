const log = (a, level = "info") => {
  if (level === "warning") {
    console.log("\x1b[33m%s\x1b[0m", new Date().toISOString() + " [WARN] " + a);
  } else if (level === "error") {
    console.log(
      "\x1b[31m%s\x1b[0m",
      new Date().toISOString() + " [ERROR] " + a
    );
  } else {
    console.log(new Date().toISOString(), a);
  }
};

module.exports.log = log;

module.exports.getRecordsTerm = registryUri => {
  return `new return, filesModuleCh, readCh, lookup(\`rho:registry:lookup\`) in {
    lookup!(\`rho:id:${registryUri}\`, *filesModuleCh) |
    for(filesModuleReader <- filesModuleCh) {
      new x in {
        filesModuleReader!(*x) |
        for (y <- x) {
          return!(*y)
        }
      }
    }
  }`;
};

module.exports.getRecordTerm = registryUri => {
  return `new return, recordCh, readCh, lookup(\`rho:registry:lookup\`) in {
    lookup!(\`${registryUri}\`, *recordCh) |
    for(record <- recordCh) {
      return!(*record)
    }
  }`;
};

module.exports.redisKeys = (client, pattern) => {
  return new Promise((resolve, reject) => {
    client.keys(pattern, (err, res) => {
      if (err) {
        log("error : " + err);
      }
      resolve(res);
    });
  });
};

module.exports.redisGet = (client, pattern) => {
  return new Promise((resolve, reject) => {
    console.log("get pattern", pattern);
    client.get(pattern, (err, res) => {
      if (err) {
        log("error : " + err);
      }
      console.log("GET", err);
      resolve(res);
    });
  });
};

module.exports.redisSmembers = (client, pattern) => {
  return new Promise((resolve, reject) => {
    client.smembers(pattern, (err, res) => {
      if (err) {
        log("error : " + err);
      }
      resolve(res);
    });
  });
};

module.exports.redisHgetall = (client, pattern) => {
  return new Promise((resolve, reject) => {
    client.hgetall(pattern, (err, res) => {
      if (err) {
        log("error : " + err);
      }
      resolve(res);
    });
  });
};

// Careful, it is different than the function that build
// the unforgeable query for dappy-node
module.exports.buildUnforgeableNameQuery = unforgeableName => {
  return {
    unforgeables: [
      {
        g_private_body: {
          id: Buffer.from(unforgeableName, "hex")
        }
      }
    ]
  };
};