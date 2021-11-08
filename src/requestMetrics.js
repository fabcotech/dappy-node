const fs = require('fs');

let requestMetrics; 

function resetRequestMetrics() {
  return { 
    total: 0, 
    ...Object.fromEntries([
      '/get-all-records',
      '/get-x-records',
      '/get-x-records-by-public-key',
      '/ping',
      '/info',
      '/last-finalized-block-number',
      '/api/deploy',
      '/api/prepare-deploy',
      '/api/explore-deploy',
      '/api/explore-deploy-from-cache',
      '/explore-deploy-x',
      '/explore-deploy-x-from-cache',
      '/api/listen-for-data-at-name',
      '/listen-for-data-at-name-x',
      '/api/get-contract-logs',
    ].map(r => [r, 0]))
  };
}

function initRequestMetrics() {
  requestMetrics = resetRequestMetrics();

  setInterval(() => {
    let day = new Date().toISOString().slice(0, 10);
    let logs = {};
    try {
      logs = JSON.parse(fs.readFileSync(`./logs/dappy-node-${day}.json`, 'utf8'));
    } catch (err) {}
    logs[new Date().toISOString().slice(11, 19)] = Object.values(requestMetrics);
    fs.writeFileSync(
      `./logs/dappy-node-${day}.json`,
      JSON.stringify(logs),
      'utf8'
    );
  
    requestMetrics = resetRequestMetrics();
  }, 30000);
}

const incRequestMetric = (reqPath) => {
  if (!reqPath in requestMetrics) return;
  
  requestMetrics.total += 1;
  requestMetrics[reqPath] += 1;
}

function incRequestMetricsMiddleware(req, _, next) {
  incRequestMetric(req.baseUrl + req.path);
  next();
};

module.exports = {
  initRequestMetrics,
  incRequestMetricsMiddleware,
  incRequestMetric,
}