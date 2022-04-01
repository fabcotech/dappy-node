const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');
const { getConfig } = require('../config');

function initSentry(app) {
  const config = getConfig();
  if (config.dappyNodeSentryUrl) {
    Sentry.init({
      dsn: config.dappyNodeSentryUrl,
      integrations: [
        // enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // enable Express.js middleware tracing
        new Tracing.Integrations.Express({ app }),
      ],

      // Set tracesSampleRate to 1.0 to capture 100%
      // of transactions for performance monitoring.
      // We recommend adjusting this value in production
      tracesSampleRate: 1.0,
    });
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
    app.use(Sentry.Handlers.errorHandler());
  }
}

module.exports = {
  initSentry,
};
