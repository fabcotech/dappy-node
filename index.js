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

const { getNodesWsHandler } = require("./src/get-nodes");
const { previewPrivateNamesWsHandler } = require("./src/preview-private-names");
const {
  listenForDataAtNameWsHandler
} = require("./src/listen-for-data-at-name");
const {
  listenForDataAtNameXWsHandler
} = require("./src/listen-for-data-at-name-x");
const { deployWsHandler } = require("./src/deploy");

const { getDappyNamesAndSaveToDb } = require("./names");

const log = require("./utils").log;
const redisSmembers = require("./utils").redisSmembers;
const redisHgetall = require("./utils").redisHgetall;
const redisKeys = require("./utils").redisKeys;

if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
  require("dotenv").config();
}

const DAPPY_NODE_VERSION = "0.1.5";

let rnodeVersion = undefined;
let protobufsLoaded = false;
let appReady = false;
let rnodeDeployClient = undefined;
let rnodeProposeClient = undefined;
let deploysAwaiting = false;

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
      if (deploysAwaiting) {
        await rchainToolkit.grpc.propose({}, rnodeProposeClient);
        deploysAwaiting = false;
        log("Successfully created a block");
      }
    } catch (err) {
      log("error : Error when proposing : " + err);
    }
  }, process.env.JOBS_INTERVAL);
};

/* app.get("/get-records-for-publickey", async (req, res) => {
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
}); */

const getAllRecordsWsHandler = async () => {
  try {
    const keys = await redisKeys(redisClient, `name:*`);
    const records = await Promise.all(
      keys.map(k => redisHgetall(redisClient, k))
    );
    return records;
  } catch (err) {
    return {
      success: false,
      error: { message: err }
    };
  }
};

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

const loadClient = async () => {
  rnodeDeployClient = await rchainToolkit.grpc.getGrpcDeployClient(
    `${process.env.RNODE_HOST}:${process.env.RNODE_GRPC_PORT}`,
    grpc,
    protoLoader
  );

  rnodeProposeClient = await rchainToolkit.grpc.getGrpcProposeClient(
    `${process.env.RNODE_HOST}:${process.env.RNODE_GRPC_PORT}`,
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
        dappy_node_version: DAPPY_NODE_VERSION,
        rnode_version: rnodeVersion,
        rchain_names_unforgeable_name:
          process.env.RCHAIN_NAMES_UNFORGEABLE_NAME_ID,
        rchain_names_registry_uri: process.env.RCHAIN_NAMES_REGISTRY_URI
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

    getNodesWsHandler({ network: network }, rnodeDeployClient)
      .then(resp => {
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
      .catch(err => {
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
    key: fs.readFileSync(path.join(__dirname, "server-key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "server-crt.pem"))
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
  maxPayload: 16100
});

serverHttps.listen(process.env.HTTPS_PORT);

ws.on("close", err => {
  log("critical error : websocket connection closed");
  log(err);
});

ws.on("error", err => {
  log("critical error : websocket connection error");
  log(err);
});

log(`RChain node GRPC port ${process.env.RNODE_GRPC_PORT}`);
log(`RChain node HTTP port ${process.env.RNODE_HTTP_PORT}`);
http.get(
  `http://${process.env.RNODE_HOST}:${process.env.RNODE_HTTP_PORT}/version`,
  resp => {
    log(`RChain node responding at ${process.env.RNODE_HOST}`);

    if (resp.statusCode !== 200) {
      process.exit();
      return;
    }

    resp.setEncoding("utf8");
    let rawData = "";
    resp.on("data", chunk => {
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

    resp.on("error", err => {
      log("error: " + err);
      process.exit();
    });
  }
);

const initWs = () => {
  ws.on("connection", client => {
    client.on("message", (a, b) => {
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
                dappy_node_version: DAPPY_NODE_VERSION,
                rnode_version: rnodeVersion,
                rchain_names_unforgeable_name:
                  process.env.RCHAIN_NAMES_UNFORGEABLE_NAME_ID,
                rchain_names_registry_uri: process.env.RCHAIN_NAMES_REGISTRY_URI
              }
            })
          );
          // ======== DEPLOY ========
        } else if (json.type === "deploy") {
          deployWsHandler(json.body, rnodeDeployClient)
            .then(data => {
              deploysAwaiting = true;
              client.send(
                JSON.stringify({
                  ...data,
                  requestId: json.requestId
                })
              );
            })
            .catch(err => {
              log("error : deploy ws handler");
              log(err);
              client.send(
                JSON.stringify({
                  success: false,
                  requestId: json.requestId,
                  error: { message: err.message }
                })
              );
            });
          // ======== LISTEN FOR DATA AT NAME ========
        } else if (json.type === "listen-for-data-at-name") {
          listenForDataAtNameWsHandler(json.body, rnodeDeployClient)
            .then(data => {
              client.send(
                JSON.stringify({
                  ...data,
                  requestId: json.requestId
                })
              );
            })
            .catch(err => {
              log("error : listen-for-data-at-name ws handler");
              log(err);
              client.send(
                JSON.stringify({
                  success: false,
                  requestId: json.requestId,
                  error: { message: err.message }
                })
              );
            });
        } else if (json.type === "listen-for-data-at-name-x") {
          listenForDataAtNameXWsHandler(json.body, rnodeDeployClient)
            .then(data => {
              client.send(
                JSON.stringify({
                  ...data,
                  requestId: json.requestId
                })
              );
            })
            .catch(err => {
              log("error : listen-for-data-at-name-x ws handler");
              log(err);
              client.send(
                JSON.stringify({
                  success: false,
                  requestId: json.requestId,
                  error: { message: err.message }
                })
              );
            });

          // ======== PREVIEW PRIVATE NAMES ========
        } else if (json.type === "preview-private-names") {
          previewPrivateNamesWsHandler(json.body, rnodeDeployClient)
            .then(data => {
              client.send(
                JSON.stringify({
                  ...data,
                  requestId: json.requestId
                })
              );
            })
            .catch(err => {
              log("error : preview-private-names ws handler");
              log(err);
              client.send(
                JSON.stringify({
                  ...err,
                  requestId: json.requestId
                })
              );
            });

          // ======== GET ALL RECORDS ========
        } else if (json.type === "get-all-records") {
          getAllRecordsWsHandler()
            .then(data => {
              client.send(
                JSON.stringify({
                  success: true,
                  requestId: json.requestId,
                  data: JSON.stringify(data)
                })
              );
            })
            .catch(err => {
              log("error : get-all-records ws handler");
              log(err);
              client.send(
                JSON.stringify({
                  ...err,
                  requestId: json.requestId
                })
              );
            });

          // ======== GET NODES ========
        } else if (json.type === "get-nodes") {
          getNodesWsHandler(json.body, rnodeDeployClient)
            .then(data => {
              client.send(
                JSON.stringify({
                  ...data,
                  requestId: json.requestId
                })
              );
            })
            .catch(err => {
              log("error : get-nodes ws handler");
              log(err);
              err.requestId = json.requestId;
              client.send(
                JSON.stringify({
                  ...err,
                  requestId: json.requestId
                })
              );
            });
        } else {
          client.send(
            JSON.stringify({
              success: false,
              requestId: json.requestId,
              error: { message: "Unknown request" }
            })
          );
        }
      } catch (err) {
        console.log(err);
        client.send({
          success: false,
          error: { message: "Unable to parse request" }
        });
      }
    });

    client.on("close", (a, b) => {
      client.terminate();
    });

    client.on("error", err => {
      client.send({
        type: "websocket-error",
        error: a
      });
    });
  });
};
