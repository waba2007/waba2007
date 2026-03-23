import { logger } from "../utils/logger.js";
import { callLLM } from "./llm.js";
import { LLMMessage, LLMResponse } from "./types.js";
import { getHistory, saveMessage } from "../memory/store.js";
import { registry } from "../tools/index.js";

const MAX_ITERATIONS = 5;

/**
 * Main Agent Loop: Processes a message, reasons, calls tools, and generates a response.
 */
export async function processMessage(userId: number, text: string): Promise<string> {
  // 1. Fetch conversation history
  const history = await getHistory(userId);
  const messages: LLMMessage[] = [
    {
      role: "system",
      content: `You are WABA, a personalized, secure, and local AI agent.
      Current time is ${new Date().toLocaleString()}.
      You can use tools to help the user.
      Keep your answers helpful, concise, and professional.`,
    },
    ...history.map((m) => {
      const metadata = m.metadata ? JSON.parse(m.metadata) : {};
      return {
        role: m.role as any,
        content: m.content,
        tool_call_id: metadata.tool_call_id,
        tool_calls: metadata.tool_calls,
        name: metadata.name,
      };
    }),
    { role: "user", content: text },
  ];

  // Store user message
  await saveMessage(userId, "user", text);

  let iteration = 0;
  while (iteration < MAX_ITERATIONS) {
    iteration++;
    const response = await callLLM(messages);

    if (response.type === "error") {
      return `❌ Une erreur est survenue avec l'IA: ${response.error}`;
    }

    if (response.type === "text") {
      const result = response.content || "";
      await saveMessage(userId, "assistant", result);
      return result;
    }

    if (response.type === "tool_call" && response.toolCalls) {
      // ⚠️ IMPORTANT: We must save the assistant's tool_calls to history first!
      const toolCallsForAPI = response.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.args),
        },
      }));

      await saveMessage(userId, "assistant", "", { tool_calls: toolCallsForAPI });
      messages.push({ role: "assistant", content: "", tool_calls: toolCallsForAPI });

      for (const toolCall of response.toolCalls) {
        const result = await registry.executeTool(toolCall.name, toolCall.args);
        
        // Save tool result and add to messages
        await saveMessage(userId, "tool", result, { tool_call_id: toolCall.id, name: toolCall.name });
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.name,
          content: result,
        });
      }
      continue;
    }
    break;
  }

  return "⚠️ I reached my reasoning limit without a final answer. Please try something simpler.";
}
