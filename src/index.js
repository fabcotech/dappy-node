const WebSocket = require("ws");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const http = require("http");
const https = require("https");
const redis = require("redis");
const path = require("path");
const fs = require("fs");

// will not override the env variables in docker-compose
require("dotenv").config();

const rchainToolkit = require("rchain-toolkit");

const { getNodesWsHandler } = require("./get-nodes");
const { previewPrivateNamesWsHandler } = require("./preview-private-names");
const { listenForDataAtNameWsHandler } = require("./listen-for-data-at-name");
const {
  listenForDataAtNameXWsHandler,
} = require("./listen-for-data-at-name-x");
const { deployWsHandler } = require("./deploy");
const { exploreDeployWsHandler } = require("./explore-deploy");
const { exploreDeployXWsHandler } = require("./explore-deploy-x");
const { prepareDeployWsHandler } = require("./prepare-deploy");
const { getAllRecordsWsHandler } = require("./get-all-records");
const { getOneRecordWsHandler } = require("./get-one-record");
const { getDappyRecordsAndSaveToDb } = require("./jobs/records");
const { getLastFinalizedBlockNumber } = require("./jobs/last-block");

const log = require("./utils").log;
const redisHgetall = require("./utils").redisHgetall;
const redisKeys = require("./utils").redisKeys;

if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
  require("dotenv").config();
}

const DAPPY_NODE_VERSION = "0.2.1";

let rnodeVersion = undefined;
let lastFinalizedBlockNumber = undefined;
let namePrice = undefined;

let protobufsLoaded = false;
let appReady = false;
let rnodeProposeClient = undefined;
let deploysAwaiting = false;

const redisClient = redis.createClient({
  db: 1,
  host: process.env.REDIS_HOST,
});

redisClient.on("error", (err) => {
  log("error : redis error " + err);
});

let recordsJobRunning = false;
const runRecordsChildProcessJob = async () => {
  if (recordsJobRunning) {
    return;
  }
  recordsJobRunning = true;
  await getDappyRecordsAndSaveToDb();
  recordsJobRunning = false;
};

const initJobs = () => {
  runRecordsChildProcessJob();
  getLastFinalizedBlockNumber(httpUrlReadOnly)
    .then((a) => {
      lastFinalizedBlockNumber = a.lastFinalizedBlockNumber;
      namePrice = a.namePrice;
    })
    .catch((err) => {
      log("failed to get last finalized block height");
      console.log(err);
    });
  setInterval(() => {
    runRecordsChildProcessJob();
  }, process.env.NAMES_JOB_INTERVAL);
  setInterval(() => {
    getLastFinalizedBlockNumber(httpUrlReadOnly)
      .then((a) => {
        lastFinalizedBlockNumber = a.lastFinalizedBlockNumber;
        namePrice = a.namePrice;
      })
      .catch((err) => {
        log("failed to get last finalized block height");
        console.log(err);
      });
  }, process.env.LAST_BLOCK_JOB_INTERVAL);

  if (process.env.RNODE_HOST === process.env.RNODE_DEPLOY_HOST) {
    setInterval(async () => {
      try {
        if (deploysAwaiting) {
          await rchainToolkit.grpc.propose({}, rnodeProposeClient);
          deploysAwaiting = false;
          log("Successfully created a block");
        }
      } catch (err) {
        log("error : Error when proposing : " + err);
      }
    }, process.env.JOBS_INTERVAL);
  }
};

/* app.get("/get-records-for-publickey", async (req, res) => {
  if (!req.query.publickey) {
    res.status(400).send("Missing query attribute publickey");
  }
  const keys = await redisSmembers(
    redisClient,
    `publicKey:${req.query.publickey}`
  );
  const records = await Promise.all(
    keys.map(k => redisHgetall(redisClient, `name:${k}`))
  );
  res.send(records);
}); */

/* app.get("/get-all-records", async (req, res) => {
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
 */

