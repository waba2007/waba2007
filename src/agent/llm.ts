import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { LLMMessage, LLMResponse, LLMToolCall } from "./types.js";
import { registry } from "../tools/index.js";

/**
 * Main LLM entry point. Handles vision, tools, and error fallbacks.
 */
export async function callLLM(messages: LLMMessage[]): Promise<LLMResponse> {
  const tools = registry.getAllSchemas();
  
  // Decide which model to use. If an image is present, use Vision model.
  const hasImage = messages.some(m => Array.isArray(m.content) && m.content.some(c => c.type === "image_url"));
  const primaryModel = hasImage ? "llama-3.2-11b-vision-preview" : (config.llm.primary.model || "llama-3.3-70b-versatile");
  const backupModels = [primaryModel, "llama-3.1-8b-instant"];

  for (const model of backupModels) {
    try {
      logger.debug(`Calling LLM model ${model} (Vision: ${hasImage})...`);
      return await fetchLLM(
        config.llm.primary.baseUrl,
        config.llm.primary.apiKey,
        model,
        messages,
        hasImage ? [] : tools // Disable tools for vision calls to avoid Groq validation conflicts
      );
    } catch (error: any) {
      logger.error(`Error with model ${model}: ${error.message}`);
    }
  }

  return { type: "error", error: "Toutes les tentatives d'appel IA ont échoué." };
}

/**
 * Standard OpenAI-compatible fetch call.
 */
async function fetchLLM(
  url: string,
  apiKey: string,
  model: string,
  messages: LLMMessage[],
  tools: any[]
): Promise<LLMResponse> {
  const response = await fetch(url.endsWith("chat/completions") ? url : `${url}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM Error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as any;
  const choice = data.choices[0];

  if (choice.message?.tool_calls) {
    const toolCalls: LLMToolCall[] = choice.message.tool_calls.map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments),
    }));
    return { type: "tool_call", toolCalls };
  }

  return { type: "text", content: choice.message.content };
}
