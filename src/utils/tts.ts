import { logger } from "./logger.js";
import fs from "fs/promises";
import path from "path";

/**
 * Generates an audio file from text using ElevenLabs API.
 */
export async function generateSpeech(text: string, outputDir: string): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    logger.warn("ElevenLabs API Key missing. Skipping TTS.");
    return null;
  }

  // Voice ID for "Rachel" (classic versatile voice)
  const voiceId = "21m00Tcm4TlvDq8ikWAM"; 
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  logger.info(`Generating speech for text (length: ${text.length})...`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs error: ${error}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const fileName = `speech_${Date.now()}.mp3`;
    const filePath = path.join(outputDir, fileName);

    await fs.writeFile(filePath, Buffer.from(audioBuffer));
    logger.info(`Speech generated and saved to: ${filePath}`);
    
    return filePath;
  } catch (error: any) {
    logger.error("Failed to generate speech:", error.message);
    return null;
  }
}