if (
  !process.env.READ_ONLY_HOST.startsWith("https://") &&
  !process.env.READ_ONLY_HOST.startsWith("http://")
) {
  log("READ_ONLY_HOST must start with http:// or https://", "error");
  process.exit();
}
if (
  !process.env.VALIDATOR_HOST.startsWith("https://") &&
  !process.env.VALIDATOR_HOST.startsWith("http://")
) {
  log("VALIDATOR_HOST must start with http:// or https://", "error");
  process.exit();
}
log("host (read-only):                   " + process.env.READ_ONLY_HOST);
log("host (read-only) HTTP port:         " + process.env.READ_ONLY_HTTP_PORT);
log("host (validator):                   " + process.env.VALIDATOR_HOST);
log("host (validator) HTTP port:         " + process.env.VALIDATOR_HTTP_PORT);
log(
  "host (validator) GRPC propose port: " +
    process.env.VALIDATOR_GRPC_PROPOSE_PORT
);

let httpUrlReadOnly = `${process.env.READ_ONLY_HOST}:${process.env.READ_ONLY_HTTP_PORT}`;
if (!process.env.READ_ONLY_HTTP_PORT) {
  httpUrlReadOnly = process.env.READ_ONLY_HOST;
}
let httpUrlValidator = `${process.env.VALIDATOR_HOST}:${process.env.VALIDATOR_HTTP_PORT}`;
if (!process.env.VALIDATOR_HTTP_PORT) {
  httpUrlValidator = process.env.VALIDATOR_HOST;
}
const grpcUrlValidator = `${process.env.VALIDATOR_HOST}:${process.env.VALIDATOR_GRPC_PROPOSE_PORT}`;

const loadClient = async () => {
  rnodeProposeClient = await rchainToolkit.grpc.getGrpcProposeClient(
    grpcUrlValidator,
    grpc,
    protoLoader
  );

  protobufsLoaded = true;
  if (appReady) {
    initJobs();
    initWs();
  }
};
loadClient();

// HTTP endpoint

log(
  `Listening for HTTP traffic on address ${process.env.HTTP_HOST}:${process.env.HTTP_PORT} !`
);

const serverHttp = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/info") {
    res.setHeader("Content-Type", "application/json");
    res.write(
      JSON.stringify({
        dappyNodeVersion: DAPPY_NODE_VERSION,
        lastFinalizedBlockNumber: lastFinalizedBlockNumber,
        rnodeVersion: rnodeVersion,
        rchainNamesRegistryUri: process.env.RCHAIN_NAMES_REGISTRY_URI,
        rchainNetwork: process.env.RCHAIN_NETWORK,
        namePrice: namePrice,
      })
    );
    res.end();
  } else if (req.method === "GET" && req.url.startsWith("/get-nodes")) {
    const io = req.url.indexOf("?network=");

    if (io === -1) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain");
      res.end('Bad Request please provide "network" url parameter');
      return;
    }
    const network = req.url.substr(io + 9, 1000);

    getNodesWsHandler({ network: network }, httpUrlReadOnly)
      .then((resp) => {
        if (resp.success) {
          res.setHeader("Content-Type", "application/json");
          res.write(JSON.stringify(resp));
          res.end();
        } else {
          res.statusCode = 404;
          res.setHeader("Content-Type", "text/plain");
          res.end(resp.error.message);
          return;
        }
      })
      .catch((err) => {
        console.log(err);
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain");
        res.end(err);
      });
  }
});

serverHttp.listen(process.env.HTTP_PORT);

// SSL endpoint

let serverHttps;

