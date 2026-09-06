const http = require('http');
const https = require('https');
const { URL } = require('url');

class HttpTransport {
  /**
   * @param {Object} options
   * @param {string} options.endpoint URL endpoint server log
   * @param {string} [options.apiKey] API Key untuk otentikasi
   * @param {number} [options.timeout=5000] Timeout request HTTP (ms)
   */
  constructor(options = {}) {
    this.name = 'HttpTransport';
    this.endpoint = options.endpoint || 'http://localhost:3000/api/v1/logs/batch';
    this.apiKey = options.apiKey || null;
    this.timeout = options.timeout || 5000;
  }

  /**
   * Mengirimkan batch array log ke Ingestion Server via HTTP POST
   */
  send(logs) {
    return new Promise((resolve, reject) => {
      if (!logs || logs.length === 0) return resolve();

      const url = new URL(this.endpoint);
      const payload = JSON.stringify({ logs });
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      };

      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }

      const reqOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: headers,
        timeout: this.timeout
      };

      const req = client.request(reqOptions, (res) => {
        let responseBody = '';
        res.on('data', chunk => { responseBody += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`Server merespons status HTTP ${res.statusCode}: ${responseBody}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`HTTP Transport request timeout setelah ${this.timeout}ms`));
      });

      req.write(payload);
      req.end();
    });
  }
}

module.exports = HttpTransport;
