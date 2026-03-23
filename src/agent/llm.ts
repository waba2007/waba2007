import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { LLMMessage, LLMResponse, ToolCall } from "./types.js";
import { registry } from "../tools/index.js";

/**
 * Handles LLM interaction via Groq (OpenAI-compatible).
 */
export async function callLLM(messages: LLMMessage[]): Promise<LLMResponse> {
  const tools = registry.getAllSchemas();

  try {
    return await fetchLLM(
      config.llm.primary.baseUrl,
      config.llm.primary.apiKey,
      config.llm.primary.model,
      messages,
      tools
    );
  } catch (error: any) {
    logger.warn(`Primary Groq model failed: ${error.message}. Attempting fallback with Mixtral...`);

    if (config.llm.fallback.apiKey && config.llm.fallback.baseUrl) {
      try {
        logger.debug(`Trying model ${config.llm.fallback.model || "mixtral-8x7b-32768"} with ${tools.length} tools`);
        return await fetchLLM(
          config.llm.fallback.baseUrl,
          config.llm.fallback.apiKey,
          config.llm.fallback.model || "mixtral-8x7b-32768",
          messages,
          tools
        );
      } catch (fallbackError: any) {
        logger.error(`Fallback failed: ${fallbackError.message}`);
        return { type: "error", error: "All LLM calls failed." };
      }
    }

    return { type: "error", error: error.message };
  }
}

/**
 * Perform the actual HTTP request to an OpenAI-compatible API.
 */
async function fetchLLM(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: LLMMessage[],
  tools: any[]
): Promise<LLMResponse> {
  // Ensure the URL ends with chat/completions correctly
  let url = baseUrl;
  if (!url.endsWith("/chat/completions")) {
    url = url.endsWith("/") ? `${url}chat/completions` : `${url}/chat/completions`;
  }

  logger.debug(`Fetching LLM: ${url} (Model: ${model})`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/waba-agent", // OpenRouter best practice
      "X-Title": "WABA Agent",
    },
    body: JSON.stringify({
      model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LLM Error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const choice = data.choices[0];
  const message = choice.message;

  if (message.tool_calls && message.tool_calls.length > 0) {
    const toolCalls: ToolCall[] = message.tool_calls.map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments),
    }));
    return { type: "tool_call", toolCalls };
  }

  return { type: "text", content: message.content || "" };
}
