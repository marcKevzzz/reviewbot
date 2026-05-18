import { DEFAULTS } from "../constants";
import { logger } from "./logger";

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
  } = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULTS.RETRY_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULTS.RETRY_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULTS.RETRY_MAX_DELAY_MS;

  let attempt = 0;
  while (true) {
    attempt++;
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw error;
      }

      // Exponential backoff + jitter
      const delay = Math.min(
        maxDelayMs,
        baseDelayMs * Math.pow(2, attempt - 1) * (0.5 + Math.random())
      );

      logger.warning(
        `Attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}. Retrying in ${Math.round(delay)}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
