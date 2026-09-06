const Logger = require('./Logger');
const ConsoleTransport = require('./transports/ConsoleTransport');
const HttpTransport = require('./transports/HttpTransport');
const expressMiddleware = require('./middleware/express');

/**
 * Factory function ringkas untuk membuat instance Logger dengan default transport
 */
function createLogger(options = {}) {
  const transports = options.transports || [];

  // Jika tidak ada transport khusus, tambahkan ConsoleTransport & HttpTransport secara default
  if (transports.length === 0) {
    if (options.enableConsole !== false) {
      transports.push(new ConsoleTransport());
    }

    if (options.endpoint) {
      transports.push(new HttpTransport({
        endpoint: options.endpoint,
        apiKey: options.apiKey
      }));
    }
  }

  return new Logger({
    serviceName: options.serviceName || 'my-app',
    batchSize: options.batchSize || 10,
    flushIntervalMs: options.flushIntervalMs || 2000,
    transports: transports
  });
}

module.exports = {
  createLogger,
  Logger,
  ConsoleTransport,
  HttpTransport,
  expressMiddleware
};
