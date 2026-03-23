import { config } from "../config/env.js";
import { logger } from "./logger.js";
import fs from "fs";

/**
 * Transcribes an audio file using Groq's Whisper-large-v3 model.
 */
export async function transcribeAudio(filePath: string): Promise<string> {
  logger.info(`Transcribing audio file: ${filePath}`);
  
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: "audio/ogg" });
  
  formData.append("file", blob, "voice.ogg");
  formData.append("model", "whisper-large-v3");
  formData.append("language", "fr");
  formData.append("response_format", "json");

  try {
    const response = await fetch(`${config.llm.primary.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.llm.primary.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whisper API error: ${errorText}`);
    }

    const data = await response.json() as { text: string };
    logger.info("Transcription successful.");
    return data.text;
  } catch (error: any) {
    logger.error("Failed to transcribe audio:", error.message);
    throw error;
  }
}
