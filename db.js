const path = require('path');
const fs = require('fs');

const DB_DRIVER = process.env.DB_DRIVER || 'sqlite'; // Default 'sqlite' for Zero-Config

let dbAdapter = null;

if (DB_DRIVER === 'sqlite') {
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.join(__dirname, 'logs.sqlite');
  const sqlite = new DatabaseSync(dbPath);

  // Enable Write-Ahead Logging (WAL) for fast concurrent writes
  sqlite.exec('PRAGMA journal_mode = WAL;');

  dbAdapter = {
    driver: 'sqlite',
    async init() {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          level TEXT NOT NULL,
          service TEXT NOT NULL,
          event TEXT,
          message TEXT,
          request_id TEXT,
          user_id TEXT,
          ip TEXT,
          metadata TEXT
        );

        CREATE TABLE IF NOT EXISTS alerts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          triggered_at TEXT NOT NULL,
          error_count INTEGER,
          threshold_value INTEGER,
          window_minutes INTEGER,
          message TEXT
        );

        CREATE TABLE IF NOT EXISTS api_keys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key_hash TEXT NOT NULL,
          label TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('[Learn-Log DB] SQLite Zero-Config Database siap (WAL mode enabled)');
    },

    async query(sql, params = []) {
      const trimmedSql = sql.trim();
      const isSelect = trimmedSql.toUpperCase().startsWith('SELECT');

      // 1. Handling Bulk Insert (ARRAY OF ARRAYS)
      if (params.length === 1 && Array.isArray(params[0]) && Array.isArray(params[0][0])) {
        const rows = params[0];
        const stmt = sqlite.prepare(`
          INSERT INTO logs (timestamp, level, service, event, message, request_id, user_id, ip, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        sqlite.exec('BEGIN TRANSACTION');
        try {
          for (const row of rows) {
            // Formating timestamp string
            const rowData = [...row];
            if (rowData[0] instanceof Date) {
              rowData[0] = rowData[0].toISOString();
            }
            stmt.run(...rowData);
          }
          sqlite.exec('COMMIT');
          return [{ affectedRows: rows.length, insertId: 0 }];
        } catch (err) {
          sqlite.exec('ROLLBACK');
          throw err;
        }
      }

      // 2. Query Select
      if (isSelect) {
        // Konversi query MySQL specific ke SQLite jika ada
        let convertedSql = sql
          .replace(/NOW\(\)\s*-\s*INTERVAL\s+(\d+)\s+MINUTE/gi, "datetime('now', '-$1 minute')")
          .replace(/NOW\(\)\s*-\s*INTERVAL\s+\?\s+DAY/gi, "datetime('now', '-' || ? || ' day')")
          .replace(/ORDER BY id DESC/gi, "ORDER BY id DESC");

        const stmt = sqlite.prepare(convertedSql);
        const rows = stmt.all(...params);
        return [rows];
      }

      // 3. Query Insert/Update/Delete biasa
      let convertedSql = sql
        .replace(/NOW\(\)/gi, "datetime('now')");

      const stmt = sqlite.prepare(convertedSql);
      const result = stmt.run(...params);
      return [{ affectedRows: result.changes, insertId: result.lastInsertRowid }];
    }
  };

} else {
  // MySQL Adapter
  const mysql = require('mysql2/promise');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'log_management'
  });

  dbAdapter = {
    driver: 'mysql',
    async init() {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            timestamp DATETIME NOT NULL,
            level VARCHAR(20) NOT NULL,
            service VARCHAR(100) NOT NULL,
            event VARCHAR(100),
            message TEXT,
            request_id VARCHAR(100),
            user_id VARCHAR(100),
            ip VARCHAR(45),
            metadata JSON
          );
        `);
        console.log('[Learn-Log DB] Koneksi MySQL Database Siap');
      } catch (err) {
        console.warn('[Learn-Log DB] MySQL Init Warning:', err.message);
      }
    },
    async query(sql, params) {
      return pool.query(sql, params);
    }
  };
}

module.exports = dbAdapter;