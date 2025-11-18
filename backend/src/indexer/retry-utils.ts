// Retry utilities for handling event processing race conditions

/**
 * Sleep for a specified number of milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries?: number; // Maximum number of retry attempts (default: 5)
  initialDelayMs?: number; // Initial delay in milliseconds (default: 100ms)
  maxDelayMs?: number; // Maximum delay in milliseconds (default: 5000ms)
  backoffMultiplier?: number; // Exponential backoff multiplier (default: 2)
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Retry a function with exponential backoff
 *
 * @param fn Function to retry
 * @param shouldRetry Function to determine if error is retryable
 * @param config Retry configuration
 * @returns Result of the function
 * @throws Error if all retries are exhausted
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: unknown) => boolean,
  config: RetryConfig = {}
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;
  let delayMs = cfg.initialDelayMs;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt or error is not retryable
      if (attempt === cfg.maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Log retry attempt
      console.warn(
        `[Retry] Attempt ${attempt + 1}/${cfg.maxRetries} failed, retrying in ${delayMs}ms...`,
        error
      );

      // Wait before retrying
      await sleep(delayMs);

      // Exponential backoff with max delay cap
      delayMs = Math.min(delayMs * cfg.backoffMultiplier, cfg.maxDelayMs);
    }
  }

  // This should never be reached due to the throw in the loop, but TypeScript needs it
  throw lastError;
}

/**
 * Specific error types for event processing
 */
export class DependencyNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DependencyNotFoundError';
  }
}

/**
 * Check if an error is a dependency not found error that should be retried
 */
export function isDependencyNotFoundError(error: unknown): boolean {
  return error instanceof DependencyNotFoundError;
}
