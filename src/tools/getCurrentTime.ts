import { logger } from "../utils/logger.js";
import { ToolInstance } from "./index.js";

/**
 * Basic tool to get the current date and time.
 */
export const getCurrentTime: ToolInstance = {
  schema: {
    type: "function",
    function: {
      name: "get_current_time",
      description: "Returns the current date and time.",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description: "The timezone to use (optional).",
          },
        },
      },
    },
  },
  execute: async (args: any) => {
    logger.debug(`Fetching current time for args:`, args);
    const date = new Date();
    return date.toLocaleString("fr-FR", { timeZone: args.timezone || "Europe/Paris" });
  },
};
