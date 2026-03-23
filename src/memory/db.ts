import Database, { Database as DatabaseType } from "better-sqlite3";
import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";
import path from "path";
import fs from "fs";

/**
 * Initializes and exports the SQLite database instance for WABA.
 */
function initDB(): DatabaseType {
  const dbPath = path.resolve(config.database.path);
  
  // Ensure the database directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(dbPath);
  logger.info(`Database initialized: ${dbPath}`);

  // Conversation history: (userId, role, content, timestamp, metadata)
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT CHECK(role IN ('user', 'assistant', 'system', 'tool')) NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT -- JSON string for additional context
    )
  `);

  // Persistent agent memory: (key, value, created_at, updated_at)
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TRIGGER IF NOT EXISTS UpdateMemoryTime
    AFTER UPDATE ON agent_memory
    FOR EACH ROW
    BEGIN
      UPDATE agent_memory SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;
  `);

  logger.info("Database schema initialized.");
  return db;
}

export const db: DatabaseType = initDB();
