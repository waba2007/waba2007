import { db } from "./db.js";
import { supabase } from "./supabaseClient.js";
import { logger } from "../utils/logger.js";
import { config } from "../config/env.js";

/**
 * Message interface for conversation history.
 */
export interface DBMessage {
  id?: number;
  user_id: number;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp?: string;
  metadata?: string;
}

/**
 * Persists a message to the database (Cloud or Local).
 */
export async function saveMessage(userId: number, role: DBMessage["role"], content: string, metadata?: any) {
  const metadataString = metadata ? JSON.stringify(metadata) : null;

  if (config.cloud.useSupabase && supabase) {
    const { error } = await supabase.from("conversations").insert([
      { user_id: userId, role, content, metadata: metadataString }
    ]);
    if (error) logger.error(`Supabase save error: ${error.message}`);
    else return;
  }

  // Local Fallback
  const stmt = db.prepare(`
    INSERT INTO conversations (user_id, role, content, metadata) 
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(userId, role, content, metadataString);
  logger.debug(`Saved ${role} message (Local) for user ID: ${userId}`);
}

/**
 * Retrieves the recent history for a user (Cloud or Local).
 */
export async function getHistory(userId: number, limit: number = 20): Promise<DBMessage[]> {
  if (config.cloud.useSupabase && supabase) {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .limit(limit);
    if (!error && data) {
      return (data as DBMessage[]).reverse();
    }
  }

  // Local Fallback
  const stmt = db.prepare(`
    SELECT * FROM conversations 
    WHERE user_id = ? 
    ORDER BY timestamp DESC
    LIMIT ?
  `);
  const results = stmt.all(userId, limit) as DBMessage[];
  return results.reverse();
}

/**
 * Clears the history for a specific user (Cloud or Local).
 */
export async function clearHistory(userId: number) {
  if (config.cloud.useSupabase && supabase) {
    await supabase.from("conversations").delete().eq("user_id", userId);
  }
  const stmt = db.prepare("DELETE FROM conversations WHERE user_id = ?");
  stmt.run(userId);
}

/**
 * Sets a persistent value in memory (Cloud or Local).
 */
export async function setMemory(key: string, value: string) {
  if (config.cloud.useSupabase && supabase) {
     await supabase.from("agent_memory").upsert({ key, value });
  }
  const stmt = db.prepare(`
    INSERT INTO agent_memory (key, value) 
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run(key, value);
}

/**
 * Retrieves a persistent value from memory (Cloud or Local).
 * Note: Still return null if nothing found.
 */
export async function getMemory(key: string): Promise<string | null> {
  if (config.cloud.useSupabase && supabase) {
    const { data } = await supabase.from("agent_memory").select("value").eq("key", key).single();
    if (data) return data.value;
  }
  const stmt = db.prepare("SELECT value FROM agent_memory WHERE key = ?");
  const result = stmt.get(key) as { value: string } | undefined;
  return result ? result.value : null;
}
