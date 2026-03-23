import "dotenv/config";
import { logger } from "../utils/logger.js";

/**
 * Validates and exports environment variables for WABA.
 */
function validateEnv() {
  const required = [
    "TELEGRAM_BOT_TOKEN",
    "OPENROUTER_API_KEY",
    "OPENROUTER_BASE_URL",
    "OPENROUTER_MODEL",
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  // Parse allowed IDs into an array of numbers
  const rawAllowedIds = process.env.TELEGRAM_ALLOWED_IDS || "";
  const allowedIds = rawAllowedIds
    .split(",")
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id));

  return {
    telegram: {
      token: process.env.TELEGRAM_BOT_TOKEN!,
      allowedIds,
      botUsername: process.env.TELEGRAM_BOT_USERNAME || "@waba_bot",
      botId: parseInt(process.env.TELEGRAM_BOT_ID || "0", 10),
    },
    llm: {
      primary: {
        apiKey: process.env.OPENROUTER_API_KEY!,
        baseUrl: process.env.OPENROUTER_BASE_URL!,
        model: process.env.OPENROUTER_MODEL!,
      },
      fallback: {
        apiKey: process.env.FALLBACK_API_KEY,
        baseUrl: process.env.FALLBACK_BASE_URL,
        model: process.env.FALLBACK_MODEL || "gemini-1.5-flash",
      },
    },
    database: {
      path: process.env.DATABASE_PATH || "./database/waba.sqlite",
    },
    cloud: {
      useSupabase: !!process.env.SUPABASE_URL,
      url: process.env.SUPABASE_URL || "",
      key: process.env.SUPABASE_ANON_KEY || "",
      elevenlabs: {
        apiKey: process.env.ELEVENLABS_API_KEY || "",
      },
    },
  };
}

export const config = validateEnv();
