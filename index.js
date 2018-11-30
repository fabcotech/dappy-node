const express = require("express");
const grpc = require("grpc");
const RNode = require("rchain-api").RNode;
const RHOCore = require("rchain-api").RHOCore;
const http = require("http");

const app = express();
const host = process.argv[5] ? process.argv[3] : "http://localhost";
const port = process.argv[5] ? process.argv[5] : "40403";
const expressport = process.argv[7] ? parseInt(process.argv[7], 10) : 3000;

console.log({
  host: host,
  port: port
});
const rchain = RNode(grpc, {
  host: host,
  port: port
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
  http.get(`${host}:${port}/version`, resp => {
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
      if (!blockResults[0]) {
        throw new Error("Not found");
      }
      console.log("blockResults[0]", blockResults[0]);
      return rchain.listenForDataAtName(
        blockResults[0].postBlockData.slice(-1).pop()
      );
    })
    .then(blockResults => {
      console.log("-----------", blockResults);
      for (let i = 0; i < blockResults.length; i += 1) {
        for (let j = 0; j < blockResults[i].postBlockData.length; i += 1) {
          const d = blockResults[i].postBlockData[j];
          res.append("Content-Type", "text/plain; charset=UTF-8");
          res.send(RHOCore.toRholang(d));
          return;
        }
      }
      throw new Error("Not found");
    })
    .catch(err => {
      console.log("ERROR");
      res.status(400).json(err.message);
    });
});

app.listen(expressport, function() {
  console.log(`dappy-node listening on port ${expressport}!`);
});
