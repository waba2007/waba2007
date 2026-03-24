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

// 📸 Handle Photo Messages
bot.on("message:photo", async (ctx) => {
  const userId = ctx.from!.id;
  const photo = ctx.message.photo.pop()!; // Highest resolution
  const caption = ctx.message.caption || "Analyse cette image pour moi.";

  try {
    await ctx.replyWithChatAction("typing");
    logger.info(`Received photo from ${userId} with caption: ${caption}`);
    
    // 1. Get file path from Telegram
    const file = await ctx.getFile();
    const fileUrl = `https://api.telegram.org/file/bot${config.telegram.token}/${file.file_path}`;
    
    // 2. Download and convert to base64
    const responseFile = await fetch(fileUrl);
    const arrayBuffer = await responseFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.file_path?.endsWith(".png") ? "image/png" : "image/jpeg";

    // 3. Process with multimodal content
    const multimodalContent = [
      { type: "text", text: caption },
      { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
    ];

    await handleTextMessage(ctx, multimodalContent as any);
  } catch (error: any) {
    logger.error(`Error handling photo from ${userId}:`, error);
    await ctx.reply("💔 Une erreur est survenue lors de l'analyse de l'image.");
  }
});

// ✍️ Handle Text Messages
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  await handleTextMessage(ctx, text);
});

async function handleTextMessage(ctx: any, text: any) {
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
      
      // 🎵 Music Feature: If it's a found song, download and send it!
      if (chunk.startsWith("MUSIQUE_FOUND:")) {
          const parts = chunk.split("|");
          const title = parts[0].replace("MUSIQUE_FOUND:", "").trim();
          const musicUrl = parts[1].replace("URL:", "").trim();
          
          await ctx.reply(`🎵 Envoi de la musique : **${title}**...`);
          try {
             const { InputFile } = await import("grammy");
             // Send it! Telegram supports sending from URL directly
             await ctx.replyWithAudio(new InputFile({ url: musicUrl }), { title });
          } catch (e) {
             await ctx.reply(`❌ Impossible d'envoyer le fichier audio directly. Voici le lien : ${musicUrl}`);
          }
          continue;
      }

      try {
        await ctx.reply(chunk, { parse_mode: "Markdown" });
      } catch (markdownError) {
        // Fallback if Markdown parsing fails
        await ctx.reply(chunk);
      }
    }

    // 🔊 TTS Generation (Prioritize ElevenLabs, realistic voice)
    // Up to 10,000 characters (several minutes)
    if (typeof response === "string" && response.length > 3 && response.length < 10000 && !response.includes("MUSIQUE_FOUND:")) {
       await ctx.replyWithChatAction("upload_voice");
       const voicePath = await generateSpeech(response, tempDir);
       if (voicePath) {
          logger.info(`Sending REALISTIC voice response to ${userId}`);
          const { InputFile } = await import("grammy");
          await ctx.replyWithVoice(new InputFile(voicePath));
          if (fs.existsSync(voicePath)) fs.unlinkSync(voicePath);
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
