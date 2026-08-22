const fs = require('fs')
const path = require('path')
const pool = require("./db")

const RETENTION_DAYS = 30
const archiveDir = path.join(__dirname, "archive")

async function runRetention() {
  if ( !fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir)
  }

  const [oldLogs] = await pool.query(`
    SELECT * FROM logs WHERE timestamp < NOW() - INTERVAL ? DAY`, [RETENTION_DAYS])
  
  if (oldLogs.length === 0) {
    console.log("Tidak ada log yang perlu di retensi")
    return
  }

  const archiveFileName = `archive-${new Date().toISOString().split("T")[0]}.json`
  const archiveFilePath = path.join(archiveDir, archiveFileName)

  fs.writeFileSync(archiveFilePath, JSON.stringify(oldLogs, null, 2))
  console.log(`${oldLogs.length} log diarsipkan ke ${archiveFileName}`)

  const idsToDelete = oldLogs.map(log => log.id)
  await pool.query(`DELETE FROM logs WHERE id IN (?)`, [idsToDelete])

  console.log(`${idsToDelete.length} log dihapus dari database`)

}

module.exports = runRetention

if (require.main === module) {
  runRetention()
  .then(() => {
    console.log("Retention selesai")
    process.exit(0)
  })
  .catch(err => {
    console.error("Retention gagal : ", err)
    process.exit(1)
  })
}