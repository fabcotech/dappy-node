const log = a => {
  console.log(new Date().toISOString(), a);
};
module.exports.log = log;

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
