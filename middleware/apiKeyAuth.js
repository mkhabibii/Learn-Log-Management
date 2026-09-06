const crypto = require("crypto");
const pool = require("../db");

function hashApiKey(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

async function apiKeyAuth(req, res, next) {
  const providedKey = req.header("X-API-Key");

  if (!providedKey) {
    return res.status(401).json({ error: "API Key tidak ditemukan" });
  }

  const hashedKey = hashApiKey(providedKey);

  try {
    const [rows] = await pool.query(
      "SELECT * FROM api_keys WHERE key_hash = ? AND is_active = TRUE",
      [hashedKey],
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "API Key tidak valid" });
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal memvalidasi API Key" });
  }
}

module.exports = apiKeyAuth;
