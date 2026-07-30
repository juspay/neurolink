import { trace } from "@opentelemetry/api";

export const MAX_IMAGE_DOWNLOAD_BYTES = 10 * 1024 * 1024;

export const streamTracer = trace.getTracer("neurolink.provider.vertex");

export let cachedCredentialsPath: string | null = null;

export const VERTEX_MODEL_ALIASES: Record<string, string> = {
  // Claude 4.x shorthand aliases → versioned names
  "claude-sonnet-4-5": "claude-sonnet-4-5@20250929",
  "claude-opus-4-5": "claude-opus-4-5@20251124",
  "claude-haiku-4-5": "claude-haiku-4-5@20251001",
  "claude-sonnet-4": "claude-sonnet-4@20250514",
  "claude-opus-4": "claude-opus-4@20250514",
  "claude-opus-4-1": "claude-opus-4-1@20250805",
  // Claude 3.x shorthand aliases → versioned names
  "claude-3-7-sonnet": "claude-3-7-sonnet@20250219",
  "claude-3-5-sonnet": "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku": "claude-3-5-haiku-20241022",
  "claude-3-opus": "claude-3-opus-20240229",
  "claude-3-sonnet": "claude-3-sonnet-20240229",
  "claude-3-haiku": "claude-3-haiku-20240307",
  // Gemini shorthand aliases
  "gemini-3-pro": "gemini-3.1-pro-preview",
  "gemini-3-flash": "gemini-3-flash-preview",
};

export const setCachedCredentialsPath = (newPath: string | null): void => {
  cachedCredentialsPath = newPath;
};
