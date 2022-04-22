import { NextFunction, Request, Response, Router } from 'express';
import client from 'prom-client';
import { getConfig } from '../config';

export function getMetricsRegistry() {
  const register = new client.Registry();
  client.collectDefaultMetrics({
    prefix: 'dappy_',
    register,
  });
  return register;
}

export const getRequestDurationMetricsMiddleware = (
  registry: client.Registry
) => {
  const httpRequestDurationMicroseconds = new client.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'code'],
    buckets: [0, 100, 300, 500, 1000, 3000, 5000, 10000],
  });
  registry.registerMetric(httpRequestDurationMicroseconds);

  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const responseTimeInMs = Date.now() - start;

      httpRequestDurationMicroseconds
        .labels(req.method, req.path, res.statusCode.toString())
        .observe(responseTimeInMs);
    });

    next();
  };
};

export const initMetrics = (app: Router) => {
  const config = getConfig();

  if (config.dappyNodeEnableRequestMetrics) {
    const registry = getMetricsRegistry();
    app.get('/metrics', async (req: Request, res: Response) => {
      res.setHeader('Content-Type', registry.contentType);
      res.send(await registry.metrics());
    });

    app.use(getRequestDurationMetricsMiddleware(registry));
  }
};