if (process.argv.includes("--ssl")) {
  log(
    `Listening for SSL/websocket on address ${process.env.HTTP_HOST}:${process.env.HTTPS_PORT} ! (SSL handled by nodeJS)`
  );
  const options = {
    key: fs.readFileSync(path.join(__dirname, "../server-key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "../server-crt.pem")),
  };
  serverHttps = https.createServer(options);
} else {
  log(
    `Listening for websocket on address ${process.env.HTTP_HOST}:${process.env.HTTPS_PORT} ! (SSL not handled by nodeJS)`
  );
  serverHttps = http.createServer();
}

const ws = new WebSocket.Server({
  server: serverHttps,
  backlog: 1000,
  maxPayload: 256100,
});

serverHttps.listen(process.env.HTTPS_PORT);

ws.on("close", (err) => {
  log("critical error : websocket connection closed");
  log(err);
});

ws.on("error", (err) => {
  log("critical error : websocket connection error");
  log(err);
});
console.log("");

(httpUrlReadOnly.startsWith("https://") ? https : http).get(
  `${httpUrlReadOnly}/version`,
  (resp) => {
    log(`RChain node responding at ${httpUrlReadOnly}/version`);

    if (resp.statusCode !== 200) {
      log("Status code different from 200", "error");
      console.log(resp.statusCode);
      process.exit();
    }

    resp.setEncoding("utf8");
    let rawData = "";
    resp.on("data", (chunk) => {
      rawData += chunk;
    });

    resp.on("end", () => {
      log(`${rawData}\n`);
      rnodeVersion = rawData;
      appReady = true;
      if (protobufsLoaded) {
        initJobs();
        initWs();
      }
      return;
    });

    resp.on("error", (err) => {
      log("error: " + err);
      process.exit();
    });
  }
);

const initWs = () => {
  ws.on("connection", (client) => {
    client.on("message", async (a, b) => {
      try {
        const json = JSON.parse(a);
        //
        // =====================================
        // ======== WEBSOCKET ENDPOINTS ========
        // =====================================
        //
        // ======== INFO ========
        if (json.type === "info") {
          client.send(
            JSON.stringify({
              success: true,
              requestId: json.requestId,
              data: {
                dappyNodeVersion: DAPPY_NODE_VERSION,
                lastFinalizedBlockNumber: lastFinalizedBlockNumber,
                rnodeVersion: rnodeVersion,
                rchainNamesRegistryUri: process.env.RCHAIN_NAMES_REGISTRY_URI,
                rchainNetwork: process.env.RCHAIN_NETWORK,
                namePrice: namePrice,
              },
            })
          );
          // ======== PING/PONG ========
        } else if (json.type === "ping") {
          client.send(
            JSON.stringify({
              success: true,
              requestId: json.requestId,
              data: "pong",
            })
          );
          // ======== DEPLOY ========
        } else if (json.type === "last-finalized-block-number") {
          log("last-finalized-block-number");
          client.send(
            JSON.stringify({
              success: true,
              data: lastFinalizedBlockNumber,
              requestId: json.requestId,
            })
          );
        } else if (json.type === "deploy") {
          try {
            const data = await deployWsHandler(json.body, httpUrlValidator);
            client.send(
              JSON.stringify({
                ...data,
                requestId: json.requestId,
              })
            );
          } catch (err) {
            log("Communication error with the node (GRPC endpoint)", "error");
            console.log(err);
            client.send(
              JSON.stringify({
                success: false,
                requestId: json.requestId,
                error: { message: err.message || err },
              })
            );
          }

          // ======== PREPARE DEPLOY ========
        } else if (json.type === "prepare-deploy") {
          try {
            const data = await prepareDeployWsHandler(
              json.body,
              httpUrlReadOnly
            );

            client.send(
              JSON.stringify({
                ...data,
                requestId: json.requestId,
              })
            );
          } catch (err) {
            log("error : prepare deploy ws handler", "error");
            console.log(err);
            client.send(
              JSON.stringify({
                success: false,
                requestId: json.requestId,
                error: { message: err.message },
              })
            );
          }
          // ======== EXPLORE DEPLOY ========
        } else if (json.type === "explore-deploy") {
          try {
            const data = await exploreDeployWsHandler(
              json.body,
              httpUrlReadOnly
            );
            client.send(
              JSON.stringify({
                ...data,
                requestId: json.requestId,
              })
            );
          } catch (err) {
            log("error : explore deploy ws handler", "error");
            console.log(err);
            client.send(
              JSON.stringify({
                success: false,
                requestId: json.requestId,
                error: { message: err.message },
              })
            );
          }
          // ======== EXPLORE DEPLOY X ========
        } else if (json.type === "explore-deploy-x") {
          try {
            const data = await exploreDeployXWsHandler(
              json.body,
              httpUrlReadOnly
            );
            client.send(
              JSON.stringify({
                ...data,
                requestId: json.requestId,
              })
            );
          } catch (err) {
            log("error : explore deploy x ws handler", "error");
            console.log(err);
            client.send(
              JSON.stringify({
                success: false,
                requestId: json.requestId,
                error: { message: err.message },
              })
            );
          }
          // ======== LISTEN FOR DATA AT NAME ========
        } else if (json.type === "listen-for-data-at-name") {
          try {
            const data = await listenForDataAtNameWsHandler(
              json.body,
              httpUrlReadOnly
            );

            client.send(
              JSON.stringify({
                ...data,
                requestId: json.requestId,
              })
            );
          } catch (err) {
            log("error : listen-for-data-at-name ws handler", "error");
            console.log(err);
            client.send(
              JSON.stringify({
                success: false,
                requestId: json.requestId,
                error: { message: err.message },
              })
            );
          }
        } else if (json.type === "listen-for-data-at-name-x") {
          listenForDataAtNameXWsHandler(json.body, httpUrlReadOnly)
            .then((data) => {
              client.send(
                JSON.stringify({
                  ...data,
                  requestId: json.requestId,
                })
              );
            })
            .catch((err) => {
              log("error : listen-for-data-at-name-x ws handler", "error");
              console.log(err);
              client.send(
                JSON.stringify({
                  success: false,
                  requestId: json.requestId,
                  error: { message: err.message },
                })
              );
            });
          // ======== GET ALL RECORDS ========
        } else if (json.type === "get-all-records") {
          getAllRecordsWsHandler(redisClient)
            .then((data) => {
              client.send(
                JSON.stringify({
                  success: true,
                  requestId: json.requestId,
                  data: JSON.stringify(data),
                })
              );
            })
            .catch((err) => {
              log("error : get-all-records ws handler", "error");
              console.log(err);
              client.send(
                JSON.stringify({
                  ...err,
                  requestId: json.requestId,
                })
              );
            });
          // ======== GET ONE RECORD ========
        } else if (json.type === "get-one-record") {
          getOneRecordWsHandler(json.body, redisClient)
            .then((data) => {
              client.send(
                JSON.stringify({
                  success: true,
                  requestId: json.requestId,
                  data: JSON.stringify(data),
                })
              );
            })
            .catch((err) => {
              log("error : get-one-record ws handler", "error");
              console.log(err);
              client.send(
                JSON.stringify({
                  ...err,
                  requestId: json.requestId,
                })
              );
            });
          // ======== GET NODES ========
        } else if (json.type === "get-nodes") {
          getNodesWsHandler(json.body, httpUrlReadOnly)
            .then((data) => {
              client.send(
                JSON.stringify({
                  ...data,
                  requestId: json.requestId,
                })
              );
            })
            .catch((err) => {
              log("error : get-nodes ws handler", "error");
              console.log(err);
              err.requestId = json.requestId;
              client.send(
                JSON.stringify({
                  ...err,
                  requestId: json.requestId,
                })
              );
            });
        } else {
          client.send(
            JSON.stringify({
              success: false,
              requestId: json.requestId,
              error: { message: "Unknown request" },
            })
          );
        }
      } catch (err) {
        console.log(err);
        client.send(
          JSON.stringify({
            success: false,
            error: { message: "Unable to parse request" },
          })
        );
      }
    });

    client.on("close", (a, b) => {
      client.terminate();
    });

    client.on("error", (err) => {
      console.log(err);
      client.send({
        type: "websocket-error",
        error: err,
      });
    });
  });
};
