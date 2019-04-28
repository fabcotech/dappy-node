const log = require("../utils").log;
const parseEitherPrivateNamePreview = require("../rchain")
  .parseEitherPrivateNamePreview;
const previewPrivateNames = require("../rchain").previewPrivateNames;

module.exports = function(req, res, rnodeClient) {
  previewPrivateNames(req.body, rnodeClient)
    .then(either => {
      let privateNames;
      try {
        privateNames = parseEitherPrivateNamePreview(either);
      } catch (err) {
        res.status(400).json(err.message);
        return;
      }

      res.append("Content-Type", "text/plain; charset=UTF-8");
      res.send(privateNames);
    })
    .catch(err => {
      log("error : communication error with the node (GRPC endpoint)");
      log(err);
      res.status(400).json(err.message);
    });
};
