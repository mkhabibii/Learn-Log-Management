/**
   * Express Middleware untuk merekam HTTP request/response secara otomatis
   * @param {Object} logger Instance Logger dari SDK
   */
function expressMiddleware(logger) {
  return function (req, res, next) {
    const start = process.hrtime();

    // Hook ke event finish respon Express
    res.on('finish', () => {
      const diff = process.hrtime(start);
      const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
      const statusCode = res.statusCode;

      let level = 'INFO';
      if (statusCode >= 400 && statusCode < 500) {
        level = 'WARN';
      } else if (statusCode >= 500) {
        level = 'ERROR';
      }

      const logMessage = `HTTP ${req.method} ${req.originalUrl || req.url} ${statusCode} - ${durationMs}ms`;
      const metadata = {
        httpMethod: req.method,
        url: req.originalUrl || req.url,
        statusCode: statusCode,
        durationMs: parseFloat(durationMs),
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent')
      };

      logger.log(level, logMessage, metadata);
    });

    next();
  };
}

module.exports = expressMiddleware;
