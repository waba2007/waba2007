import { logger } from "./logger.js";
import fs from "fs/promises";
import path from "path";

/**
 * NEW: Multi-part TTS to read EVERYTHING without limits.
 * Uses a free public endpoint but handles long texts by splitting into chunks.
 */
export async function generateSpeech(text: string, outputDir: string): Promise<string | null> {
  try {
    const rawChunks = splitText(text, 200); // 200 chars limit per chunk for the free API
    const audioPaths: string[] = [];

    logger.info(`Generating LONG speech for ${rawChunks.length} chunks...`);

    for (let i = 0; i < rawChunks.length; i++) {
        const chunk = rawChunks[i];
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=fr&client=tw-ob`;
        
        const response = await fetch(url);
        if (!response.ok) continue;

        const buffer = await response.arrayBuffer();
        const chunkPath = path.join(outputDir, `tmp_chunk_${Date.now()}_${i}.mp3`);
        await fs.writeFile(chunkPath, Buffer.from(buffer));
        audioPaths.push(chunkPath);
    }

    if (audioPaths.length === 0) return null;

    // Merge logic: For now, we'll just send the first one or simple merge if possible.
    // To be perfectly robust without external tools like ffmpeg, we'll return the chunks list 
    // or just the main one. But wait, we can append buffers!
    
    const finalBuffer = await mergeBuffers(audioPaths);
    const finalPath = path.join(outputDir, `waba_voice_${Date.now()}.mp3`);
    await fs.writeFile(finalPath, finalBuffer);

    // Clean up chunks
    for (const p of audioPaths) {
        await fs.unlink(p).catch(() => {});
    }

    return finalPath;
  } catch (error: any) {
    logger.error("Failed to generate long speech:", error.message);
    return null;
  }
}

function splitText(text: string, size: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += size) {
        chunks.push(text.substring(i, i + size));
    }
    return chunks;
}

async function mergeBuffers(paths: string[]): Promise<Buffer> {
    const buffers = [];
    for (const p of paths) {
        buffers.push(await fs.readFile(p));
    }
    return Buffer.concat(buffers);
}
