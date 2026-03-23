import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { Middleware } from "grammy";

/**
 * Middleware for strict authentication of Telegram users.
 */
export const whitelist: Middleware = async (ctx, next) => {
  const userId = ctx.from?.id;

  if (!userId) {
    logger.warn(`Potential unauthorized access (no user ID provided).`);
    return;
  }

  const isAllowed = config.telegram.allowedIds.includes(userId);

  if (isAllowed) {
    logger.info(`Authorized access for user ID: ${userId}`);
    return await next();
  } else {
    logger.warn(`Rejected unauthorized access for user ID: ${userId}. Please add this ID to TELEGRAM_ALLOWED_IDS in your .env file.`);
  }
};
