/**
 * Retry Helper
 *
 * Shared retry logic with error handling for image generation operations.
 */

/**
 * Error types for retry logic
 */
export enum ErrorType {
  ContentFiltered = 'CONTENT_FILTERED',
  ApiError = 'API_ERROR',
  Unknown = 'UNKNOWN',
}

/**
 * Check if error is content filtering
 */
export function isContentFilteredError(error: any): boolean {
  const errorMessage = error?.message || String(error);
  return (
    errorMessage.includes('IMAGE_OTHER') ||
    errorMessage.includes('SAFETY') ||
    errorMessage.includes('blocked') ||
    errorMessage.includes('Content filtered')
  );
}

/**
 * Classify error type
 */
export function classifyError(error: any): ErrorType {
  if (isContentFilteredError(error)) {
    return ErrorType.ContentFiltered;
  }
  // Add more error classifications as needed
  return ErrorType.Unknown;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  retryOnContentFilter: boolean;
  onAttempt?: (attempt: number, maxRetries: number) => void;
  onError?: (error: any, errorType: ErrorType, attempt: number) => void;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  retryOnContentFilter: true,
};

/**
 * Execute operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries, retryOnContentFilter, onAttempt, onError } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: any;
  let lastErrorType: ErrorType = ErrorType.Unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0 && onAttempt) {
        onAttempt(attempt, maxRetries);
      }

      return await operation();
    } catch (error) {
      lastError = error;
      lastErrorType = classifyError(error);

      if (onError) {
        onError(error, lastErrorType, attempt);
      }

      // Check if we should retry
      const isLastAttempt = attempt >= maxRetries;

      if (lastErrorType === ErrorType.ContentFiltered && !retryOnContentFilter) {
        throw new Error('Content filtered: Try a different reference image');
      }

      if (isLastAttempt) {
        // Final attempt failed
        if (lastErrorType === ErrorType.ContentFiltered) {
          throw new Error('Content filtered after all retries: Try a different reference image');
        } else {
          const errorMessage = lastError?.message || String(lastError);
          throw new Error(`Failed after ${maxRetries + 1} attempts: ${errorMessage}`);
        }
      }

      // Continue to next retry
    }
  }

  throw lastError;
}
