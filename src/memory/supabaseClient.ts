import { createClient } from "@supabase/supabase-js";
import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Initializes and exports the Supabase client for Cloud persistence.
 */
function initSupabase() {
  if (!config.cloud.useSupabase) return null;
  
  if (!config.cloud.url || !config.cloud.key) {
    logger.warn("Supabase URL or Key missing. Cloud persistence disabled.");
    return null;
  }

  const supabase = createClient(config.cloud.url, config.cloud.key);
  logger.info("Supabase client initialized for cloud persistence.");
  return supabase;
}

export const supabase = initSupabase();
