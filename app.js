const { createLogger } = require('./sdk');

// Inisialisasi SDK Logger
const logger = createLogger({
  serviceName: 'e-commerce-api',
  endpoint: 'http://localhost:3000/api/v1/logs/batch',
  batchSize: 5,             // Flush otomatis setiap 5 log
  flushIntervalMs: 2000     // Atau flush otomatis setiap 2 detik
});

console.log("=== Mengirim Log via Learn-Log SDK (Async Batch Mode) ===");

logger.info("User berhasil login ke sistem", { userId: 42, ip: "192.168.1.10" });
logger.warn("Percobaan login dengan password salah", { userId: 42, attempt: 3 });
logger.error("Gagal terhubung ke Database Payment Gateway", { gateway: "Midtrans", code: "ECONNREFUSED" });
logger.debug("Tracing payload request", { endpoint: "/api/checkout", payloadSize: "1.2KB" });
logger.info("Checkout berhasil diselesaikan", { orderId: "ORD-99201", total: 150000 });

// process menunggu sebentar agar timer flush dapat terfasilitasi secara otomatis
setTimeout(() => {
  console.log("=== Semua Log Berhasil Diproses Tanpa Blocking Event Loop ===");
}, 2500);
