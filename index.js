const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const http = require("http");
const redis = require("redis");
const bodyParser = require("body-parser");
const rchainToolkit = require("rchain-toolkit");

const getNodesController = require("./src/get-nodes");
const previewPrivateNamesController = require("./src/preview-private-names");
const listenForDataAtNameController = require("./src/listen-for-data-at-name");
const deployController = require("./src/deploy");
const infoController = require("./src/info");

const getDappyNamesAndSaveToDb = require("./names").getDappyNamesAndSaveToDb;

const log = require("./utils").log;
const redisSmembers = require("./utils").redisSmembers;
const redisHgetall = require("./utils").redisHgetall;
const redisKeys = require("./utils").redisKeys;

if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
  require("dotenv").config();
}

const app = express();

let protobufsLoaded = false;
let appReady = false;
let rnodeDeployClient = undefined;
let rnodeProposeClient = undefined;

const redisClient = redis.createClient({
  db: 1,
  host: process.env.REDIS_HOST
});

redisClient.on("error", err => {
  log("error : redis error " + err);
});

const initJobs = () => {
  getDappyNamesAndSaveToDb(rnodeDeployClient, redisClient);
  setInterval(() => {
    getDappyNamesAndSaveToDb(rnodeDeployClient, redisClient);
  }, process.env.JOBS_INTERVAL);

  setInterval(async () => {
    try {
      await rchainToolkit.grpc.propose({}, rnodeProposeClient);
      log("Successfully created a block");
    } catch (err) {
      log("error : Error when proposing : " + err);
    }
  }, process.env.JOBS_INTERVAL);
};

app.use(bodyParser.json());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/get-records-for-publickey", async (req, res) => {
  if (!req.query.publickey) {
    res.status(400).send("Missing query attribute publickey");
  }
  const keys = await redisSmembers(
    redisClient,
    `public_key:${req.query.publickey}`
  );
  const records = await Promise.all(
    keys.map(k => redisHgetall(redisClient, `name:${k}`))
  );
  res.send(records);
});

app.get("/get-all-records", async (req, res) => {
  const keys = await redisKeys(redisClient, `name:*`);
  const records = await Promise.all(
    keys.map(k => redisHgetall(redisClient, k))
  );
  res.send(records);
});

app.get("/get-record", async (req, res) => {
  if (!req.query.name) {
    res.status(400).send("Missing query attribute name");
  }
  const record = await redisHgetall(redisClient, `name:${req.query.name}`);
  res.send(record);
});

app.get("/info", (req, res) => {
  infoController(req, res);
});
app.post("/get-nodes", (req, res) => {
  getNodesController(req, res, rnodeDeployClient);
});
app.post("/listen-for-data-at-name", (req, res) => {
  listenForDataAtNameController(req, res, rnodeDeployClient);
});
app.post("/preview-private-names", (req, res) => {
  previewPrivateNamesController(req, res, rnodeDeployClient);
});
app.post("/deploy", (req, res) => {
  deployController(req, res, rnodeDeployClient);
});

const loadClient = async () => {
  rnodeDeployClient = await rchainToolkit.grpc.getGrpcDeployClient(
    "localhost:40401",
    grpc,
    protoLoader
  );

  rnodeProposeClient = await rchainToolkit.grpc.getGrpcProposeClient(
    "localhost:40401",
    grpc,
    protoLoader
  );

  protobufsLoaded = true;
  if (appReady) {
    initJobs();
  }
};
loadClient();

app.listen(process.env.NODEJS_PORT, function() {
  log(`dappy-node listening on port ${process.env.NODEJS_PORT}!`);
  log(`RChain node host ${process.env.RNODE_HOST}`);
  log(`RChain node GRPC port ${process.env.RNODE_GRPC_PORT}`);
  log(`RChain node HTTP port ${process.env.RNODE_HTTP_PORT}`);
  http.get(
    `http://${process.env.RNODE_HOST}:${process.env.RNODE_HTTP_PORT}/version`,
    resp => {
      log("RChain node responding\n");
      appReady = true;
      if (protobufsLoaded) {
        initJobs();
      }
    }
  );
});
