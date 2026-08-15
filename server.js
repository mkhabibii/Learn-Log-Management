const express = require("express");
const cors = require("cors");
const pool = require("./db");

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
