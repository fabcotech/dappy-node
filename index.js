const express = require("express");
const grpc = require("grpc");
const RNode = require("rchain-api").RNode;
const RHOCore = require("rchain-api").RHOCore;
const http = require("http");

const app = express();
const host = process.argv[5] ? process.argv[3] : "localhost";
const httpport = process.argv[5] ? process.argv[5] : "40403";
const grpcport = process.argv[7] ? process.argv[7] : "40401";
const expressport = process.argv[9] ? parseInt(process.argv[9], 10) : 3000;

const log = a => {
  console.log(new Date().toISOString(), a);
};
const rchain = RNode(grpc, {
  host: host,
  port: grpcport
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// respond with "hello world" when a GET request is made to the homepage
app.get(`/version`, function(req, res) {
  http.get(`http://${host}:${httpport}/version`, resp => {
    if (resp.statusCode !== 200) {
      res.status(400).json("Not found");
      return;
    }

    resp.setEncoding("utf8");
    let rawData = "";
    resp.on("data", chunk => {
      rawData += chunk;
    });

    resp.on("end", () => {
      res.append("Content-Type", "text/plain; charset=UTF-8");
      res.send(rawData);
      return;
    });
  });
});

app.post("/getValueAtPublicName", function(req, res) {
  rchain
    .listenForDataAtPublicName(req.query.channel)
    .then(blockResults => {
      if (!blockResults.length) {
        throw new Error("No blocks");
      }
      log(`${blockResults.length} block(s) found`);
      const block = blockResults[0];
      return rchain.listenForDataAtName(block.postBlockData.slice(-1).pop());
    })
    .then(blockResults => {
      for (let i = 0; i < blockResults.length; i += 1) {
        const block = blockResults[i];
        for (let j = 0; j < block.postBlockData.length; j += 1) {
          const data = RHOCore.toRholang(block.postBlockData[j]);
          if (data) {
            log(
              `Received value from block n°${
                block.block.blockNumber
              }, ${new Date(parseInt(block.block.timestamp, 10)).toISOString()}`
            );
            res.append("Content-Type", "text/plain; charset=UTF-8");
            res.send(data);
            return;
          }
        }
      }

      log(`Did not found any data for channel @"${config.options.channel_id}"`);
      throw new Error("Not found");
    })
    .catch(err => {
      console.error(err);
      res.status(400).json(err.message);
    });
});

app.listen(expressport, function() {
  log(`dappy-node listening on port ${expressport}!`);
  log(`RChain node host ${host}`);
  log(`RChain node GRPC port ${grpcport}`);
  log(`RChain node HTTP port ${httpport}`);
});
