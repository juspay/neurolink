/**
 * Central configuration constants for NeuroLink
 * Single source of truth for all default values
 */

// Image Generation Model Identifiers
// Used to detect if a model is an image generation model (not text generation).
// `isImageGenerationModel(name)` (below) does boundary-aware matching:
// the modelName must equal an entry OR contain an entry followed by a
// non-alphanumeric character (`-`, `_`, `:`, `/`, `.`, end-of-string).
// This prevents short identifiers like `"V_1"` or `"gpt-image-1"` from
// accidentally matching unrelated model names that happen to embed them.
export const IMAGE_GENERATION_MODELS = [
  // Gemini image models (Vertex AI, Google AI Studio)
  "gemini-3-pro-image-preview",
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image-preview",

  // Stability AI (direct provider — image-only)
  "stable-image-ultra",
  "stable-image-core",
  "sd3.5-large",
  "sd3.5-large-turbo",
  "sd3.5-medium",

  // Ideogram (direct provider — image-only). API uses model-version
  // identifiers like "V_1", "V_1_TURBO", "V_2", "V_2_TURBO", "V_2A",
  // "V_2A_TURBO", "V_3". Keep prefixes that won't collide with generic
  // text-model names.
  "V_1",
  "V_1_TURBO",
  "V_2",
  "V_2_TURBO",
  "V_2A",
  "V_2A_TURBO",
  "V_3",

  // Recraft (direct provider — image-only)
  "recraftv3",
  "recraftv2",

  // OpenAI image models (DALL-E + GPT-Image). Substring match keeps
  // version variants like "dall-e-3" / "dall-e-2" routed correctly.
  "gpt-image-1",
  "dall-e-3",
  "dall-e-2",

  // Replicate-hosted image models (matched on model slug prefix).
  // Replicate model slugs are passed through as-is via the LLM
  // provider; image-gen models trigger the image-gen path.
  "black-forest-labs/flux",
  "stability-ai/sdxl",
  "stability-ai/stable-diffusion",
];

/**
 * Boundary-aware test for whether `modelName` represents an image-generation
 * model.
 *
 * Matches when the model name **equals** an entry in
 * {@link IMAGE_GENERATION_MODELS} or contains the entry as a prefix followed
 * by a separator (`-`, `_`, `:`, `/`, `.`) or end-of-string. This avoids
 * accidental matches such as a custom fine-tune named `"my-V_1"` matching
 * `"V_1"` via plain substring inclusion.
 */
export function isImageGenerationModel(modelName: string | undefined): boolean {
  if (!modelName) {
    return false;
  }
  for (const entry of IMAGE_GENERATION_MODELS) {
    if (modelName === entry) {
      return true;
    }
    const idx = modelName.indexOf(entry);
    if (idx === -1) {
      continue;
    }
    const before = idx === 0 ? "" : modelName[idx - 1];
    const after = modelName[idx + entry.length] ?? "";
    const isBoundary = (ch: string): boolean =>
      ch === "" || /[-_:./@]/.test(ch);
    if (isBoundary(before) && isBoundary(after)) {
      return true;
    }
  }
  return false;
}

// PDF Image Generation Models
// Models that support generating images from PDFs
export const PDF_IMAGE_GENERATION_MODELS = [
  "gemini-3-pro-image-preview",
  "gemini-3.1-flash-image-preview",
];

// Global Location Models
// Models that require global location configuration (uses aiplatform.googleapis.com instead of region-specific endpoints)
// Includes Gemini 3.x text and image models, which are only available via the global endpoint on Vertex AI.
// IMAGE_GENERATION_MODELS is spread in to keep the two lists from drifting:
// any new image-gen model added there is automatically routed to global here.
export const GLOBAL_LOCATION_MODELS = [
  // Image generation (sourced from IMAGE_GENERATION_MODELS)
  ...IMAGE_GENERATION_MODELS,
  // Gemini 3.1 text models (global-only)
  "gemini-3.1-pro-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-3.1-pro-preview-customtools",
  // Gemini 3 text models (global-only)
  "gemini-3-pro-preview",
  "gemini-3-pro-preview-11-2025",
  "gemini-3-pro-latest",
  "gemini-3-flash-preview",
];

