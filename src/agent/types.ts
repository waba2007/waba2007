/**
 * Shared types for Agent Logic.
 */
export interface LLMMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface LLMResponse {
  type: "text" | "tool_call" | "error";
  content?: string;
  toolCalls?: ToolCall[];
  error?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args: any;
}
