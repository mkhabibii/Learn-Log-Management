const fs = require('fs');
const path = require('path');
const db = require("./db");

const RETENTION_DAYS = process.env.RETENTION_DAYS ? parseInt(process.env.RETENTION_DAYS) : 30;
const BATCH_SIZE = 1000; // Proses retensi secara bertahap (chunking 1000 item)
const archiveDir = path.join(__dirname, "archive");

async function runRetention() {
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  console.log(`[Retention Worker] Memulai proses retensi data log lebih tua dari ${RETENTION_DAYS} hari...`);

  let totalArchived = 0;
  const archiveFileName = `archive-${new Date().toISOString().split("T")[0]}.json`;
  const archiveFilePath = path.join(archiveDir, archiveFileName);

  // Buffer penampung sementara
  let archivedLogs = [];
  if (fs.existsSync(archiveFilePath)) {
    try {
      const raw = fs.readFileSync(archiveFilePath, 'utf-8');
      archivedLogs = JSON.parse(raw);
    } catch (e) {
      archivedLogs = [];
    }
  }

  while (true) {
    // Ambil log tua secara chunked (maks 1000 item per iterasi)
    let querySql = `SELECT * FROM logs WHERE timestamp < NOW() - INTERVAL ? DAY LIMIT ?`;
    if (db.driver === 'sqlite') {
      querySql = `SELECT * FROM logs WHERE timestamp < datetime('now', '-' || ? || ' day') LIMIT ?`;
    }

    const [oldLogs] = await db.query(querySql, [RETENTION_DAYS, BATCH_SIZE]);

    if (!oldLogs || oldLogs.length === 0) {
      break;
    }

    // Masukkan ke array penampung arsip
    archivedLogs = archivedLogs.concat(oldLogs);
    totalArchived += oldLogs.length;

    // Hapus chunk log dari database
    const idsToDelete = oldLogs.map(log => log.id);
    if (db.driver === 'sqlite') {
      const placeholders = idsToDelete.map(() => '?').join(',');
      await db.query(`DELETE FROM logs WHERE id IN (${placeholders})`, idsToDelete);
    } else {
      await db.query(`DELETE FROM logs WHERE id IN (?)`, [idsToDelete]);
    }

    console.log(`[Retention Worker] ${oldLogs.length} log berhasil dipindahkan ke arsip...`);
  }

  if (totalArchived > 0) {
    fs.writeFileSync(archiveFilePath, JSON.stringify(archivedLogs, null, 2));
    console.log(`[Retention Worker] Selesai: Total ${totalArchived} log diarsipkan ke ${archiveFileName}`);
  } else {
    console.log(`[Retention Worker] Tidak ada log tua yang perlu di-retensi.`);
  }

  return totalArchived;
}

module.exports = runRetention;

if (require.main === module) {
  runRetention()
    .then((count) => {
      console.log(`[Retention Worker] Selesai memproses ${count} log.`);
      process.exit(0);
    })
    .catch(err => {
      console.error("[Retention Worker] Error:", err);
      process.exit(1);
    });
}