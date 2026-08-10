const fs = require('fs')
const path = require('path')

const logDir = path.join(__dirname, 'logs');
const logFile = path.join(logDir, 'app.log')

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

function log(level, message) {
  const entry = {
    timestamp : new Date().toISOString(),
    level: level,
    service: "my-app",
    message: message
  };
  
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(logFile, line);
}

function info(message) {
  log("INFO", message);
}

function warn(message) {
  log("WARN", message);
}

function error(message) {
  log("ERROR", message);
}

module.exports = { info, warn, error};


