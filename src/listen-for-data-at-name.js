const log = require("../utils").log;

const parseEitherListeningNameData = require("../rchain")
  .parseEitherListeningNameData;
const listenForDataAtName = require("../rchain").listenForDataAtName;
const getValueFromBlocks = require("../rchain").getValueFromBlocks;

module.exports = function(req, res, rnodeClient) {
  listenForDataAtName(req.body, rnodeClient)
    .then(either => {
      let blocks;
      try {
        blocks = parseEitherListeningNameData(either);
      } catch (err) {
        res.status(400).json(err.message);
        return;
      }
      getValueFromBlocks(blocks)
        .then(data => {
          res.append("Content-Type", "text/plain; charset=UTF-8");
          res.send(data);
        })
        .catch(err => {
          res.status(404).json(err.message);
        });
    })
    .catch(err => {
      log("error : communication error with the node (GRPC endpoint)");
      log(err);
      res.status(400).json(err.message);
    });
};
