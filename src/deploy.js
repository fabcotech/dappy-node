const log = require("../utils").log;
const doDeploy = require("../rchain").doDeploy;

module.exports = function(req, res, rnodeClient) {
  if (req.body.sig && req.body.sig.data) {
    req.body.sig = new Uint8Array(req.body.sig.data);
  }
  if (req.body.deployer && req.body.deployer.data) {
    req.body.deployer = Buffer.from(new Uint8Array(req.body.deployer.data));
  }
  console.log(req.body);
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
