const rchainToolkit = require("rchain-toolkit");

module.exports = async function(req, res, rnodeClient) {
  if (req.body.sig && req.body.sig.data) {
    req.body.sig = new Uint8Array(req.body.sig.data);
  }
  if (req.body.deployer && req.body.deployer.data) {
    req.body.deployer = Buffer.from(new Uint8Array(req.body.deployer.data));
  }
  console.log(req.body);
  try {
    const either = await rchainToolkit.grpc.doDeployRaw(req.body, rnodeClient);
    if (either.success) {
      res.json(either);
    } else {
      res.status(400).json(either);
    }
  } catch (err) {
    res.status(400).json(err.message);
  }
};
