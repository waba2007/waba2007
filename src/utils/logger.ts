/**
 * Simple structured logger for WABA
 */
export const logger = {
  debug: (...args: any[]) => console.debug(`[DEBUG] ${new Date().toISOString()}:`, ...args),
  info: (...args: any[]) => console.info(`[INFO]  ${new Date().toISOString()}:`, ...args),
  warn: (...args: any[]) => console.warn(`[WARN]  ${new Date().toISOString()}:`, ...args),
  error: (...args: any[]) => console.error(`[ERROR] ${new Date().toISOString()}:`, ...args),
};
