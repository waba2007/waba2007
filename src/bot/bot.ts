import { Bot } from "grammy";
import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { whitelist } from "./whitelist.js";
import { processMessage } from "../agent/loop.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { transcribeAudio } from "../utils/stt.js";
import { generateSpeech } from "../utils/tts.js";

/**
 * Main Telegram bot instance and handler for messages.
 */
export const bot = new Bot(config.telegram.token);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDir = path.join(__dirname, "../../temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

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

// 🎤 Handle Voice Messages
bot.on("message:voice", async (ctx) => {
  const userId = ctx.from!.id;
  const voice = ctx.message.voice;

  try {
    await ctx.replyWithChatAction("typing");
    
    // 1. Download voice file
    logger.info(`Received voice message from ${userId}`);
    const file = await ctx.getFile();
    const filePath = path.join(tempDir, `voice_${userId}_${Date.now()}.ogg`);
    
    // Download using standard fetch (Grammy provides the URL)
    const fileUrl = `https://api.telegram.org/file/bot${config.telegram.token}/${file.file_path}`;
    const responseFile = await fetch(fileUrl);
    const arrayBuffer = await responseFile.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    // 2. Transcribe using Whisper
    const transcribedText = await transcribeAudio(filePath);
    logger.info(`Transcription for ${userId}: "${transcribedText}"`);

    // 3. Process as text
    await handleTextMessage(ctx, transcribedText);
    
    // Clean up
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error: any) {
    logger.error(`Error handling voice from ${userId}:`, error);
    await ctx.reply("💔 Une erreur est survenue lors de l'analyse vocale.");
  }
});

// ✍️ Handle Text Messages
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  await handleTextMessage(ctx, text);
});

async function handleTextMessage(ctx: any, text: string) {
  const userId = ctx.from!.id;

  logger.info(`Message from user ${userId}: ${text}`);

  try {
    await ctx.replyWithChatAction("typing");

    const response = await processMessage(userId, text);
    
    // Split long messages to avoid 400 Bad Request
    const { splitMessage } = await import("../utils/telegram.js");
    const chunks = splitMessage(response);

    // Send original text response
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

    // 🔊 TTS Generation (Only for the full response)
    // Send voice if text is between 5 and 5000 chars
    if (response.length > 5 && response.length < 5000) {
       await ctx.replyWithChatAction("upload_voice");
       const voicePath = await generateSpeech(response, tempDir);
       if (voicePath) {
          logger.info(`Sending voice response to ${userId} (from ${voicePath})`);
          const { InputFile } = await import("grammy");
          await ctx.replyWithVoice(new InputFile(voicePath));
          // Cleanup
          if (fs.existsSync(voicePath)) fs.unlinkSync(voicePath);
       } else {
          logger.warn(`TTS generation failed for text length ${response.length}`);
       }
    }
  } catch (error: any) {
    logger.error(`Error processing message from ${userId}:`, error);
    await ctx.reply("💔 Désolé, je ne me sens pas très bien... Une erreur interne est survenue.");
  }
}

// Global error handler
bot.catch((err) => {
  logger.error(`Grammy ERROR encountered:`, err.error);
});
