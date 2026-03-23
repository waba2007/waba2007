import { Bot } from "grammy";
import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { whitelist } from "./whitelist.js";
import { processMessage } from "../agent/loop.js";

/**
 * Main Telegram bot instance and handler for messages.
 */
export const bot = new Bot(config.telegram.token);

// Middleware: Whitelist security layer
// bot.use(whitelist); // Commutateur de sécurité désactivé : le bot est désormais public

// Commands
bot.command("start", async (ctx) => {
  await ctx.reply(`👋 Bonjour ! Je suis **WABA**, votre agent IA personnel local.
Je suis modulaire, sécurisé et prêt à vous aider.

💡 Voici ce que vous pouvez faire :
1. Posez n'importe quelle question.
2. Demandez-moi l'heure actuelle.
3. Gardez à l'esprit que je suis s'exécute en local.`);
});

bot.command("clear", async (ctx) => {
    // Optional: Clear history command
    try {
        const { clearHistory } = await import("../memory/store.js");
        await clearHistory(ctx.from!.id);
        await ctx.reply("🧹 Historique de conversation effacé.");
    } catch (e) {
        logger.error("Failed to clear history:", e);
    }
});

// Handle text messages via the Agent Loop
bot.on("message:text", async (ctx) => {
  const userId = ctx.from!.id;
  const text = ctx.message.text;

  logger.info(`Message from user ${userId}: ${text}`);

  try {
    // Typing indicator
    await ctx.replyWithChatAction("typing");

    const response = await processMessage(userId, text);
    
    // ⚠️ Fix: Split long messages to avoid 400 Bad Request
    const { splitMessage } = await import("../utils/telegram.js");
    const chunks = splitMessage(response);

    for (const chunk of chunks) {
      if (!chunk) continue;
      try {
        await ctx.reply(chunk, { parse_mode: "Markdown" });
      } catch (markdownError) {
        // Fallback if Markdown parsing fails due to AI output
        logger.warn("Markdown parsing failed, sending as plain text.");
        await ctx.reply(chunk);
      }
    }
  } catch (error: any) {
    logger.error(`Error processing message from ${userId}:`, error);
    await ctx.reply("💔 Désolé, je ne me sens pas très bien... Une erreur interne est survenue.");
  }
});

// Global error handler
bot.catch((err) => {
  logger.error(`Grammy ERROR encountered:`, err.error);
});
