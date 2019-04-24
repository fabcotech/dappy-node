const log = require("../utils").log;
const doDeploy = require("../rchain").doDeploy;

module.exports = function(req, res, rnodeClient) {
  doDeploy(req.body, rnodeClient)
    .then(resp => {
      if (resp.success) {
        res.json(resp);
      } else {
        res.status(400).json(resp);
      }
    })
    .catch(err => {
      log("error : communication error with the node (GRPC endpoint)");
      res.status(400).json(err);
    });
};
