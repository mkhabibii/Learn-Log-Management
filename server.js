const express = require("express");
const cors = require("cors");
const pool = require("./db");
const cron = require("node-cron")
const runRetention = require("./retention-worker")

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// Endpoint untuk nambah log
app.post("/logs", async (req, res) => {
  const { level, service, event, message, request_id, user_id, ip, metadata } =
    req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO logs (timestamp, level, service, event, message, request_id, user_id, ip, metadata)
      VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        level,
        service,
        event,
        message,
        request_id,
        user_id,
        ip,
        JSON.stringify(metadata || {}),
      ],
    );

    res
      .status(201)
      .json({ id: result.insertId, message: "Log Berhasil ditambahkan" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal menyimpan log" });
  }
});

app.get("/logs", async (req, res) => {
  const { level, service, event } = req.query;

  let query = "SELECT * FROM logs WHERE 1=1";
  const params = [];

  if (level) {
    query += " AND level = ?";
    params.push(level);
  }

  if (service) {
    query += " AND service = ?";
    params.push(service);
  }

  if (event) {
    query += " AND event = ?";
    params.push(event);
  }

  query += " ORDER BY id DESC";

  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil data log" });
  }
});

app.get("/logs/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const [rows] = await pool.query("SELECT * FROM logs WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Log tidak ditemukan" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil data log" });
  }
});

app.listen(PORT, () => {
  console.log(`Log API jalan di http://localhost:${PORT}`);
});

// ----- Alerts ------
async function checkAlerts() {
  const [errorRows] = await pool.query(
    `SELECT COUNT(*) AS total_error
    FROM logs WHERE level = 'ERROR' AND timestamp >= NOW() - INTERVAL 5 MINUTE  `,
  );

  const totalErrors = errorRows[0].total_error;
  const threshold = 50;

  if (totalErrors <= threshold) {
    return { isAlert: false, totalErrors, threshold };
  }

  const [recentErrors] = await pool.query(
    `SELECT * FROM alerts WHERE triggered_at >=NOW() - INTERVAL 5 MINUTE ORDER BY triggered_at DESC LIMIT 1`,
  );

  if (recentErrors.length > 0) {
    return {
      isAlert: true,
      totalErrors,
      threshold,
      note: "Alert masih berlangsung, tidak dicatat ulang",
    };
  }

  const message = `PERINGATAN : ${totalErrors} error dalam 5 menit terakhir ( Ambang batas : ${threshold} )`;

  await pool.query(
    `INSERT INTO alerts (triggered_at, error_count, threshold_value, window_minutes, message) VALUES (NOW(), ?, ?, ?, ?)`,
    [totalErrors, threshold, 5, message],
  );

  return { isAlert: true, totalErrors, threshold, note: "Alert baru dicatat" };
}

app.get("/alerts/check", async (req, res) => {
  try {
    const result = await checkAlerts();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengecek alert" });
  }
});

app.get("/alerts", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM alerts ORDER BY triggered_at DESC",
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil data alert" });
  }
});

setInterval(checkAlerts, 60 * 1000);

cron.schedule("0 2 * * *", async () => {
  console.log("Menjalankan retention job terjadwal ...")
  try {
    await runRetention()
  } catch (err) {
    console.error("Retention job gagal ", err)
  }
})
