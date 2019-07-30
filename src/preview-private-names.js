const rchainToolkit = require("rchain-toolkit");

module.exports = async function(req, res, rnodeClient) {
  log("preview-private-name");
  if (req.body.user && req.body.user.data) {
    req.body.user = Buffer.from(new Uint8Array(req.body.user.data));
  }

  try {
    privateNames = await rchainToolkit.grpc.previewPrivateNames(
      req.body,
      rnodeClient
    );
    res.append("Content-Type", "text/plain; charset=UTF-8");
    res.send({
      ids: privateNames.ids.map(id => Array.from(new Uint8Array(id)))
    });
  } catch (err) {
    log("error : communication error with the node (GRPC endpoint)");
    log(err);
    res.status(400).json(err.message);
  }
};
