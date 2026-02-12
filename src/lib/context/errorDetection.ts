/**
 * Context Overflow Error Detection
 *
 * Cross-provider regex patterns to detect context window overflow errors.
 * Modeled on Cline + pi-mono patterns.
 */

/**
 * Provider-specific error patterns for context overflow.
 *
 * IMPORTANT: Order matters for getContextOverflowProvider - more specific
 * patterns should be checked first. OpenAI patterns are very specific
 * (e.g., "This model's maximum context length is") so they come first.
 */
const OVERFLOW_PATTERNS: Array<{ provider: string; patterns: RegExp[] }> = [
  {
    provider: "openai",
    patterns: [
      /This model's maximum context length is/i,
      /tokens\. However, (?:your messages|you requested)/i,
      /reduce the length of the messages/i,
      /Please reduce the length/i,
    ],
  },
  {
    provider: "azure",
    patterns: [/content_length_exceeded/i],
  },
  {
    provider: "google",
    patterns: [
      /RESOURCE_EXHAUSTED/i,
      /exceeds the maximum number of tokens/i,
      /content is too long/i,
      /request payload size exceeds/i,
      /input token limit/i,
    ],
  },
  {
    provider: "bedrock",
    patterns: [
      /ValidationException.*token/i,
      /Input is too long/i,
      /exceeds the model's maximum/i,
    ],
  },
  {
    provider: "mistral",
    patterns: [/context length exceeded/i, /maximum number of tokens/i],
  },
  {
    provider: "openrouter",
    patterns: [/context_length_exceeded/i],
  },
  {
    provider: "anthropic",
    patterns: [
      /prompt is too long/i,
      /input is too long/i,
      /too many tokens/i,
      /maximum context length/i,
    ],
  },
];

/**
 * Check if an error is a context overflow error from any provider.
 */
export function isContextOverflowError(error: unknown): boolean {
  const errorMessage = extractErrorMessage(error);
  if (!errorMessage) {
    return false;
  }

  return OVERFLOW_PATTERNS.some(({ patterns }) =>
    patterns.some((pattern) => pattern.test(errorMessage)),
  );
}

/**
 * Identify which provider produced the context overflow error.
 */
export function getContextOverflowProvider(error: unknown): string | null {
  const errorMessage = extractErrorMessage(error);
  if (!errorMessage) {
    return null;
  }

  for (const { provider, patterns } of OVERFLOW_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(errorMessage))) {
      return provider;
    }
  }

  return null;
}

/**
 * Extract error message from various error formats.
 */
function extractErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    // Check nested error messages too
    const msg = error.message;
    const cause = (error as Error & { cause?: unknown })?.cause;
    if (cause instanceof Error) {
      return `${msg} ${cause.message}`;
    }
    return msg;
  }

  if (typeof error === "object") {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === "string") {
      return obj.message;
    }
    if (typeof obj.error === "string") {
      return obj.error;
    }
    if (typeof obj.error === "object" && obj.error !== null) {
      const nested = obj.error as Record<string, unknown>;
      if (typeof nested.message === "string") {
        return nested.message;
      }
    }
  }

  return null;
}
