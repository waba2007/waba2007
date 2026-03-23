/**
 * Tool types to avoid circular dependencies.
 */
export interface ToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface ToolInstance {
  schema: ToolSchema;
  execute: (args: any) => Promise<string>;
}