// Core AI Generation Defaults
export const DEFAULT_MAX_TOKENS = undefined; // Unlimited by default - let providers decide their own limits
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_TIMEOUT = 60000;
export const DEFAULT_MAX_STEPS = 200;
export const DEFAULT_TOOL_MAX_RETRIES = 2; // Maximum retries per tool before permanently failing

// Fire-and-forget tool storage writes (Redis). 5s is generous for a single
// Redis write; if breached, the .catch logs a warning.
export const TOOL_STORAGE_TIMEOUT_MS = 5000;

// Step execution limits
export const STEP_LIMITS = {
  min: 1,
  max: 500,
  default: DEFAULT_MAX_STEPS,
};

// Specialized Use Case Defaults
export const DEFAULT_EVALUATION_MAX_TOKENS = 500; // Keep evaluation fast
export const DEFAULT_ANALYSIS_MAX_TOKENS = 800; // For analysis tools
export const DEFAULT_DOCUMENTATION_MAX_TOKENS = 12000; // For documentation generation

// Provider-specific configurations
export const PROVIDER_CONFIG = {
  evaluation: {
    maxTokens: DEFAULT_EVALUATION_MAX_TOKENS,
    model: "gemini-2.5-flash",
    temperature: 0.3, // Lower temperature for consistent evaluation
  },
  analysis: {
    maxTokens: DEFAULT_ANALYSIS_MAX_TOKENS,
    temperature: 0.5,
  },
  documentation: {
    maxTokens: DEFAULT_DOCUMENTATION_MAX_TOKENS,
    temperature: 0.4,
  },
};

// Provider-specific maxTokens limits
export const PROVIDER_MAX_TOKENS = {
  anthropic: {
    default: 64000,
  },
  openai: {
    default: 128000,
  },
  "google-ai": {
    default: 64000,
  },
  vertex: {
    default: 64000,
  },
  bedrock: {
    default: 64000,
  },
  azure: {
    default: 128000,
  },
  mistral: {
    default: 128000,
  },
  ollama: {
    default: 64000,
  },
  litellm: {
    default: 128000,
  },
  default: 64000,
};

// CLI Validation Limits
export const CLI_LIMITS = {
  maxTokens: {
    min: 1,
    max: 64000,
    default: DEFAULT_MAX_TOKENS,
  },
  temperature: {
    min: 0,
    max: 2,
    default: DEFAULT_TEMPERATURE,
  },
};

// PDF Processing Limits
export const PDF_LIMITS = {
  // Maximum PDF size for image conversion (20MB)
  MAX_SIZE_MB: 20,
  // Default maximum pages for image conversion
  DEFAULT_MAX_PAGES: 20,
};

// Performance and System Limits
export const SYSTEM_LIMITS = {
  // Prompt size limits (baseProvider.ts magic number fix)
  MAX_PROMPT_LENGTH: 1000000, // 1M characters - prevents memory issues

  // Memory monitoring thresholds (performance.ts)
  HIGH_MEMORY_THRESHOLD: 100, // MB - when to warn about memory usage

  // Timeout warnings (baseProvider.ts)
  LONG_TIMEOUT_WARNING: 300000, // 5 minutes - when to warn about long timeouts

  // Concurrency control (neurolink.ts provider testing)
  DEFAULT_CONCURRENCY_LIMIT: 3, // Max parallel provider tests
  MAX_CONCURRENCY_LIMIT: 5, // Upper bound for concurrency

  // Retry system defaults (retryHandler.ts)
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_INITIAL_DELAY: 1000, // 1 second
  DEFAULT_MAX_DELAY: 30000, // 30 seconds
  DEFAULT_BACKOFF_MULTIPLIER: 2,
};

// Environment Variable Support (for future use)
export const ENV_DEFAULTS = {
  maxTokens: (() => {
    if (!process.env.NEUROLINK_DEFAULT_MAX_TOKENS) {
      return undefined;
    }
    const n = parseInt(process.env.NEUROLINK_DEFAULT_MAX_TOKENS, 10);
    return Number.isFinite(n) ? n : undefined;
  })(),
  temperature: process.env.NEUROLINK_DEFAULT_TEMPERATURE
    ? (() => {
        const t = parseFloat(
          process.env.NEUROLINK_DEFAULT_TEMPERATURE as string,
        );
        return Number.isFinite(t) ? t : DEFAULT_TEMPERATURE;
      })()
    : DEFAULT_TEMPERATURE,
};
