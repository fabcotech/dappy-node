const rchainToolkit = require("rchain-toolkit");

const log = require("../utils").log;

module.exports.deployWsHandler = (body, rnodeClient) => {
  log("deploy");

  return new Promise(async (resolve, reject) => {
    if (body.sig && body.sig.data) {
      body.sig = new Uint8Array(body.sig.data);
    }
    if (body.deployer && body.deployer.data) {
      body.deployer = Buffer.from(new Uint8Array(body.deployer.data));
    }

    try {
      const either = await rchainToolkit.grpc.doDeployRaw(body, rnodeClient);
      if (either.success) {
        resolve({
          success: true,
          data: either
        });
      } else {
        resolve({
          success: false,
          error: { message: either.error.messages }
        });
      }
    } catch (err) {
      log("error : communication error with the node (GRPC endpoint)");
      log(err);
      reject(err.message);
    }
  });
};
