const http = require("http");

const log = require("../utils").log;

module.exports = function(req, res) {
  http.get(
    `http://${process.env.RNODE_HOST}:${process.env.RNODE_HTTP_PORT}/version`,
    resp => {
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
        res.append("Content-Type", "application/json; charset=UTF-8");
        res.json({
          dappy_node_version: "0.1.0",
          rnode_version: rawData,
          rchain_names_unforgeable_name:
            process.env.RCHAIN_NAMES_UNFORGEABLE_NAME_ID,
          rchain_names_registry_uri: process.env.RCHAIN_NAMES_REGISTRY_URI
        });
        return;
      });

      resp.on("error", err => {
        log("error: " + err);
        res.status(404).json("Error");
      });
    }
  );
};
