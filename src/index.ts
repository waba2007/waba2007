import { bot } from "./bot/bot.js";
import { logger } from "./utils/logger.js";
import { db } from "./memory/db.js";

import http from "http";

/**
 * Entry point for WABA Agent startup.
 */
async function start() {
  logger.info("Starting WABA Agent...");

  // Keep-alive dummy server for Render/Cloud free tiers
  const port = process.env.PORT || 3000;
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end("WABA is online!");
  }).listen(port);
  logger.info(`Dummy keep-alive server listening on port ${port}`);

  try {
    // 1. Ensure the SQLite DB is connected
    if (!db.open) {
      throw new Error("Unable to open the SQLite database.");
    }
    logger.info("SQLite database connection verified.");

    // 2. Clear pre-set bot commands
    await bot.api.setMyCommands([
      { command: "start", description: "Initialize WABA Agent" },
      { command: "clear", description: "Clear conversation history" }
    ]);

    // 3. Start the bot with long polling
    logger.info("Telegram Bot starts with long polling...");
    await bot.start({
        onStart: (me) => {
            logger.info(`Bot @${me.username} is now online and listening.`);
        }
    });

  } catch (error: any) {
    logger.error("Failed to start WABA Agent:", error.message);
    process.exit(1);
  }
}

// Global process handling
process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection:", reason);
});

// Shutdown gracefully
process.on("SIGINT", () => {
  logger.info("Graceful shutdown initiated...");
  db.close();
  logger.info("Database connection closed.");
  process.exit(0);
});

start();
