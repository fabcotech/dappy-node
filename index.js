const express = require("express");
const grpc = require("grpc");

const http = require("http");
const protoLoader = require("@grpc/proto-loader");

const app = express();
const host = process.argv[5] ? process.argv[3] : "localhost";
const httpport = process.argv[5] ? process.argv[5] : "40403";
const grpcport = process.argv[7] ? process.argv[7] : "40401";
const expressport = process.argv[9] ? parseInt(process.argv[9], 10) : 3000;

let client = undefined;

protoLoader
  .load("./protobuf/CasperMessage.proto", {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  })
  .then(packageDefinition => {
    const packageObject = grpc.loadPackageDefinition(packageDefinition);
    client = new packageObject.coop.rchain.casper.protocol.DeployService(
      `${host}:${grpcport}`,
      grpc.credentials.createInsecure()
    );
  });

const listenForDataAtName = (options, client) => {
  return new Promise((resolve, reject) => {
    client.listenForDataAtName(options, function(err, blocks) {
      if (err) {
        reject(err);
      } else {
        resolve(blocks);
      }
    });
  });
};

const log = a => {
  console.log(new Date().toISOString(), a);
};

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
  listenForDataAtName(
    { depth: 1000, name: { exprs: [{ g_string: req.query.channel }] } },
    client
  )
    .then(blocks => {
      for (let i = 0; i < blocks.blockResults.length; i += 1) {
        const block = blocks.blockResults[i];
        for (let j = 0; j < block.postBlockData.length; j += 1) {
          const data = block.postBlockData[j].exprs[0];
          if (data) {
            log(
              `Received value from block n°${
                block.block.blockNumber
              }, ${new Date(parseInt(block.block.timestamp, 10)).toISOString()}`
            );
            if (expressport === 4002) {
              setTimeout(() => {
                res.status(400).json("error");
              }, 3000);
              return;
            } else if (expressport === 4001) {
              setTimeout(() => {
                res.append("Content-Type", "text/plain; charset=UTF-8");
                res.send(data);
              }, 3000);
              return;
            } else {
              res.append("Content-Type", "text/plain; charset=UTF-8");
              res.send(data);
              return;
            }
          }
        }
      }

      log(`Did not found any data for channel @"${req.query.channel}"`);
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
