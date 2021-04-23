const rchainToolkit = require('rchain-toolkit');
const fs = require('fs');

module.exports.health = async (httpUrlReadOnly) => {
  const results = {};
  const writeToLogs = () => {
    if (Object.keys(results).length === httpUrlReadOnly.length) {
      let day = new Date().toISOString().slice(0, 10);
      let logs = {};
      try {
        logs = JSON.parse(fs.readFileSync(`./logs/dappy-network-${day}.json`));
      } catch (err) {}
      logs[new Date().toISOString().slice(11, 19)] = results;
      fs.writeFileSync(
        `./logs/dappy-network-${day}.json`,
        JSON.stringify(logs, null, 2),
        'utf8'
      );
    }
  };

  httpUrlReadOnly.forEach(async (url) => {
    const s = new Date().getTime();
    try {
      lastblock = JSON.parse(
        await rchainToolkit.http.blocks(url, {
          position: 1,
        })
      )[0].blockNumber;
      results[url] = {
        status: 'success',
        block: lastblock,
        time: new Date().getTime() - s,
      };
      writeToLogs();
    } catch (err) {
      results[url] = { status: 'fail', time: new Date().getTime() - s };
      writeToLogs();
    }
  });
};
