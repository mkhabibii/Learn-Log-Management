class ConsoleTransport {
  constructor(options = {}) {
    this.name = "ConsoleTransport";
    this.useColors = options.useColors !== false;
  }

  send(logs) {
    const colors = {
      INFO: "\x1b[36m", // Cyan
      WARN: "\x1b[33m", // Yellow
      ERROR: "\x1b[31m", // Red
      DEBUG: "\x1b[90m", // Gray
      RESET: "\x1b[0m",
    };

    for (const log of logs) {
      const color = this.useColors ? colors[log.level] || colors.RESET : "";
      const reset = this.useColors ? colors.RESET : "";
      const meta =
        Object.keys(log.metadata).length > 0
          ? JSON.stringify(log.metadata)
          : "";

      console.log(
        `[${log.timestamp}] ${color}[${log.level}]${reset} (${log.service}): ${log.message} ${meta}`,
      );
    }
  }
}

module.exports = ConsoleTransport;
