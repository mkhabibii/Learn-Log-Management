const crypto = require("crypto");
const pool = require("../db");

function generateApiKey() {
  return crypto.randomBytes(32).toString("hex");
}

function hashApiKey(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

async function createApiKey(label) {
  const rawKey = generateApiKey();
  const hashKey = hashApiKey(rawKey);

  await pool.query("INSERT INTO api_keys (key_hash, label) VALUES (?, ?) ", [
    hashApiKey,
    label,
  ]);

  console.log("API Key berhasil dibuat!");
  console.log("Label : ", label);
  console.log("Key (SIMPAN INI, TIDAK AKAN DITAMPILKAN KEMBALI) ", rawKey);

  process.exit(0);
}

const label = process.argv[2] || "Default Key";
createApiKey(label);
