const crypto = require('crypto');
const os = require('os');

class Logger {
  /**
   * @param {Object} options
   * @param {string} options.serviceName Nama service/aplikasi contoh 'auth-service'
   * @param {number} [options.batchSize=10] Batas maksimum log di buffer sebelum diflush otomatis
   * @param {number} [options.flushIntervalMs=2000] Interval waktu (ms) untuk memicu flush otomatis
   * @param {Array<Object>} [options.transports=[]] Daftar transport ConsoleTransport, HttpTransport dll
   */
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'default-service';
    this.batchSize = options.batchSize || 10;
    this.flushIntervalMs = options.flushIntervalMs || 2000;
    this.transports = options.transports || [];

    // Internal In-Memory Buffer
    this.buffer = [];

    // System Context Meta
    this.hostname = os.hostname();
    this.pid = process.pid;

    // Start periodic flush timer
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);

    // Prevent timer from keeping Node.js process alive on exit
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  /**
   * Menambahkan transport baru ke logger
   */
  addTransport(transport) {
    this.transports.push(transport);
  }

  /**
   * Fungsi internal untuk membentuk objek log terstruktur
   */
  _createLogEntry(level, message, metadata = {}) {
    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: this.serviceName,
      message: typeof message === 'object' ? JSON.stringify(message) : String(message),
      metadata: metadata,
      hostname: this.hostname,
      pid: this.pid
    };
  }

  /**
   * Method utama memasukkan log ke dalam buffer
   */
  log(level, message, metadata = {}) {
    const entry = this._createLogEntry(level, message, metadata);
    this.buffer.push(entry);

    // Jika jumlah log di buffer sudah mencapai batchSize, trigger flush langsung
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  info(message, metadata) {
    this.log('INFO', message, metadata);
  }

  warn(message, metadata) {
    this.log('WARN', message, metadata);
  }

  error(message, metadata) {
    this.log('ERROR', message, metadata);
  }

  debug(message, metadata) {
    this.log('DEBUG', message, metadata);
  }

  /**
   * Mengosongkan buffer dan mengirimkan array log ke semua Transport secara async
   */
  async flush() {
    if (this.buffer.length === 0) return;

    // Ambil data log yang ada saat ini dan kosongkan buffer (Atomic drain)
    const logsToSend = this.buffer.splice(0, this.buffer.length);

    // Kirim log ke semua Transport terdaftar
    for (const transport of this.transports) {
      try {
        await transport.send(logsToSend);
      } catch (err) {
        // FAIL-SAFE, Jika transport gagal, logger tidak boleh meng-crash aplikasi utama
        console.error(`[Learn-Log SDK] Transport Error (${transport.name || 'Unknown'}):`, err.message);
      }
    }
  }
}

module.exports = Logger;
