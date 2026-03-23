import { logger } from "../utils/logger.js";
import { getCurrentTime } from "./getCurrentTime.js";
import { ToolInstance, ToolSchema } from "./types.js";

/**
 * Registry of available tools for the agent.
 */
class ToolRegistry {
  private tools: Map<string, ToolInstance> = new Map();

  register(tool: ToolInstance) {
    this.tools.set(tool.schema.function.name, tool);
    logger.info(`Tool registered: ${tool.schema.function.name}`);
  }

  getTool(name: string): ToolInstance | undefined {
    return this.tools.get(name);
  }

  getAllSchemas(): ToolSchema[] {
    const schemas = Array.from(this.tools.values()).map((t) => t.schema);
    logger.debug(`Fetching ${schemas.length} tool schemas for LLM.`);
    return schemas;
  }

  async executeTool(name: string, args: any): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found in registry.`);
    }
    logger.info(`Executing tool: ${name} with args:`, args);
    try {
      return await tool.execute(args);
    } catch (error: any) {
      logger.error(`Error executing tool ${name}:`, error);
      return `Error executing tool ${name}: ${error.message}`;
    }
  }
}

export const registry = new ToolRegistry();

// Initialize the registry with default tools
registry.register(getCurrentTime);
