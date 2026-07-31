/* eslint-disable max-lines-per-function */
// Native SDK imports - no more @ai-sdk/google-vertex dependency
import fs from "fs";
import path from "path";
import os from "os";
import type { ZodType } from "zod";
import type { AnthropicVertex as AnthropicVertexType } from "@anthropic-ai/vertex-sdk";
import {
  AIProviderName,
  ErrorCategory,
  ErrorSeverity,
} from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import {
  DEFAULT_GEMINI_STREAM_TIMEOUT_MS,
  DEFAULT_MAX_STEPS,
  DEFAULT_TOOL_EXECUTION_TIMEOUT_MS,
  DEFAULT_TOOL_MAX_RETRIES,
  GLOBAL_LOCATION_MODELS,
  IMAGE_GENERATION_MODELS,
  TOOL_STORAGE_TIMEOUT_MS,
} from "../core/constants.js";
import { ModelConfigurationManager } from "../core/modelConfiguration.js";
import { isSchemaComplexityError } from "../core/modules/structuredOutputPolicy.js";
import { stringifyContentSafe } from "../utils/logSanitize.js";
import type { NeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  UnknownRecord,
  ZodUnknownSchema,
  EnhancedGenerateResult,
  GenerateStopReason,
  TextGenerationOptions,
  GenAIClient,
  GoogleGenAIClass,
  GoogleVertexProviderSettings,
  AnthropicVertexSettings,
  StreamOptions,
  StreamResult,
  Tool,
  ToolWithLegacyParams,
  VertexNativePart,
  VertexNativeLoopPart,
  VertexGenaiFunctionDeclaration,
  VertexAnthropicMessage,
  VertexAnthropicTool,
  VertexAnthropicContentBlock,
  VertexToolStep,
  VertexSegment,
  ChatMessage,
  MinimalChatMessage,
} from "../types/index.js";
import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import { ERROR_CODES, NeuroLinkError } from "../utils/errorHandling.js";
import { applyVertexAnthropicCacheBreakpoints } from "../utils/anthropicCacheBreakpoints.js";
import { FileDetector } from "../utils/fileDetector.js";
import { processUnifiedFilesArray } from "../utils/messageBuilder.js";
import { logger } from "../utils/logger.js";
import {
  hasRestrictedOutputLimit,
  RESTRICTED_OUTPUT_TOKEN_LIMIT,
  toVertexAnthropicModelId,
} from "../utils/modelDetection.js";
import { detectImageMimeType } from "../utils/imageDetection.js";
import { resolveClaudeMaxTokens } from "../utils/tokenLimits.js";
import {
  validateApiKey,
  createVertexProjectConfig,
  createGoogleAuthConfig,
} from "../utils/providerConfig.js";
import {
  convertZodToJsonSchema,
  inlineJsonSchema,
  ensureNestedSchemaTypes,
} from "../utils/schemaConversion.js";
import { createNativeThinkingConfig } from "../utils/thinkingConfig.js";
import {
  TimeoutError,
  raceWithAbort,
  withTimeout,
} from "../utils/async/index.js";
import { parseTimeout } from "../utils/timeout.js";
import {
  appendStepText,
  buildAbortedTurnMessage,
  buildContextCapMessage,
  buildToolLoopCapMessage,
  buildTurnStalledMessage,
  buildTurnTimeoutMessage,
  buildWrapupNudgeText,
  createContextGuard,
  createTextChannel,
  createTurnClock,
  extractThoughtSignature,
  isAbortError,
  mapGeminiFinishReason,
  prependConversationMessages,
  resolveTurnStopReason,
  DedupExecuteMap,
} from "./googleNativeGemini3.js";
import { getContextWindowSize } from "../constants/contextWindows.js";
import { resolveLiveTool } from "../tools/toolDiscovery.js";
import {
  ATTR,
  LANGFUSE_ATTR,
  spanJsonAttribute,
  tracers,
  withClientSpan,
  withClientStreamSpan,
  withSpan,
} from "../telemetry/index.js";
import {
  SpanKind,
  SpanStatusCode,
  context as otelContext,
  trace as otelTrace,
} from "@opentelemetry/api";
import { calculateCost } from "../utils/pricing.js";
import { transformToolExecutions } from "../utils/transformationUtils.js";
import { resolveToolExecutionRecords } from "../core/toolExecutionRecorder.js";
import { resolveSamplingParams } from "../models/modelRegistry.js";
import { sanitizeAnthropicMessagesForTrace } from "../utils/anthropicTraceSanitizer.js";
import {
  extractMcpToolErrorMessage,
  extractToolFailureText,
} from "../utils/mcpErrorText.js";
import type { Schema, LanguageModel } from "../types/index.js";

// Import proper types for multimodal message handling

// Dynamic import helper for native Anthropic Vertex SDK
let anthropicVertexModule: typeof import("@anthropic-ai/vertex-sdk") | null =
  null;

async function getAnthropicVertexModule(): Promise<
  typeof import("@anthropic-ai/vertex-sdk")
> {
  if (!anthropicVertexModule) {
    anthropicVertexModule = await import("@anthropic-ai/vertex-sdk");
  }
  return anthropicVertexModule;
}

// Enhanced Anthropic support check - now uses native SDK
const hasAnthropicSupport = (): boolean => {
  // Always return true as we have the native SDK available
  // Actual availability is checked at runtime when creating the client
  return true;
};

// Parse stored rows into ordered segments, grouping tool_call/tool_result by (turn, step).
function collectHistorySegments(
  conversationMessages: Array<ChatMessage | MinimalChatMessage>,
): VertexSegment[] {
  const segments: VertexSegment[] = [];
  const stepMap = new Map<string, VertexToolStep>();
  let turnCounter = 0;

  const getStep = (stepIndex: number | undefined): VertexToolStep => {
    const key = `${turnCounter}:${stepIndex ?? "x"}`;
    let step = stepMap.get(key);
    if (!step) {
      step = { type: "tool_step", callParts: [], resultParts: [] };
      stepMap.set(key, step);
      segments.push(step);
    }
    return step;
  };

  for (const msg of conversationMessages) {
    if (msg.role === "tool_call") {
      getStep(msg.metadata?.stepIndex).callParts.push({
        name: msg.tool || "unknown",
        input: msg.args || {},
      });
      continue;
    }
    if (msg.role === "tool_result") {
      getStep(msg.metadata?.stepIndex).resultParts.push(
        msg.content && msg.content.length > 0 ? msg.content : "(no output)",
      );
      continue;
    }
    const role =
      msg.role === "assistant"
        ? "assistant"
        : msg.role === "user"
          ? "user"
          : null;
    if (!role || !msg.content || msg.content.trim().length === 0) {
      continue;
    }
    // New turn → fresh step namespace for any following tool rows.
    turnCounter++;
    segments.push({ type: "regular", role, parts: [msg.content] });
  }
  return segments;
}

// Append blocks to the trailing turn if it shares the role, else start a new turn.
function pushTurn(
  messages: VertexAnthropicMessage[],
  role: "user" | "assistant",
  blocks: VertexAnthropicContentBlock[],
): void {
  const last = messages[messages.length - 1];
  if (last && last.role === role && Array.isArray(last.content)) {
    last.content.push(...blocks);
  } else {
    messages.push({ role, content: [...blocks] });
  }
}

// Pair a tool step's calls/results by position; unbalanced extras are dropped
// because Anthropic 400s on an orphaned tool_use/tool_result reference.
function pairToolStep(
  step: VertexToolStep,
  ordinal: number,
): {
  uses: VertexAnthropicContentBlock[];
  results: VertexAnthropicContentBlock[];
} {
  const calls = step.callParts as Array<{
    name: string;
    input: Record<string, unknown>;
  }>;
  const resultStrings = step.resultParts as string[];
  const paired = Math.min(calls.length, resultStrings.length);
  if (paired !== calls.length || paired !== resultStrings.length) {
    logger.debug(
      "[GoogleVertex] Unbalanced tool step in Claude history replay",
      {
        calls: calls.length,
        results: resultStrings.length,
        paired,
      },
    );
  }
  const uses: VertexAnthropicContentBlock[] = [];
  const results: VertexAnthropicContentBlock[] = [];
  for (let i = 0; i < paired; i++) {
    const id = `hist_${ordinal}_${i}`;
    uses.push({
      type: "tool_use",
      id,
      name: calls[i].name,
      input: calls[i].input,
    });
    results.push({
      type: "tool_result",
      tool_use_id: id,
      content: resultStrings[i],
    });
  }
  return { uses, results };
}

// Drop leading turns until the first is a real user turn — Anthropic requires it
// (covers a leading assistant/tool step and an orphaned tool_result-only turn).
function trimLeadingNonUser(messages: VertexAnthropicMessage[]): void {
  const isToolResultOnly = (m: VertexAnthropicMessage): boolean =>
    Array.isArray(m.content) &&
    m.content.length > 0 &&
    m.content.every((block) => block.type === "tool_result");
  while (
    messages.length > 0 &&
    (messages[0].role !== "user" || isToolResultOnly(messages[0]))
  ) {
    messages.shift();
  }
}

// Rebuild Anthropic history with paired tool_use/tool_result turns from stored rows.
export function buildAnthropicHistoryMessages(
  conversationMessages: Array<ChatMessage | MinimalChatMessage>,
): VertexAnthropicMessage[] {
  const messages: VertexAnthropicMessage[] = [];
  let stepOrdinal = 0;
  for (const seg of collectHistorySegments(conversationMessages)) {
    if (seg.type === "regular") {
      pushTurn(messages, seg.role === "assistant" ? "assistant" : "user", [
        { type: "text", text: String(seg.parts[0] ?? "") },
      ]);
      continue;
    }
    const { uses, results } = pairToolStep(seg, stepOrdinal);
    if (uses.length === 0) {
      continue;
    }
    stepOrdinal++;
    pushTurn(messages, "assistant", uses);
    pushTurn(messages, "user", results);
  }
  trimLeadingNonUser(messages);

  if (logger.shouldLog("debug")) {
    const blocks = messages.flatMap((m) =>
      Array.isArray(m.content) ? m.content : [],
    );
    logger.debug("[GoogleVertex] Replayed Claude history with tool turns", {
      historyMessages: messages.length,
      toolUseBlocks: blocks.filter((b) => b.type === "tool_use").length,
      toolResultBlocks: blocks.filter((b) => b.type === "tool_result").length,
    });
  }
  return messages;
}

// Append the live user turn, merging into a trailing user turn to avoid back-to-back user messages.
export function appendUserMessage(
  messages: VertexAnthropicMessage[],
  content: VertexAnthropicMessage["content"],
): void {
  const last = messages[messages.length - 1];
  if (last && last.role === "user") {
    const head = Array.isArray(last.content)
      ? last.content
      : [{ type: "text" as const, text: last.content }];
    const tail = Array.isArray(content)
      ? content
      : [{ type: "text" as const, text: content }];
    last.content = [...head, ...tail];
    return;
  }
  messages.push({ role: "user", content });
}

/**
 * Recursively strip JSON-schema fields that Vertex Gemini's function-call AND
 * `responseSchema` (structured output) validators reject with 400
 * INVALID_ARGUMENT. Vertex implements OpenAPI 3.0 Schema strictly and rejects
 * extension fields that the broader JSON Schema spec allows. The fields
 * stripped here have no semantic meaning for the model, so removing them is
 * safe for every caller.
 *
 * Fields removed:
 * - `additionalProperties` — extension; Vertex rejects on any nested object.
 * - `default` — Vertex rejects defaults on object/array-typed properties and
 *   on properties that are also marked `required`. Safest to strip globally
 *   because the model never inspects them.
 * - `$schema`, `$id`, `$ref`, `definitions`, `$defs` — JSON-Schema-meta
 *   fields that Vertex doesn't recognise.
 * - `examples` — accepted by some Gemini variants but not 2.5-flash; strip
 *   to avoid the model rejecting tool schemas under that path.
 * - `errorMessage` — emitted by `convertZodToJsonSchema` (which enables
 *   zod-to-json-schema's `errorMessages: true`) for any field carrying a
 *   custom message, e.g. `z.string().regex(re, { message })`. Vertex's
 *   `response_schema` validator rejects it with `Unknown name "errorMessage"
 *   … Cannot find field`, failing the whole structured-output request.
 *
 * Exported for deterministic unit testing of the sanitization contract.
 */
export function stripAdditionalPropertiesDeep(
  schema: Record<string, unknown> | undefined,
): void {
  if (!schema || typeof schema !== "object") {
    return;
  }
  const FIELDS_TO_STRIP = [
    "additionalProperties",
    "default",
    "$schema",
    "$id",
    "$ref",
    "definitions",
    "$defs",
    "examples",
    "errorMessage",
  ] as const;
  for (const field of FIELDS_TO_STRIP) {
    if (field in schema) {
      delete (schema as Record<string, unknown>)[field];
    }
  }
  // JSON Schema Draft-4 `exclusiveMinimum: true` / `exclusiveMaximum: true`
  // (boolean form) is rejected by Vertex's OpenAPI 3.0 validator, which
  // expects a numeric bound. zod-to-json-schema's openApi3 target still
  // emits the Draft-4 form for `z.number().positive()` etc. Translate the
  // boolean form into the numeric form when paired with `minimum` /
  // `maximum`; otherwise drop it (the model doesn't validate, so the
  // constraint is informational only).
  if (typeof schema.exclusiveMinimum === "boolean") {
    if (
      schema.exclusiveMinimum === true &&
      typeof schema.minimum === "number"
    ) {
      schema.exclusiveMinimum = schema.minimum;
      delete schema.minimum;
    } else {
      delete schema.exclusiveMinimum;
    }
  }
  if (typeof schema.exclusiveMaximum === "boolean") {
    if (
      schema.exclusiveMaximum === true &&
      typeof schema.maximum === "number"
    ) {
      schema.exclusiveMaximum = schema.maximum;
      delete schema.maximum;
    } else {
      delete schema.exclusiveMaximum;
    }
  }
  // Strip `maximum` values that exceed int32 range — Vertex's protobuf
  // serializer treats `type: "integer"` as int32 and rejects bounds beyond
  // 2^31. zod's `.positive().int()` emits Number.MAX_SAFE_INTEGER as the
  // upper bound (8.9e15), which trips this. The constraint is informational
  // for the model anyway, so dropping it is safe.
  const INT32_MAX = 2147483647;
  if (typeof schema.maximum === "number" && schema.maximum > INT32_MAX) {
    delete schema.maximum;
  }
  if (typeof schema.minimum === "number" && schema.minimum < -INT32_MAX) {
    delete schema.minimum;
  }
  if (schema.properties && typeof schema.properties === "object") {
    for (const child of Object.values(
      schema.properties as Record<string, unknown>,
    )) {
      if (child && typeof child === "object") {
        stripAdditionalPropertiesDeep(child as Record<string, unknown>);
      }
    }
  }
  if (schema.items && typeof schema.items === "object") {
    if (Array.isArray(schema.items)) {
      for (const item of schema.items) {
        if (item && typeof item === "object") {
          stripAdditionalPropertiesDeep(item as Record<string, unknown>);
        }
      }
    } else {
      stripAdditionalPropertiesDeep(schema.items as Record<string, unknown>);
    }
  }
  for (const key of ["allOf", "anyOf", "oneOf"] as const) {
    if (Array.isArray(schema[key])) {
      for (const branch of schema[key] as unknown[]) {
        if (branch && typeof branch === "object") {
          stripAdditionalPropertiesDeep(branch as Record<string, unknown>);
        }
      }
    }
  }
}

// Configuration helpers - now using consolidated utility
const getVertexProjectId = (): string => {
  return validateApiKey(createVertexProjectConfig());
};

const getVertexLocation = (): string => {
  return (
    process.env.GOOGLE_CLOUD_LOCATION ||
    process.env.VERTEX_LOCATION ||
    process.env.GOOGLE_VERTEX_LOCATION ||
    "us-central1"
  );
};

/**
 * Resolve the effective Vertex region for a given model.
 *
 * Policy (matches the bugfixes-suite contract):
 *  - Every Gemini model (`gemini-*`) is force-routed to the `global` endpoint
 *    regardless of any caller-supplied region. Regional endpoints 404 for
 *    Gemini 3.x previews and the regional/global behaviour for 2.x is
 *    consistent enough that pinning all Gemini traffic to global is the
 *    right safe default. The legacy `GLOBAL_LOCATION_MODELS` allowlist is
 *    kept as a defence-in-depth fallback so any non-`gemini-` identifiers
 *    that still need global (e.g. image-gen aliases) keep working.
 *  - Non-Gemini models (Claude on Vertex, embeddings, custom models) keep
 *    the caller-supplied region or fall back to env-derived defaults.
 *
 * @param modelName - The target model identifier.
 * @param configuredLocation - Caller-provided region (e.g. options.region).
 *   Used as the fallback for non-Gemini models; ignored for Gemini.
 * @returns The region string to pass to the @google/genai client.
 */
export const resolveVertexLocation = (
  modelName: string | undefined,
  configuredLocation?: string,
): string => {
  const fallback = configuredLocation || getVertexLocation();
  if (!modelName) {
    return fallback;
  }
  const lower = modelName.toLowerCase();
  const isGemini =
    lower.startsWith("gemini-") ||
    lower.includes("/gemini-") ||
    GLOBAL_LOCATION_MODELS.some(
      (m) =>
        lower === m.toLowerCase() ||
        lower.includes(m.toLowerCase()) ||
        m.toLowerCase().includes(lower),
    );
  if (isGemini) {
    return process.env.GOOGLE_VERTEX_GLOBAL_LOCATION || "global";
  }
  return fallback;
};

/**
 * Backwards-compatible internal alias kept so existing call sites compile
 * unchanged. New code should call `resolveVertexLocation` directly.
 */
const resolveVertexRegionForModel = resolveVertexLocation;

const getDefaultVertexModel = (): string => {
  // Use gemini-2.5-flash as default - latest and best price-performance model
  // Override with VERTEX_MODEL environment variable if needed
  return process.env.VERTEX_MODEL || "gemini-2.5-flash";
};

const hasGoogleCredentials = (): boolean => {
  return !!(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    (process.env.GOOGLE_AUTH_CLIENT_EMAIL &&
      process.env.GOOGLE_AUTH_PRIVATE_KEY)
  );
};

// Cache the runtime-created credentials file path so we don't write a new file
// on every settings creation (which would leak files in /tmp). The file is also
// cleaned up on process exit.
let cachedRuntimeCredentialsFile: string | null = null;
let credentialsCleanupRegistered = false;

const registerCredentialsCleanup = (filePath: string): void => {
  if (credentialsCleanupRegistered) {
    return;
  }
  credentialsCleanupRegistered = true;
  const cleanup = () => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignore cleanup errors — best-effort
    }
  };
  process.once("exit", cleanup);
  process.once("SIGINT", () => {
    cleanup();
    process.exit(130);
  });
  process.once("SIGTERM", () => {
    cleanup();
    process.exit(143);
  });
};

// Enhanced Vertex settings creation with authentication fallback and proxy support
const createVertexSettings = async (
  region?: string,
): Promise<GoogleVertexProviderSettings> => {
  const location = region || getVertexLocation();
  const project = getVertexProjectId();

  const baseSettings: GoogleVertexProviderSettings = {
    project,
    location,
    fetch: createProxyFetch(),
  };

  // Note: Global endpoint handling is managed by the @google/genai SDK based on location parameter.
  // Authentication is handled via GOOGLE_APPLICATION_CREDENTIALS environment variable
  // or the temporary credentials file approach below.

  // 🎯 OPTION 2: Create credentials file from environment variables at runtime
  // This solves the problem where GOOGLE_APPLICATION_CREDENTIALS exists in ZSHRC locally
  // but the file doesn't exist on production servers

  // First, try to create credentials file from individual environment variables
  const requiredEnvVarsForFile = {
    type: process.env.GOOGLE_AUTH_TYPE,
    project_id: process.env.GOOGLE_AUTH_BREEZE_PROJECT_ID,
    private_key: process.env.GOOGLE_AUTH_PRIVATE_KEY,
    client_email: process.env.GOOGLE_AUTH_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_AUTH_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_AUTH_URI,
    token_uri: process.env.GOOGLE_AUTH_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_AUTH_CLIENT_CERT_URL,
    universe_domain: process.env.GOOGLE_AUTH_UNIVERSE_DOMAIN,
  };

  // If we have the essential fields, create a runtime credentials file
  // (or reuse the one we already wrote earlier in this process)
  if (
    requiredEnvVarsForFile.client_email &&
    requiredEnvVarsForFile.private_key
  ) {
    try {
      // Reuse cached file if it still exists on disk
      if (
        cachedRuntimeCredentialsFile &&
        fs.existsSync(cachedRuntimeCredentialsFile)
      ) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS =
          cachedRuntimeCredentialsFile;
        return baseSettings;
      }

      // Build complete service account credentials object
      const serviceAccountCredentials = {
        type: requiredEnvVarsForFile.type || "service_account",
        project_id: requiredEnvVarsForFile.project_id || getVertexProjectId(),
        private_key: requiredEnvVarsForFile.private_key.replace(/\\n/g, "\n"),
        client_email: requiredEnvVarsForFile.client_email,
        client_id: requiredEnvVarsForFile.client_id || "",
        auth_uri:
          requiredEnvVarsForFile.auth_uri ||
          "https://accounts.google.com/o/oauth2/auth",
        token_uri:
          requiredEnvVarsForFile.token_uri ||
          "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          requiredEnvVarsForFile.auth_provider_x509_cert_url ||
          "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: requiredEnvVarsForFile.client_x509_cert_url || "",
        universe_domain:
          requiredEnvVarsForFile.universe_domain || "googleapis.com",
      };

      // Create temporary credentials file (once per process)
      const tmpDir = os.tmpdir();
      const credentialsFileName = `google-credentials-${Date.now()}-${Math.random().toString(36).substring(2, 11)}.json`;
      const credentialsFilePath = path.join(tmpDir, credentialsFileName);

      fs.writeFileSync(
        credentialsFilePath,
        JSON.stringify(serviceAccountCredentials, null, 2),
        // Owner read/write only — credentials should not be world-readable
        { mode: 0o600 },
      );

      // Set the environment variable to point to our runtime-created file
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsFilePath;
      cachedRuntimeCredentialsFile = credentialsFilePath;
      registerCredentialsCleanup(credentialsFilePath);

      // Now continue with the normal flow - check if the file exists
      const fileExists = fs.existsSync(credentialsFilePath);
      if (fileExists) {
        return baseSettings;
      }
    } catch {
      // Silent error handling for runtime credentials file creation
    }
  }

  // 🎯 OPTION 1: Check for principal account authentication (Accept any valid GOOGLE_APPLICATION_CREDENTIALS file (service account OR ADC))
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK) {
    const credentialsPath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK;

    // Check if the credentials file exists
    let fileExists = false;
    try {
      fileExists = fs.existsSync(credentialsPath);
    } catch {
      // fileExists remains false
    }

    if (fileExists) {
      return baseSettings;
    }
  } else {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      // Check if the credentials file exists
      let fileExists = false;
      try {
        fileExists = fs.existsSync(credentialsPath);
      } catch {
        // fileExists remains false
      }

      if (fileExists) {
        return baseSettings;
      }
    }
  }

  // Log warning if no valid authentication is available
  // Note: Authentication is handled via GOOGLE_APPLICATION_CREDENTIALS environment variable
  // or the temporary credentials file approach (OPTION 2 above).
  logger.warn("No valid authentication found for Google Vertex AI", {
    authMethod: "none",
    authenticationAttempts: {
      principalAccountFile: {
        envVarSet: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        filePath: process.env.GOOGLE_APPLICATION_CREDENTIALS || "NOT_SET",
        fileExists: false, // We already checked above
      },
      explicitCredentials: {
        hasClientEmail: !!process.env.GOOGLE_AUTH_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.GOOGLE_AUTH_PRIVATE_KEY,
      },
    },
    troubleshooting: [
      "1. Ensure GOOGLE_APPLICATION_CREDENTIALS points to an existing file, OR",
      "2. Set individual environment variables: GOOGLE_AUTH_CLIENT_EMAIL and GOOGLE_AUTH_PRIVATE_KEY",
    ],
  });
  return baseSettings;
};

// Create Anthropic-specific Vertex settings for native @anthropic-ai/vertex-sdk
const createVertexAnthropicSettings = async (
  region?: string,
  timeoutMs?: number,
): Promise<AnthropicVertexSettings> => {
  const location = region || getVertexLocation();
  const project = getVertexProjectId();

  return {
    projectId: project,
    region: location,
    ...(timeoutMs !== undefined && { timeout: timeoutMs }),
    // The SDK's built-in retry honors Retry-After hints without any upper
    // bound (a 429 with retry-after: 8549 sleeps 2.4h per retry, invisible
    // to fallback orchestration). Retries are the orchestrator's job.
    maxRetries: 0,
  };
};

// Helper function to determine if a model is an Anthropic model
const isAnthropicModel = (modelName: string): boolean => {
  return modelName.toLowerCase().includes("claude");
};

/**
 * Google Vertex AI Provider v2 - BaseProvider Implementation
 *
 * Features:
 * - Extends BaseProvider for shared functionality
 * - Preserves existing Google Cloud authentication
 * - Maintains Anthropic model support via dynamic imports
 * - Fresh model creation for each request
 * - Enhanced error handling with setup guidance
 * - Tool registration and context management
 *
 * @important Tools + Schema Support (Fixed)
 * Gemini models on Vertex AI now support combining function calling (tools) with
 * structured output (JSON schema) simultaneously. The fix works by NOT setting
 * `responseMimeType: "application/json"` when tools are present, which was
 * causing the Google API error.
 *
 * The `responseSchema` is still set to guide the output structure, allowing
 * tools to execute AND the final output to follow the schema format.
 *
 * @example Gemini models with tools + schemas
 * ```typescript
 * const provider = new GoogleVertexProvider("gemini-2.5-flash");
 * const result = await provider.generate({
 *   input: { text: "Analyze data using tools" },
 *   schema: MySchema,
 *   output: { format: "json" },
 *   // No need for disableTools: true anymore!
 * });
 * ```
 *
 * @example Claude models (always supported both)
 * ```typescript
 * const provider = new GoogleVertexProvider("claude-3-5-sonnet-20241022");
 * const result = await provider.generate({
 *   input: { text: "Analyze data" },
 *   schema: MySchema,
 *   output: { format: "json" }
 * });
 * ```
 *
 * @note "Too many states for serving" errors can still occur with very complex schemas + tools.
 *       Solution: Simplify schema or reduce number of tools if this occurs.
 * @see https://cloud.google.com/vertex-ai/docs/generative-ai/learn/models
 */
export class GoogleVertexProvider extends BaseProvider {
  private projectId: string;
  private location: string;
  private registeredTools: Map<
    string,
    {
      description: string;
      parameters: ZodType<unknown>;
      execute: (params: Record<string, unknown>) => Promise<unknown>;
    }
  > = new Map();
  private toolContext: Record<string, unknown> = {};

  // Memory-managed cache for model configuration lookups to avoid repeated calls
  // Uses WeakMap for automatic cleanup and bounded LRU for recently used models
  private static modelConfigCache: Map<string, unknown> = new Map();
  private static modelConfigCacheTime = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 50; // Prevent memory leaks by limiting cache size

  // Memory-managed cache for maxTokens handling decisions to optimize streaming performance
  private static maxTokensCache: Map<string, boolean> = new Map();
  private static maxTokensCacheTime = 0;

  constructor(
    modelName?: string,
    _providerName?: string,
    sdk?: unknown,
    region?: string,
    credentials?: Record<string, unknown>,
  ) {
    super(modelName, "vertex" as AIProviderName, sdk as NeuroLink | undefined);

    // Apply per-request credentials if provided
    if (credentials) {
      if (credentials.projectId) {
        process.env.GOOGLE_CLOUD_PROJECT = String(credentials.projectId);
      }
      if (credentials.location) {
        process.env.GOOGLE_CLOUD_LOCATION = String(credentials.location);
      }
      if (credentials.apiKey) {
        process.env.GOOGLE_API_KEY = String(credentials.apiKey);
      }
    }

    // Validate Google Cloud credentials - now using consolidated utility
    if (!hasGoogleCredentials()) {
      validateApiKey(createGoogleAuthConfig());
    }

    // Initialize Google Cloud configuration
    this.projectId = (credentials?.projectId as string) || getVertexProjectId();
    this.location =
      region || (credentials?.location as string) || getVertexLocation();

    logger.debug("[GoogleVertexProvider] Constructor initialized", {
      regionParam: region,
      resolvedLocation: this.location,
      projectId: this.projectId,
    });

    logger.debug("Google Vertex AI BaseProvider v2 initialized", {
      modelName: this.modelName,
      projectId: this.projectId,
      location: this.location,
      provider: this.providerName,
    });
  }

  protected getProviderName(): AIProviderName {
    return "vertex" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultVertexModel();
  }

  /**
   * Returns the Vercel AI SDK model instance for Google Vertex
   * Creates fresh model instances for each request
   */
  protected async getAISDKModel(): Promise<LanguageModel> {
    // This method is no longer used - we route ALL models directly to native SDKs
    // in executeStream and generate methods. Throwing an error to catch any
    // unexpected code paths that might try to use the old Vercel AI SDK approach.
    throw new NeuroLinkError({
      code: ERROR_CODES.INVALID_CONFIGURATION,
      message:
        "GoogleVertexProvider no longer uses @ai-sdk/google-vertex. All models use native SDKs: @google/genai for Gemini, @anthropic-ai/vertex-sdk for Claude.",
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.CRITICAL,
      retriable: false,
      context: { provider: this.providerName, model: this.modelName },
    });
  }

  /**
   * Initialize model creation tracking
   */
  private initializeModelCreationLogging(): {
    modelCreationId: string;
    modelCreationStartTime: number;
    modelCreationHrTimeStart: bigint;
    modelName: string;
  } {
    const modelCreationId = `vertex-model-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const modelCreationStartTime = Date.now();
    const modelCreationHrTimeStart = process.hrtime.bigint();
    const modelName = this.modelName || getDefaultVertexModel();

    return {
      modelCreationId,
      modelCreationStartTime,
      modelCreationHrTimeStart,
      modelName,
    };
  }

  /**
   * Check if model is Anthropic-based and attempt creation
   */
  private async attemptAnthropicModelCreation(
    modelName: string,
    modelCreationId: string,
    modelCreationStartTime: number,
    modelCreationHrTimeStart: bigint,
  ): Promise<LanguageModel | null> {
    const isAnthropic = isAnthropicModel(modelName);

    if (!isAnthropic) {
      return null;
    }

    logger.debug("Creating Anthropic model using vertexAnthropic provider", {
      modelName,
    });

    if (!hasAnthropicSupport()) {
      logger.warn(
        `[GoogleVertexProvider] Anthropic support not available, falling back to Google model`,
      );
      return null;
    }

    try {
      const anthropicModel = await this.createAnthropicModel(modelName);

      if (anthropicModel) {
        return anthropicModel;
      }

      // Anthropic model creation returned null, falling back to Google model
    } catch (error) {
      logger.error(
        `[GoogleVertexProvider] ❌ LOG_POINT_V006_ANTHROPIC_MODEL_ERROR`,
        {
          logPoint: "V006_ANTHROPIC_MODEL_ERROR",
          modelCreationId,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - modelCreationStartTime,
          elapsedNs: (
            process.hrtime.bigint() - modelCreationHrTimeStart
          ).toString(),
          modelName,
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : "UnknownError",
          errorStack: error instanceof Error ? error.stack : undefined,
          fallbackToGoogle: true,
          message:
            "Anthropic model creation failed - falling back to Google model",
        },
      );
    }

    // Fall back to regular model if Anthropic not available
    logger.warn(
      `Anthropic model ${modelName} requested but not available, falling back to Google model`,
    );
    return null;
  }

  /**
   * Create Google Vertex model with comprehensive logging and error handling
   */
  private async createGoogleVertexModel(
    modelName: string,
    modelCreationId: string,
    modelCreationStartTime: number,
    modelCreationHrTimeStart: bigint,
  ): Promise<LanguageModel> {
    logger.debug("Creating Google Vertex model", {
      modelName,
      project: this.projectId,
      location: this.location,
    });

    const vertexSettingsStartTime = process.hrtime.bigint();
    logger.debug(
      `[GoogleVertexProvider] ⚙️ LOG_POINT_V008_VERTEX_SETTINGS_START`,
      {
        logPoint: "V008_VERTEX_SETTINGS_START",
        modelCreationId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - modelCreationStartTime,
        elapsedNs: (
          process.hrtime.bigint() - modelCreationHrTimeStart
        ).toString(),
        vertexSettingsStartTimeNs: vertexSettingsStartTime.toString(),

        // Network configuration analysis
        networkConfig: {
          projectId: this.projectId,
          location: this.location,
          expectedEndpoint: `https://${this.location}-aiplatform.googleapis.com`,
          httpProxy: process.env.HTTP_PROXY || process.env.http_proxy,
          httpsProxy: process.env.HTTPS_PROXY || process.env.https_proxy,
          noProxy: process.env.NO_PROXY || process.env.no_proxy,
          proxyConfigured: !!(
            process.env.HTTP_PROXY ||
            process.env.HTTPS_PROXY ||
            process.env.http_proxy ||
            process.env.https_proxy
          ),
        },

        message:
          "Starting Vertex settings creation with network configuration analysis",
      },
    );

    try {
      const vertexSettings = await createVertexSettings(this.location);

      const vertexSettingsEndTime = process.hrtime.bigint();
      const vertexSettingsDurationNs =
        vertexSettingsEndTime - vertexSettingsStartTime;

      logger.debug(
        `[GoogleVertexProvider] ✅ LOG_POINT_V009_VERTEX_SETTINGS_SUCCESS`,
        {
          logPoint: "V009_VERTEX_SETTINGS_SUCCESS",
          modelCreationId,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - modelCreationStartTime,
          elapsedNs: (
            process.hrtime.bigint() - modelCreationHrTimeStart
          ).toString(),
          vertexSettingsDurationNs: vertexSettingsDurationNs.toString(),
          vertexSettingsDurationMs: Number(vertexSettingsDurationNs) / 1000000,

          // Settings analysis
          vertexSettingsAnalysis: {
            hasSettings: !!vertexSettings,
            settingsType: typeof vertexSettings,
            settingsKeys: vertexSettings ? Object.keys(vertexSettings) : [],
            projectId: vertexSettings?.project,
            location: vertexSettings?.location,
            hasFetch: !!vertexSettings?.fetch,
            settingsSize: vertexSettings
              ? JSON.stringify(vertexSettings).length
              : 0,
          },

          message: "Vertex settings created successfully",
        },
      );

      return await this.createVertexInstance(
        vertexSettings,
        modelName,
        modelCreationId,
        modelCreationStartTime,
        modelCreationHrTimeStart,
      );
    } catch (error) {
      const vertexSettingsErrorTime = process.hrtime.bigint();
      const vertexSettingsDurationNs =
        vertexSettingsErrorTime - vertexSettingsStartTime;
      const totalErrorDurationNs =
        vertexSettingsErrorTime - modelCreationHrTimeStart;

      logger.error(
        `[GoogleVertexProvider] ❌ LOG_POINT_V014_VERTEX_SETTINGS_ERROR`,
        {
          logPoint: "V014_VERTEX_SETTINGS_ERROR",
          modelCreationId,
          timestamp: new Date().toISOString(),
          totalElapsedMs: Date.now() - modelCreationStartTime,
          totalElapsedNs: totalErrorDurationNs.toString(),
          totalErrorDurationMs: Number(totalErrorDurationNs) / 1000000,
          vertexSettingsDurationNs: vertexSettingsDurationNs.toString(),
          vertexSettingsDurationMs: Number(vertexSettingsDurationNs) / 1000000,

          // Comprehensive error analysis
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : "UnknownError",
          errorStack: error instanceof Error ? error.stack : undefined,

          // Network diagnostic information
          networkDiagnostics: {
            errorCode: (error as Record<string, unknown>)?.code || "UNKNOWN",
            errorErrno: (error as Record<string, unknown>)?.errno || "UNKNOWN",
            errorAddress:
              (error as Record<string, unknown>)?.address || "UNKNOWN",
            errorPort: (error as Record<string, unknown>)?.port || "UNKNOWN",
            errorSyscall:
              (error as Record<string, unknown>)?.syscall || "UNKNOWN",
            errorHostname:
              (error as Record<string, unknown>)?.hostname || "UNKNOWN",
            isTimeoutError:
              error instanceof Error &&
              (error.message.includes("timeout") ||
                error.message.includes("ETIMEDOUT")),
            isNetworkError:
              error instanceof Error &&
              (error.message.includes("ENOTFOUND") ||
                error.message.includes("ECONNREFUSED") ||
                error.message.includes("ETIMEDOUT")),
            isAuthError:
              error instanceof Error &&
              (error.message.includes("PERMISSION_DENIED") ||
                error.message.includes("401") ||
                error.message.includes("403")),
            infrastructureIssue:
              error instanceof Error &&
              error.message.includes("ETIMEDOUT") &&
              error.message.includes("aiplatform.googleapis.com"),
          },

          // Environment at error time
          errorEnvironment: {
            httpProxy: process.env.HTTP_PROXY || process.env.http_proxy,
            httpsProxy: process.env.HTTPS_PROXY || process.env.https_proxy,
            googleAppCreds:
              process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK ||
              process.env.GOOGLE_APPLICATION_CREDENTIALS ||
              "NOT_SET",
            hasGoogleServiceKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
          },

          message:
            "Vertex settings creation failed - critical network/authentication error",
        },
      );

      throw error;
    }
  }

  /**
   * @deprecated This method is no longer used. All models now use native SDKs.
   */
  private async createVertexInstance(
    _vertexSettings: unknown,
    _modelName: string,
    _modelCreationId: string,
    _modelCreationStartTime: number,
    _modelCreationHrTimeStart: bigint,
  ): Promise<LanguageModel> {
    // This method is dead code - all models now route to native SDK methods.
    throw new NeuroLinkError({
      code: ERROR_CODES.INVALID_CONFIGURATION,
      message:
        "createVertexInstance is deprecated. Use executeNativeGemini3Stream/Generate or executeNativeAnthropicStream/Generate instead.",
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.CRITICAL,
      retriable: false,
      context: { provider: this.providerName },
    });
  }

  /**
   * Gets the appropriate model instance (Google or Anthropic)
   * Uses dual provider architecture for proper model routing
   * Creates fresh instances for each request to ensure proper authentication
   */
  private async getModel(): Promise<LanguageModel> {
    // Initialize logging and setup
    const {
      modelCreationId,
      modelCreationStartTime,
      modelCreationHrTimeStart,
      modelName,
    } = this.initializeModelCreationLogging();

    // Check if this is an Anthropic model and attempt creation
    const anthropicModel = await this.attemptAnthropicModelCreation(
      modelName,
      modelCreationId,
      modelCreationStartTime,
      modelCreationHrTimeStart,
    );

    if (anthropicModel) {
      return anthropicModel;
    }

    // Fall back to Google Vertex model creation
    return await this.createGoogleVertexModel(
      modelName,
      modelCreationId,
      modelCreationStartTime,
      modelCreationHrTimeStart,
    );
  }

  // executeGenerate removed - BaseProvider handles all generation with tools

  /**
   * Validate stream options
   */
  private validateStreamOptionsOnly(options: StreamOptions): void {
    this.validateStreamOptions(options);
  }

  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ZodType<unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    // ALL models now use native SDKs - no more @ai-sdk/google-vertex dependency
    const modelName =
      options.model || this.modelName || getDefaultVertexModel();

    // Wrap the native stream path in a `neurolink.provider.stream` span so
    // the test:tracing observability harness sees the same span hierarchy
    // it sees for AI Studio. BaseProvider.stream does NOT emit this span
    // for any provider — each native provider has to add it itself.
    return withClientStreamSpan(
      {
        name: "neurolink.provider.stream",
        tracer: tracers.provider,
        attributes: {
          [ATTR.GEN_AI_SYSTEM]: this.providerName,
          [ATTR.GEN_AI_MODEL]: modelName,
          [ATTR.GEN_AI_OPERATION]: "stream",
          [ATTR.NL_PROVIDER]: this.providerName,
        },
      },
      async (streamSpan) => {
        const streamStartTime = Date.now();

        // Tool filter (a0269210): trust options.tools — caller (BaseProvider.stream)
        // already merged MCP/built-in tools and applied any enabledToolNames filter.
        const optionTools = options.tools || {};

        // Emit a `neurolink.message.build` span for the native stream path
        // so observability tooling sees the same hierarchy it sees on
        // Pipeline A. Without this, test:tracing's "Message Build Span"
        // assertion has to skip on every native-Vertex stream.
        const processedOptions = await withSpan(
          {
            name: "neurolink.message.build",
            tracer: tracers.provider,
            attributes: {
              [ATTR.NL_PROVIDER]: this.providerName,
              "message.count": 1,
              "message.build.count": 1,
              "message.build.path": "vertex.native.stream",
            },
          },
          async () => this.processCSVFilesForNativeSDK(options),
        );

        // Pass through to native SDK path
        const mergedOptions = {
          ...processedOptions,
          tools: optionTools,
        };

        try {
          // Route Claude models to native Anthropic SDK
          let result: StreamResult;
          if (isAnthropicModel(modelName)) {
            logger.info(
              "[GoogleVertex] Routing Claude model to native @anthropic-ai/vertex-sdk",
              {
                model: modelName,
                totalToolCount: Object.keys(optionTools).length,
              },
            );
            result = await this.executeNativeAnthropicStream(mergedOptions);
          } else {
            // ALL Gemini models use native @google/genai SDK
            logger.info(
              "[GoogleVertex] Routing Gemini model to native @google/genai",
              {
                model: modelName,
                totalToolCount: Object.keys(optionTools).length,
              },
            );
            result = await this.executeNativeGemini3Stream(mergedOptions);
          }
          // Cost / token usage on the stream span. Native streams resolve
          // usage synchronously (the stream loop has already drained), so
          // `result.usage` is populated by the time we reach this point.
          this.attachUsageAndCostAttributes(
            streamSpan,
            modelName,
            result?.usage,
          );
          // Wrap the result's async iterable to fire onChunk / onFinish
          // lifecycle callbacks. Pipeline A gets these via the AI SDK
          // wrapStream middleware; the native path has to fire them here.
          const wrappedResult = this.wrapStreamResultWithLifecycle(
            options,
            result,
            streamStartTime,
          );
          this.emitStreamEnd(
            modelName,
            streamStartTime,
            true,
            undefined,
            result.finishReason,
          );
          return wrappedResult;
        } catch (error) {
          this.fireGenerateOnError(options, error, streamStartTime);
          this.emitStreamEnd(modelName, streamStartTime, false, error);
          throw error;
        }
      },
      (r) => r.stream,
      // Preserve live getters (finishReason/structuredOutput/…) that the
      // spread would otherwise snapshot before the background loop resolves.
      (r, wrapped) =>
        this.preserveStreamResultAccessors(r, { ...r, stream: wrapped }),
    );
  }

  /**
   * Emit `stream:end` so the Pipeline B observability listener creates a
   * `model.generation` span for native Vertex stream traffic. Mirrors
   * `emitGenerationEnd` (used by `generate()`).
   */
  private emitStreamEnd(
    modelName: string,
    startTime: number,
    success: boolean,
    error?: unknown,
    resolvedFinishReason?: string,
  ): void {
    const emitter = this.neurolink?.getEventEmitter();
    if (!emitter) {
      return;
    }
    emitter.emit("stream:end", {
      provider: this.providerName,
      responseTime: Date.now() - startTime,
      timestamp: Date.now(),
      result: {
        content: "",
        usage: { input: 0, output: 0, total: 0 },
        model: modelName,
        provider: this.providerName,
        finishReason: success ? (resolvedFinishReason ?? "stop") : "error",
      },
      success,
      ...(error
        ? { error: error instanceof Error ? error.message : String(error) }
        : {}),
    });
  }

  /**
   * Create @google/genai client configured for Vertex AI
   */
  private async createVertexGenAIClient(
    regionOverride?: string,
  ): Promise<GenAIClient> {
    const project = getVertexProjectId();
    const location = regionOverride || this.location || getVertexLocation();

    const mod: unknown = await import("@google/genai");
    const ctor = (mod as Record<string, unknown>).GoogleGenAI as unknown;
    if (!ctor) {
      throw new NeuroLinkError({
        code: ERROR_CODES.INVALID_CONFIGURATION,
        message: "@google/genai does not export GoogleGenAI",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.CRITICAL,
        retriable: false,
        context: { module: "@google/genai", expectedExport: "GoogleGenAI" },
      });
    }

    const Ctor = ctor as GoogleGenAIClass;

    // Use vertexai mode with project and location
    // Include httpOptions with proxy fetch for corporate network support
    return new Ctor({
      vertexai: true,
      project,
      location,
      httpOptions: {
        fetch: createProxyFetch(),
      },
    });
  }

  /**
   * Convert one AI-SDK tool into a Vertex Gemini function declaration.
   * Single source for the pre-loop snapshot AND the mid-turn discovery
   * refresh, so tools hydrated by search_tools get the exact same schema
   * treatment (inline, typed, additionalProperties stripped).
   */
  private buildGeminiFunctionDeclaration(
    name: string,
    tool: Tool,
  ): VertexGenaiFunctionDeclaration {
    const decl: VertexGenaiFunctionDeclaration = {
      name,
      description: tool.description || `Tool: ${name}`,
    };

    // Access legacy `parameters` (AI SDK v3/v4) or current `inputSchema` (v6)
    const legacyTool = tool as ToolWithLegacyParams;
    const toolParams = legacyTool.parameters || tool.inputSchema;
    if (toolParams) {
      // Convert and inline schema to resolve $ref/definitions
      const rawSchema = convertZodToJsonSchema(
        toolParams as ZodUnknownSchema,
        "openApi3",
      ) as Record<string, unknown>;
      const inlinedSchema = inlineJsonSchema(rawSchema);
      // Remove $schema if present - @google/genai doesn't need it
      if (inlinedSchema.$schema) {
        delete inlinedSchema.$schema;
      }
      // CRITICAL: Google Vertex AI requires ALL nested schemas to have a type field
      // ensureNestedSchemaTypes recursively adds missing type fields to tool schemas
      // Note: convertZodToJsonSchema now uses openApi3 target which produces nullable: true
      const typedSchema = ensureNestedSchemaTypes(inlinedSchema);
      // Strip `additionalProperties` recursively — Vertex Gemini's
      // function-call validator rejects it on object schemas (returns
      // 400 INVALID_ARGUMENT) even though it's valid OpenAPI 3. The
      // field has no semantic meaning to the model, so dropping it
      // before send is safe for every caller.
      stripAdditionalPropertiesDeep(typedSchema);
      decl.parametersJsonSchema = typedSchema;
    }
    return decl;
  }

  /**
   * Mid-turn tool sync for the native Gemini loops. `search_tools` hydrates
   * discovered tools into the live `options.tools` record between steps, but
   * the loop's declarations + executeMap are a pre-loop snapshot — without
   * this refresh, a tool discovered this turn stays invisible to the rest of
   * the turn and every call to it dies as TOOL_NOT_FOUND. Mutates the
   * declaration array in place (the request config holds it by reference)
   * and clears breaker strikes accrued while the tool was still deferred.
   */
  private refreshGeminiToolDeclarations(
    liveTools: Record<string, Tool> | undefined,
    declarations: VertexGenaiFunctionDeclaration[] | undefined,
    executeMap: DedupExecuteMap,
    failedTools: Map<string, { count: number; lastError: string }>,
  ): void {
    if (!liveTools || !declarations) {
      return;
    }
    const declared = new Set(declarations.map((d) => d.name));
    for (const [name, tool] of Object.entries(liveTools)) {
      if (declared.has(name)) {
        continue;
      }
      declarations.push(this.buildGeminiFunctionDeclaration(name, tool));
      if (tool.execute) {
        executeMap.set(name, tool.execute);
      }
      failedTools.delete(name);
      logger.info(
        `[GoogleVertex] Tool "${name}" hydrated mid-turn via discovery — added to Gemini declarations.`,
      );
    }
  }

  /**
   * Dispatch-miss recovery for the native Gemini loops: the model called a
   * name missing from the executeMap snapshot. Re-read the live record (a
   * tool hydrated by search_tools in this very step batch) or auto-hydrate a
   * deferred catalog tool the model called directly by its advertised name.
   * Returns the dedup-wrapped executor, or undefined when the name is
   * genuinely unknown — callers keep TOOL_NOT_FOUND for that case.
   */
  private resolveGeminiToolOnMiss(
    name: string,
    liveTools: Record<string, Tool> | undefined,
    declarations: VertexGenaiFunctionDeclaration[] | undefined,
    executeMap: DedupExecuteMap,
    failedTools: Map<string, { count: number; lastError: string }>,
  ): Tool["execute"] | undefined {
    if (!declarations) {
      return undefined;
    }
    const tool = resolveLiveTool(liveTools, name);
    if (!tool?.execute) {
      return undefined;
    }
    if (!declarations.some((d) => d.name === name)) {
      declarations.push(this.buildGeminiFunctionDeclaration(name, tool));
    }
    executeMap.set(name, tool.execute);
    // NOT_FOUND strikes accrued while the tool was deferred are snapshot
    // artifacts, not real failures — reset so the breaker starts clean.
    failedTools.delete(name);
    logger.info(
      `[GoogleVertex] Tool "${name}" resolved mid-turn via discovery — executing.`,
    );
    return executeMap.get(name);
  }

  /**
   * Convert one AI-SDK tool into an Anthropic (Claude-on-Vertex) tool
   * declaration. Single source for the pre-loop snapshot AND the mid-turn
   * discovery refresh — Anthropic validates input_schema as JSON Schema
   * draft 2020-12 and rejects OpenAPI-3 dialect (`nullable: true`), so this
   * uses the default JSON Schema target, matching the direct anthropic
   * provider. The Gemini paths keep "openApi3".
   */
  private buildAnthropicToolDeclaration(
    name: string,
    tool: Tool,
  ): VertexAnthropicTool {
    const anthropicTool: VertexAnthropicTool = {
      name,
      description: tool.description || `Tool: ${name}`,
      input_schema: {
        type: "object",
      },
    };

    // Access legacy `parameters` (AI SDK v3/v4) or current `inputSchema` (v6)
    const legacyTool = tool as ToolWithLegacyParams;
    const toolParams = legacyTool.parameters || tool.inputSchema;
    if (toolParams) {
      const jsonSchema = convertZodToJsonSchema(
        toolParams as ZodUnknownSchema,
      ) as Record<string, unknown>;
      const inlined = inlineJsonSchema(jsonSchema);
      anthropicTool.input_schema = {
        type: "object",
        properties: (inlined.properties as Record<string, unknown>) || {},
        required: (inlined.required as string[]) || [],
      };
    }
    return anthropicTool;
  }

  /**
   * Mid-turn tool sync for the Claude-on-Vertex loops — the Anthropic
   * counterpart of refreshGeminiToolDeclarations. Claude only calls tools
   * present in the request's `tools` array, so without this per-step refresh
   * a tool discovered via search_tools is unreachable for the rest of the
   * turn. Mutates the array in place (requestParams holds it by reference).
   */
  private refreshAnthropicToolDeclarations(
    liveTools: Record<string, Tool> | undefined,
    declarations: VertexAnthropicTool[] | undefined,
    executeMap: DedupExecuteMap,
    failedTools: Map<string, { count: number; lastError: string }>,
  ): void {
    if (!liveTools || !declarations) {
      return;
    }
    const declared = new Set(declarations.map((d) => d.name));
    for (const [name, tool] of Object.entries(liveTools)) {
      if (declared.has(name)) {
        continue;
      }
      declarations.push(this.buildAnthropicToolDeclaration(name, tool));
      if (tool.execute) {
        executeMap.set(name, tool.execute);
      }
      failedTools.delete(name);
      logger.info(
        `[GoogleVertex] Tool "${name}" hydrated mid-turn via discovery — added to Anthropic declarations.`,
      );
    }
  }

  /**
   * Dispatch-miss recovery for the Claude-on-Vertex loops — the Anthropic
   * counterpart of resolveGeminiToolOnMiss.
   */
  private resolveAnthropicToolOnMiss(
    name: string,
    liveTools: Record<string, Tool> | undefined,
    declarations: VertexAnthropicTool[] | undefined,
    executeMap: DedupExecuteMap,
    failedTools: Map<string, { count: number; lastError: string }>,
  ): Tool["execute"] | undefined {
    if (!declarations) {
      return undefined;
    }
    const tool = resolveLiveTool(liveTools, name);
    if (!tool?.execute) {
      return undefined;
    }
    if (!declarations.some((d) => d.name === name)) {
      declarations.push(this.buildAnthropicToolDeclaration(name, tool));
    }
    executeMap.set(name, tool.execute);
    failedTools.delete(name);
    logger.info(
      `[GoogleVertex] Tool "${name}" resolved mid-turn via discovery — executing.`,
    );
    return executeMap.get(name);
  }

  /**
   * Execute stream using native @google/genai SDK for Gemini 3 models on Vertex AI
   * This bypasses @ai-sdk/google-vertex to properly handle thought_signature
   */
  private async executeNativeGemini3Stream(
    options: StreamOptions,
  ): Promise<StreamResult> {
    const modelName =
      options.model || this.modelName || getDefaultVertexModel();
    const effectiveLocation = resolveVertexRegionForModel(
      modelName,
      options.region,
    );
    const client = await this.createVertexGenAIClient(effectiveLocation);

    logger.debug("[GoogleVertex] Using native @google/genai for Gemini 3", {
      model: modelName,
      hasTools: !!options.tools && Object.keys(options.tools).length > 0,
      project: this.projectId,
      location: effectiveLocation,
    });

    // Build contents from input with multimodal support
    const contents: Array<{
      role: string;
      parts: VertexNativePart[];
    }> = [];

    // Build user message parts - start with text.
    // `options.input.text` is `string | undefined` in strict mode; the
    // VertexNativePart `text` field requires `string`, so coerce to "" if
    // unset (the multimodal-only path still appends other parts below).
    const userParts: VertexNativePart[] = [{ text: options.input.text ?? "" }];

    // Add PDF files as inlineData parts if present
    // Cast input to access multimodal properties that may exist at runtime
    const multimodalInput = options.input as {
      text: string;
      pdfFiles?: Array<Buffer | string>;
      images?: Array<Buffer | string>;
    };

    if (multimodalInput?.pdfFiles && multimodalInput.pdfFiles.length > 0) {
      logger.debug(
        `[GoogleVertex] Processing ${multimodalInput.pdfFiles.length} PDF file(s) for native stream`,
      );

      for (const pdfFile of multimodalInput.pdfFiles) {
        let pdfBuffer: Buffer;

        if (typeof pdfFile === "string") {
          // Check if it's a file path
          if (fs.existsSync(pdfFile)) {
            pdfBuffer = fs.readFileSync(pdfFile);
          } else {
            // Assume it's already base64 encoded
            pdfBuffer = Buffer.from(pdfFile, "base64");
          }
        } else {
          pdfBuffer = pdfFile;
        }

        // Convert to base64 for the native SDK
        const base64Data = pdfBuffer.toString("base64");
        userParts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: base64Data,
          },
        });
      }
    }

    // Add images as inlineData parts if present
    if (multimodalInput?.images && multimodalInput.images.length > 0) {
      logger.debug(
        `[GoogleVertex] Processing ${multimodalInput.images.length} image(s) for native stream`,
      );

      for (const image of multimodalInput.images) {
        let imageBuffer: Buffer;
        let mimeType = "image/jpeg"; // Default

        if (typeof image === "string") {
          if (fs.existsSync(image)) {
            imageBuffer = fs.readFileSync(image);
            // Detect mime type from extension
            const ext = path.extname(image).toLowerCase();
            if (ext === ".png") {
              mimeType = "image/png";
            } else if (ext === ".gif") {
              mimeType = "image/gif";
            } else if (ext === ".webp") {
              mimeType = "image/webp";
            }
          } else if (image.startsWith("data:")) {
            // Handle data URL
            const matches = image.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              mimeType = matches[1];
              imageBuffer = Buffer.from(matches[2], "base64");
            } else {
              continue; // Skip invalid data URL
            }
          } else if (
            image.startsWith("http://") ||
            image.startsWith("https://")
          ) {
            // Image URL — fetch and base64-encode. Without this, the URL
            // string falls through to the "assume base64" branch below
            // and Vertex returns "Provided image is not valid".
            try {
              const response = await fetch(image);
              if (!response.ok) {
                logger.warn(
                  `[GoogleVertex] Image fetch failed: ${response.status} ${response.statusText}, skipping`,
                  { url: image },
                );
                continue;
              }
              const arrayBuffer = await response.arrayBuffer();
              imageBuffer = Buffer.from(arrayBuffer);
              const headerMime = response.headers.get("content-type");
              if (headerMime && headerMime.startsWith("image/")) {
                mimeType = headerMime.split(";")[0];
              }
            } catch (fetchError) {
              logger.warn(
                `[GoogleVertex] Image URL fetch threw, skipping: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
                { url: image },
              );
              continue;
            }
          } else {
            // Assume base64 string
            imageBuffer = Buffer.from(image, "base64");
            // Sniff the real format from magic bytes — bare base64 carries no
            // mime hint, and leaving the image/jpeg default makes Anthropic
            // reject PNG/GIF/WebP with a media-type mismatch 400.
            mimeType = this.detectImageType(imageBuffer);
          }
        } else {
          imageBuffer = image;
          // Buffer input (e.g. Slack/REST uploads) carries no mime hint; sniff
          // it instead of defaulting to image/jpeg (mislabels PNG -> 400).
          mimeType = this.detectImageType(imageBuffer);
        }

        const base64Data = imageBuffer.toString("base64");
        userParts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      }
    }

    // Prepend prior conversation turns before the current user message so
    // multi-turn callers (memory, loop REPL, agent flows) actually carry
    // context. Without this, the native Vertex Gemini stream rebuilt the
    // contents from only the current input on every call.
    prependConversationMessages(
      contents as Array<{ role: string; parts: unknown[] }>,
      options.conversationMessages,
    );

    contents.push({
      role: "user",
      parts: userParts,
    });

    // Convert Vercel AI SDK tools to @google/genai FunctionDeclarations
    let tools:
      | Array<{ functionDeclarations: VertexGenaiFunctionDeclaration[] }>
      | undefined;
    const executeMap = new DedupExecuteMap();

    if (
      options.tools &&
      Object.keys(options.tools).length > 0 &&
      !options.disableTools
    ) {
      const functionDeclarations: VertexGenaiFunctionDeclaration[] = [];

      for (const [name, tool] of Object.entries(options.tools)) {
        functionDeclarations.push(
          this.buildGeminiFunctionDeclaration(name, tool),
        );
        if (tool.execute) {
          executeMap.set(name, tool.execute);
        }
      }

      tools = [{ functionDeclarations }];

      logger.debug("[GoogleVertex] Converted tools for native SDK", {
        toolCount: functionDeclarations.length,
        toolNames: functionDeclarations.map((t) => t.name),
      });
    }

    // Check if we need to use the final_result tool pattern for structured output with tools
    // When both schema AND tools are present, we add final_result as a tool
    const streamOptions = options as TextGenerationOptions;
    let useFinalResultTool = false;
    if (streamOptions.schema && tools) {
      useFinalResultTool = true;

      // Convert schema to JSON schema format
      const schemaAsJson = convertZodToJsonSchema(
        streamOptions.schema as ZodUnknownSchema,
        "openApi3",
      ) as Record<string, unknown>;
      const inlinedSchema = inlineJsonSchema(schemaAsJson);
      if (inlinedSchema.$schema) {
        delete inlinedSchema.$schema;
      }
      const typedSchema = ensureNestedSchemaTypes(inlinedSchema);

      // Add final_result tool to the existing function declarations
      const existingDeclarations = tools[0]?.functionDeclarations || [];
      existingDeclarations.push({
        name: "final_result",
        description:
          "Return the final structured result. You MUST call this tool when you have gathered all information and are ready to provide the final answer. The arguments should contain the structured data matching the expected schema.",
        parametersJsonSchema: typedSchema,
      });
      tools = [{ functionDeclarations: existingDeclarations }];

      logger.debug(
        "[GoogleVertex] Added final_result tool for structured output with tools (stream)",
        {
          schemaKeys: Object.keys(typedSchema),
          totalTools: existingDeclarations.length,
        },
      );
    }

    // Build config. Registry-driven sampling strip applied for uniformity
    // with every other provider path (inert for current Gemini models).
    const geminiSampling = resolveSamplingParams(
      this.providerName,
      modelName,
      {
        temperature: options.temperature ?? 1.0, // Gemini 3 requires 1.0 for tool calling
        ...(options.topP !== undefined && { topP: options.topP }),
      },
      "vertex.gemini",
    );
    const config: Record<string, unknown> = {
      ...(geminiSampling.temperature !== undefined && {
        temperature: geminiSampling.temperature,
      }),
      maxOutputTokens: options.maxTokens,
    };

    // Cap maxOutputTokens for models with restricted output token limits (32768)
    // This applies to Gemini 3 models and image generation models (gemini-2.5-flash-image, gemini-3-pro-image-preview)
    if (hasRestrictedOutputLimit(modelName)) {
      if (
        config.maxOutputTokens &&
        (config.maxOutputTokens as number) > RESTRICTED_OUTPUT_TOKEN_LIMIT
      ) {
        logger.warn(
          `[GoogleVertex] Capping maxOutputTokens from ${config.maxOutputTokens} to ${RESTRICTED_OUTPUT_TOKEN_LIMIT} for ${modelName}`,
        );
        config.maxOutputTokens = RESTRICTED_OUTPUT_TOKEN_LIMIT;
      }
      // If maxOutputTokens is undefined, set a safe default
      if (!config.maxOutputTokens) {
        config.maxOutputTokens = RESTRICTED_OUTPUT_TOKEN_LIMIT;
      }
    }

    // Add topP, topK, stopSequences if provided
    if (geminiSampling.topP !== undefined) {
      config.topP = geminiSampling.topP;
    }
    if (options.topK !== undefined) {
      config.topK = options.topK;
    }
    if (options.stopSequences && options.stopSequences.length > 0) {
      config.stopSequences = options.stopSequences;
    }

    if (tools) {
      config.tools = tools;
    }

    // Build system prompt, adding final_result instruction if needed
    let effectiveSystemPrompt = options.systemPrompt || "";
    if (useFinalResultTool) {
      const finalResultInstruction =
        "\n\nIMPORTANT: When you have gathered all necessary information and are ready to provide your final answer, you MUST call the 'final_result' tool with the structured data. Do not return the final answer as plain text - always use the final_result tool.";
      effectiveSystemPrompt = effectiveSystemPrompt + finalResultInstruction;
    }

    if (effectiveSystemPrompt) {
      config.systemInstruction = effectiveSystemPrompt;
    }

    // Add thinking config for Gemini 3
    const nativeThinkingConfig = createNativeThinkingConfig(
      options.thinkingConfig,
    );
    if (nativeThinkingConfig) {
      config.thinkingConfig = nativeThinkingConfig;
    }

    // Add JSON output format support for native SDK stream
    // CRITICAL: Google Gemini API does NOT allow combining responseMimeType with function calling.
    // Error: "Function calling with a response mime type: 'application/json' is unsupported"
    // Additionally, responseSchema REQUIRES responseMimeType: "application/json" - they cannot be used separately.
    // Error without it: "Response_schema with a response mime type 'text/plain' is unsupported"
    // Therefore: When tools are present, we cannot use EITHER responseMimeType OR responseSchema.
    // When using final_result tool pattern, we skip this entirely as schema is enforced via tool.
    if (
      (streamOptions.output?.format === "json" || streamOptions.schema) &&
      !useFinalResultTool
    ) {
      // Only set responseMimeType AND responseSchema when NOT using tools
      // Both must be set together, and neither can be used with function calling
      if (!tools) {
        config.responseMimeType = "application/json";

        // Convert schema to JSON schema format for the native SDK
        if (streamOptions.schema) {
          const rawSchema = convertZodToJsonSchema(
            streamOptions.schema as ZodUnknownSchema,
            "openApi3",
          ) as Record<string, unknown>;
          const inlinedSchema = inlineJsonSchema(rawSchema);
          // Remove $schema if present - @google/genai doesn't need it
          if (inlinedSchema.$schema) {
            delete inlinedSchema.$schema;
          }
          // CRITICAL: Google Vertex AI requires ALL nested schemas to have a type field
          // ensureNestedSchemaTypes recursively adds missing type fields
          // Note: convertZodToJsonSchema now uses openApi3 target which produces nullable: true
          const typedSchema = ensureNestedSchemaTypes(inlinedSchema);
          // Sanitize the same way tool schemas are (see tool path above):
          // Vertex's responseSchema validator rejects extension keywords such
          // as `errorMessage` (from convertZodToJsonSchema's errorMessages
          // option) and `additionalProperties`. Without this a user schema with
          // a `.regex(.., { message })` field 400s the whole structured-output
          // request and the recovery loop retries the same poisoned payload.
          stripAdditionalPropertiesDeep(typedSchema);
          config.responseSchema = typedSchema;

          logger.debug(
            "[GoogleVertex] Added responseSchema for JSON output (stream)",
            {
              schemaKeys: Object.keys(typedSchema),
            },
          );
        }
      }
    }

    const startTime = Date.now();
    // Ensure maxSteps is a valid positive integer to prevent infinite loops
    const rawMaxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
    const maxSteps =
      Number.isFinite(rawMaxSteps) && rawMaxSteps > 0
        ? Math.min(Math.floor(rawMaxSteps), 100) // Cap at 100 for safety
        : Math.min(DEFAULT_MAX_STEPS, 100);
    // Widened per-turn copy: the agentic loop appends functionCall /
    // functionResponse parts on top of the plain text/inlineData parts the
    // initial contents carry.
    const currentContents: Array<{
      role: string;
      parts: VertexNativeLoopPart[];
    }> = [...contents];
    let finalText = "";
    // Last SDK finish reason seen across steps (Bug 2: previously never read,
    // so callers fell back to "unknown"). Last non-empty value wins — the
    // terminal chunk is authoritative.
    let lastFinishReason: string | undefined;
    const allToolCalls: Array<{
      toolName: string;
      args: Record<string, unknown>;
    }> = [];
    // Mirrors the generate-path shape so StreamResult.toolExecutions can be
    // populated (parity with AI-SDK-driven providers) and so the storage
    // hook can persist actual tool outputs rather than the placeholder
    // "success" string used by flushPendingToolData's default fallback.
    const toolExecutions: Array<{
      name: string;
      input: Record<string, unknown>;
      output: unknown;
    }> = [];
    let step = 0;

    // Track structured output from final_result tool (when using final_result pattern)
    let finalResultStructuredOutput: Record<string, unknown> | undefined;

    // Track failed tools to prevent infinite retry loops
    // Key: tool name, Value: { count: retry attempts, lastError: error message }
    const failedTools = new Map<string, { count: number; lastError: string }>();

    // In-loop context guard: stop calling tools when the accumulated
    // conversation approaches the model's context window instead of stepping
    // into a provider "prompt too long" rejection mid-loop.
    const contextGuard = createContextGuard(
      getContextWindowSize("vertex", modelName),
    );
    let hitContextLimit = false;

    // Track token usage across all steps. Every loop step is a separate
    // billed API call, so per-step usage is folded into these turn totals
    // after each step's chunk drain — assigning them directly from chunk
    // metadata would record only the last step of a multi-step tool loop.
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheReadTokens = 0;
    let totalReasoningTokens = 0;

    // Track text parts as they arrive from the SDK so the returned async
    // iterable yields multiple chunks instead of a single buffered chunk.
    // The CLI's chunk-count smoke test asserts > 1 stream chunks for any
    // non-trivial response — collecting everything into `finalText` and
    // yielding it once breaks that signal even though the underlying
    // network stream is genuinely incremental.
    const incrementalTextChunks: string[] = [];

    // Abort scaffolding (mirrors executeNativeAnthropicStream). The native
    // Gemini SDK cancels via config.abortSignal, so drive an internal
    // AbortController: the caller's signal and the turn clock's watchdogs
    // (whole-turn deadline + optional stall detector) all trip it, and every
    // request/tool-exec receives effectiveSignal.
    const streamTimeoutMs =
      parseTimeout(options.timeout) ?? DEFAULT_GEMINI_STREAM_TIMEOUT_MS;
    const toolExecTimeoutMs =
      options.toolTimeoutMs ?? DEFAULT_TOOL_EXECUTION_TIMEOUT_MS;
    const effectiveTurnDeadlineMs = options.turnTimeoutMs ?? streamTimeoutMs;
    const internalAbort = new AbortController();
    const onCallerAbort = () => internalAbort.abort();
    options.abortSignal?.addEventListener("abort", onCallerAbort);
    const turnClock = createTurnClock({
      turnTimeoutMs: options.turnTimeoutMs,
      // Preserve the pre-existing defensive whole-turn bound when the caller
      // sets no explicit turn budget — a turn must never hang forever.
      defaultTurnTimeoutMs: streamTimeoutMs,
      stallTimeoutMs: options.stallTimeoutMs,
      wrapupTimeLeadMs: options.wrapupTimeLeadMs,
      onDeadline: (kind) => {
        logger.warn(
          kind === "timeout"
            ? `[GoogleVertex] Native Gemini turn exceeded its ${effectiveTurnDeadlineMs}ms time budget — aborting`
            : `[GoogleVertex] Native Gemini turn made no progress for ${options.stallTimeoutMs}ms — aborting`,
        );
        internalAbort.abort();
      },
    });
    const effectiveSignal = internalAbort.signal;
    if (options.abortSignal?.aborted) {
      internalAbort.abort();
    }
    let wasAborted = false;
    // One retry per turn for MALFORMED_FUNCTION_CALL steps (see the retry
    // block after the step drain).
    let malformedRetryCount = 0;

    // Step-cap flags declared in the outer scope so the terminal block (also
    // inside the try) and the finishReason mapping (after the finally) can
    // both read them.
    let hitStepLimit = false;
    let synthesizedFinalAnswer = false;

    try {
      // Agentic loop for tool calling
      while (step < maxSteps) {
        if (effectiveSignal.aborted) {
          wasAborted = true;
          break;
        }
        // Context guard: stop the tool loop before the accumulated
        // conversation crosses the window threshold — synthesize from what
        // we have instead of stepping into a provider rejection.
        if (contextGuard.shouldStop()) {
          hitContextLimit = true;
          logger.warn(
            `[GoogleVertex] Gemini turn stopped by the context guard: ` +
              `projected prompt ~${contextGuard.projectedNextPromptTokens} tokens ` +
              `>= threshold ${contextGuard.thresholdTokens} (step ${step}) — synthesizing a final answer.`,
          );
          break;
        }
        step++;
        turnClock.noteProgress();
        // Mid-turn discovery sync: search_tools may have hydrated new tools
        // into the live record during the previous step — advertise them in
        // this step's request instead of leaving them invisible until the
        // next turn (TOOL_NOT_FOUND).
        this.refreshGeminiToolDeclarations(
          options.tools,
          tools?.[0]?.functionDeclarations,
          executeMap,
          failedTools,
        );
        logger.debug(`[GoogleVertex] Native SDK step ${step}/${maxSteps}`);

        try {
          const stream = await client.models.generateContentStream({
            model: modelName,
            contents: currentContents,
            config: { ...config, abortSignal: effectiveSignal },
          });

          const stepFunctionCalls: Array<{
            name: string;
            args: Record<string, unknown>;
          }> = [];

          // Capture raw response parts including thoughtSignature
          const rawResponseParts: unknown[] = [];
          // This step's own finish reason (vs the cross-step
          // lastFinishReason) — drives the single MALFORMED_FUNCTION_CALL
          // retry below.
          let stepFinishReason: string | undefined;
          // Per-step usage trackers for WRITE-THROUGH accumulation: within a
          // step's chunk stream the counts are latest-wins (promptTokenCount
          // arrives once in the final chunk; candidates/thoughts counts are
          // cumulative across chunks), so each chunk folds only the DELTA
          // over this step's previous value into the turn totals. The totals
          // are therefore correct at every point mid-drain — a step killed
          // mid-stream (abort / turn deadline / stall watchdog) still counts
          // the billed tokens it already reported.
          let stepInputTokens = 0;
          let stepOutputTokens = 0;
          let stepCacheReadTokens = 0;
          let stepReasoningTokens = 0;

          for await (const chunk of stream) {
            turnClock.noteProgress();
            // Extract raw parts from candidates FIRST
            // This avoids using chunk.text which triggers SDK warning when
            // non-text parts (thoughtSignature, functionCall) are present
            const chunkRecord = chunk as Record<string, unknown>;
            const candidates = chunkRecord.candidates as
              | Array<Record<string, unknown>>
              | undefined;
            const firstCandidate = candidates?.[0];
            // Capture the SDK finish reason (Bug 2: previously dropped). Last
            // non-empty value across chunks wins.
            const chunkFinishReason = firstCandidate?.finishReason;
            if (typeof chunkFinishReason === "string" && chunkFinishReason) {
              lastFinishReason = chunkFinishReason;
              stepFinishReason = chunkFinishReason;
            }
            const chunkContent = firstCandidate?.content as
              | Record<string, unknown>
              | undefined;
            if (chunkContent && Array.isArray(chunkContent.parts)) {
              for (const part of chunkContent.parts as Array<
                Record<string, unknown>
              >) {
                rawResponseParts.push(part);
                if (typeof part.text === "string" && part.text.length > 0) {
                  incrementalTextChunks.push(part.text);
                }
              }
            }
            if (chunk.functionCalls) {
              stepFunctionCalls.push(...chunk.functionCalls);
            }

            // Extract usage metadata from chunk
            // promptTokenCount is typically in the final chunk, candidatesTokenCount accumulates
            const usageMetadata = chunkRecord.usageMetadata as
              | {
                  promptTokenCount?: number;
                  candidatesTokenCount?: number;
                  cachedContentTokenCount?: number;
                  thoughtsTokenCount?: number;
                  totalTokenCount?: number;
                }
              | undefined;
            if (usageMetadata) {
              // Take the latest promptTokenCount (usually only in final chunk)
              if (
                usageMetadata.promptTokenCount !== undefined &&
                usageMetadata.promptTokenCount > 0
              ) {
                totalInputTokens +=
                  usageMetadata.promptTokenCount - stepInputTokens;
                stepInputTokens = usageMetadata.promptTokenCount;
                // Feed the context guard the REAL prompt size of this call.
                contextGuard.noteUsage(
                  usageMetadata.promptTokenCount,
                  usageMetadata.candidatesTokenCount ?? 0,
                );
                // cachedContentTokenCount is OVERLAPPING (a subset already inside
                // promptTokenCount). Clamp to the prompt count so an uncached
                // step reports 0 instead of a stale cached value.
                const chunkCacheReadTokens = Math.min(
                  usageMetadata.cachedContentTokenCount ?? 0,
                  usageMetadata.promptTokenCount,
                );
                totalCacheReadTokens +=
                  chunkCacheReadTokens - stepCacheReadTokens;
                stepCacheReadTokens = chunkCacheReadTokens;
              }
              // Take the latest candidatesTokenCount (accumulates through chunks)
              if (
                usageMetadata.candidatesTokenCount !== undefined &&
                usageMetadata.candidatesTokenCount > 0
              ) {
                totalOutputTokens +=
                  usageMetadata.candidatesTokenCount - stepOutputTokens;
                stepOutputTokens = usageMetadata.candidatesTokenCount;
              }
              // thoughtsTokenCount (thinking tokens, billed at the output
              // rate) is NOT part of candidatesTokenCount — Gemini reports
              // totalTokenCount = prompt + candidates + thoughts.
              if (
                usageMetadata.thoughtsTokenCount !== undefined &&
                usageMetadata.thoughtsTokenCount > 0
              ) {
                totalReasoningTokens +=
                  usageMetadata.thoughtsTokenCount - stepReasoningTokens;
                stepReasoningTokens = usageMetadata.thoughtsTokenCount;
              }
            }
          }

          // Extract text from raw parts after stream completes
          // This avoids SDK warning about non-text parts (thoughtSignature, functionCall)
          const stepText = rawResponseParts
            .filter(
              (part): part is { text: string } =>
                typeof (part as Record<string, unknown>).text === "string",
            )
            .map((part) => part.text)
            .join("");

          // MALFORMED_FUNCTION_CALL is usually a transient formatting failure
          // (the model emitted an unparseable call): retry the step ONCE with
          // a corrective note instead of hard-ending the turn with empty
          // content — automated alert-RCA turns were dying at step 2-4 on
          // this, mislabeled as step-cap exits.
          if (
            stepFunctionCalls.length === 0 &&
            !stepText &&
            stepFinishReason === "MALFORMED_FUNCTION_CALL" &&
            malformedRetryCount < 1 &&
            !effectiveSignal.aborted
          ) {
            malformedRetryCount++;
            logger.warn(
              `[GoogleVertex] Model returned MALFORMED_FUNCTION_CALL at step ${step}/${maxSteps}; retrying once with a corrective note.`,
            );
            this.emitTurnEvent({ phase: "malformed-retry", step, maxSteps });
            if (rawResponseParts.length > 0) {
              currentContents.push({
                role: "model",
                parts: rawResponseParts as VertexNativePart[],
              });
            }
            currentContents.push({
              role: "user",
              parts: [
                {
                  text:
                    "Your previous function call was malformed and could not " +
                    "be parsed. Re-issue it as a single valid function call, " +
                    "or answer in plain text.",
                },
              ],
            });
            continue;
          }

          // If no function calls, we're done
          if (stepFunctionCalls.length === 0) {
            finalText = stepText;
            break;
          }

          // Check for final_result tool call - this is our structured output pattern
          if (useFinalResultTool) {
            const finalResultCall = stepFunctionCalls.find(
              (call) => call.name === "final_result",
            );
            if (finalResultCall) {
              // Extract the structured output from final_result arguments
              finalResultStructuredOutput = finalResultCall.args as Record<
                string,
                unknown
              >;
              logger.debug(
                "[GoogleVertex] Received final_result tool call with structured output (stream)",
                {
                  outputKeys: Object.keys(finalResultStructuredOutput),
                },
              );
              // Return the structured output as JSON text
              finalText = JSON.stringify(finalResultStructuredOutput);
              break;
            }
          }

          // Execute function calls
          logger.debug(
            `[GoogleVertex] Executing ${stepFunctionCalls.length} function calls`,
          );

          // Add model response with ALL parts (including thoughtSignature) to history
          // This preserves the thought_signature which is required for Gemini 3 multi-turn tool calling
          currentContents.push({
            role: "model",
            parts:
              rawResponseParts.length > 0
                ? (rawResponseParts as VertexNativeLoopPart[])
                : stepFunctionCalls.map((fc) => ({
                    functionCall: fc,
                  })),
          });

          // Execute each function and collect responses (plus an optional
          // trailing wrap-up nudge text part).
          const functionResponses: Array<
            | {
                functionResponse: {
                  name: string;
                  response: Record<string, unknown>;
                };
              }
            | { text: string }
          > = [];
          // Per-step bookkeeping for conversation-memory storage.
          const stepStorageCalls: Array<{
            toolName: string;
            args: Record<string, unknown>;
          }> = [];
          const stepStorageResults: Array<{
            toolName: string;
            output: unknown;
          }> = [];

          // Note: tool:start / tool:end events are emitted by ToolsManager's
          // wrapped `execute` (see ToolsManager.ts:355) — no inline emit needed.
          for (const call of stepFunctionCalls) {
            // Honor a deadline/stall/caller abort BETWEEN tool executions —
            // without this check a multi-tool step keeps executing its whole
            // batch (up to N × toolTimeoutMs past the deadline) before the
            // while-top check finally breaks.
            if (effectiveSignal.aborted) {
              wasAborted = true;
              break;
            }
            allToolCalls.push({ toolName: call.name, args: call.args });
            stepStorageCalls.push({ toolName: call.name, args: call.args });

            // Check if this tool has already exceeded retry limit
            const failedInfo = failedTools.get(call.name);
            if (failedInfo && failedInfo.count >= DEFAULT_TOOL_MAX_RETRIES) {
              logger.warn(
                `[GoogleVertex] Tool "${call.name}" has exceeded retry limit (${DEFAULT_TOOL_MAX_RETRIES}), skipping execution`,
              );
              const errorPayload = {
                error: `TOOL_PERMANENTLY_FAILED: The tool "${call.name}" has failed ${failedInfo.count} times and will not be retried. Last error: ${failedInfo.lastError}. Please proceed without using this tool or inform the user that this functionality is unavailable.`,
                status: "permanently_failed",
                do_not_retry: true,
              };
              functionResponses.push({
                functionResponse: {
                  name: call.name,
                  response: errorPayload,
                },
              });
              toolExecutions.push({
                name: call.name,
                input: call.args,
                output: errorPayload,
              });
              stepStorageResults.push({
                toolName: call.name,
                output: errorPayload,
              });
              continue;
            }

            let execute = executeMap.get(call.name);
            if (!execute) {
              // Snapshot miss: the tool may have been hydrated into the live
              // record by search_tools within this very step batch, or the
              // model called a deferred catalog tool directly by name.
              execute = this.resolveGeminiToolOnMiss(
                call.name,
                options.tools,
                tools?.[0]?.functionDeclarations,
                executeMap,
                failedTools,
              );
            }
            if (execute) {
              try {
                // AI SDK Tool execute requires (args, options) - provide minimal options
                const toolOptions = {
                  toolCallId: `${call.name}-${Date.now()}`,
                  messages: [],
                  abortSignal: effectiveSignal,
                };
                turnClock.noteProgress();
                // Bound the execute() await — a wedged tool costs one step
                // (error tool_result), not the whole turn — and race it
                // against the turn's abort so a deadline/caller abort is
                // observed IMMEDIATELY instead of after the tool settles.
                const result = await withTimeout(
                  raceWithAbort(
                    Promise.resolve(execute(call.args, toolOptions)),
                    effectiveSignal,
                  ),
                  toolExecTimeoutMs,
                  `Tool "${call.name}" execution timed out after ${toolExecTimeoutMs}ms`,
                );
                turnClock.noteProgress();
                // Error-shaped success (MCP isError / { error } payloads —
                // e.g. proxy-blocked tools) counts toward the breaker too:
                // these fail without throwing, and only counting throws lets
                // the model grind on a blocked tool for the whole budget.
                const resultErrorText = extractToolFailureText(result);
                if (resultErrorText) {
                  const info = failedTools.get(call.name) || {
                    count: 0,
                    lastError: "",
                  };
                  info.count++;
                  info.lastError = resultErrorText;
                  failedTools.set(call.name, info);
                } else {
                  // Genuinely consecutive: a success clears the strike count
                  // (argument-dependent soft errors — file-not-found on
                  // different paths — must not disable a working tool).
                  failedTools.delete(call.name);
                }
                toolExecutions.push({
                  name: call.name,
                  input: call.args,
                  output: result,
                });
                functionResponses.push({
                  functionResponse: { name: call.name, response: { result } },
                });
                stepStorageResults.push({
                  toolName: call.name,
                  output: result,
                });
              } catch (error) {
                // An abort during tool execution ends the turn gracefully — it
                // must NOT be recorded as a spurious tool failure. Both checks
                // matter: effectiveSignal.aborted catches an abort WE triggered
                // (even if the throw isn't abort-shaped); isAbortError(error)
                // catches an abort-shaped throw (e.g. a tool raising AbortError)
                // even when the signal itself never fired.
                if (effectiveSignal.aborted || isAbortError(error)) {
                  wasAborted = true;
                  break;
                }
                turnClock.noteProgress();
                if (error instanceof TimeoutError) {
                  this.emitTurnEvent({
                    phase: "tool-timeout",
                    step,
                    maxSteps,
                    toolName: call.name,
                  });
                }
                const errorMessage =
                  error instanceof Error ? error.message : "Unknown error";

                // Track this failure
                const currentFailInfo = failedTools.get(call.name) || {
                  count: 0,
                  lastError: "",
                };
                currentFailInfo.count++;
                currentFailInfo.lastError = errorMessage;
                failedTools.set(call.name, currentFailInfo);

                logger.warn(
                  `[GoogleVertex] Tool "${call.name}" failed (attempt ${currentFailInfo.count}/${DEFAULT_TOOL_MAX_RETRIES}): ${errorMessage}`,
                );

                // Determine if this is a permanent failure
                const isPermanentFailure =
                  currentFailInfo.count >= DEFAULT_TOOL_MAX_RETRIES;

                const errorPayload = {
                  error: isPermanentFailure
                    ? `TOOL_PERMANENTLY_FAILED: The tool "${call.name}" has failed ${currentFailInfo.count} times with error: ${errorMessage}. This tool will not be retried. Please proceed without using this tool or inform the user that this functionality is unavailable.`
                    : `TOOL_EXECUTION_ERROR: ${errorMessage}. Retry attempt ${currentFailInfo.count}/${DEFAULT_TOOL_MAX_RETRIES}.`,
                  status: isPermanentFailure ? "permanently_failed" : "failed",
                  do_not_retry: isPermanentFailure,
                  retry_count: currentFailInfo.count,
                  max_retries: DEFAULT_TOOL_MAX_RETRIES,
                };
                functionResponses.push({
                  functionResponse: {
                    name: call.name,
                    response: errorPayload,
                  },
                });
                toolExecutions.push({
                  name: call.name,
                  input: call.args,
                  output: errorPayload,
                });
                stepStorageResults.push({
                  toolName: call.name,
                  output: errorPayload,
                });
              }
            } else {
              // Tool not found is a permanent error. Count it toward the
              // breaker too (parity with the Anthropic loops) — a model that
              // ignores the do_not_retry hint and keeps calling a
              // hallucinated/stale tool name must not burn the whole step
              // budget on TOOL_NOT_FOUND round-trips.
              const errorPayload = {
                error: `TOOL_NOT_FOUND: The tool "${call.name}" does not exist. Do not attempt to call this tool again.`,
                status: "permanently_failed",
                do_not_retry: true,
              };
              const notFoundInfo = failedTools.get(call.name) || {
                count: 0,
                lastError: "",
              };
              notFoundInfo.count++;
              notFoundInfo.lastError = errorPayload.error;
              failedTools.set(call.name, notFoundInfo);
              functionResponses.push({
                functionResponse: {
                  name: call.name,
                  response: errorPayload,
                },
              });
              toolExecutions.push({
                name: call.name,
                input: call.args,
                output: errorPayload,
              });
              stepStorageResults.push({
                toolName: call.name,
                output: errorPayload,
              });
            }
          }

          // An abort inside the tool-exec loop only breaks that inner for-loop.
          // Break the while too so no further model call is issued and control
          // reaches the terminal step-cap handling below.
          if (wasAborted) {
            break;
          }

          // Persist this step's tool calls/results into conversation memory.
          // Without this, tool_call / tool_result rows never reach Redis and
          // the chat-history UI loses every tool invocation.
          //
          // `thoughtSignature` rides as a sibling on the first call of the
          // step — Gemini 3 needs it to match thinking patterns when the
          // conversation is replayed on the next turn.
          if (stepStorageCalls.length > 0 || stepStorageResults.length > 0) {
            const stepThoughtSig = extractThoughtSignature(rawResponseParts);
            withTimeout(
              this.handleToolExecutionStorage(
                stepStorageCalls.map((c, i) => ({
                  ...c,
                  ...(i === 0 && stepThoughtSig
                    ? { thoughtSignature: stepThoughtSig }
                    : {}),
                  stepIndex: step,
                })),
                stepStorageResults.map((r) => ({ ...r, stepIndex: step })),
                options,
                new Date(),
              ),
              TOOL_STORAGE_TIMEOUT_MS,
              "tool storage write timed out",
            ).catch((error: unknown) => {
              logger.warn(
                "[GoogleVertex] Failed to store native Gemini stream tool executions",
                {
                  error: error instanceof Error ? error.message : String(error),
                },
              );
            });
          }

          // Time-budget wrap-up nudge (twin of the Anthropic loops' soft
          // step nudge): with the turn deadline approaching, tell the model
          // to consolidate. Rides as a trailing text part on the
          // tool-response user turn.
          if (turnClock.shouldNudgeWrapup()) {
            functionResponses.push({
              text: buildWrapupNudgeText(useFinalResultTool),
            });
          }

          // The @google/genai SDK only accepts "user" and "model" as valid
          // roles in contents — function/tool responses must use role: "user"
          // (matching the SDK's automaticFunctionCalling implementation and
          // the Google AI Studio path). Sending role: "function" was causing
          // native Vertex Gemini tool loops to be silently rejected by the
          // request validator.
          currentContents.push({
            role: "user",
            parts: functionResponses,
          });
          // Project this step's growth for the context guard: the appended
          // tool results ride the next prompt (Gemini reports usage per call,
          // but only for content it has already seen).
          try {
            contextGuard.noteAppendedChars(
              JSON.stringify(functionResponses).length,
            );
          } catch {
            /* estimation is best-effort — never break the loop */
          }
        } catch (error) {
          // A mid-drain abort surfaces as an AbortError from the `for await`.
          // Break gracefully into the terminal block instead of re-throwing
          // (a re-throw would route the caller's abort into a second unbounded
          // fallback stream()). Dual check as with the inner catch:
          // effectiveSignal.aborted (a signal we tripped) OR isAbortError(error)
          // (an abort-shaped throw) — either means "stop", not a real failure.
          if (effectiveSignal.aborted || isAbortError(error)) {
            wasAborted = true;
            break;
          }
          logger.error("[GoogleVertex] Native SDK error", error);
          throw this.handleProviderError(error);
        }
      }

      // Handle maxSteps termination / abort — the loop exited because the step
      // cap was reached (or the turn was aborted) while the model was still
      // calling tools. Surface a real answer instead of the canned placeholder
      // (Bug 1) and a meaningful finishReason (Bug 2).
      if (!finalText && (step >= maxSteps || wasAborted || hitContextLimit)) {
        hitStepLimit = step >= maxSteps && !wasAborted;
        const toolCallCount = allToolCalls.filter(
          (tc) => tc.toolName !== "final_result",
        ).length;
        // The consumer receives text via `incrementalTextChunks`; any text the
        // model emitted across steps is already preserved there. Only produce a
        // terminal message when NOTHING was produced (the pure-functionCall /
        // abort case that otherwise surfaces the placeholder). When chunks
        // exist, leave `finalText` empty so `textPartsToYield` keeps replaying
        // the gathered chunks instead of collapsing to a single one.
        if (incrementalTextChunks.length > 0) {
          logger.warn(
            hitContextLimit
              ? `[GoogleVertex] Tool call loop stopped by the context guard; ` +
                  `returning text already gathered from prior steps.`
              : `[GoogleVertex] Tool call loop terminated after reaching maxSteps (${maxSteps}); ` +
                  `returning text already gathered from prior steps.`,
          );
        } else if (wasAborted) {
          // Turn ended on a time condition or caller abort — skip synth
          // entirely so it can never add +300s after a blown budget, and
          // deliver exactly one HONEST terminal chunk matching the actual
          // exit cause (never the step-cap text — a killed healthy turn must
          // not claim it "reached the step limit").
          logger.warn(
            `[GoogleVertex] Tool call loop ended mid-turn ` +
              `(${turnClock.timedOut ? "turn time limit" : turnClock.stalled ? "stall watchdog" : "caller abort"}); ` +
              `returning an honest terminal message.`,
          );
          finalText = this.buildLoopExitMessage({
            turnClock,
            wasAborted,
            stallTimeoutMs: options.stallTimeoutMs,
            maxSteps,
            toolCallCount,
          });
        } else {
          logger.warn(
            hitContextLimit
              ? `[GoogleVertex] Tool call loop stopped by the context guard ` +
                  `with no text; synthesizing a final answer with tools disabled.`
              : `[GoogleVertex] Tool call loop terminated after reaching maxSteps (${maxSteps}) ` +
                  `with no text; synthesizing a final answer with tools disabled.`,
          );
          // synth self-bounds its connect+drain via withTimeout(timeoutMs) and
          // never throws (returns empty on timeout/error), so it needs no outer
          // withTimeout wrapper — see synthesizeFinalAnswerWithoutTools.
          const synth = await this.synthesizeFinalAnswerWithoutTools(
            client,
            modelName,
            config,
            currentContents,
            useFinalResultTool,
            parseTimeout(options.timeout) ?? DEFAULT_GEMINI_STREAM_TIMEOUT_MS,
            effectiveSignal,
          );
          if (synth.text) {
            synthesizedFinalAnswer = true;
            finalText = synth.text;
            incrementalTextChunks.push(synth.text);
            totalInputTokens += synth.inputTokens;
            totalOutputTokens += synth.outputTokens;
            totalReasoningTokens += synth.reasoningTokens ?? 0;
            if (synth.finishReason) {
              lastFinishReason = synth.finishReason;
            }
          } else {
            finalText = hitContextLimit
              ? buildContextCapMessage(toolCallCount)
              : buildToolLoopCapMessage(maxSteps, toolCallCount);
          }
        }
      }
    } finally {
      turnClock.dispose();
      options.abortSignal?.removeEventListener("abort", onCallerAbort);
    }

    // Unified finish reason: a step-cap exhaustion that did NOT end in a clean
    // synthesized answer is reported as "tool-calls" (the model still wanted
    // tools) — NOT "length", which neurolink.ts treats as token truncation
    // (jsonTruncated + WARNING span). A clean completion maps from the SDK
    // finish reason.
    const resolvedFinishReason =
      hitStepLimit && !synthesizedFinalAnswer
        ? "tool-calls"
        : mapGeminiFinishReason(lastFinishReason);

    // Turn-exit discriminator, independent of the provider-shaped
    // finishReason — consumers branch on this instead of sniffing strings.
    const stopReason = resolveTurnStopReason({
      timedOut: turnClock.timedOut,
      stalled: turnClock.stalled,
      wasAborted,
      cappedWithoutAnswer: hitStepLimit && !synthesizedFinalAnswer,
      contextCappedWithoutAnswer: hitContextLimit && !synthesizedFinalAnswer,
      finishReason: resolvedFinishReason,
    });
    if (stopReason !== "completed") {
      this.emitTurnEvent({
        phase: stopReason,
        step,
        maxSteps,
        toolCallCount: allToolCalls.filter(
          (tc) => tc.toolName !== "final_result",
        ).length,
        elapsedMs: turnClock.elapsedMs(),
      });
    }

    const responseTime = Date.now() - startTime;

    // Yield each text part separately so the CLI receives multiple stream
    // chunks instead of a single coalesced buffer. The SDK already gave us
    // the chunks during the for-await loop above; we just preserved them
    // in `incrementalTextChunks` instead of collapsing into `finalText`.
    // For final_result structured output, we yield the JSON-serialized
    // value as a single chunk because that's the contract callers expect.
    const textPartsToYield = finalResultStructuredOutput
      ? [finalText]
      : incrementalTextChunks.length > 0
        ? incrementalTextChunks
        : [finalText];

    async function* createTextStream(): AsyncIterable<{ content: string }> {
      for (const part of textPartsToYield) {
        if (part.length > 0) {
          yield { content: part };
        }
      }
    }

    // Filter out final_result from tool calls as it's an internal pattern
    const externalToolCalls = allToolCalls.filter(
      (tc) => tc.toolName !== "final_result",
    );
    const externalToolExecutions = toolExecutions.filter(
      (te) => te.name !== "final_result",
    );

    // Gemini promptTokenCount is OVERLAPPING (already includes
    // cachedContentTokenCount). Subtract once so the cached portion is billed at
    // the cheaper cacheRead rate without double-counting; total is conserved.
    const adjustedInputTokens = Math.max(
      0,
      totalInputTokens - totalCacheReadTokens,
    );
    const result: StreamResult = {
      stream: createTextStream(),
      provider: this.providerName,
      model: modelName,
      finishReason: resolvedFinishReason,
      stopReason,
      rawFinishReason: lastFinishReason,
      usage: {
        input: adjustedInputTokens,
        // Thinking tokens are billed at the output rate but Gemini does NOT
        // include them in candidatesTokenCount (totalTokenCount = prompt +
        // candidates + thoughts), so they are folded into `output` — that is
        // what calculateCost bills at the output rate — with `reasoning`
        // reporting the thinking subset.
        output: totalOutputTokens + totalReasoningTokens,
        total:
          adjustedInputTokens +
          totalCacheReadTokens +
          totalOutputTokens +
          totalReasoningTokens,
        ...(totalCacheReadTokens > 0 && {
          cacheReadTokens: totalCacheReadTokens,
        }),
        ...(totalReasoningTokens > 0 && {
          reasoning: totalReasoningTokens,
        }),
      },
      toolCalls: externalToolCalls.map((tc) => ({
        toolName: tc.toolName,
        args: tc.args,
      })),
      // Surface tools-used + execution summary so `hasToolActivity` in
      // conversationMemory.ts evaluates true for tool-only stream turns
      // (assistant text empty but tools ran) and downstream consumers see
      // the same shape AI-SDK-driven providers expose.
      toolsUsed: externalToolCalls.map((tc) => tc.toolName),
      // transformToolExecutions' record shape (name/input/output/duration) is
      // what downstream consumers read at runtime; it shares no required
      // members with the declared ToolExecutionSummary element type, so the
      // assertion carries both shapes instead of erasing the real one.
      toolExecutions: transformToolExecutions(
        externalToolExecutions,
      ) as ReturnType<typeof transformToolExecutions> &
        NonNullable<StreamResult["toolExecutions"]>,
      metadata: {
        streamId: `native-vertex-${Date.now()}`,
        startTime,
        responseTime,
        totalToolExecutions: externalToolCalls.length,
        stopReason,
        rawFinishReason: lastFinishReason,
        stepsUsed: step,
      },
    };

    // Add structured output if final_result tool was used
    if (finalResultStructuredOutput) {
      (
        result as StreamResult & { structuredOutput?: unknown }
      ).structuredOutput = finalResultStructuredOutput;
    }

    return result;
  }

  /**
   * Execute generate using native @google/genai SDK for Gemini 3 models on Vertex AI
   * This bypasses @ai-sdk/google-vertex to properly handle thought_signature
   */
  private async executeNativeGemini3Generate(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    const modelName =
      options.model || this.modelName || getDefaultVertexModel();
    const effectiveLocation = resolveVertexRegionForModel(
      modelName,
      options.region,
    );
    const client = await this.createVertexGenAIClient(effectiveLocation);

    logger.debug(
      "[GoogleVertex] Using native @google/genai for Gemini 3 generate",
      {
        model: modelName,
        project: this.projectId,
        location: effectiveLocation,
      },
    );

    // Build contents from input with multimodal support
    // Prioritize input.text over prompt since processCSVFilesForNativeSDK modifies input.text with CSV data
    const inputText =
      options.input?.text || options.prompt || "Please respond.";

    const contents: Array<{
      role: string;
      parts: VertexNativePart[];
    }> = [];

    // Build user message parts - start with text
    const userParts: VertexNativePart[] = [{ text: inputText }];

    // Add PDF files as inlineData parts if present
    // Cast input to access multimodal properties that may exist at runtime
    const multimodalInput = options.input as
      | {
          text?: string;
          pdfFiles?: Array<Buffer | string>;
          images?: Array<Buffer | string>;
        }
      | undefined;

    if (multimodalInput?.pdfFiles && multimodalInput.pdfFiles.length > 0) {
      logger.debug(
        `[GoogleVertex] Processing ${multimodalInput.pdfFiles.length} PDF file(s) for native generate`,
      );

      for (const pdfFile of multimodalInput.pdfFiles) {
        let pdfBuffer: Buffer;

        if (typeof pdfFile === "string") {
          // Check if it's a file path
          if (fs.existsSync(pdfFile)) {
            pdfBuffer = fs.readFileSync(pdfFile);
          } else {
            // Assume it's already base64 encoded
            pdfBuffer = Buffer.from(pdfFile, "base64");
          }
        } else {
          pdfBuffer = pdfFile;
        }

        // Convert to base64 for the native SDK
        const base64Data = pdfBuffer.toString("base64");
        userParts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: base64Data,
          },
        });
      }
    }

    // Add images as inlineData parts if present
    if (multimodalInput?.images && multimodalInput.images.length > 0) {
      logger.debug(
        `[GoogleVertex] Processing ${multimodalInput.images.length} image(s) for native generate`,
      );

      for (const image of multimodalInput.images) {
        let imageBuffer: Buffer;
        let mimeType = "image/jpeg"; // Default

        if (typeof image === "string") {
          if (fs.existsSync(image)) {
            imageBuffer = fs.readFileSync(image);
            // Detect mime type from extension
            const ext = path.extname(image).toLowerCase();
            if (ext === ".png") {
              mimeType = "image/png";
            } else if (ext === ".gif") {
              mimeType = "image/gif";
            } else if (ext === ".webp") {
              mimeType = "image/webp";
            }
          } else if (image.startsWith("data:")) {
            // Handle data URL
            const matches = image.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              mimeType = matches[1];
              imageBuffer = Buffer.from(matches[2], "base64");
            } else {
              continue; // Skip invalid data URL
            }
          } else if (
            image.startsWith("http://") ||
            image.startsWith("https://")
          ) {
            // Image URL — fetch and base64-encode. Without this, the URL
            // string falls through to the "assume base64" branch below
            // and Vertex returns "Provided image is not valid".
            try {
              const response = await fetch(image);
              if (!response.ok) {
                logger.warn(
                  `[GoogleVertex] Image fetch failed: ${response.status} ${response.statusText}, skipping`,
                  { url: image },
                );
                continue;
              }
              const arrayBuffer = await response.arrayBuffer();
              imageBuffer = Buffer.from(arrayBuffer);
              const headerMime = response.headers.get("content-type");
              if (headerMime && headerMime.startsWith("image/")) {
                mimeType = headerMime.split(";")[0];
              }
            } catch (fetchError) {
              logger.warn(
                `[GoogleVertex] Image URL fetch threw, skipping: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
                { url: image },
              );
              continue;
            }
          } else {
            // Assume base64 string
            imageBuffer = Buffer.from(image, "base64");
            // Sniff the real format from magic bytes — bare base64 carries no
            // mime hint, and leaving the image/jpeg default makes Anthropic
            // reject PNG/GIF/WebP with a media-type mismatch 400.
            mimeType = this.detectImageType(imageBuffer);
          }
        } else {
          imageBuffer = image;
          // Buffer input (e.g. Slack/REST uploads) carries no mime hint; sniff
          // it instead of defaulting to image/jpeg (mislabels PNG -> 400).
          mimeType = this.detectImageType(imageBuffer);
        }

        const base64Data = imageBuffer.toString("base64");
        userParts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      }
    }

    // Prepend prior conversation turns before the current user message so
    // multi-turn callers (memory, loop REPL, agent flows) carry context
    // into native Vertex Gemini generate. Without this, every call started
    // fresh from the current input alone.
    prependConversationMessages(
      contents as Array<{ role: string; parts: unknown[] }>,
      options.conversationMessages,
    );

    contents.push({
      role: "user",
      parts: userParts,
    });

    // Tool filter (a0269210): trust options.tools — already merged + filtered
    // upstream. Defensive guard on disableTools matches the AI Studio path
    // and protects callers that bypass BaseProvider.generate() (which is
    // exactly what this method is doing).
    const combinedTools = !options.disableTools ? options.tools || {} : {};

    // Convert Vercel AI SDK tools to @google/genai FunctionDeclarations
    let tools:
      | Array<{ functionDeclarations: VertexGenaiFunctionDeclaration[] }>
      | undefined;
    const executeMap = new DedupExecuteMap();

    if (Object.keys(combinedTools).length > 0) {
      const functionDeclarations: VertexGenaiFunctionDeclaration[] = [];

      for (const [name, tool] of Object.entries(combinedTools)) {
        functionDeclarations.push(
          this.buildGeminiFunctionDeclaration(name, tool),
        );
        if (tool.execute) {
          executeMap.set(name, tool.execute);
        }
      }

      tools = [{ functionDeclarations }];

      logger.debug("[GoogleVertex] Converted tools for native SDK generate", {
        toolCount: functionDeclarations.length,
        toolNames: functionDeclarations.map((t) => t.name),
      });
    }

    // Check if we need to use the final_result tool pattern for structured output with tools
    // When both schema AND tools are present, we add final_result as a tool
    let useFinalResultTool = false;
    if (options.schema && tools) {
      useFinalResultTool = true;

      // Convert schema to JSON schema format
      const schemaAsJson = convertZodToJsonSchema(
        options.schema as ZodUnknownSchema,
        "openApi3",
      ) as Record<string, unknown>;
      const inlinedSchema = inlineJsonSchema(schemaAsJson);
      if (inlinedSchema.$schema) {
        delete inlinedSchema.$schema;
      }
      const typedSchema = ensureNestedSchemaTypes(inlinedSchema);

      // Add final_result tool to the existing function declarations
      const existingDeclarations = tools[0]?.functionDeclarations || [];
      existingDeclarations.push({
        name: "final_result",
        description:
          "Return the final structured result. You MUST call this tool when you have gathered all information and are ready to provide the final answer. The arguments should contain the structured data matching the expected schema.",
        parametersJsonSchema: typedSchema,
      });
      tools = [{ functionDeclarations: existingDeclarations }];

      logger.debug(
        "[GoogleVertex] Added final_result tool for structured output with tools (generate)",
        {
          schemaKeys: Object.keys(typedSchema),
          totalTools: existingDeclarations.length,
        },
      );
    }

    // Build config. Registry-driven sampling strip applied for uniformity
    // with every other provider path (inert for current Gemini models).
    const geminiSampling = resolveSamplingParams(
      this.providerName,
      modelName,
      {
        temperature: options.temperature ?? 1.0, // Gemini 3 requires 1.0 for tool calling
        ...(options.topP !== undefined && { topP: options.topP }),
      },
      "vertex.gemini",
    );
    const config: Record<string, unknown> = {
      ...(geminiSampling.temperature !== undefined && {
        temperature: geminiSampling.temperature,
      }),
      maxOutputTokens: options.maxTokens,
    };

    // Cap maxOutputTokens for models with restricted output token limits (32768)
    // This applies to Gemini 3 models and image generation models (gemini-2.5-flash-image, gemini-3-pro-image-preview)
    if (hasRestrictedOutputLimit(modelName)) {
      if (
        config.maxOutputTokens &&
        (config.maxOutputTokens as number) > RESTRICTED_OUTPUT_TOKEN_LIMIT
      ) {
        logger.warn(
          `[GoogleVertex] Capping maxOutputTokens from ${config.maxOutputTokens} to ${RESTRICTED_OUTPUT_TOKEN_LIMIT} for ${modelName}`,
        );
        config.maxOutputTokens = RESTRICTED_OUTPUT_TOKEN_LIMIT;
      }
      // If maxOutputTokens is undefined, set a safe default
      if (!config.maxOutputTokens) {
        config.maxOutputTokens = RESTRICTED_OUTPUT_TOKEN_LIMIT;
      }
    }

    // Add topP, topK, stopSequences if provided
    if (geminiSampling.topP !== undefined) {
      config.topP = geminiSampling.topP;
    }
    if (options.topK !== undefined) {
      config.topK = options.topK;
    }
    if (options.stopSequences && options.stopSequences.length > 0) {
      config.stopSequences = options.stopSequences;
    }

    if (tools) {
      config.tools = tools;
    }

    // Build system prompt, adding final_result instruction if needed
    let effectiveSystemPrompt = options.systemPrompt || "";
    if (useFinalResultTool) {
      const finalResultInstruction =
        "\n\nIMPORTANT: When you have gathered all necessary information and are ready to provide your final answer, you MUST call the 'final_result' tool with the structured data. Do not return the final answer as plain text - always use the final_result tool.";
      effectiveSystemPrompt = effectiveSystemPrompt + finalResultInstruction;
    }

    if (effectiveSystemPrompt) {
      config.systemInstruction = effectiveSystemPrompt;
    }

    // Add thinking config for Gemini 3
    const nativeThinkingConfig2 = createNativeThinkingConfig(
      options.thinkingConfig,
    );
    if (nativeThinkingConfig2) {
      config.thinkingConfig = nativeThinkingConfig2;
    }

    // Add JSON output format support for native SDK generate (matching stream implementation)
    // CRITICAL: Google Gemini API does NOT allow combining responseMimeType with function calling.
    // Error: "Function calling with a response mime type: 'application/json' is unsupported"
    // Additionally, responseSchema REQUIRES responseMimeType: "application/json" - they cannot be used separately.
    // Error without it: "Response_schema with a response mime type 'text/plain' is unsupported"
    // Therefore: When tools are present, we cannot use EITHER responseMimeType OR responseSchema.
    // When using final_result tool pattern, we skip this entirely as schema is enforced via tool.
    if (
      (options.output?.format === "json" || options.schema) &&
      !useFinalResultTool
    ) {
      // Only set responseMimeType AND responseSchema when NOT using tools
      // Both must be set together, and neither can be used with function calling
      if (!tools) {
        config.responseMimeType = "application/json";

        // Convert schema to JSON schema format for the native SDK
        if (options.schema) {
          const rawSchema = convertZodToJsonSchema(
            options.schema as ZodUnknownSchema,
            "openApi3",
          ) as Record<string, unknown>;
          const inlinedSchema = inlineJsonSchema(rawSchema);
          // Remove $schema if present - @google/genai doesn't need it
          if (inlinedSchema.$schema) {
            delete inlinedSchema.$schema;
          }
          // CRITICAL: Google Vertex AI requires ALL nested schemas to have a type field
          // ensureNestedSchemaTypes recursively adds missing type fields
          // Note: convertZodToJsonSchema now uses openApi3 target which produces nullable: true
          const typedSchema = ensureNestedSchemaTypes(inlinedSchema);
          // Sanitize the same way tool schemas are (see tool path above):
          // Vertex's responseSchema validator rejects extension keywords such
          // as `errorMessage` (from convertZodToJsonSchema's errorMessages
          // option) and `additionalProperties`. Without this a user schema with
          // a `.regex(.., { message })` field 400s the whole structured-output
          // request and the recovery loop retries the same poisoned payload.
          stripAdditionalPropertiesDeep(typedSchema);
          config.responseSchema = typedSchema;

          logger.debug(
            "[GoogleVertex] Added responseSchema for JSON output (generate)",
            {
              schemaKeys: Object.keys(typedSchema),
            },
          );
        }
      }
    }

    const startTime = Date.now();
    // Ensure maxSteps is a valid positive integer to prevent infinite loops
    const rawMaxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
    const maxSteps =
      Number.isFinite(rawMaxSteps) && rawMaxSteps > 0
        ? Math.min(Math.floor(rawMaxSteps), 100) // Cap at 100 for safety
        : Math.min(DEFAULT_MAX_STEPS, 100);
    // Widened per-turn copy: the agentic loop appends functionCall /
    // functionResponse parts on top of the plain text/inlineData parts the
    // initial contents carry.
    const currentContents: Array<{
      role: string;
      parts: VertexNativeLoopPart[];
    }> = [...contents];
    let finalText = "";
    // Cross-step text accumulation + last SDK finish reason, so the
    // maxSteps-exhaustion exit can surface real gathered text (Bug 1) and a
    // meaningful finishReason (Bug 2) instead of a placeholder / "unknown".
    let accumulatedText = "";
    let lastFinishReason: string | undefined;
    const allToolCalls: Array<{
      toolName: string;
      args: Record<string, unknown>;
    }> = [];
    const toolExecutions: Array<{
      name: string;
      input: Record<string, unknown>;
      output: unknown;
    }> = [];
    let step = 0;

    // Track structured output from final_result tool (when using final_result pattern)
    let finalResultStructuredOutput: Record<string, unknown> | undefined;

    // Track failed tools to prevent infinite retry loops
    // Key: tool name, Value: { count: retry attempts, lastError: error message }
    const failedTools = new Map<string, { count: number; lastError: string }>();

    // In-loop context guard: stop calling tools when the accumulated
    // conversation approaches the model's context window instead of stepping
    // into a provider "prompt too long" rejection mid-loop.
    const contextGuard = createContextGuard(
      getContextWindowSize("vertex", modelName),
    );
    let hitContextLimit = false;

    // Track token usage across all steps. Every loop step is a separate
    // billed API call, so per-step usage is folded into these turn totals
    // after each step's chunk drain — assigning them directly from chunk
    // metadata would record only the last step of a multi-step tool loop.
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheReadTokens = 0;
    let totalReasoningTokens = 0;

    // Abort scaffolding (mirrors executeNativeAnthropicStream). The native
    // Gemini SDK cancels via config.abortSignal, so drive an internal
    // AbortController: the caller's signal and the turn clock's watchdogs
    // (whole-turn deadline + optional stall detector) all trip it, and every
    // request/tool-exec receives effectiveSignal.
    const streamTimeoutMs =
      parseTimeout(options.timeout) ?? DEFAULT_GEMINI_STREAM_TIMEOUT_MS;
    const toolExecTimeoutMs =
      options.toolTimeoutMs ?? DEFAULT_TOOL_EXECUTION_TIMEOUT_MS;
    const effectiveTurnDeadlineMs = options.turnTimeoutMs ?? streamTimeoutMs;
    const internalAbort = new AbortController();
    const onCallerAbort = () => internalAbort.abort();
    options.abortSignal?.addEventListener("abort", onCallerAbort);
    const turnClock = createTurnClock({
      turnTimeoutMs: options.turnTimeoutMs,
      // Preserve the pre-existing defensive whole-turn bound when the caller
      // sets no explicit turn budget — a turn must never hang forever.
      defaultTurnTimeoutMs: streamTimeoutMs,
      stallTimeoutMs: options.stallTimeoutMs,
      wrapupTimeLeadMs: options.wrapupTimeLeadMs,
      onDeadline: (kind) => {
        logger.warn(
          kind === "timeout"
            ? `[GoogleVertex] Native Gemini turn exceeded its ${effectiveTurnDeadlineMs}ms time budget — aborting`
            : `[GoogleVertex] Native Gemini turn made no progress for ${options.stallTimeoutMs}ms — aborting`,
        );
        internalAbort.abort();
      },
    });
    const effectiveSignal = internalAbort.signal;
    if (options.abortSignal?.aborted) {
      internalAbort.abort();
    }
    let wasAborted = false;
    // One retry per turn for MALFORMED_FUNCTION_CALL steps (see the retry
    // block after the step drain).
    let malformedRetryCount = 0;

    // Step-cap flags declared in the outer scope so the terminal block (also
    // inside the try) and the finishReason mapping (after the finally) can
    // both read them.
    let hitStepLimit = false;
    let synthesizedFinalAnswer = false;

    try {
      // Agentic loop for tool calling
      while (step < maxSteps) {
        if (effectiveSignal.aborted) {
          wasAborted = true;
          break;
        }
        // Context guard: stop the tool loop before the accumulated
        // conversation crosses the window threshold — synthesize from what
        // we have instead of stepping into a provider rejection.
        if (contextGuard.shouldStop()) {
          hitContextLimit = true;
          logger.warn(
            `[GoogleVertex] Gemini turn stopped by the context guard: ` +
              `projected prompt ~${contextGuard.projectedNextPromptTokens} tokens ` +
              `>= threshold ${contextGuard.thresholdTokens} (step ${step}) — synthesizing a final answer.`,
          );
          break;
        }
        step++;
        turnClock.noteProgress();
        // Mid-turn discovery sync — see the stream twin.
        this.refreshGeminiToolDeclarations(
          combinedTools,
          tools?.[0]?.functionDeclarations,
          executeMap,
          failedTools,
        );
        logger.debug(
          `[GoogleVertex] Native SDK generate step ${step}/${maxSteps}`,
        );

        try {
          // Use generateContentStream and collect all chunks (same as GoogleAIStudio)
          const stream = await client.models.generateContentStream({
            model: modelName,
            contents: currentContents,
            config: { ...config, abortSignal: effectiveSignal },
          });

          const stepFunctionCalls: Array<{
            name: string;
            args: Record<string, unknown>;
          }> = [];

          // Capture raw response parts including thoughtSignature
          const rawResponseParts: unknown[] = [];
          // This step's own finish reason (vs the cross-step
          // lastFinishReason) — drives the single MALFORMED_FUNCTION_CALL
          // retry below.
          let stepFinishReason: string | undefined;
          // Per-step usage trackers for WRITE-THROUGH accumulation: within a
          // step's chunk stream the counts are latest-wins (promptTokenCount
          // arrives once in the final chunk; candidates/thoughts counts are
          // cumulative across chunks), so each chunk folds only the DELTA
          // over this step's previous value into the turn totals. The totals
          // are therefore correct at every point mid-drain — a step killed
          // mid-stream (abort / turn deadline / stall watchdog) still counts
          // the billed tokens it already reported.
          let stepInputTokens = 0;
          let stepOutputTokens = 0;
          let stepCacheReadTokens = 0;
          let stepReasoningTokens = 0;

          // Collect all chunks from stream
          for await (const chunk of stream) {
            turnClock.noteProgress();
            // Extract raw parts from candidates FIRST
            // This avoids using chunk.text which triggers SDK warning when
            // non-text parts (thoughtSignature, functionCall) are present
            const chunkRecord = chunk as Record<string, unknown>;
            const candidates = chunkRecord.candidates as
              | Array<Record<string, unknown>>
              | undefined;
            const firstCandidate = candidates?.[0];
            // Capture the SDK finish reason (Bug 2: previously dropped). Last
            // non-empty value across chunks wins.
            const chunkFinishReason = firstCandidate?.finishReason;
            if (typeof chunkFinishReason === "string" && chunkFinishReason) {
              lastFinishReason = chunkFinishReason;
              stepFinishReason = chunkFinishReason;
            }
            const chunkContent = firstCandidate?.content as
              | Record<string, unknown>
              | undefined;
            if (chunkContent && Array.isArray(chunkContent.parts)) {
              rawResponseParts.push(...chunkContent.parts);
            }
            if (chunk.functionCalls) {
              stepFunctionCalls.push(...chunk.functionCalls);
            }

            // Extract usage metadata from chunk
            // promptTokenCount is typically in the final chunk, candidatesTokenCount accumulates
            const usageMetadata = chunkRecord.usageMetadata as
              | {
                  promptTokenCount?: number;
                  candidatesTokenCount?: number;
                  cachedContentTokenCount?: number;
                  thoughtsTokenCount?: number;
                  totalTokenCount?: number;
                }
              | undefined;
            if (usageMetadata) {
              // Take the latest promptTokenCount (usually only in final chunk)
              if (
                usageMetadata.promptTokenCount !== undefined &&
                usageMetadata.promptTokenCount > 0
              ) {
                totalInputTokens +=
                  usageMetadata.promptTokenCount - stepInputTokens;
                stepInputTokens = usageMetadata.promptTokenCount;
                // Feed the context guard the REAL prompt size of this call.
                contextGuard.noteUsage(
                  usageMetadata.promptTokenCount,
                  usageMetadata.candidatesTokenCount ?? 0,
                );
                // cachedContentTokenCount is OVERLAPPING (a subset already inside
                // promptTokenCount). Clamp to the prompt count so an uncached
                // step reports 0 instead of a stale cached value.
                const chunkCacheReadTokens = Math.min(
                  usageMetadata.cachedContentTokenCount ?? 0,
                  usageMetadata.promptTokenCount,
                );
                totalCacheReadTokens +=
                  chunkCacheReadTokens - stepCacheReadTokens;
                stepCacheReadTokens = chunkCacheReadTokens;
              }
              // Take the latest candidatesTokenCount (accumulates through chunks)
              if (
                usageMetadata.candidatesTokenCount !== undefined &&
                usageMetadata.candidatesTokenCount > 0
              ) {
                totalOutputTokens +=
                  usageMetadata.candidatesTokenCount - stepOutputTokens;
                stepOutputTokens = usageMetadata.candidatesTokenCount;
              }
              // thoughtsTokenCount (thinking tokens, billed at the output
              // rate) is NOT part of candidatesTokenCount — Gemini reports
              // totalTokenCount = prompt + candidates + thoughts.
              if (
                usageMetadata.thoughtsTokenCount !== undefined &&
                usageMetadata.thoughtsTokenCount > 0
              ) {
                totalReasoningTokens +=
                  usageMetadata.thoughtsTokenCount - stepReasoningTokens;
                stepReasoningTokens = usageMetadata.thoughtsTokenCount;
              }
            }
          }

          // Extract text from raw parts after stream completes
          // This avoids SDK warning about non-text parts (thoughtSignature, functionCall)
          const stepText = rawResponseParts
            .filter(
              (part): part is { text: string } =>
                typeof (part as Record<string, unknown>).text === "string",
            )
            .map((part) => part.text)
            .join("");

          // MALFORMED_FUNCTION_CALL is usually a transient formatting failure
          // (the model emitted an unparseable call): retry the step ONCE with
          // a corrective note instead of hard-ending the turn with empty
          // content — automated alert-RCA turns were dying at step 2-4 on
          // this, mislabeled as step-cap exits.
          if (
            stepFunctionCalls.length === 0 &&
            !stepText &&
            stepFinishReason === "MALFORMED_FUNCTION_CALL" &&
            malformedRetryCount < 1 &&
            !effectiveSignal.aborted
          ) {
            malformedRetryCount++;
            logger.warn(
              `[GoogleVertex] Model returned MALFORMED_FUNCTION_CALL at step ${step}/${maxSteps}; retrying once with a corrective note.`,
            );
            this.emitTurnEvent({ phase: "malformed-retry", step, maxSteps });
            if (rawResponseParts.length > 0) {
              currentContents.push({
                role: "model",
                parts: rawResponseParts as VertexNativePart[],
              });
            }
            currentContents.push({
              role: "user",
              parts: [
                {
                  text:
                    "Your previous function call was malformed and could not " +
                    "be parsed. Re-issue it as a single valid function call, " +
                    "or answer in plain text.",
                },
              ],
            });
            continue;
          }

          // If no function calls, we're done
          if (stepFunctionCalls.length === 0) {
            finalText = stepText;
            break;
          }

          // Check for final_result tool call - this is our structured output pattern
          if (useFinalResultTool) {
            const finalResultCall = stepFunctionCalls.find(
              (call) => call.name === "final_result",
            );
            if (finalResultCall) {
              // Extract the structured output from final_result arguments
              finalResultStructuredOutput = finalResultCall.args as Record<
                string,
                unknown
              >;
              logger.debug(
                "[GoogleVertex] Received final_result tool call with structured output (generate)",
                {
                  outputKeys: Object.keys(finalResultStructuredOutput),
                },
              );
              // Return the structured output as JSON text
              finalText = JSON.stringify(finalResultStructuredOutput);
              break;
            }
          }

          // Accumulate non-empty step text across steps so the
          // maxSteps-exhaustion exit can surface the prose the model produced
          // instead of a canned placeholder (Bug 1). Mirrors the Vertex-Claude
          // loop's text accumulation.
          accumulatedText = appendStepText(accumulatedText, stepText);

          // Execute function calls
          logger.debug(
            `[GoogleVertex] Generate executing ${stepFunctionCalls.length} function calls`,
          );

          // Add model response with ALL parts (including thoughtSignature) to history
          // This preserves the thought_signature which is required for Gemini 3 multi-turn tool calling
          currentContents.push({
            role: "model",
            parts:
              rawResponseParts.length > 0
                ? (rawResponseParts as VertexNativeLoopPart[])
                : stepFunctionCalls.map((fc) => ({
                    functionCall: fc,
                  })),
          });

          // Execute each function and collect responses (plus an optional
          // trailing wrap-up nudge text part).
          const functionResponses: Array<
            | {
                functionResponse: {
                  name: string;
                  response: Record<string, unknown>;
                };
              }
            | { text: string }
          > = [];
          const toolCallsBefore = allToolCalls.length;
          const toolExecsBefore = toolExecutions.length;
          // Note: tool:start / tool:end events are emitted by ToolsManager's
          // wrapped `execute` (see ToolsManager.ts:355) — no inline emit needed.

          for (const call of stepFunctionCalls) {
            // Honor a deadline/stall/caller abort BETWEEN tool executions —
            // without this check a multi-tool step keeps executing its whole
            // batch (up to N × toolTimeoutMs past the deadline) before the
            // while-top check finally breaks.
            if (effectiveSignal.aborted) {
              wasAborted = true;
              break;
            }
            allToolCalls.push({ toolName: call.name, args: call.args });

            // Check if this tool has already exceeded retry limit
            const failedInfo = failedTools.get(call.name);
            if (failedInfo && failedInfo.count >= DEFAULT_TOOL_MAX_RETRIES) {
              logger.warn(
                `[GoogleVertex] Tool "${call.name}" has exceeded retry limit (${DEFAULT_TOOL_MAX_RETRIES}), skipping execution`,
              );

              const errorOutput = {
                error: `TOOL_PERMANENTLY_FAILED: The tool "${call.name}" has failed ${failedInfo.count} times and will not be retried. Last error: ${failedInfo.lastError}. Please proceed without using this tool or inform the user that this functionality is unavailable.`,
                status: "permanently_failed",
                do_not_retry: true,
              };

              toolExecutions.push({
                name: call.name,
                input: call.args,
                output: errorOutput,
              });

              functionResponses.push({
                functionResponse: {
                  name: call.name,
                  response: errorOutput,
                },
              });
              continue;
            }

            let execute = executeMap.get(call.name);
            if (!execute) {
              // Snapshot miss — see the stream twin.
              execute = this.resolveGeminiToolOnMiss(
                call.name,
                combinedTools,
                tools?.[0]?.functionDeclarations,
                executeMap,
                failedTools,
              );
            }
            if (execute) {
              try {
                // AI SDK Tool execute requires (args, options) - provide minimal options
                const toolOptions = {
                  toolCallId: `${call.name}-${Date.now()}`,
                  messages: [],
                  abortSignal: effectiveSignal,
                };
                turnClock.noteProgress();
                // Bound the execute() await — a wedged tool costs one step
                // (error tool_result), not the whole turn.
                const execResult = await withTimeout(
                  raceWithAbort(
                    Promise.resolve(execute(call.args, toolOptions)),
                    effectiveSignal,
                  ),
                  toolExecTimeoutMs,
                  `Tool "${call.name}" execution timed out after ${toolExecTimeoutMs}ms`,
                );
                turnClock.noteProgress();
                // Error-shaped success (MCP isError / { error } payloads —
                // e.g. proxy-blocked tools) counts toward the breaker too:
                // these fail without throwing, and only counting throws lets
                // the model grind on a blocked tool for the whole budget.
                const resultErrorText = extractToolFailureText(execResult);
                if (resultErrorText) {
                  const info = failedTools.get(call.name) || {
                    count: 0,
                    lastError: "",
                  };
                  info.count++;
                  info.lastError = resultErrorText;
                  failedTools.set(call.name, info);
                } else {
                  // Genuinely consecutive: a success clears the strike count
                  // (argument-dependent soft errors — file-not-found on
                  // different paths — must not disable a working tool).
                  failedTools.delete(call.name);
                }

                // Track execution
                toolExecutions.push({
                  name: call.name,
                  input: call.args,
                  output: execResult,
                });

                functionResponses.push({
                  functionResponse: {
                    name: call.name,
                    response: { result: execResult },
                  },
                });
              } catch (error) {
                // An abort during tool execution ends the turn gracefully — it
                // must NOT be recorded as a spurious tool failure. Both checks
                // matter: effectiveSignal.aborted catches an abort WE triggered
                // (even if the throw isn't abort-shaped); isAbortError(error)
                // catches an abort-shaped throw (e.g. a tool raising AbortError)
                // even when the signal itself never fired.
                if (effectiveSignal.aborted || isAbortError(error)) {
                  wasAborted = true;
                  break;
                }
                turnClock.noteProgress();
                if (error instanceof TimeoutError) {
                  this.emitTurnEvent({
                    phase: "tool-timeout",
                    step,
                    maxSteps,
                    toolName: call.name,
                  });
                }
                const errorMessage =
                  error instanceof Error ? error.message : "Unknown error";

                // Track this failure
                const currentFailInfo = failedTools.get(call.name) || {
                  count: 0,
                  lastError: "",
                };
                currentFailInfo.count++;
                currentFailInfo.lastError = errorMessage;
                failedTools.set(call.name, currentFailInfo);

                logger.warn(
                  `[GoogleVertex] Tool "${call.name}" failed (attempt ${currentFailInfo.count}/${DEFAULT_TOOL_MAX_RETRIES}): ${errorMessage}`,
                );

                // Determine if this is a permanent failure
                const isPermanentFailure =
                  currentFailInfo.count >= DEFAULT_TOOL_MAX_RETRIES;

                const errorOutput = {
                  error: isPermanentFailure
                    ? `TOOL_PERMANENTLY_FAILED: The tool "${call.name}" has failed ${currentFailInfo.count} times with error: ${errorMessage}. This tool will not be retried. Please proceed without using this tool or inform the user that this functionality is unavailable.`
                    : `TOOL_EXECUTION_ERROR: ${errorMessage}. Retry attempt ${currentFailInfo.count}/${DEFAULT_TOOL_MAX_RETRIES}.`,
                  status: isPermanentFailure ? "permanently_failed" : "failed",
                  do_not_retry: isPermanentFailure,
                  retry_count: currentFailInfo.count,
                  max_retries: DEFAULT_TOOL_MAX_RETRIES,
                };

                toolExecutions.push({
                  name: call.name,
                  input: call.args,
                  output: errorOutput,
                });

                functionResponses.push({
                  functionResponse: {
                    name: call.name,
                    response: errorOutput,
                  },
                });
              }
            } else {
              // Tool not found is a permanent error
              const errorOutput = {
                error: `TOOL_NOT_FOUND: The tool "${call.name}" does not exist. Do not attempt to call this tool again.`,
                status: "permanently_failed",
                do_not_retry: true,
              };

              toolExecutions.push({
                name: call.name,
                input: call.args,
                output: errorOutput,
              });

              functionResponses.push({
                functionResponse: {
                  name: call.name,
                  response: errorOutput,
                },
              });
            }
          }

          // An abort inside the tool-exec loop only breaks that inner for-loop.
          // Break the while too so no further model call is issued and control
          // reaches the terminal step-cap handling below.
          if (wasAborted) {
            break;
          }

          // Persist this step's tool calls/results into conversation memory.
          // Without this, tool_call / tool_result rows never reach Redis and
          // the chat-history UI loses every tool invocation. The first call
          // of the step carries the step's `thoughtSignature` so Gemini 3 can
          // match thinking patterns on replay.
          const stepToolCalls = allToolCalls.slice(toolCallsBefore);
          const stepToolExecs = toolExecutions.slice(toolExecsBefore);
          if (stepToolCalls.length > 0 || stepToolExecs.length > 0) {
            const stepThoughtSig = extractThoughtSignature(rawResponseParts);
            withTimeout(
              this.handleToolExecutionStorage(
                stepToolCalls.map((tc, i) => ({
                  toolName: tc.toolName,
                  args: tc.args,
                  ...(i === 0 && stepThoughtSig
                    ? { thoughtSignature: stepThoughtSig }
                    : {}),
                  stepIndex: step,
                })),
                stepToolExecs.map((te) => ({
                  toolName: te.name,
                  output: te.output,
                  stepIndex: step,
                })),
                options,
                new Date(),
              ),
              TOOL_STORAGE_TIMEOUT_MS,
              "tool storage write timed out",
            ).catch((error: unknown) => {
              logger.warn(
                "[GoogleVertex] Failed to store native Gemini generate tool executions",
                {
                  error: error instanceof Error ? error.message : String(error),
                },
              );
            });
          }

          // Time-budget wrap-up nudge (twin of the Anthropic loops' soft
          // step nudge): with the turn deadline approaching, tell the model
          // to consolidate. Rides as a trailing text part on the
          // tool-response user turn.
          if (turnClock.shouldNudgeWrapup()) {
            functionResponses.push({
              text: buildWrapupNudgeText(useFinalResultTool),
            });
          }

          // The @google/genai SDK only accepts "user" and "model" as valid
          // roles in contents — function/tool responses must use role: "user"
          // (matching the SDK's automaticFunctionCalling implementation and
          // the Google AI Studio path). See note in executeNativeGemini3Stream.
          currentContents.push({
            role: "user",
            parts: functionResponses,
          });
          // Project this step's growth for the context guard: the appended
          // tool results ride the next prompt (Gemini reports usage per call,
          // but only for content it has already seen).
          try {
            contextGuard.noteAppendedChars(
              JSON.stringify(functionResponses).length,
            );
          } catch {
            /* estimation is best-effort — never break the loop */
          }
        } catch (error) {
          // A mid-drain abort surfaces as an AbortError from the `for await`.
          // Break gracefully into the terminal block instead of re-throwing
          // (a re-throw would route the caller's abort into a second unbounded
          // fallback generate()). Dual check as with the inner catch:
          // effectiveSignal.aborted (a signal we tripped) OR isAbortError(error)
          // (an abort-shaped throw) — either means "stop", not a real failure.
          if (effectiveSignal.aborted || isAbortError(error)) {
            wasAborted = true;
            break;
          }
          logger.error("[GoogleVertex] Native SDK generate error", {
            error,
            model: modelName,
            location: effectiveLocation,
            status: (error as { status?: number })?.status,
          });
          // Best-effort request context for formatProviderError —
          // this.modelName can be stale when options.model overrides the
          // instance default.
          try {
            if (error && typeof error === "object") {
              const e = error as Record<string, unknown>;
              e.requestModel = modelName;
              e.requestRegion = effectiveLocation;
            }
          } catch {
            /* frozen/sealed error — context stays best-effort */
          }
          throw this.handleProviderError(error);
        }
      }

      // Handle maxSteps termination / abort — the loop exited because the step
      // cap was reached (or the turn was aborted) while the model was still
      // calling tools. Surface a real answer instead of the canned placeholder
      // (Bug 1) and a meaningful finishReason (Bug 2).
      if (!finalText && (step >= maxSteps || wasAborted || hitContextLimit)) {
        hitStepLimit = step >= maxSteps && !wasAborted;
        const toolCallCount = allToolCalls.filter(
          (tc) => tc.toolName !== "final_result",
        ).length;
        if (accumulatedText) {
          // Prefer the prose the model already produced across steps.
          logger.warn(
            hitContextLimit
              ? `[GoogleVertex] Generate tool call loop stopped by the context guard; ` +
                  `returning text already gathered from prior steps.`
              : `[GoogleVertex] Generate tool call loop terminated after reaching maxSteps (${maxSteps}); ` +
                  `returning text already gathered from prior steps.`,
          );
          finalText = accumulatedText;
        } else if (wasAborted) {
          // Turn ended on a time condition or caller abort — skip synth
          // entirely so it can never add +300s after a blown budget, and
          // answer with an HONEST message matching the actual exit cause
          // (never the step-cap text).
          logger.warn(
            `[GoogleVertex] Generate tool call loop ended mid-turn ` +
              `(${turnClock.timedOut ? "turn time limit" : turnClock.stalled ? "stall watchdog" : "caller abort"}); ` +
              `returning an honest terminal message.`,
          );
          finalText = this.buildLoopExitMessage({
            turnClock,
            wasAborted,
            stallTimeoutMs: options.stallTimeoutMs,
            maxSteps,
            toolCallCount,
          });
        } else {
          // Pure functionCall turns leave no text — make one tools-disabled call
          // so the model answers from the gathered tool results instead of the
          // canned placeholder.
          logger.warn(
            hitContextLimit
              ? `[GoogleVertex] Generate tool call loop stopped by the context guard ` +
                  `with no text; synthesizing a final answer with tools disabled.`
              : `[GoogleVertex] Generate tool call loop terminated after reaching maxSteps (${maxSteps}) ` +
                  `with no text; synthesizing a final answer with tools disabled.`,
          );
          // synth self-bounds its connect+drain via withTimeout(timeoutMs) and
          // never throws (returns empty on timeout/error), so it needs no outer
          // withTimeout wrapper — see synthesizeFinalAnswerWithoutTools.
          const synth = await this.synthesizeFinalAnswerWithoutTools(
            client,
            modelName,
            config,
            currentContents,
            useFinalResultTool,
            parseTimeout(options.timeout) ?? DEFAULT_GEMINI_STREAM_TIMEOUT_MS,
            effectiveSignal,
          );
          if (synth.text) {
            synthesizedFinalAnswer = true;
            finalText = synth.text;
            totalInputTokens += synth.inputTokens;
            totalOutputTokens += synth.outputTokens;
            totalReasoningTokens += synth.reasoningTokens ?? 0;
            if (synth.finishReason) {
              lastFinishReason = synth.finishReason;
            }
          } else {
            finalText = hitContextLimit
              ? buildContextCapMessage(toolCallCount)
              : buildToolLoopCapMessage(maxSteps, toolCallCount);
          }
        }
      }
    } finally {
      turnClock.dispose();
      options.abortSignal?.removeEventListener("abort", onCallerAbort);
    }

    // Unified finish reason: a step-cap exhaustion that did NOT end in a clean
    // synthesized answer is reported as "tool-calls" (the model still wanted
    // tools) — NOT "length", which neurolink.ts treats as token truncation
    // (jsonTruncated + WARNING span). A clean completion maps from the SDK
    // finish reason.
    const resolvedFinishReason =
      hitStepLimit && !synthesizedFinalAnswer
        ? "tool-calls"
        : mapGeminiFinishReason(lastFinishReason);

    // Turn-exit discriminator, independent of the provider-shaped
    // finishReason — consumers branch on this instead of sniffing strings.
    const stopReason = resolveTurnStopReason({
      timedOut: turnClock.timedOut,
      stalled: turnClock.stalled,
      wasAborted,
      cappedWithoutAnswer: hitStepLimit && !synthesizedFinalAnswer,
      contextCappedWithoutAnswer: hitContextLimit && !synthesizedFinalAnswer,
      finishReason: resolvedFinishReason,
    });
    if (stopReason !== "completed") {
      this.emitTurnEvent({
        phase: stopReason,
        step,
        maxSteps,
        toolCallCount: allToolCalls.filter(
          (tc) => tc.toolName !== "final_result",
        ).length,
        elapsedMs: turnClock.elapsedMs(),
      });
    }

    const responseTime = Date.now() - startTime;

    // Filter out final_result from tool calls and executions as it's an internal pattern
    const externalToolCalls = allToolCalls.filter(
      (tc) => tc.toolName !== "final_result",
    );
    const externalToolExecutions = toolExecutions.filter(
      (te) => te.name !== "final_result",
    );

    // Build EnhancedGenerateResult
    // Gemini promptTokenCount is OVERLAPPING (already includes
    // cachedContentTokenCount). Subtract once so the cached portion is billed at
    // the cheaper cacheRead rate without double-counting; total is conserved.
    const adjustedInputTokens = Math.max(
      0,
      totalInputTokens - totalCacheReadTokens,
    );
    const result: EnhancedGenerateResult = {
      content: finalText,
      provider: this.providerName,
      model: modelName,
      finishReason: resolvedFinishReason,
      stopReason,
      rawFinishReason: lastFinishReason,
      stepsUsed: step,
      usage: {
        input: adjustedInputTokens,
        // Thinking tokens are billed at the output rate but Gemini does NOT
        // include them in candidatesTokenCount (totalTokenCount = prompt +
        // candidates + thoughts), so they are folded into `output` — that is
        // what calculateCost bills at the output rate — with `reasoning`
        // reporting the thinking subset.
        output: totalOutputTokens + totalReasoningTokens,
        total:
          adjustedInputTokens +
          totalCacheReadTokens +
          totalOutputTokens +
          totalReasoningTokens,
        ...(totalCacheReadTokens > 0 && {
          cacheReadTokens: totalCacheReadTokens,
        }),
        ...(totalReasoningTokens > 0 && {
          reasoning: totalReasoningTokens,
        }),
      },
      ...(totalReasoningTokens > 0 && {
        reasoningTokens: totalReasoningTokens,
      }),
      responseTime,
      toolsUsed: externalToolCalls.map((tc) => tc.toolName),
      toolExecutions: resolveToolExecutionRecords(
        options,
        externalToolExecutions,
      ),
      enhancedWithTools: externalToolCalls.length > 0,
    };

    // Add structured output if final_result tool was used
    if (finalResultStructuredOutput) {
      (
        result as EnhancedGenerateResult & { structuredOutput?: unknown }
      ).structuredOutput = finalResultStructuredOutput;
    }

    // Route through enhanceResult so analytics/evaluation/tracing get the
    // same treatment as the BaseProvider.generate() path. Without this,
    // enableAnalytics / enableEvaluation are silently ignored on the native
    // Vertex Gemini generate path.
    return this.enhanceResult(result, options, startTime);
  }

  /**
   * One-shot, tools-disabled model call used when a native Gemini agentic loop
   * is force-terminated by the step cap with no text produced. Lets the model
   * synthesize a final answer from the function results already in `contents`
   * instead of returning a canned placeholder (Bug 1, part b).
   *
   * Tools are disabled by OMITTING `config.tools` — the codebase's established
   * mechanism. `@google/genai`'s `FunctionCallingConfigMode.NONE` is documented
   * as equivalent to passing no function declarations, and `functionCallingConfig`
   * is not used anywhere in this codebase. When the structured-output
   * (`final_result`) pattern was active, a trailing instruction countermands the
   * earlier "you MUST call final_result" directive so the model answers in plain
   * text. Never throws — returns empty text so the caller falls back to the
   * graceful cap message (buildToolLoopCapMessage), guaranteeing no new failure
   * path.
   */
  // eslint-disable-next-line max-params -- trailing optional abortSignal keeps the positional call sites stable
  private async synthesizeFinalAnswerWithoutTools(
    client: GenAIClient,
    modelName: string,
    config: Record<string, unknown>,
    contents: Array<{ role: string; parts: VertexNativeLoopPart[] }>,
    useFinalResultTool: boolean,
    timeoutMs: number,
    abortSignal?: AbortSignal,
  ): Promise<{
    text: string;
    finishReason?: string;
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
  }> {
    // Already aborted — never issue the synth request (would add +300s after a
    // blown budget). Return empty so the caller maps to the graceful message.
    if (abortSignal?.aborted) {
      return { text: "", inputTokens: 0, outputTokens: 0, reasoningTokens: 0 };
    }
    try {
      // Shallow clone so the loop's config is never mutated; dropping the
      // top-level `tools` key is sufficient (nested thinkingConfig /
      // systemInstruction are intentionally preserved). Fold in the abort
      // signal so the synth request is cancellable too.
      const synthConfig: Record<string, unknown> = {
        ...config,
        ...(abortSignal ? { abortSignal } : {}),
      };
      delete synthConfig.tools;
      if (useFinalResultTool) {
        const baseSystemInstruction =
          typeof synthConfig.systemInstruction === "string"
            ? synthConfig.systemInstruction
            : "";
        synthConfig.systemInstruction =
          baseSystemInstruction +
          "\n\nThe final_result tool is no longer available. Provide your " +
          "final answer directly as plain text now, using the information " +
          "gathered so far.";
      }

      // Bound the whole connect + drain with a timeout. The surrounding
      // try/catch only catches throws, not hangs, so without this a stalled
      // Vertex endpoint would hang the maxSteps recovery path indefinitely.
      // On timeout withTimeout rejects (TimeoutError) and the catch below
      // falls back to the placeholder — no new failure path is introduced.
      return await withTimeout(
        (async () => {
          const stream = await client.models.generateContentStream({
            model: modelName,
            contents,
            config: synthConfig,
          });

          const parts: unknown[] = [];
          let finishReason: string | undefined;
          let inputTokens = 0;
          let outputTokens = 0;
          let reasoningTokens = 0;
          for await (const chunk of stream) {
            const chunkRecord = chunk as Record<string, unknown>;
            const candidates = chunkRecord.candidates as
              | Array<Record<string, unknown>>
              | undefined;
            const firstCandidate = candidates?.[0];
            const chunkFinishReason = firstCandidate?.finishReason;
            if (typeof chunkFinishReason === "string" && chunkFinishReason) {
              finishReason = chunkFinishReason;
            }
            const chunkContent = firstCandidate?.content as
              | Record<string, unknown>
              | undefined;
            if (chunkContent && Array.isArray(chunkContent.parts)) {
              parts.push(...chunkContent.parts);
            }
            const usageMetadata = chunkRecord.usageMetadata as
              | {
                  promptTokenCount?: number;
                  candidatesTokenCount?: number;
                  thoughtsTokenCount?: number;
                }
              | undefined;
            if (usageMetadata) {
              if (
                usageMetadata.promptTokenCount !== undefined &&
                usageMetadata.promptTokenCount > 0
              ) {
                inputTokens = usageMetadata.promptTokenCount;
              }
              if (
                usageMetadata.candidatesTokenCount !== undefined &&
                usageMetadata.candidatesTokenCount > 0
              ) {
                outputTokens = usageMetadata.candidatesTokenCount;
              }
              if (
                usageMetadata.thoughtsTokenCount !== undefined &&
                usageMetadata.thoughtsTokenCount > 0
              ) {
                reasoningTokens = usageMetadata.thoughtsTokenCount;
              }
            }
          }

          const text = parts
            .filter(
              (part): part is { text: string } =>
                typeof (part as Record<string, unknown>).text === "string",
            )
            .map((part) => part.text)
            .join("");

          return {
            text,
            finishReason,
            inputTokens,
            outputTokens,
            reasoningTokens,
          };
        })(),
        timeoutMs,
        "Gemini synthesis call timed out",
      );
    } catch (error) {
      logger.warn(
        "[GoogleVertex] Tools-disabled synthesis call failed; falling back to placeholder",
        { error: error instanceof Error ? error.message : String(error) },
      );
      return { text: "", inputTokens: 0, outputTokens: 0, reasoningTokens: 0 };
    }
  }

  /**
   * Create native AnthropicVertex client for Claude models
   */
  private async createAnthropicVertexClient(
    timeoutMs?: number,
  ): Promise<AnthropicVertexType> {
    const mod = await getAnthropicVertexModule();
    const settings = await createVertexAnthropicSettings(
      this.location,
      timeoutMs,
    );
    const client = new mod.AnthropicVertex(settings);
    // The vertex SDK eagerly starts Google ADC resolution in its constructor
    // (`this._authClientPromise = this._auth.getClient()`) and only awaits it
    // per-request in `prepareOptions()`. A client that is constructed but never
    // used — or built with misconfigured credentials — would otherwise leak
    // that rejection as a process-level `unhandledRejection`. Attaching a
    // handler here marks the promise as handled (so Node no longer reports it);
    // it does not consume the rejection — the per-request `await` in
    // `prepareOptions()` is a separate continuation and still surfaces auth
    // errors to callers. `void` flags the returned promise as deliberately
    // ignored (codebase convention for fire-and-forget).
    //
    // `_authClientPromise` is a private SDK internal, so it is reached via
    // runtime narrowing (`in` + `instanceof`) rather than a type assertion.
    const clientInternals: object = client;
    if ("_authClientPromise" in clientInternals) {
      const authClientPromise = clientInternals._authClientPromise;
      if (authClientPromise instanceof Promise) {
        void authClientPromise.catch(() => {
          // Intentionally ignored — see above.
        });
      }
    }
    return client;
  }

  /**
   * Execute stream using native @anthropic-ai/vertex-sdk for Claude models on Vertex AI
   * This bypasses @ai-sdk/google-vertex completely and uses Anthropic's native SDK
   */
  private async executeNativeAnthropicStream(
    options: StreamOptions,
  ): Promise<StreamResult> {
    const modelName = toVertexAnthropicModelId(
      options.model || this.modelName || "claude-sonnet-4-5@20250929",
    );
    const startTime = Date.now();
    const streamTimeoutMs = parseTimeout(options.timeout) ?? 300_000;
    const client = await this.createAnthropicVertexClient(streamTimeoutMs);

    logger.debug(
      "[GoogleVertex] Using native @anthropic-ai/vertex-sdk for Claude stream",
      {
        model: modelName,
        project: this.projectId,
        location: this.location,
      },
    );

    // Build messages from input
    const messages: VertexAnthropicMessage[] = [];

    // Replay conversationMessages (with tool turns), else the legacy text-only conversationHistory.
    if (
      options.conversationMessages &&
      options.conversationMessages.length > 0
    ) {
      messages.push(
        ...buildAnthropicHistoryMessages(options.conversationMessages),
      );
    } else if (
      options.conversationHistory &&
      options.conversationHistory.length > 0
    ) {
      for (const msg of options.conversationHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({
            role: msg.role,
            content: stringifyContentSafe(msg.content),
          });
        }
      }
    }

    // Add current user input with multimodal support
    // Cast input to access multimodal properties that may exist at runtime
    const multimodalInput = options.input as {
      text: string;
      pdfFiles?: Array<Buffer | string>;
      images?: Array<Buffer | string>;
    };

    // Build content parts for the user message
    const userContentParts: Array<
      | { type: "text"; text: string }
      | {
          type: "image";
          source: { type: "base64"; media_type: string; data: string };
        }
      | {
          type: "document";
          source: { type: "base64"; media_type: string; data: string };
        }
    > = [];

    // Add PDF files as document parts if present
    if (multimodalInput?.pdfFiles && multimodalInput.pdfFiles.length > 0) {
      logger.debug(
        `[GoogleVertex] Processing ${multimodalInput.pdfFiles.length} PDF file(s) for native Anthropic stream`,
      );

      for (const pdfFile of multimodalInput.pdfFiles) {
        let pdfBuffer: Buffer;

        if (typeof pdfFile === "string") {
          // Check if it's a file path
          if (fs.existsSync(pdfFile)) {
            pdfBuffer = fs.readFileSync(pdfFile);
          } else {
            // Assume it's already base64 encoded
            pdfBuffer = Buffer.from(pdfFile, "base64");
          }
        } else {
          pdfBuffer = pdfFile;
        }

        // Convert to base64 for Anthropic's document format
        const base64Data = pdfBuffer.toString("base64");
        userContentParts.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64Data,
          },
        });
      }
    }

    // Add images as image parts if present
    if (multimodalInput?.images && multimodalInput.images.length > 0) {
      logger.debug(
        `[GoogleVertex] Processing ${multimodalInput.images.length} image(s) for native Anthropic stream`,
      );

      for (const image of multimodalInput.images) {
        let imageBuffer: Buffer;
        let mimeType = "image/jpeg"; // Default

        if (typeof image === "string") {
          if (fs.existsSync(image)) {
            imageBuffer = fs.readFileSync(image);
            // Detect mime type from extension
            const ext = path.extname(image).toLowerCase();
            if (ext === ".png") {
              mimeType = "image/png";
            } else if (ext === ".gif") {
              mimeType = "image/gif";
            } else if (ext === ".webp") {
              mimeType = "image/webp";
            }
          } else if (image.startsWith("data:")) {
            // Handle data URL
            const matches = image.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              mimeType = matches[1];
              imageBuffer = Buffer.from(matches[2], "base64");
            } else {
              continue; // Skip invalid data URL
            }
          } else if (
            image.startsWith("http://") ||
            image.startsWith("https://")
          ) {
            // Image URL — fetch and base64-encode. Without this, the URL
            // string falls through to the "assume base64" branch below
            // and Vertex returns "Provided image is not valid".
            try {
              const response = await fetch(image);
              if (!response.ok) {
                logger.warn(
                  `[GoogleVertex] Image fetch failed: ${response.status} ${response.statusText}, skipping`,
                  { url: image },
                );
                continue;
              }
              const arrayBuffer = await response.arrayBuffer();
              imageBuffer = Buffer.from(arrayBuffer);
              const headerMime = response.headers.get("content-type");
              if (headerMime && headerMime.startsWith("image/")) {
                mimeType = headerMime.split(";")[0];
              }
            } catch (fetchError) {
              logger.warn(
                `[GoogleVertex] Image URL fetch threw, skipping: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
                { url: image },
              );
              continue;
            }
          } else {
            // Assume base64 string
            imageBuffer = Buffer.from(image, "base64");
            // Sniff the real format from magic bytes — bare base64 carries no
            // mime hint, and leaving the image/jpeg default makes Anthropic
            // reject PNG/GIF/WebP with a media-type mismatch 400.
            mimeType = this.detectImageType(imageBuffer);
          }
        } else {
          imageBuffer = image;
          // Buffer input (e.g. Slack/REST uploads) carries no mime hint; sniff
          // it instead of defaulting to image/jpeg (mislabels PNG -> 400).
          mimeType = this.detectImageType(imageBuffer);
        }

        const base64Data = imageBuffer.toString("base64");
        userContentParts.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType,
            data: base64Data,
          },
        });
      }
    }

    // Always add the text content
    userContentParts.push({
      type: "text",
      text: multimodalInput.text,
    });

    // Append the live user turn (merges into a trailing user turn if present).
    appendUserMessage(
      messages,
      userContentParts.length === 1 && userContentParts[0].type === "text"
        ? multimodalInput.text
        : userContentParts,
    );

    // Convert tools to Anthropic format if present
    let tools: VertexAnthropicTool[] | undefined;
    const executeMap = new DedupExecuteMap();

    if (
      options.tools &&
      Object.keys(options.tools).length > 0 &&
      !options.disableTools
    ) {
      tools = [];

      for (const [name, tool] of Object.entries(options.tools)) {
        tools.push(this.buildAnthropicToolDeclaration(name, tool));
        if (tool.execute) {
          executeMap.set(name, tool.execute);
        }
      }

      logger.debug("[GoogleVertex] Converted tools for native Anthropic SDK", {
        toolCount: tools.length,
        toolNames: tools.map((t) => t.name),
      });
    }

    // Handle JSON schema support via final_result tool pattern
    // Anthropic doesn't have native responseSchema, so we add a final_result tool
    const streamOptions = options as StreamOptions & {
      schema?: ZodUnknownSchema;
    };
    let useFinalResultTool = false;
    let schemaSystemPromptSuffix = "";

    if (streamOptions.schema) {
      useFinalResultTool = true;

      // Convert schema to JSON schema format
      const schemaAsJson = convertZodToJsonSchema(
        streamOptions.schema as ZodUnknownSchema,
      ) as Record<string, unknown>;
      const inlinedSchema = inlineJsonSchema(schemaAsJson);
      if (inlinedSchema.$schema) {
        delete inlinedSchema.$schema;
      }
      const typedSchema = ensureNestedSchemaTypes(inlinedSchema);

      // Create final_result tool
      const finalResultTool: VertexAnthropicTool = {
        name: "final_result",
        description:
          "Return the final structured result. You MUST call this tool when you have gathered all information and are ready to provide the final answer. The arguments should contain the structured data matching the expected schema.",
        input_schema: {
          type: "object",
          properties:
            (typedSchema.properties as Record<string, unknown>) || typedSchema,
          required: (typedSchema.required as string[]) || [],
        },
      };

      // Add to tools array or create new array
      if (!tools) {
        tools = [];
      }
      tools.push(finalResultTool);

      // Add instruction to system prompt
      schemaSystemPromptSuffix =
        "\n\nIMPORTANT: You MUST call the 'final_result' tool to return your response in the required structured format. Do not respond with plain text - always use the final_result tool.";

      logger.debug(
        "[GoogleVertex] Added final_result tool for Anthropic structured output (stream)",
        {
          schemaKeys: Object.keys(typedSchema),
          totalTools: tools.length,
        },
      );
    }

    // Build request options
    const systemPromptWithSchema = options.systemPrompt
      ? options.systemPrompt + schemaSystemPromptSuffix
      : schemaSystemPromptSuffix
        ? schemaSystemPromptSuffix.trim()
        : undefined;

    // Registry-driven strip: Sonnet 5 / Opus 4.7+ / Fable 5 on Vertex reject
    // sampling params. Applied here so every rebuild that spreads
    // `...requestParams` (forced finalization, tools-off backstop) inherits
    // the strip automatically.
    const streamSampling = resolveSamplingParams(
      this.providerName,
      modelName,
      {
        ...(options.temperature !== undefined && {
          temperature: options.temperature,
        }),
        ...(options.topP !== undefined && { topP: options.topP }),
      },
      "vertex.anthropic.stream",
    );

    const requestParams: Parameters<typeof client.messages.stream>[0] = {
      model: modelName,
      // Default to the model's real output ceiling (e.g. 64K for Sonnet 4.x)
      // instead of the legacy 4096, which silently truncated large structured
      // responses mid-JSON. resolveClaudeMaxTokens also clamps over-large
      // caller values so the native Vertex path never 400s.
      max_tokens: resolveClaudeMaxTokens(modelName, options.maxTokens),
      messages: messages as Parameters<
        typeof client.messages.stream
      >[0]["messages"],
      ...(tools && tools.length > 0 && { tools }),
      ...(useFinalResultTool && { tool_choice: { type: "any" as const } }),
      ...(systemPromptWithSchema && { system: systemPromptWithSchema }),
      ...(streamSampling.temperature !== undefined && {
        temperature: streamSampling.temperature,
      }),
      ...(streamSampling.topP !== undefined && {
        top_p: streamSampling.topP,
      }),
      ...(options.stopSequences &&
        options.stopSequences.length > 0 && {
          stop_sequences: options.stopSequences,
        }),
    };

    // ── Real-time streaming via stream.on('text', ...) ────────────────────
    //
    // The Anthropic SDK exposes per-delta streaming through `stream.on('text', listener)`:
    // each content_block_delta SSE event fires the listener synchronously
    // with that token's text — typically ~10 chars per delta, ~26ms apart
    // on Claude Haiku. Awaiting `stream.finalMessage()` here would buffer
    // the entire response before yielding anything; the listener pattern
    // keeps the wire and the consumer in lockstep instead.
    //
    // Structure: push-channel + background agentic loop, returning the
    // StreamResult immediately so callers can iterate `channel.iterable`
    // while generation is still in progress. Mirrors the executeStream
    // pattern in googleAiStudio.ts.

    const maxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
    // Reserve the LAST step of the budget for a forced final_result call when
    // structured output is active — see the generate twin for the full
    // rationale (tool_choice:"any" makes the text exit unreachable, so an
    // un-reserved budget deadlocks into an empty stream).
    const agenticStepBudget = useFinalResultTool
      ? Math.max(maxSteps - 1, 0)
      : maxSteps;
    const allToolCalls: Array<{
      toolName: string;
      args: Record<string, unknown>;
    }> = [];
    const toolExecutions: Array<{
      name: string;
      input: Record<string, unknown>;
      output: unknown;
    }> = [];

    const channel = createTextChannel();

    // Mutable holders the StreamResult references. Background loop updates
    // these as state progresses; consumer reads them after iterating the
    // stream to completion (channel.close() is called AFTER mutations).
    const usage: {
      input: number;
      output: number;
      total: number;
      cacheReadTokens?: number;
      cacheCreationTokens?: number;
    } = { input: 0, output: 0, total: 0 };
    const metadata: {
      streamId: string;
      startTime: number;
      responseTime: number;
      totalToolExecutions: number;
      // Mirrors finishReasonRef — set on metadata too because wrapper spreads
      // ({ ...result }) snapshot the top-level getter to undefined before the
      // background loop resolves, while the metadata object reference survives.
      finishReason?: string;
      // Same mutable-reference contract for the turn-exit discriminator, the
      // raw provider stop reason, and the step count.
      stopReason?: GenerateStopReason;
      rawFinishReason?: string;
      stepsUsed?: number;
    } = {
      streamId: `native-anthropic-vertex-${Date.now()}`,
      startTime,
      responseTime: 0,
      totalToolExecutions: 0,
    };
    const toolsUsedRef: string[] = [];
    const structuredOutputRef: { value?: Record<string, unknown> } = {};
    // Resolved after the background loop finishes; the StreamResult exposes it
    // via a getter (consumers read it after draining the stream), mirroring
    // the Gemini stream path's finishReason field.
    const finishReasonRef: { value?: string } = {};
    const stopReasonRef: { value?: GenerateStopReason } = {};
    const rawFinishReasonRef: { value?: string } = {};

    // Langfuse/OTel: the native SDK bypasses the Vercel AI SDK's
    // experimental_telemetry, so emit spans manually — one turn span, one
    // generation span per API call, one tool span per execution — all carrying
    // langfuse.* attributes the LangfuseSpanProcessor maps to observations.
    // Usage lives ONLY on the generation spans (Langfuse sums usage across
    // observations for trace totals, so repeating it on the turn double-counts).
    const offeredToolNames = (tools ?? []).map(
      (anthropicTool) => anthropicTool.name,
    );
    const turnInputAttribute = spanJsonAttribute({
      system: systemPromptWithSchema,
      messages: sanitizeAnthropicMessagesForTrace(messages),
    });
    const turnSpan = tracers.provider.startSpan("anthropic.vertex.stream", {
      kind: SpanKind.CLIENT,
      attributes: {
        // Mark as span, not generation — without it Langfuse infers "generation"
        // from the gen_ai.* attributes; the model calls live in child spans.
        [LANGFUSE_ATTR.OBSERVATION_TYPE]: "span",
        [ATTR.GEN_AI_SYSTEM]: "anthropic",
        [ATTR.GEN_AI_MODEL]: modelName,
        [ATTR.GEN_AI_OPERATION]: "stream",
        [ATTR.NL_PROVIDER]: this.providerName,
        [ATTR.NL_TOOL_COUNT]: offeredToolNames.length,
        [LANGFUSE_ATTR.OBSERVATION_INPUT]: turnInputAttribute,
        // Also lift IO to the trace — Langfuse reads trace input/output from
        // langfuse.trace.* and the trace list is unreadable without it.
        [LANGFUSE_ATTR.TRACE_INPUT]: turnInputAttribute,
        [LANGFUSE_ATTR.OBSERVATION_METADATA]: spanJsonAttribute({
          toolsOffered: offeredToolNames,
          toolCount: offeredToolNames.length,
          maxSteps,
          structuredOutput: useFinalResultTool,
        }),
      },
    });
    const turnContext = otelTrace.setSpan(otelContext.active(), turnSpan);
    let aggregatedTurnText = "";
    // Count of characters ALREADY delivered to the consumer via live text
    // deltas. aggregatedTurnText only reflects completed finalMessage()
    // responses, so an aborted mid-answer call would otherwise look "empty"
    // to the terminal handling even though the consumer saw partial prose.
    let liveTextPushedLength = 0;
    // Anthropic prompt-cache token accounting, aggregated across loop steps.
    const turnCacheUsage = {
      read: 0,
      creation: 0,
      creation5m: 0,
      creation1h: 0,
    };

    // Track the active Anthropic stream so aborts can cancel it mid-flight
    // (pre-rewrite code had no abort handling — fixed for free).
    let activeStream:
      | Awaited<ReturnType<typeof client.messages.stream>>
      | undefined;
    const abortHandler = () => {
      try {
        activeStream?.controller.abort();
      } catch {
        /* ignore — stream may already be finalized */
      }
    };
    // Internal abort fan-in: the caller's signal and the turn clock's
    // watchdogs (whole-turn deadline + optional stall detector) all trip it;
    // it cancels the in-flight SDK stream and is the signal tool executions
    // receive.
    const internalAbort = new AbortController();
    internalAbort.signal.addEventListener("abort", abortHandler);
    const onCallerAbort = () => internalAbort.abort();
    options.abortSignal?.addEventListener("abort", onCallerAbort);
    if (options.abortSignal?.aborted) {
      internalAbort.abort();
    }
    const toolExecTimeoutMs =
      options.toolTimeoutMs ?? DEFAULT_TOOL_EXECUTION_TIMEOUT_MS;
    const effectiveTurnDeadlineMs = options.turnTimeoutMs ?? streamTimeoutMs;
    // Whole-turn deadline + optional stall watchdog. When the caller sets no
    // explicit turn budget, keep the pre-existing defensive bound
    // (options.timeout, else 5 min) so a stalled Vertex/Anthropic endpoint
    // can't hang forever.
    const turnClock = createTurnClock({
      turnTimeoutMs: options.turnTimeoutMs,
      defaultTurnTimeoutMs: streamTimeoutMs,
      stallTimeoutMs: options.stallTimeoutMs,
      wrapupTimeLeadMs: options.wrapupTimeLeadMs,
      onDeadline: (kind) => {
        logger.warn(
          kind === "timeout"
            ? `[GoogleVertex] Anthropic stream turn exceeded its ${effectiveTurnDeadlineMs}ms time budget — aborting`
            : `[GoogleVertex] Anthropic stream turn made no progress for ${options.stallTimeoutMs}ms — aborting`,
        );
        internalAbort.abort();
      },
    });

    const loopPromise = (async () => {
      let step = 0;
      const currentMessages = [...messages];
      // Step-cap / abort bookkeeping (mirrors the generate twin): read by the
      // terminal recovery block after the loop and by the finishReason
      // mapping written into finishReasonRef.
      let wasAborted = false;
      let hitStepLimit = false;
      let hitContextLimit = false;
      let synthesizedFinalAnswer = false;
      let modelFinished = false;
      let lastStopReason: string | null | undefined;
      // In-loop context guard + consecutive-failure breaker — same rationale
      // as the generate twin (see executeNativeAnthropicGenerate).
      const contextGuard = createContextGuard(
        getContextWindowSize("vertex", modelName),
      );
      const failedTools = new Map<
        string,
        { count: number; lastError: string }
      >();

      try {
        while (step < agenticStepBudget) {
          // Honor aborts BETWEEN steps (caller signal OR the turn clock's
          // watchdogs — all fan into internalAbort): break into terminal
          // handling (one honest terminal chunk, clean close) instead of
          // throwing — channel.error would surface the caller's own abort as
          // a stream failure and route consumers into fallback retries.
          if (internalAbort.signal.aborted) {
            wasAborted = true;
            break;
          }
          // Context guard: stop the tool loop before the accumulated
          // conversation crosses the window threshold (see generate twin).
          if (contextGuard.shouldStop()) {
            hitContextLimit = true;
            logger.warn(
              `[GoogleVertex] Anthropic stream turn stopped by the context guard: ` +
                `projected prompt ~${contextGuard.projectedNextPromptTokens} tokens ` +
                `>= threshold ${contextGuard.thresholdTokens} (step ${step}) — synthesizing a final answer.`,
            );
            break;
          }
          step++;
          turnClock.noteProgress();
          // Mid-turn discovery sync: Claude only calls tools declared in the
          // request, so tools hydrated by search_tools last step must be
          // advertised now (requestParams.tools holds this array by
          // reference).
          this.refreshAnthropicToolDeclarations(
            options.tools,
            tools,
            executeMap,
            failedTools,
          );

          // One generation observation per API call: request in, content + usage out.
          const generationSpan = tracers.generation.startSpan(
            "anthropic.messages.stream",
            {
              kind: SpanKind.CLIENT,
              attributes: {
                [LANGFUSE_ATTR.OBSERVATION_TYPE]: "generation",
                [LANGFUSE_ATTR.OBSERVATION_MODEL_NAME]: modelName,
                [LANGFUSE_ATTR.OBSERVATION_MODEL_PARAMETERS]: spanJsonAttribute(
                  {
                    max_tokens: requestParams.max_tokens,
                    temperature: requestParams.temperature,
                    top_p: requestParams.top_p,
                  },
                ),
                [LANGFUSE_ATTR.OBSERVATION_INPUT]: spanJsonAttribute({
                  system: systemPromptWithSchema,
                  messages: sanitizeAnthropicMessagesForTrace(currentMessages),
                }),
                [LANGFUSE_ATTR.OBSERVATION_METADATA]: spanJsonAttribute({
                  step,
                  toolsOffered: offeredToolNames.length,
                }),
                [ATTR.GEN_AI_SYSTEM]: "anthropic",
                [ATTR.GEN_AI_MODEL]: modelName,
                [ATTR.GEN_AI_OPERATION]: "chat",
              },
            },
            turnContext,
          );

          let response: Awaited<
            ReturnType<
              Awaited<ReturnType<typeof client.messages.stream>>["finalMessage"]
            >
          >;
          try {
            // Vertex has no automatic prompt caching — place explicit
            // cache_control breakpoints (system, tools, rolling history) so the
            // conversation prefix is cached across turns instead of re-billed as
            // fresh input every call. Re-applied per step: the stable prefix
            // stays byte-identical (consistent cache key) while the rolling
            // breakpoint follows the growing tail.
            const cachedStream = applyVertexAnthropicCacheBreakpoints({
              system: systemPromptWithSchema,
              tools,
              messages: currentMessages,
            });
            const stream = await client.messages.stream({
              ...requestParams,
              ...(cachedStream.system !== undefined && {
                system: cachedStream.system as Parameters<
                  typeof client.messages.stream
                >[0]["system"],
              }),
              ...(cachedStream.tools &&
                cachedStream.tools.length > 0 && {
                  tools: cachedStream.tools as Parameters<
                    typeof client.messages.stream
                  >[0]["tools"],
                }),
              messages: cachedStream.messages as Parameters<
                typeof client.messages.stream
              >[0]["messages"],
            });
            activeStream = stream;

            // Forward each text delta as it arrives — the Anthropic SDK fires
            // this synchronously per content_block_delta, so the channel streams
            // at wire cadence. The first delta stamps completion_start_time,
            // giving Langfuse the generation's time-to-first-token.
            let firstDeltaSeen = false;
            stream.on("text", (delta: string) => {
              turnClock.noteProgress();
              if (delta.length > 0) {
                if (!firstDeltaSeen) {
                  firstDeltaSeen = true;
                  generationSpan.setAttribute(
                    LANGFUSE_ATTR.OBSERVATION_COMPLETION_START_TIME,
                    new Date().toISOString(),
                  );
                }
                channel.push(delta);
                liveTextPushedLength += delta.length;
              }
            });

            // finalMessage() resolves AFTER message_stop. By then the listener
            // has already fired for every delta — awaiting here doesn't block
            // visible streaming, it just gives us the structured response
            // shape needed for tool_use block extraction.
            response = await stream.finalMessage();
          } catch (modelCallError) {
            generationSpan.setStatus({
              code: SpanStatusCode.ERROR,
              message:
                modelCallError instanceof Error
                  ? modelCallError.message
                  : String(modelCallError),
            });
            if (modelCallError instanceof Error) {
              generationSpan.recordException(modelCallError);
            }
            generationSpan.end();
            // A mid-flight abort (caller signal or a turn-clock watchdog
            // tripping internalAbort/abortHandler) rejects finalMessage()
            // with an abort-shaped error. Break gracefully into the terminal
            // handling instead of routing it through channel.error as a
            // failure.
            if (internalAbort.signal.aborted || isAbortError(modelCallError)) {
              activeStream = undefined;
              wasAborted = true;
              break;
            }
            throw modelCallError;
          }
          activeStream = undefined;

          // End the generation span even if the bookkeeping below throws (else
          // it leaks). The model-call error path already ended it — no double-end.
          try {
            const stepCacheRead = response.usage?.cache_read_input_tokens ?? 0;
            const stepCacheCreation =
              response.usage?.cache_creation_input_tokens ?? 0;
            const stepCacheCreation5m =
              response.usage?.cache_creation?.ephemeral_5m_input_tokens ?? 0;
            const stepCacheCreation1h =
              response.usage?.cache_creation?.ephemeral_1h_input_tokens ?? 0;
            turnCacheUsage.read += stepCacheRead;
            turnCacheUsage.creation += stepCacheCreation;
            turnCacheUsage.creation5m += stepCacheCreation5m;
            turnCacheUsage.creation1h += stepCacheCreation1h;

            usage.input += response.usage?.input_tokens || 0;
            usage.output += response.usage?.output_tokens || 0;
            // Anthropic's input_tokens is only the UNCACHED remainder; cache
            // reads/writes are billed tokens reported separately, so the
            // total must include them (matches proxyTracer + anthropic.ts).
            usage.total =
              usage.input +
              usage.output +
              turnCacheUsage.read +
              turnCacheUsage.creation;
            lastStopReason = response.stop_reason;
            // Feed the context guard the FULL prompt size of this call
            // (uncached input + cache reads/writes).
            contextGuard.noteUsage(
              (response.usage?.input_tokens || 0) +
                stepCacheRead +
                stepCacheCreation,
              response.usage?.output_tokens || 0,
            );

            for (const block of response.content) {
              if (block.type === "text" && typeof block.text === "string") {
                aggregatedTurnText += block.text;
              }
            }

            generationSpan.setAttribute(
              LANGFUSE_ATTR.OBSERVATION_OUTPUT,
              spanJsonAttribute(response.content),
            );
            // 5m and 1h cache-creation are priced differently, so keep both;
            // drop the aggregate input_cache_creation (= 5m + 1h) that would
            // double-count. total sums the per-TTL keys shown here to match them.
            generationSpan.setAttribute(
              LANGFUSE_ATTR.OBSERVATION_USAGE_DETAILS,
              spanJsonAttribute({
                input: response.usage?.input_tokens ?? 0,
                output: response.usage?.output_tokens ?? 0,
                input_cached_tokens: stepCacheRead,
                input_cache_creation_5m: stepCacheCreation5m,
                input_cache_creation_1h: stepCacheCreation1h,
                total:
                  (response.usage?.input_tokens ?? 0) +
                  (response.usage?.output_tokens ?? 0) +
                  stepCacheRead +
                  stepCacheCreation5m +
                  stepCacheCreation1h,
              }),
            );
            generationSpan.setAttribute(
              ATTR.GEN_AI_INPUT_TOKENS,
              response.usage?.input_tokens ?? 0,
            );
            generationSpan.setAttribute(
              ATTR.GEN_AI_OUTPUT_TOKENS,
              response.usage?.output_tokens ?? 0,
            );
            if (response.stop_reason) {
              generationSpan.setAttribute(
                ATTR.GEN_AI_FINISH_REASON,
                response.stop_reason,
              );
            }
            generationSpan.setStatus({ code: SpanStatusCode.OK });
          } finally {
            generationSpan.end();
          }

          const toolUseBlocks = (
            response.content as VertexAnthropicContentBlock[]
          ).filter(
            (
              block,
            ): block is {
              type: "tool_use";
              id: string;
              name: string;
              input: Record<string, unknown>;
            } => block.type === "tool_use",
          );

          // Structured-output pattern: when the model returns the
          // final_result tool call, push its arguments as JSON and stop.
          // Single-shot yield so callers consuming the stream still see
          // the structured value.
          if (useFinalResultTool) {
            const finalResultCall = toolUseBlocks.find(
              (block) => block.name === "final_result",
            );
            if (finalResultCall) {
              structuredOutputRef.value = finalResultCall.input;
              channel.push(JSON.stringify(finalResultCall.input));
              modelFinished = true;
              logger.debug(
                "[GoogleVertex] Extracted structured output from final_result tool (stream)",
                { keys: Object.keys(finalResultCall.input) },
              );
              break;
            }
          }

          // No tools — pure text turn. Listener already pushed all deltas;
          // loop terminates and channel.close() flushes the consumer.
          if (toolUseBlocks.length === 0) {
            modelFinished = true;
            break;
          }

          // Tool execution loop. tool:start / tool:end events fire from
          // ToolsManager's wrapped execute (ToolsManager.ts:355) — no inline
          // emit needed. The array also carries the trailing soft-budget
          // nudge text block appended below (tool_result blocks stay first,
          // as the Anthropic API requires).
          const toolResults: Array<
            | {
                type: "tool_result";
                tool_use_id: string;
                content: string;
              }
            | { type: "text"; text: string }
          > = [];
          // Per-step bookkeeping for conversation-memory storage.
          const stepStorageCalls: Array<{
            toolCallId: string;
            toolName: string;
            args: Record<string, unknown>;
          }> = [];
          const stepStorageResults: Array<{
            toolCallId: string;
            toolName: string;
            output: unknown;
          }> = [];
          // Note: tool:start / tool:end events are emitted by ToolsManager's
          // wrapped `execute` (see ToolsManager.ts:355) — no inline emit needed.
          for (const toolUse of toolUseBlocks) {
            // Honor a deadline/stall/caller abort BETWEEN tool executions —
            // without this check a multi-tool step keeps executing its whole
            // batch (up to N × toolTimeoutMs past the deadline) before the
            // while-top check finally breaks. Skipped tools get neither a
            // call row nor a result row, so persisted history stays paired.
            if (internalAbort.signal.aborted) {
              wasAborted = true;
              break;
            }
            allToolCalls.push({
              toolName: toolUse.name,
              args: toolUse.input,
            });
            toolsUsedRef.push(toolUse.name);
            stepStorageCalls.push({
              toolCallId: toolUse.id,
              toolName: toolUse.name,
              args: toolUse.input,
            });

            // Consecutive-failure breaker (ports the Gemini loops' failedTools
            // map): a tool that has already failed DEFAULT_TOOL_MAX_RETRIES
            // times this turn is short-circuited instead of re-executed.
            const failedInfo = failedTools.get(toolUse.name);
            if (failedInfo && failedInfo.count >= DEFAULT_TOOL_MAX_RETRIES) {
              logger.warn(
                `[GoogleVertex] Tool "${toolUse.name}" has exceeded retry limit (${DEFAULT_TOOL_MAX_RETRIES}), skipping execution`,
              );
              const errMsg = `TOOL_PERMANENTLY_FAILED: The tool "${toolUse.name}" has failed ${failedInfo.count} times and will not be retried. Last error: ${failedInfo.lastError}. Please proceed without using this tool or inform the user that this functionality is unavailable.`;
              const errorPayload = { error: errMsg };
              toolExecutions.push({
                name: toolUse.name,
                input: toolUse.input,
                output: errorPayload,
              });
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: errMsg,
              });
              stepStorageResults.push({
                toolCallId: toolUse.id,
                toolName: toolUse.name,
                output: errorPayload,
              });
              continue;
            }

            // One tool observation per execution. ai.toolCall.* names follow the
            // Vercel AI SDK convention so existing tooling keeps working.
            const toolSpan = tracers.mcp.startSpan(
              "ai.toolCall",
              {
                kind: SpanKind.INTERNAL,
                attributes: {
                  [LANGFUSE_ATTR.OBSERVATION_TYPE]: "tool",
                  [ATTR.GEN_AI_TOOL_NAME]: toolUse.name,
                  "ai.toolCall.name": toolUse.name,
                  "ai.toolCall.id": toolUse.id,
                  "ai.toolCall.args": spanJsonAttribute(toolUse.input, 20_000),
                  [LANGFUSE_ATTR.OBSERVATION_INPUT]: spanJsonAttribute(
                    toolUse.input,
                    20_000,
                  ),
                  [LANGFUSE_ATTR.OBSERVATION_METADATA]: spanJsonAttribute({
                    step,
                  }),
                },
              },
              turnContext,
            );
            const endToolSpan = (output: unknown, errorMessage?: string) => {
              toolSpan.setAttribute(
                "ai.toolCall.result",
                spanJsonAttribute(output),
              );
              toolSpan.setAttribute(
                LANGFUSE_ATTR.OBSERVATION_OUTPUT,
                spanJsonAttribute(output),
              );
              if (errorMessage) {
                toolSpan.setAttribute(LANGFUSE_ATTR.OBSERVATION_LEVEL, "ERROR");
                toolSpan.setAttribute(
                  LANGFUSE_ATTR.OBSERVATION_STATUS_MESSAGE,
                  errorMessage,
                );
                toolSpan.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: errorMessage,
                });
              } else {
                toolSpan.setStatus({ code: SpanStatusCode.OK });
              }
              toolSpan.end();
            };

            let execute = executeMap.get(toolUse.name);
            if (!execute) {
              // Snapshot miss: hydrated by search_tools this step batch, or
              // a deferred catalog tool called directly by name.
              execute = this.resolveAnthropicToolOnMiss(
                toolUse.name,
                options.tools,
                tools,
                executeMap,
                failedTools,
              );
            }
            if (execute) {
              try {
                const toolOptions = {
                  toolCallId: toolUse.id,
                  messages: [],
                  abortSignal: internalAbort.signal,
                };
                turnClock.noteProgress();
                // Run with toolSpan active so spans inside execute
                // (neurolink.tool.execute) nest under this observation instead
                // of becoming disconnected siblings. Bound the await — a
                // wedged tool costs one step (error tool_result), not the
                // whole turn — and race it against the turn's abort so a
                // deadline/caller abort is observed IMMEDIATELY instead of
                // after the tool settles.
                const result = await withTimeout(
                  raceWithAbort(
                    otelContext.with(
                      otelTrace.setSpan(turnContext, toolSpan),
                      () =>
                        Promise.resolve(execute(toolUse.input, toolOptions)),
                    ),
                    internalAbort.signal,
                  ),
                  toolExecTimeoutMs,
                  `Tool "${toolUse.name}" execution timed out after ${toolExecTimeoutMs}ms`,
                );
                turnClock.noteProgress();
                // MCP failures are returned, not thrown — surface them on
                // the span so failed calls show as ERROR in Langfuse.
                endToolSpan(result, extractMcpToolErrorMessage(result));
                // Error-shaped success (MCP isError / { error } payloads)
                // counts toward the breaker too — see the generate twin.
                const resultErrorText = extractToolFailureText(result);
                if (resultErrorText) {
                  const info = failedTools.get(toolUse.name) || {
                    count: 0,
                    lastError: "",
                  };
                  info.count++;
                  info.lastError = resultErrorText;
                  failedTools.set(toolUse.name, info);
                } else {
                  // Genuinely consecutive: a success clears the strike count
                  // (argument-dependent soft errors — file-not-found on
                  // different paths — must not disable a working tool).
                  failedTools.delete(toolUse.name);
                }
                toolExecutions.push({
                  name: toolUse.name,
                  input: toolUse.input,
                  output: result,
                });
                // Anthropic requires tool_result.content to be a string.
                // JSON.stringify returns undefined for undefined/function/symbol,
                // so coerce defensively to keep the follow-up turn valid.
                const resultContent =
                  typeof result === "string"
                    ? result
                    : stringifyContentSafe(result ?? null);
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: resultContent,
                });
                stepStorageResults.push({
                  toolCallId: toolUse.id,
                  toolName: toolUse.name,
                  output: result,
                });
              } catch (err) {
                // An aborted tool call is a cancellation, not a tool failure —
                // end the span without recording an error execution/result and
                // break the turn.
                if (internalAbort.signal.aborted || isAbortError(err)) {
                  endToolSpan({ aborted: true });
                  // Keep persisted tool history paired: the call row was
                  // already pushed above, so record a neutral cancellation
                  // result (NOT an error) — an unpaired tool_use replayed on
                  // the next turn would be rejected by the Anthropic API.
                  stepStorageResults.push({
                    toolCallId: toolUse.id,
                    toolName: toolUse.name,
                    output: { aborted: true },
                  });
                  wasAborted = true;
                  break;
                }
                turnClock.noteProgress();
                if (err instanceof TimeoutError) {
                  this.emitTurnEvent({
                    phase: "tool-timeout",
                    step,
                    maxSteps,
                    toolName: toolUse.name,
                  });
                }
                // Count the failure toward the consecutive-failure breaker.
                const thrownErrorText =
                  err instanceof Error ? err.message : String(err);
                const info = failedTools.get(toolUse.name) || {
                  count: 0,
                  lastError: "",
                };
                info.count++;
                info.lastError = thrownErrorText;
                failedTools.set(toolUse.name, info);
                logger.warn(
                  `[GoogleVertex] Tool "${toolUse.name}" failed (attempt ${info.count}/${DEFAULT_TOOL_MAX_RETRIES}): ${thrownErrorText}`,
                );
                const errMsg = `Error executing tool "${toolUse.name}": ${thrownErrorText}`;
                const errorPayload = { error: errMsg };
                endToolSpan(errorPayload, errMsg);
                toolExecutions.push({
                  name: toolUse.name,
                  input: toolUse.input,
                  output: errorPayload,
                });
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: errMsg,
                });
                stepStorageResults.push({
                  toolCallId: toolUse.id,
                  toolName: toolUse.name,
                  output: errorPayload,
                });
              }
            } else {
              const errMsg = `TOOL_NOT_FOUND: The tool "${toolUse.name}" does not exist.`;
              const errorPayload = { error: errMsg };
              // A missing tool counts toward the breaker too — a model
              // grinding on a hallucinated/stale tool name must not burn the
              // whole step budget on TOOL_NOT_FOUND round-trips.
              const notFoundInfo = failedTools.get(toolUse.name) || {
                count: 0,
                lastError: "",
              };
              notFoundInfo.count++;
              notFoundInfo.lastError = errMsg;
              failedTools.set(toolUse.name, notFoundInfo);
              endToolSpan(errorPayload, errMsg);
              toolExecutions.push({
                name: toolUse.name,
                input: toolUse.input,
                output: errorPayload,
              });
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: errMsg,
              });
              stepStorageResults.push({
                toolCallId: toolUse.id,
                toolName: toolUse.name,
                output: errorPayload,
              });
            }
          }

          // Persist this step's tool calls/results into conversation memory.
          // Without this hook, tool rows never land in Redis and the
          // chat-history UI loses every tool invocation. Runs BEFORE the
          // abort break below so tools that DID complete in an aborted step
          // (real side effects) still reach the chat history.
          if (stepStorageCalls.length > 0 || stepStorageResults.length > 0) {
            withTimeout(
              this.handleToolExecutionStorage(
                stepStorageCalls.map((c) => ({ ...c, stepIndex: step })),
                stepStorageResults.map((r) => ({ ...r, stepIndex: step })),
                options,
                new Date(),
              ),
              TOOL_STORAGE_TIMEOUT_MS,
              "tool storage write timed out",
            ).catch((error: unknown) => {
              logger.warn(
                "[GoogleVertex] Failed to store native Anthropic stream tool executions",
                {
                  error: error instanceof Error ? error.message : String(error),
                },
              );
            });
          }

          // An abort inside the tool-exec loop only breaks that inner
          // for-loop. Break the while too so no further model call is issued
          // and control reaches the terminal step-cap handling below.
          if (wasAborted) {
            break;
          }

          // Soft budget nudge: with the step cap approaching, tell the model
          // to wrap up so the reserved forced-finalization call below stays a
          // fallback, not the norm. Rides as a trailing text block on the
          // tool_result user turn (cache-safe: it lives in the growing tail).
          // The time-budget twin fires when the turn deadline is inside the
          // wrap-up lead window instead.
          const stepsRemaining = agenticStepBudget - step;
          if (stepsRemaining > 0 && stepsRemaining <= 3) {
            toolResults.push({
              type: "text",
              text:
                `NOTE: Only ${stepsRemaining} tool step(s) remain. Consolidate what you have and ` +
                (useFinalResultTool
                  ? "call final_result with your best answer."
                  : "provide your final answer."),
            });
          } else if (turnClock.shouldNudgeWrapup()) {
            toolResults.push({
              type: "text",
              text: buildWrapupNudgeText(useFinalResultTool),
            });
          }

          // Continue the loop: assistant turn + tool_result user turn.
          // Filter server_tool_use blocks (Anthropic API rejects them in
          // subsequent message turns).
          const assistantContent = response.content.filter(
            (block: { type: string }) => block.type !== "server_tool_use",
          ) as (typeof currentMessages)[number]["content"];
          currentMessages.push({
            role: "assistant",
            content: assistantContent,
          });
          currentMessages.push({
            role: "user",
            content: toolResults,
          });
          // Project this step's growth for the context guard: everything
          // just appended (tool results + nudge text) rides the next prompt.
          contextGuard.noteAppendedChars(
            toolResults.reduce(
              (sum, block) =>
                sum +
                ("content" in block
                  ? block.content.length
                  : (block as { text: string }).text.length),
              0,
            ),
          );
        }

        // Terminal handling — the loop exited without a model-initiated
        // finish (step budget exhausted, or the turn was aborted). Never end
        // the stream empty: force the reserved final_result step on
        // structured-output turns, synthesize a plain-text answer on tool
        // turns, or push one graceful cap chunk. Mirrors the generate twin
        // and the Gemini paths (ed289b7 / PR #1123). The finalization and
        // backstop calls emit no per-call generation span (matching the
        // Gemini synthesizeFinalAnswerWithoutTools precedent); their tokens
        // still land in `usage` and the turn-span metadata.
        if (!modelFinished) {
          // An abort that landed during the FINAL budgeted step's tool
          // execution leaves wasAborted=false (no loop-entry check runs after
          // a budget exit) — re-check before issuing any terminal model call.
          if (internalAbort.signal.aborted) {
            wasAborted = true;
          }
          const externalToolCallCount = allToolCalls.filter(
            (tc) => tc.toolName !== "final_result",
          ).length;
          // Clamp the terminal calls' max_tokens so prompt + output stays
          // inside the model window: pre-4.5 Claude models 400 on
          // input + max_tokens > window, which would defeat the very
          // synthesis these calls exist for on context-capped turns. Only
          // bites when the prompt is near the window (min() is a no-op on
          // ordinary step-cap turns).
          const terminalMaxTokens = Math.max(
            1024,
            Math.min(
              requestParams.max_tokens,
              getContextWindowSize("vertex", modelName) -
                contextGuard.projectedNextPromptTokens -
                4_000,
            ),
          );
          if (wasAborted) {
            // Budget already blown — never issue another model call. Deliver
            // exactly one HONEST terminal chunk matching the actual exit
            // cause (time limit / stall / caller abort — never the step-cap
            // text) if nothing reached the consumer (live deltas already
            // delivered count as "something reached").
            logger.warn(
              `[GoogleVertex] Native Anthropic stream loop ended mid-turn ` +
                `(${turnClock.timedOut ? "turn time limit" : turnClock.stalled ? "stall watchdog" : "caller abort"}); ` +
                `returning an honest terminal message.`,
            );
            if (
              aggregatedTurnText.length === 0 &&
              liveTextPushedLength === 0 &&
              !structuredOutputRef.value
            ) {
              const exitMessage = this.buildLoopExitMessage({
                turnClock,
                wasAborted,
                stallTimeoutMs: options.stallTimeoutMs,
                maxSteps,
                toolCallCount: externalToolCallCount,
              });
              channel.push(exitMessage);
              aggregatedTurnText = exitMessage;
            }
          } else if (useFinalResultTool) {
            if (!hitContextLimit) {
              hitStepLimit = true;
            }
            logger.warn(
              hitContextLimit
                ? `[GoogleVertex] Native Anthropic stream loop stopped by the context guard without final_result; forcing a finalization call.`
                : `[GoogleVertex] Native Anthropic stream loop reached maxSteps (${maxSteps}) without final_result; forcing a finalization call.`,
            );
            try {
              // Reserved finalization step: identical request except
              // tool_choice pins final_result — Anthropic guarantees a
              // final_result tool_use. Cache treatment is byte-identical to
              // loop steps. No text listener: forced tool calls stream no
              // text deltas, and the structured JSON is pushed once below.
              const cachedFinal = applyVertexAnthropicCacheBreakpoints({
                system: systemPromptWithSchema,
                tools,
                messages: currentMessages,
              });
              const finalizationStream = await client.messages.stream({
                ...requestParams,
                max_tokens: terminalMaxTokens,
                tool_choice: {
                  type: "tool" as const,
                  name: "final_result",
                },
                ...(cachedFinal.system !== undefined && {
                  system: cachedFinal.system as Parameters<
                    typeof client.messages.stream
                  >[0]["system"],
                }),
                ...(cachedFinal.tools &&
                  cachedFinal.tools.length > 0 && {
                    tools: cachedFinal.tools as Parameters<
                      typeof client.messages.stream
                    >[0]["tools"],
                  }),
                messages: cachedFinal.messages as Parameters<
                  typeof client.messages.stream
                >[0]["messages"],
              });
              // Mid-flight aborts are covered by the shared abortHandler via
              // activeStream; already-fired aborts were handled by the
              // terminal-entry re-check above.
              activeStream = finalizationStream;
              const response = await finalizationStream.finalMessage();
              activeStream = undefined;
              usage.input += response.usage?.input_tokens || 0;
              usage.output += response.usage?.output_tokens || 0;
              turnCacheUsage.read +=
                response.usage?.cache_read_input_tokens ?? 0;
              turnCacheUsage.creation +=
                response.usage?.cache_creation_input_tokens ?? 0;
              turnCacheUsage.creation5m +=
                response.usage?.cache_creation?.ephemeral_5m_input_tokens ?? 0;
              turnCacheUsage.creation1h +=
                response.usage?.cache_creation?.ephemeral_1h_input_tokens ?? 0;
              // Total counts cache reads/writes — input_tokens is only the
              // uncached remainder.
              usage.total =
                usage.input +
                usage.output +
                turnCacheUsage.read +
                turnCacheUsage.creation;
              lastStopReason = response.stop_reason;
              const forcedFinalResult = (
                response.content as VertexAnthropicContentBlock[]
              ).find(
                (
                  block,
                ): block is {
                  type: "tool_use";
                  id: string;
                  name: string;
                  input: Record<string, unknown>;
                } => block.type === "tool_use" && block.name === "final_result",
              );
              if (forcedFinalResult) {
                structuredOutputRef.value = forcedFinalResult.input;
                channel.push(JSON.stringify(forcedFinalResult.input));
                synthesizedFinalAnswer = true;
                logger.debug(
                  "[GoogleVertex] Forced finalization returned structured output (stream)",
                  { keys: Object.keys(forcedFinalResult.input) },
                );
              } else {
                const capMessage = hitContextLimit
                  ? buildContextCapMessage(externalToolCallCount)
                  : buildToolLoopCapMessage(maxSteps, externalToolCallCount);
                channel.push(capMessage);
                aggregatedTurnText += capMessage;
              }
            } catch (error) {
              activeStream = undefined;
              // An aborted finalization is a cancellation (caller abort or a
              // turn-clock watchdog), not a step-cap turn — keep finishReason
              // mapping from lastStopReason and pick the exit message by the
              // actual cause.
              if (internalAbort.signal.aborted || isAbortError(error)) {
                hitStepLimit = false;
                wasAborted = true;
              }
              logger.warn(
                "[GoogleVertex] Forced finalization call failed; falling back to a terminal message",
                {
                  error: error instanceof Error ? error.message : String(error),
                },
              );
              const exitMessage =
                hitContextLimit && !wasAborted
                  ? buildContextCapMessage(externalToolCallCount)
                  : this.buildLoopExitMessage({
                      turnClock,
                      wasAborted,
                      stallTimeoutMs: options.stallTimeoutMs,
                      maxSteps,
                      toolCallCount: externalToolCallCount,
                    });
              channel.push(exitMessage);
              aggregatedTurnText += exitMessage;
            }
          } else {
            if (!hitContextLimit) {
              hitStepLimit = true;
            }
            if (aggregatedTurnText.length === 0) {
              // Pure tool-loop with no streamed text: one tools-disabled call
              // so the model answers from the gathered tool results, pushed
              // as a single chunk (matching the Gemini stream synth). NOTE:
              // the tools array must stay in the request — Anthropic rejects
              // histories containing tool_use/tool_result blocks without a
              // tools param — so "tools disabled" is tool_choice:"none",
              // which also keeps the cached tools prefix byte-identical.
              logger.warn(
                hitContextLimit
                  ? `[GoogleVertex] Native Anthropic stream loop stopped by the context guard with no text; synthesizing a final answer with tools disabled.`
                  : `[GoogleVertex] Native Anthropic stream loop reached maxSteps (${maxSteps}) with no text; synthesizing a final answer with tools disabled.`,
              );
              try {
                const backstopSystem =
                  (systemPromptWithSchema
                    ? systemPromptWithSchema + "\n\n"
                    : "") +
                  "Tool calling is no longer available for this turn. " +
                  "Provide your final answer directly as plain text now, " +
                  "using the information gathered so far.";
                const cachedBackstop = applyVertexAnthropicCacheBreakpoints({
                  system: backstopSystem,
                  tools,
                  messages: currentMessages,
                });
                const backstopStream = await client.messages.stream({
                  ...requestParams,
                  max_tokens: terminalMaxTokens,
                  tool_choice: { type: "none" as const },
                  system: cachedBackstop.system as Parameters<
                    typeof client.messages.stream
                  >[0]["system"],
                  ...(cachedBackstop.tools &&
                    cachedBackstop.tools.length > 0 && {
                      tools: cachedBackstop.tools as Parameters<
                        typeof client.messages.stream
                      >[0]["tools"],
                    }),
                  messages: cachedBackstop.messages as Parameters<
                    typeof client.messages.stream
                  >[0]["messages"],
                });
                activeStream = backstopStream;
                const response = await backstopStream.finalMessage();
                activeStream = undefined;
                usage.input += response.usage?.input_tokens || 0;
                usage.output += response.usage?.output_tokens || 0;
                turnCacheUsage.read +=
                  response.usage?.cache_read_input_tokens ?? 0;
                turnCacheUsage.creation +=
                  response.usage?.cache_creation_input_tokens ?? 0;
                turnCacheUsage.creation5m +=
                  response.usage?.cache_creation?.ephemeral_5m_input_tokens ??
                  0;
                turnCacheUsage.creation1h +=
                  response.usage?.cache_creation?.ephemeral_1h_input_tokens ??
                  0;
                // Total counts cache reads/writes — input_tokens is only the
                // uncached remainder.
                usage.total =
                  usage.input +
                  usage.output +
                  turnCacheUsage.read +
                  turnCacheUsage.creation;
                lastStopReason = response.stop_reason;
                const backstopText = (
                  response.content as VertexAnthropicContentBlock[]
                )
                  .filter(
                    (block): block is { type: "text"; text: string } =>
                      block.type === "text",
                  )
                  .map((b) => b.text)
                  .join("");
                if (backstopText) {
                  synthesizedFinalAnswer = true;
                  channel.push(backstopText);
                  aggregatedTurnText = backstopText;
                } else {
                  const capMessage = hitContextLimit
                    ? buildContextCapMessage(externalToolCallCount)
                    : buildToolLoopCapMessage(maxSteps, externalToolCallCount);
                  channel.push(capMessage);
                  aggregatedTurnText = capMessage;
                }
              } catch (error) {
                activeStream = undefined;
                // An aborted backstop is a cancellation (caller abort or a
                // turn-clock watchdog), not a step-cap turn — keep
                // finishReason mapping from lastStopReason and pick the exit
                // message by the actual cause.
                if (internalAbort.signal.aborted || isAbortError(error)) {
                  hitStepLimit = false;
                  wasAborted = true;
                }
                logger.warn(
                  "[GoogleVertex] Tools-disabled backstop call failed; falling back to a terminal message",
                  {
                    error:
                      error instanceof Error ? error.message : String(error),
                  },
                );
                const exitMessage =
                  hitContextLimit && !wasAborted
                    ? buildContextCapMessage(externalToolCallCount)
                    : this.buildLoopExitMessage({
                        turnClock,
                        wasAborted,
                        stallTimeoutMs: options.stallTimeoutMs,
                        maxSteps,
                        toolCallCount: externalToolCallCount,
                      });
                channel.push(exitMessage);
                aggregatedTurnText = exitMessage;
              }
            }
            // else: prose already streamed to the consumer across steps —
            // add nothing; finishReason "tool-calls" flags the capped turn.
          }
        }

        // Absolute backstop — never close the stream empty on a turn that
        // ran tools (mirrors the generate twin's guard). Catches the
        // model-finished-with-empty-content exit, which skips the terminal
        // recovery above.
        const deliveredNothing =
          aggregatedTurnText.length === 0 &&
          liveTextPushedLength === 0 &&
          !structuredOutputRef.value;
        const externalToolCallTotal = allToolCalls.filter(
          (tc) => tc.toolName !== "final_result",
        ).length;
        if (deliveredNothing && externalToolCallTotal > 0) {
          const exitMessage =
            hitContextLimit && !wasAborted
              ? buildContextCapMessage(externalToolCallTotal)
              : this.buildLoopExitMessage({
                  turnClock,
                  wasAborted,
                  stallTimeoutMs: options.stallTimeoutMs,
                  maxSteps,
                  toolCallCount: externalToolCallTotal,
                });
          channel.push(exitMessage);
          aggregatedTurnText = exitMessage;
        }

        // Honest finish reason (same mapping as the generate twin): "length"
        // takes precedence, a capped turn without a clean/forced answer is
        // "tool-calls", everything else is "stop". Mirrored onto metadata
        // (a mutable reference) because wrapper spreads snapshot the
        // top-level getter before this line runs.
        finishReasonRef.value =
          lastStopReason === "max_tokens"
            ? "length"
            : hitStepLimit && !synthesizedFinalAnswer
              ? "tool-calls"
              : "stop";
        metadata.finishReason = finishReasonRef.value;

        metadata.responseTime = Date.now() - startTime;
        metadata.totalToolExecutions = allToolCalls.filter(
          (tc) => tc.toolName !== "final_result",
        ).length;

        // Turn-exit discriminator + raw provider stop reason + step count —
        // mirrored onto metadata (mutable reference) for wrapper spreads,
        // like finishReason above.
        const resolvedStopReason = resolveTurnStopReason({
          timedOut: turnClock.timedOut,
          stalled: turnClock.stalled,
          wasAborted,
          cappedWithoutAnswer: hitStepLimit && !synthesizedFinalAnswer,
          contextCappedWithoutAnswer:
            hitContextLimit && !synthesizedFinalAnswer,
          finishReason: finishReasonRef.value,
        });
        stopReasonRef.value = resolvedStopReason;
        rawFinishReasonRef.value = lastStopReason ?? undefined;
        metadata.stopReason = resolvedStopReason;
        metadata.rawFinishReason = rawFinishReasonRef.value;
        metadata.stepsUsed = step;
        if (resolvedStopReason !== "completed") {
          this.emitTurnEvent({
            phase: resolvedStopReason,
            step,
            maxSteps,
            toolCallCount: metadata.totalToolExecutions,
            elapsedMs: turnClock.elapsedMs(),
          });
        }

        // Surface cache metrics once, after the agentic loop, from the
        // cumulative turnCacheUsage running totals (accumulated via += on every
        // step above). Assigned here — not per-iteration — so the final values
        // are unambiguous: analytics sees caching is working and calculateCost
        // can price the cache-read/write tiers instead of full input rate.
        if (turnCacheUsage.read > 0) {
          usage.cacheReadTokens = turnCacheUsage.read;
        }
        if (turnCacheUsage.creation > 0) {
          usage.cacheCreationTokens = turnCacheUsage.creation;
        }

        const turnOutputAttribute = spanJsonAttribute({
          text: aggregatedTurnText,
          ...(structuredOutputRef.value
            ? { structuredOutput: structuredOutputRef.value }
            : {}),
        });
        turnSpan.setAttribute(
          LANGFUSE_ATTR.OBSERVATION_OUTPUT,
          turnOutputAttribute,
        );
        turnSpan.setAttribute(LANGFUSE_ATTR.TRACE_OUTPUT, turnOutputAttribute);
        // Turn usage is metadata-only (not usage_details) — see the note at the
        // top of this method on why it must not contribute to the cost rollup.
        turnSpan.setAttribute(
          LANGFUSE_ATTR.OBSERVATION_METADATA,
          spanJsonAttribute({
            toolsOffered: offeredToolNames,
            toolCount: offeredToolNames.length,
            maxSteps,
            steps: step,
            toolCallCount: metadata.totalToolExecutions,
            toolsCalled: toolsUsedRef.filter((name) => name !== "final_result"),
            structuredOutput: useFinalResultTool,
            usage: {
              input: usage.input,
              output: usage.output,
              input_cached_tokens: turnCacheUsage.read,
              input_cache_creation: turnCacheUsage.creation,
              input_cache_creation_5m: turnCacheUsage.creation5m,
              input_cache_creation_1h: turnCacheUsage.creation1h,
            },
          }),
        );
        turnSpan.setStatus({ code: SpanStatusCode.OK });
        channel.close();
      } catch (err) {
        turnSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: err instanceof Error ? err.message : String(err),
        });
        if (err instanceof Error) {
          turnSpan.recordException(err);
        }
        logger.error("[GoogleVertex] Native Anthropic SDK stream error", err);
        channel.error(this.handleProviderError(err));
      } finally {
        turnSpan.end();
        options.abortSignal?.removeEventListener("abort", onCallerAbort);
        internalAbort.signal.removeEventListener("abort", abortHandler);
        turnClock.dispose();
      }
    })();
    // Suppress unhandled-rejection: errors funnel through channel.error()
    // and surface when the consumer iterates the stream.
    loopPromise.catch(() => undefined);

    // Return StreamResult IMMEDIATELY — caller's for-await can begin
    // iterating channel.iterable while the background loop is still
    // generating. usage / metadata / toolCalls / toolExecutions are mutable
    // references that the loop fills in over time; the consumer reads them
    // after iteration completes (after channel.close() has fired).
    const result: StreamResult = {
      stream: channel.iterable,
      provider: this.providerName,
      model: modelName,
      usage,
      metadata,
    };

    Object.defineProperty(result, "toolCalls", {
      enumerable: true,
      configurable: true,
      get: () => allToolCalls.filter((tc) => tc.toolName !== "final_result"),
    });
    Object.defineProperty(result, "toolsUsed", {
      enumerable: true,
      configurable: true,
      get: () => toolsUsedRef.filter((name) => name !== "final_result"),
    });
    Object.defineProperty(result, "toolExecutions", {
      enumerable: true,
      configurable: true,
      get: () =>
        transformToolExecutions(
          toolExecutions.filter((te) => te.name !== "final_result"),
        ),
    });

    Object.defineProperty(result, "structuredOutput", {
      enumerable: true,
      configurable: true,
      get: () => structuredOutputRef.value,
    });

    // Resolved by the background loop right before channel.close(); consumers
    // read it after draining the stream (same contract as usage/metadata).
    Object.defineProperty(result, "finishReason", {
      enumerable: true,
      configurable: true,
      get: () => finishReasonRef.value,
    });
    Object.defineProperty(result, "stopReason", {
      enumerable: true,
      configurable: true,
      get: () => stopReasonRef.value,
    });
    Object.defineProperty(result, "rawFinishReason", {
      enumerable: true,
      configurable: true,
      get: () => rawFinishReasonRef.value,
    });

    return result;
  }

  /**
   * Execute generate using native @anthropic-ai/vertex-sdk for Claude models on Vertex AI
   */
  private async executeNativeAnthropicGenerate(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    const modelName = toVertexAnthropicModelId(
      options.model || this.modelName || "claude-sonnet-4-5@20250929",
    );
    const startTime = Date.now();
    const generateTimeoutMs = parseTimeout(options.timeout) ?? 300_000;
    const client = await this.createAnthropicVertexClient(generateTimeoutMs);

    logger.debug(
      "[GoogleVertex] Using native @anthropic-ai/vertex-sdk for Claude generate",
      {
        model: modelName,
        project: this.projectId,
        location: this.location,
      },
    );

    // Build messages from input
    const messages: VertexAnthropicMessage[] = [];
    const inputText =
      options.prompt || options.input?.text || "Please respond.";

    // Replay conversationMessages (with tool turns), else the legacy text-only conversationHistory.
    if (
      options.conversationMessages &&
      options.conversationMessages.length > 0
    ) {
      messages.push(
        ...buildAnthropicHistoryMessages(options.conversationMessages),
      );
    } else if (
      options.conversationHistory &&
      options.conversationHistory.length > 0
    ) {
      for (const msg of options.conversationHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({
            role: msg.role,
            content: stringifyContentSafe(msg.content),
          });
        }
      }
    }

    // Add current user input with multimodal support
    // Cast input to access multimodal properties that may exist at runtime
    const multimodalInput = options.input as
      | {
          text: string;
          pdfFiles?: Array<Buffer | string>;
          images?: Array<Buffer | string>;
        }
      | undefined;

    // Build content parts for the user message
    const userContentParts: Array<
      | { type: "text"; text: string }
      | {
          type: "image";
          source: { type: "base64"; media_type: string; data: string };
        }
      | {
          type: "document";
          source: { type: "base64"; media_type: string; data: string };
        }
    > = [];

    // Add PDF files as document parts if present
    if (multimodalInput?.pdfFiles && multimodalInput.pdfFiles.length > 0) {
      logger.debug(
        `[GoogleVertex] Processing ${multimodalInput.pdfFiles.length} PDF file(s) for native Anthropic generate`,
      );

      for (const pdfFile of multimodalInput.pdfFiles) {
        let pdfBuffer: Buffer;

        if (typeof pdfFile === "string") {
          // Check if it's a file path
          if (fs.existsSync(pdfFile)) {
            pdfBuffer = fs.readFileSync(pdfFile);
          } else {
            // Assume it's already base64 encoded
            pdfBuffer = Buffer.from(pdfFile, "base64");
          }
        } else {
          pdfBuffer = pdfFile;
        }

        // Convert to base64 for Anthropic's document format
        const base64Data = pdfBuffer.toString("base64");
        userContentParts.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64Data,
          },
        });
      }
    }

    // Add images as image parts if present
    if (multimodalInput?.images && multimodalInput.images.length > 0) {
      logger.debug(
        `[GoogleVertex] Processing ${multimodalInput.images.length} image(s) for native Anthropic generate`,
      );

      for (const image of multimodalInput.images) {
        let imageBuffer: Buffer;
        let mimeType = "image/jpeg"; // Default

        if (typeof image === "string") {
          if (fs.existsSync(image)) {
            imageBuffer = fs.readFileSync(image);
            // Detect mime type from extension
            const ext = path.extname(image).toLowerCase();
            if (ext === ".png") {
              mimeType = "image/png";
            } else if (ext === ".gif") {
              mimeType = "image/gif";
            } else if (ext === ".webp") {
              mimeType = "image/webp";
            }
          } else if (image.startsWith("data:")) {
            // Handle data URL
            const matches = image.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              mimeType = matches[1];
              imageBuffer = Buffer.from(matches[2], "base64");
            } else {
              continue; // Skip invalid data URL
            }
          } else if (
            image.startsWith("http://") ||
            image.startsWith("https://")
          ) {
            // Image URL — fetch and base64-encode. Without this, the URL
            // string falls through to the "assume base64" branch below
            // and Vertex returns "Provided image is not valid".
            try {
              const response = await fetch(image);
              if (!response.ok) {
                logger.warn(
                  `[GoogleVertex] Image fetch failed: ${response.status} ${response.statusText}, skipping`,
                  { url: image },
                );
                continue;
              }
              const arrayBuffer = await response.arrayBuffer();
              imageBuffer = Buffer.from(arrayBuffer);
              const headerMime = response.headers.get("content-type");
              if (headerMime && headerMime.startsWith("image/")) {
                mimeType = headerMime.split(";")[0];
              }
            } catch (fetchError) {
              logger.warn(
                `[GoogleVertex] Image URL fetch threw, skipping: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
                { url: image },
              );
              continue;
            }
          } else {
            // Assume base64 string
            imageBuffer = Buffer.from(image, "base64");
            // Sniff the real format from magic bytes — bare base64 carries no
            // mime hint, and leaving the image/jpeg default makes Anthropic
            // reject PNG/GIF/WebP with a media-type mismatch 400.
            mimeType = this.detectImageType(imageBuffer);
          }
        } else {
          imageBuffer = image;
          // Buffer input (e.g. Slack/REST uploads) carries no mime hint; sniff
          // it instead of defaulting to image/jpeg (mislabels PNG -> 400).
          mimeType = this.detectImageType(imageBuffer);
        }

        const base64Data = imageBuffer.toString("base64");
        userContentParts.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType,
            data: base64Data,
          },
        });
      }
    }

    // Always add the text content
    userContentParts.push({
      type: "text",
      text: inputText,
    });

    // Append the live user turn (merges into a trailing user turn if present).
    appendUserMessage(
      messages,
      userContentParts.length === 1 && userContentParts[0].type === "text"
        ? inputText
        : userContentParts,
    );

    // Convert tools to Anthropic format if present
    let tools: VertexAnthropicTool[] | undefined;
    const executeMap = new DedupExecuteMap();
    const toolExecutions: Array<{
      name: string;
      input: Record<string, unknown>;
      output: unknown;
    }> = [];

    // Defensive guard: Vertex generate() bypasses BaseProvider.generate(), so
    // disableTools must be checked here before native tool declarations are
    // ever sent to the Anthropic Vertex SDK.
    if (
      !options.disableTools &&
      options.tools &&
      Object.keys(options.tools).length > 0
    ) {
      tools = [];

      for (const [name, tool] of Object.entries(options.tools)) {
        tools.push(this.buildAnthropicToolDeclaration(name, tool));
        if (tool.execute) {
          executeMap.set(name, tool.execute);
        }
      }
    }

    // Handle JSON schema support via final_result tool pattern
    // Anthropic doesn't have native responseSchema, so we add a final_result tool
    let useFinalResultTool = false;
    let schemaSystemPromptSuffix = "";

    if (options.schema) {
      useFinalResultTool = true;

      // Convert schema to JSON schema format
      const schemaAsJson = convertZodToJsonSchema(
        options.schema as ZodUnknownSchema,
      ) as Record<string, unknown>;
      const inlinedSchema = inlineJsonSchema(schemaAsJson);
      if (inlinedSchema.$schema) {
        delete inlinedSchema.$schema;
      }
      const typedSchema = ensureNestedSchemaTypes(inlinedSchema);

      // Create final_result tool
      const finalResultTool: VertexAnthropicTool = {
        name: "final_result",
        description:
          "Return the final structured result. You MUST call this tool when you have gathered all information and are ready to provide the final answer. The arguments should contain the structured data matching the expected schema.",
        input_schema: {
          type: "object",
          properties:
            (typedSchema.properties as Record<string, unknown>) || typedSchema,
          required: (typedSchema.required as string[]) || [],
        },
      };

      // Add to tools array or create new array
      if (!tools) {
        tools = [];
      }
      tools.push(finalResultTool);

      // Add instruction to system prompt
      schemaSystemPromptSuffix =
        "\n\nIMPORTANT: You MUST call the 'final_result' tool to return your response in the required structured format. Do not respond with plain text - always use the final_result tool.";

      logger.debug(
        "[GoogleVertex] Added final_result tool for Anthropic structured output (generate)",
        {
          schemaKeys: Object.keys(typedSchema),
          totalTools: tools.length,
        },
      );
    }

    // Build request options
    const systemPromptWithSchema = options.systemPrompt
      ? options.systemPrompt + schemaSystemPromptSuffix
      : schemaSystemPromptSuffix
        ? schemaSystemPromptSuffix.trim()
        : undefined;

    // Registry-driven strip: Sonnet 5 / Opus 4.7+ / Fable 5 on Vertex reject
    // sampling params. Applied at the requestParams build so the forced
    // finalization and tools-off backstop rebuilds (`...requestParams`)
    // inherit the strip automatically.
    const generateSampling = resolveSamplingParams(
      this.providerName,
      modelName,
      {
        ...(options.temperature !== undefined && {
          temperature: options.temperature,
        }),
        ...(options.topP !== undefined && { topP: options.topP }),
      },
      "vertex.anthropic.generate",
    );

    const requestParams = {
      model: modelName,
      // Default to the model's real output ceiling (see stream path note).
      max_tokens: resolveClaudeMaxTokens(modelName, options.maxTokens),
      messages,
      ...(tools && tools.length > 0 && { tools }),
      ...(useFinalResultTool && { tool_choice: { type: "any" as const } }),
      ...(systemPromptWithSchema && { system: systemPromptWithSchema }),
      ...(generateSampling.temperature !== undefined && {
        temperature: generateSampling.temperature,
      }),
      ...(generateSampling.topP !== undefined && {
        top_p: generateSampling.topP,
      }),
      ...(options.stopSequences &&
        options.stopSequences.length > 0 && {
          stop_sequences: options.stopSequences,
        }),
    };

    // Handle tool calling loop with max steps
    const maxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
    // Reserve the LAST step of the budget for a forced final_result call when
    // structured output is active. tool_choice:"any" (set above) forces a tool
    // call on every assistant turn, so the toolUseBlocks.length===0 text exit
    // is structurally unreachable — without a reserved finalization step, a
    // turn whose budget is consumed by other tool calls (runaway loop, or all
    // tools failing) ends with content:"" and a masking finishReason "stop".
    const agenticStepBudget = useFinalResultTool
      ? Math.max(maxSteps - 1, 0)
      : maxSteps;
    let step = 0;
    let finalText = "";
    // Prose produced mid-loop alongside tool calls, accumulated across steps
    // via appendStepText — surfaced if the step budget runs out (mirrors the
    // Gemini paths' accumulatedText; last-step-only would drop earlier prose).
    let accumulatedStepText = "";
    let structuredOutput: Record<string, unknown> | undefined;
    const allToolCalls: Array<{
      toolName: string;
      args: Record<string, unknown>;
    }> = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    // Cache metrics (Anthropic reports these separately from input_tokens, which
    // is the uncached remainder). Surfaced on the result so analytics can see
    // caching is working and calculateCost can price the ~0.1x cache-read /
    // ~1.25x cache-write tiers instead of billing everything at full input rate.
    let totalCacheReadTokens = 0;
    let totalCacheCreationTokens = 0;
    // Track the final Anthropic stop_reason so we can surface finishReason
    // (notably "length" on token truncation) — the legacy native path always
    // reported "stop", hiding truncation from callers.
    let lastStopReason: string | null | undefined;
    // Step-cap / abort bookkeeping (mirrors the native Gemini loops): the
    // terminal recovery block below and the finishReason mapping both read
    // these to distinguish clean finishes, capped turns, and aborted turns.
    let wasAborted = false;
    let hitStepLimit = false;
    let hitContextLimit = false;
    let synthesizedFinalAnswer = false;
    let modelFinished = false;
    const currentMessages = [...messages];

    // In-loop context guard: stop calling tools when the accumulated
    // conversation approaches the model's real context window, instead of
    // stepping into an Anthropic 400 "prompt is too long" at step N that
    // destroys the whole turn's work (claude-sonnet-5 1,005,647-token RCA).
    const contextGuard = createContextGuard(
      getContextWindowSize("vertex", modelName),
    );
    // Consecutive-failure breaker (ports the Gemini loops' failedTools map):
    // a tool that keeps failing — thrown errors, timeouts, or error-shaped
    // results like mcp-proxy blocks — is short-circuited after
    // DEFAULT_TOOL_MAX_RETRIES instead of being retried for the remaining
    // step budget.
    const failedTools = new Map<string, { count: number; lastError: string }>();

    // Internal abort fan-in: the caller's signal and the turn clock's
    // watchdogs all trip it; it rides every SDK request and tool execution.
    const internalAbort = new AbortController();
    const onCallerAbort = () => internalAbort.abort();
    options.abortSignal?.addEventListener("abort", onCallerAbort);
    if (options.abortSignal?.aborted) {
      internalAbort.abort();
    }
    const toolExecTimeoutMs =
      options.toolTimeoutMs ?? DEFAULT_TOOL_EXECUTION_TIMEOUT_MS;
    // Whole-turn deadline + optional stall watchdog. NOTE: unlike the stream
    // twin, this path historically had NO whole-turn bound (only the per-call
    // withTimeout) — so no defensive default is introduced here: without an
    // explicit turnTimeoutMs, long multi-step turns keep running as before.
    const turnClock = createTurnClock({
      turnTimeoutMs: options.turnTimeoutMs,
      stallTimeoutMs: options.stallTimeoutMs,
      wrapupTimeLeadMs: options.wrapupTimeLeadMs,
      onDeadline: (kind) => {
        logger.warn(
          kind === "timeout"
            ? `[GoogleVertex] Anthropic generate turn exceeded its ${options.turnTimeoutMs}ms time budget — aborting`
            : `[GoogleVertex] Anthropic generate turn made no progress for ${options.stallTimeoutMs}ms — aborting`,
        );
        internalAbort.abort();
      },
    });
    // No top-level try/finally wraps this loop (pre-existing shape); release
    // watchdog timers + the caller-signal listener at both exits — the
    // provider-error throw in the per-step catch and the normal return path.
    const releaseTurnResources = () => {
      turnClock.dispose();
      options.abortSignal?.removeEventListener("abort", onCallerAbort);
    };

    while (step < agenticStepBudget) {
      // Honor aborts BETWEEN steps (caller signal OR turn-clock watchdogs —
      // all fan into internalAbort): break into terminal handling instead of
      // throwing (a throw routes consumers into abortSignal-less fallback
      // retries — observed in production as a 600s abort no-op).
      if (internalAbort.signal.aborted) {
        wasAborted = true;
        break;
      }
      // Context guard: the projected next prompt (last call's REAL usage +
      // this step's appended tool results/output) would cross the window
      // threshold — stop the tool loop and synthesize from what we have.
      if (contextGuard.shouldStop()) {
        hitContextLimit = true;
        logger.warn(
          `[GoogleVertex] Anthropic generate turn stopped by the context guard: ` +
            `projected prompt ~${contextGuard.projectedNextPromptTokens} tokens ` +
            `>= threshold ${contextGuard.thresholdTokens} (step ${step}) — synthesizing a final answer.`,
        );
        break;
      }
      step++;
      turnClock.noteProgress();
      // Mid-turn discovery sync — see the stream twin.
      this.refreshAnthropicToolDeclarations(
        options.tools,
        tools,
        executeMap,
        failedTools,
      );

      try {
        // Bound the SDK wait so a stalled Vertex/Anthropic call can't hang
        // generate forever. options.timeout wins if set, otherwise default
        // to 5 min — generous for tool-heavy turns.
        // Vertex has no automatic prompt caching — place explicit cache_control
        // breakpoints (system, tools, rolling history) so the conversation
        // prefix is cached across turns instead of re-billed as fresh input
        // every call. Re-applied per step: the stable prefix stays
        // byte-identical (consistent cache key) while the rolling breakpoint
        // follows the growing tail.
        const cachedGenerate = applyVertexAnthropicCacheBreakpoints({
          system: systemPromptWithSchema,
          tools,
          messages: currentMessages,
        });
        // The caller's abortSignal rides as an SDK request option so a
        // mid-flight abort cancels the HTTP call itself (the SDK rejects with
        // an abort-shaped error the per-step catch below turns into a break).
        const response = await withTimeout(
          client.messages.create(
            {
              ...requestParams,
              ...(cachedGenerate.system !== undefined && {
                system: cachedGenerate.system as Parameters<
                  typeof client.messages.create
                >[0]["system"],
              }),
              ...(cachedGenerate.tools &&
                cachedGenerate.tools.length > 0 && {
                  tools: cachedGenerate.tools as Parameters<
                    typeof client.messages.create
                  >[0]["tools"],
                }),
              messages: cachedGenerate.messages as Parameters<
                typeof client.messages.create
              >[0]["messages"],
            },
            { signal: internalAbort.signal },
          ),
          generateTimeoutMs,
          "Anthropic generate timed out",
        );

        // Update token counts. input_tokens is the uncached remainder; cache
        // reads/writes are reported separately and accumulated here so the
        // result reflects the full picture.
        totalInputTokens += response.usage?.input_tokens || 0;
        totalOutputTokens += response.usage?.output_tokens || 0;
        totalCacheReadTokens += response.usage?.cache_read_input_tokens || 0;
        totalCacheCreationTokens +=
          response.usage?.cache_creation_input_tokens || 0;
        lastStopReason = response.stop_reason;
        // Feed the context guard the FULL prompt size of this call (uncached
        // input + cache reads/writes) — the API reports it every step.
        contextGuard.noteUsage(
          (response.usage?.input_tokens || 0) +
            (response.usage?.cache_read_input_tokens || 0) +
            (response.usage?.cache_creation_input_tokens || 0),
          response.usage?.output_tokens || 0,
        );

        // Check if we need to handle tool use
        const toolUseBlocks = (
          response.content as VertexAnthropicContentBlock[]
        ).filter(
          (
            block,
          ): block is {
            type: "tool_use";
            id: string;
            name: string;
            input: Record<string, unknown>;
          } => block.type === "tool_use",
        );

        // Check for final_result tool call (for structured output)
        if (useFinalResultTool) {
          const finalResultCall = toolUseBlocks.find(
            (block) => block.name === "final_result",
          );
          if (finalResultCall) {
            // Extract structured output and convert to JSON string for finalText
            structuredOutput = finalResultCall.input;
            finalText = JSON.stringify(structuredOutput);
            modelFinished = true;
            logger.debug(
              "[GoogleVertex] Extracted structured output from final_result tool (generate)",
              { keys: Object.keys(structuredOutput) },
            );
            break; // We have the structured output, we're done
          }
        }

        // Extract text from response
        const textBlocks = (
          response.content as VertexAnthropicContentBlock[]
        ).filter(
          (block): block is { type: "text"; text: string } =>
            block.type === "text",
        );
        const responseText = textBlocks.map((b) => b.text).join("");

        if (toolUseBlocks.length === 0) {
          // No tool calls, we're done
          finalText = responseText || accumulatedStepText;
          modelFinished = true;
          break;
        }

        // Handle tool calls. The array also carries the trailing soft-budget
        // nudge text block appended below (tool_result blocks stay first, as
        // the Anthropic API requires).
        const toolResults: Array<
          | {
              type: "tool_result";
              tool_use_id: string;
              content: string;
            }
          | { type: "text"; text: string }
        > = [];
        // Per-step bookkeeping for conversation-memory storage. Tracks calls
        // and results for ONLY the tools fired in this step so the storage
        // hook can tag them with the current stepIndex.
        const stepStorageCalls: Array<{
          toolCallId: string;
          toolName: string;
          args: Record<string, unknown>;
        }> = [];
        const stepStorageResults: Array<{
          toolCallId: string;
          toolName: string;
          output: unknown;
        }> = [];
        // Note: tool:start / tool:end events are emitted by ToolsManager's
        // wrapped `execute` (see ToolsManager.ts:355) — no inline emit needed.
        for (const toolUse of toolUseBlocks) {
          // Honor a deadline/stall/caller abort BETWEEN tool executions —
          // without this check a multi-tool step keeps executing its whole
          // batch (up to N × toolTimeoutMs past the deadline) before the
          // while-top check finally breaks. Skipped tools get neither a call
          // row nor a result row, so persisted history stays paired.
          if (internalAbort.signal.aborted) {
            wasAborted = true;
            break;
          }
          allToolCalls.push({
            toolName: toolUse.name,
            args: toolUse.input,
          });
          stepStorageCalls.push({
            toolCallId: toolUse.id,
            toolName: toolUse.name,
            args: toolUse.input,
          });

          // Consecutive-failure breaker: stop re-executing a tool that has
          // already failed DEFAULT_TOOL_MAX_RETRIES times this turn (ports
          // the Gemini loops' failedTools map — the Anthropic loops let a
          // blocked tool be retried for the entire remaining step budget).
          const failedInfo = failedTools.get(toolUse.name);
          if (failedInfo && failedInfo.count >= DEFAULT_TOOL_MAX_RETRIES) {
            logger.warn(
              `[GoogleVertex] Tool "${toolUse.name}" has exceeded retry limit (${DEFAULT_TOOL_MAX_RETRIES}), skipping execution`,
            );
            const errMsg = `TOOL_PERMANENTLY_FAILED: The tool "${toolUse.name}" has failed ${failedInfo.count} times and will not be retried. Last error: ${failedInfo.lastError}. Please proceed without using this tool or inform the user that this functionality is unavailable.`;
            const errorPayload = { error: errMsg };
            toolExecutions.push({
              name: toolUse.name,
              input: toolUse.input,
              output: errorPayload,
            });
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: errMsg,
            });
            stepStorageResults.push({
              toolCallId: toolUse.id,
              toolName: toolUse.name,
              output: errorPayload,
            });
            continue;
          }

          let execute = executeMap.get(toolUse.name);
          if (!execute) {
            // Snapshot miss — see the stream twin.
            execute = this.resolveAnthropicToolOnMiss(
              toolUse.name,
              options.tools,
              tools,
              executeMap,
              failedTools,
            );
          }
          if (execute) {
            try {
              const toolOptions = {
                toolCallId: toolUse.id,
                messages: [],
                abortSignal: internalAbort.signal,
              };
              turnClock.noteProgress();
              // Bound the execute() await — a wedged tool costs one step
              // (error tool_result), not the whole turn — and race it against
              // the turn's abort so a deadline/caller abort is observed
              // IMMEDIATELY instead of after the tool settles (live-verified:
              // an 8s deadline previously waited out a 60s tool).
              const result = await withTimeout(
                raceWithAbort(
                  Promise.resolve(execute(toolUse.input, toolOptions)),
                  internalAbort.signal,
                ),
                toolExecTimeoutMs,
                `Tool "${toolUse.name}" execution timed out after ${toolExecTimeoutMs}ms`,
              );
              turnClock.noteProgress();
              // Error-shaped success (MCP isError / { error } payloads —
              // e.g. proxy-blocked tools) counts toward the breaker too:
              // these fail without throwing, and only counting throws lets
              // the model grind on a blocked tool for the whole budget.
              const resultErrorText = extractToolFailureText(result);
              if (resultErrorText) {
                const info = failedTools.get(toolUse.name) || {
                  count: 0,
                  lastError: "",
                };
                info.count++;
                info.lastError = resultErrorText;
                failedTools.set(toolUse.name, info);
              } else {
                // Genuinely consecutive: a success clears the strike count
                // (argument-dependent soft errors — file-not-found on
                // different paths — must not disable a working tool).
                failedTools.delete(toolUse.name);
              }
              toolExecutions.push({
                name: toolUse.name,
                input: toolUse.input,
                output: result,
              });
              // Anthropic requires tool_result.content to be a string.
              // JSON.stringify returns undefined for undefined/function/symbol,
              // so coerce defensively to keep the follow-up turn valid.
              const resultContent =
                typeof result === "string"
                  ? result
                  : stringifyContentSafe(result ?? null);
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: resultContent,
              });
              stepStorageResults.push({
                toolCallId: toolUse.id,
                toolName: toolUse.name,
                output: result,
              });
            } catch (err) {
              // An aborted tool call is a cancellation, not a tool failure —
              // break the turn without recording an error execution/result.
              if (internalAbort.signal.aborted || isAbortError(err)) {
                // Keep persisted tool history paired: the call row was
                // already pushed above, so record a neutral cancellation
                // result (NOT an error) — an unpaired tool_use replayed on
                // the next turn would be rejected by the Anthropic API.
                stepStorageResults.push({
                  toolCallId: toolUse.id,
                  toolName: toolUse.name,
                  output: { aborted: true },
                });
                wasAborted = true;
                break;
              }
              turnClock.noteProgress();
              if (err instanceof TimeoutError) {
                this.emitTurnEvent({
                  phase: "tool-timeout",
                  step,
                  maxSteps,
                  toolName: toolUse.name,
                });
              }
              // Count the failure toward the consecutive-failure breaker.
              const thrownErrorText =
                err instanceof Error ? err.message : String(err);
              const info = failedTools.get(toolUse.name) || {
                count: 0,
                lastError: "",
              };
              info.count++;
              info.lastError = thrownErrorText;
              failedTools.set(toolUse.name, info);
              logger.warn(
                `[GoogleVertex] Tool "${toolUse.name}" failed (attempt ${info.count}/${DEFAULT_TOOL_MAX_RETRIES}): ${thrownErrorText}`,
              );
              const errMsg = `Error executing tool "${toolUse.name}": ${thrownErrorText}`;
              const errorPayload = { error: errMsg };
              toolExecutions.push({
                name: toolUse.name,
                input: toolUse.input,
                output: errorPayload,
              });
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: errMsg,
              });
              stepStorageResults.push({
                toolCallId: toolUse.id,
                toolName: toolUse.name,
                output: errorPayload,
              });
            }
          } else {
            const errMsg = `TOOL_NOT_FOUND: The tool "${toolUse.name}" does not exist.`;
            const errorPayload = { error: errMsg };
            // A missing tool counts toward the breaker too — a model
            // grinding on a hallucinated/stale tool name must not burn the
            // whole step budget on TOOL_NOT_FOUND round-trips.
            const notFoundInfo = failedTools.get(toolUse.name) || {
              count: 0,
              lastError: "",
            };
            notFoundInfo.count++;
            notFoundInfo.lastError = errMsg;
            failedTools.set(toolUse.name, notFoundInfo);
            toolExecutions.push({
              name: toolUse.name,
              input: toolUse.input,
              output: errorPayload,
            });
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: errMsg,
            });
            stepStorageResults.push({
              toolCallId: toolUse.id,
              toolName: toolUse.name,
              output: errorPayload,
            });
          }
        }

        // Persist this step's tool calls/results into conversation memory.
        // Without this, tool_call / tool_result rows never reach Redis and
        // the chat-history UI loses every tool invocation.
        // Fire-and-forget — storage failures must not break generation.
        // Runs BEFORE the abort break below so tools that DID complete in an
        // aborted step (real side effects) still reach the chat history.
        if (stepStorageCalls.length > 0 || stepStorageResults.length > 0) {
          withTimeout(
            this.handleToolExecutionStorage(
              stepStorageCalls.map((c) => ({ ...c, stepIndex: step })),
              stepStorageResults.map((r) => ({ ...r, stepIndex: step })),
              options,
              new Date(),
            ),
            TOOL_STORAGE_TIMEOUT_MS,
            "tool storage write timed out",
          ).catch((error: unknown) => {
            logger.warn(
              "[GoogleVertex] Failed to store native Anthropic generate tool executions",
              {
                error: error instanceof Error ? error.message : String(error),
              },
            );
          });
        }

        // An abort inside the tool-exec loop only breaks that inner for-loop.
        // Break the while too so no further model call is issued and control
        // reaches the terminal step-cap handling below.
        if (wasAborted) {
          break;
        }

        // Soft budget nudge: with the step cap approaching, tell the model to
        // wrap up so the reserved forced-finalization call below stays a
        // fallback, not the norm. Rides as a trailing text block on the
        // tool_result user turn (cache-safe: it lives in the growing tail).
        // The time-budget twin fires when the turn deadline is inside the
        // wrap-up lead window instead.
        const stepsRemaining = agenticStepBudget - step;
        if (stepsRemaining > 0 && stepsRemaining <= 3) {
          toolResults.push({
            type: "text",
            text:
              `NOTE: Only ${stepsRemaining} tool step(s) remain. Consolidate what you have and ` +
              (useFinalResultTool
                ? "call final_result with your best answer."
                : "provide your final answer."),
          });
        } else if (turnClock.shouldNudgeWrapup()) {
          toolResults.push({
            type: "text",
            text: buildWrapupNudgeText(useFinalResultTool),
          });
        }

        // Add assistant message and tool results to continue the loop
        // Filter out server_tool_use blocks that the Anthropic API doesn't accept in messages
        const assistantContent = response.content.filter(
          (block: { type: string }) => block.type !== "server_tool_use",
        ) as (typeof currentMessages)[number]["content"];
        currentMessages.push({
          role: "assistant",
          content: assistantContent,
        });
        currentMessages.push({
          role: "user",
          content: toolResults,
        });
        // Project this step's growth for the context guard: everything just
        // appended (tool results + nudge text) rides the next prompt. The
        // assistant output was already counted via noteUsage.
        contextGuard.noteAppendedChars(
          toolResults.reduce(
            (sum, block) =>
              sum +
              ("content" in block
                ? block.content.length
                : (block as { text: string }).text.length),
            0,
          ),
        );

        // Accumulate the step's prose so a capped turn can still surface it —
        // finalText is reserved for model-initiated finishes.
        accumulatedStepText = appendStepText(accumulatedStepText, responseText);
      } catch (error) {
        // A mid-request abort surfaces as an abort-shaped SDK rejection (we
        // pass internalAbort.signal as the request signal above, and the
        // caller's signal + turn-clock watchdogs all fan into it). Break
        // gracefully into the terminal handling instead of re-throwing — a
        // re-throw routes the caller's abort into abortSignal-less fallback
        // retries. Dual check as in the Gemini loops: the internal signal OR
        // an abort-shaped error either way means "stop", not a real failure.
        if (internalAbort.signal.aborted || isAbortError(error)) {
          wasAborted = true;
          break;
        }
        logger.error("[GoogleVertex] Native Anthropic SDK generate error", {
          error,
          model: modelName,
          step,
          status: (error as { status?: number })?.status,
        });
        // Best-effort request context for formatProviderError — see the
        // native Gemini catch for rationale.
        try {
          if (error && typeof error === "object") {
            (error as Record<string, unknown>).requestModel = modelName;
          }
        } catch {
          /* frozen/sealed error — context stays best-effort */
        }
        releaseTurnResources();
        throw this.handleProviderError(error);
      }
    }

    // Terminal handling — the loop exited without a model-initiated finish
    // (step budget exhausted, or the turn was aborted). Never return "":
    // force the reserved final_result step on structured-output turns,
    // synthesize a plain-text answer on tool turns, or fall back to a
    // graceful cap message. Mirrors the Gemini paths (ed289b7 / PR #1123).
    if (!modelFinished && !finalText) {
      // An abort that landed during the FINAL budgeted step's tool
      // execution leaves wasAborted=false (no loop-entry check runs after a
      // budget exit) — re-check before issuing any terminal model call.
      if (internalAbort.signal.aborted) {
        wasAborted = true;
      }
      const externalToolCallCount = allToolCalls.filter(
        (tc) => tc.toolName !== "final_result",
      ).length;
      // Clamp the terminal calls' max_tokens so prompt + output stays inside
      // the model window: pre-4.5 Claude models 400 on input + max_tokens >
      // window, which would defeat the very synthesis these calls exist for
      // on context-capped turns. Only bites when the prompt is near the
      // window (min() is a no-op on ordinary step-cap turns).
      const terminalMaxTokens = Math.max(
        1024,
        Math.min(
          requestParams.max_tokens,
          getContextWindowSize("vertex", modelName) -
            contextGuard.projectedNextPromptTokens -
            4_000,
        ),
      );
      if (wasAborted) {
        // Budget already blown — never issue another model call; prefer the
        // prose the model already produced (mirrors the Gemini abort path),
        // else answer with an HONEST message matching the actual exit cause
        // (time limit / stall / caller abort — never the step-cap text).
        // finishReason keeps mapping from lastStopReason (an aborted turn is
        // not a step-cap turn).
        logger.warn(
          `[GoogleVertex] Native Anthropic generate loop ended mid-turn ` +
            `(${turnClock.timedOut ? "turn time limit" : turnClock.stalled ? "stall watchdog" : "caller abort"}); ` +
            `returning gathered text or an honest terminal message.`,
        );
        finalText =
          accumulatedStepText ||
          this.buildLoopExitMessage({
            turnClock,
            wasAborted,
            stallTimeoutMs: options.stallTimeoutMs,
            maxSteps,
            toolCallCount: externalToolCallCount,
          });
      } else if (useFinalResultTool) {
        if (!hitContextLimit) {
          hitStepLimit = true;
        }
        logger.warn(
          hitContextLimit
            ? `[GoogleVertex] Native Anthropic generate loop stopped by the context guard without final_result; forcing a finalization call.`
            : `[GoogleVertex] Native Anthropic generate loop reached maxSteps (${maxSteps}) without final_result; forcing a finalization call.`,
        );
        try {
          // Reserved finalization step: identical request except tool_choice
          // pins final_result, so Anthropic guarantees the response is a
          // final_result tool_use. Cache treatment is byte-identical to loop
          // steps (same applyVertexAnthropicCacheBreakpoints on the same
          // stable system/tools prefix), so caching is unaffected.
          const cachedFinal = applyVertexAnthropicCacheBreakpoints({
            system: systemPromptWithSchema,
            tools,
            messages: currentMessages,
          });
          const response = await withTimeout(
            client.messages.create(
              {
                ...requestParams,
                max_tokens: terminalMaxTokens,
                tool_choice: {
                  type: "tool" as const,
                  name: "final_result",
                },
                ...(cachedFinal.system !== undefined && {
                  system: cachedFinal.system as Parameters<
                    typeof client.messages.create
                  >[0]["system"],
                }),
                ...(cachedFinal.tools &&
                  cachedFinal.tools.length > 0 && {
                    tools: cachedFinal.tools as Parameters<
                      typeof client.messages.create
                    >[0]["tools"],
                  }),
                messages: cachedFinal.messages as Parameters<
                  typeof client.messages.create
                >[0]["messages"],
              },
              { signal: internalAbort.signal },
            ),
            generateTimeoutMs,
            "Anthropic finalization call timed out",
          );
          totalInputTokens += response.usage?.input_tokens || 0;
          totalOutputTokens += response.usage?.output_tokens || 0;
          totalCacheReadTokens += response.usage?.cache_read_input_tokens || 0;
          totalCacheCreationTokens +=
            response.usage?.cache_creation_input_tokens || 0;
          lastStopReason = response.stop_reason;
          const forcedFinalResult = (
            response.content as VertexAnthropicContentBlock[]
          ).find(
            (
              block,
            ): block is {
              type: "tool_use";
              id: string;
              name: string;
              input: Record<string, unknown>;
            } => block.type === "tool_use" && block.name === "final_result",
          );
          if (forcedFinalResult) {
            structuredOutput = forcedFinalResult.input;
            finalText = JSON.stringify(structuredOutput);
            synthesizedFinalAnswer = true;
            logger.debug(
              "[GoogleVertex] Forced finalization returned structured output (generate)",
              { keys: Object.keys(structuredOutput) },
            );
          } else {
            finalText = hitContextLimit
              ? buildContextCapMessage(externalToolCallCount)
              : buildToolLoopCapMessage(maxSteps, externalToolCallCount);
          }
        } catch (error) {
          // An aborted finalization is a cancellation (caller abort or a
          // turn-clock watchdog), not a step-cap turn — keep finishReason
          // mapping from lastStopReason and pick the exit message by the
          // actual cause.
          if (internalAbort.signal.aborted || isAbortError(error)) {
            hitStepLimit = false;
            wasAborted = true;
          }
          logger.warn(
            "[GoogleVertex] Forced finalization call failed; falling back to a terminal message",
            { error: error instanceof Error ? error.message : String(error) },
          );
          finalText =
            hitContextLimit && !wasAborted
              ? buildContextCapMessage(externalToolCallCount)
              : this.buildLoopExitMessage({
                  turnClock,
                  wasAborted,
                  stallTimeoutMs: options.stallTimeoutMs,
                  maxSteps,
                  toolCallCount: externalToolCallCount,
                });
        }
      } else {
        if (!hitContextLimit) {
          hitStepLimit = true;
        }
        if (accumulatedStepText) {
          // Prefer the prose the model already produced across steps.
          logger.warn(
            hitContextLimit
              ? `[GoogleVertex] Native Anthropic generate loop stopped by the context guard; returning text already gathered from prior steps.`
              : `[GoogleVertex] Native Anthropic generate loop reached maxSteps (${maxSteps}); returning text already gathered from prior steps.`,
          );
          finalText = accumulatedStepText;
        } else {
          // Pure tool-loop with no text: one tools-disabled call so the model
          // answers from the gathered tool results (Anthropic twin of the
          // Gemini synthesizeFinalAnswerWithoutTools). NOTE: the tools array
          // must stay in the request — Anthropic rejects requests whose
          // history contains tool_use/tool_result blocks without a tools
          // param — so "tools disabled" is expressed as tool_choice:"none",
          // which also keeps the cached tools prefix byte-identical.
          logger.warn(
            hitContextLimit
              ? `[GoogleVertex] Native Anthropic generate loop stopped by the context guard with no text; synthesizing a final answer with tools disabled.`
              : `[GoogleVertex] Native Anthropic generate loop reached maxSteps (${maxSteps}) with no text; synthesizing a final answer with tools disabled.`,
          );
          try {
            const backstopSystem =
              (systemPromptWithSchema ? systemPromptWithSchema + "\n\n" : "") +
              "Tool calling is no longer available for this turn. Provide " +
              "your final answer directly as plain text now, using the " +
              "information gathered so far.";
            const cachedBackstop = applyVertexAnthropicCacheBreakpoints({
              system: backstopSystem,
              tools,
              messages: currentMessages,
            });
            const response = await withTimeout(
              client.messages.create(
                {
                  ...requestParams,
                  max_tokens: terminalMaxTokens,
                  tool_choice: { type: "none" as const },
                  system: cachedBackstop.system as Parameters<
                    typeof client.messages.create
                  >[0]["system"],
                  ...(cachedBackstop.tools &&
                    cachedBackstop.tools.length > 0 && {
                      tools: cachedBackstop.tools as Parameters<
                        typeof client.messages.create
                      >[0]["tools"],
                    }),
                  messages: cachedBackstop.messages as Parameters<
                    typeof client.messages.create
                  >[0]["messages"],
                },
                { signal: internalAbort.signal },
              ),
              generateTimeoutMs,
              "Anthropic backstop call timed out",
            );
            totalInputTokens += response.usage?.input_tokens || 0;
            totalOutputTokens += response.usage?.output_tokens || 0;
            totalCacheReadTokens +=
              response.usage?.cache_read_input_tokens || 0;
            totalCacheCreationTokens +=
              response.usage?.cache_creation_input_tokens || 0;
            lastStopReason = response.stop_reason;
            const backstopText = (
              response.content as VertexAnthropicContentBlock[]
            )
              .filter(
                (block): block is { type: "text"; text: string } =>
                  block.type === "text",
              )
              .map((b) => b.text)
              .join("");
            if (backstopText) {
              synthesizedFinalAnswer = true;
              finalText = backstopText;
            } else {
              finalText = hitContextLimit
                ? buildContextCapMessage(externalToolCallCount)
                : buildToolLoopCapMessage(maxSteps, externalToolCallCount);
            }
          } catch (error) {
            // An aborted backstop is a cancellation (caller abort or a
            // turn-clock watchdog), not a step-cap turn — keep finishReason
            // mapping from lastStopReason and pick the exit message by the
            // actual cause.
            if (internalAbort.signal.aborted || isAbortError(error)) {
              hitStepLimit = false;
              wasAborted = true;
            }
            logger.warn(
              "[GoogleVertex] Tools-disabled backstop call failed; falling back to a terminal message",
              {
                error: error instanceof Error ? error.message : String(error),
              },
            );
            finalText =
              hitContextLimit && !wasAborted
                ? buildContextCapMessage(externalToolCallCount)
                : this.buildLoopExitMessage({
                    turnClock,
                    wasAborted,
                    stallTimeoutMs: options.stallTimeoutMs,
                    maxSteps,
                    toolCallCount: externalToolCallCount,
                  });
          }
        }
      }
    }

    releaseTurnResources();

    const responseTime = Date.now() - startTime;
    const externalToolCalls = allToolCalls.filter(
      (tc) => tc.toolName !== "final_result",
    );
    const externalToolExecutions = toolExecutions.filter(
      (te) => te.name !== "final_result",
    );

    // Absolute backstop — no code path may surface empty content on a turn
    // that ran tools (the consumer-facing "empty response" incident shape).
    // Cause-aware: an aborted/timed-out turn gets the honest exit message,
    // a genuine budget exhaustion gets the step-cap message.
    if (!finalText && externalToolCalls.length > 0) {
      finalText =
        hitContextLimit && !wasAborted
          ? buildContextCapMessage(externalToolCalls.length)
          : this.buildLoopExitMessage({
              turnClock,
              wasAborted,
              stallTimeoutMs: options.stallTimeoutMs,
              maxSteps,
              toolCallCount: externalToolCalls.length,
            });
    }

    // Honest finish reason. "length" (token truncation) takes precedence; a
    // step-cap exhaustion without a clean/forced answer surfaces as
    // "tool-calls" (aligned with the Gemini paths, so consumers detect
    // capped turns uniformly); everything else — including a successful
    // forced finalization or backstop synthesis — is a normal "stop".
    const resolvedFinishReason =
      lastStopReason === "max_tokens"
        ? "length"
        : hitStepLimit && !synthesizedFinalAnswer
          ? "tool-calls"
          : "stop";
    // Turn-exit discriminator, independent of the provider-shaped
    // finishReason — consumers branch on this instead of sniffing strings.
    const stopReason = resolveTurnStopReason({
      timedOut: turnClock.timedOut,
      stalled: turnClock.stalled,
      wasAborted,
      cappedWithoutAnswer: hitStepLimit && !synthesizedFinalAnswer,
      contextCappedWithoutAnswer: hitContextLimit && !synthesizedFinalAnswer,
      finishReason: resolvedFinishReason,
    });
    if (stopReason !== "completed") {
      this.emitTurnEvent({
        phase: stopReason,
        step,
        maxSteps,
        toolCallCount: externalToolCalls.length,
        elapsedMs: turnClock.elapsedMs(),
      });
    }

    const result: EnhancedGenerateResult = {
      content: finalText,
      finishReason: resolvedFinishReason,
      stopReason,
      rawFinishReason: lastStopReason ?? undefined,
      stepsUsed: step,
      provider: this.providerName,
      model: modelName,
      usage: {
        input: totalInputTokens,
        output: totalOutputTokens,
        // Anthropic's input_tokens is only the UNCACHED remainder; cache
        // reads/writes are billed tokens reported separately, so the total
        // must include them (matches proxyTracer + anthropic.ts).
        total:
          totalInputTokens +
          totalOutputTokens +
          totalCacheReadTokens +
          totalCacheCreationTokens,
        ...(totalCacheReadTokens > 0 && {
          cacheReadTokens: totalCacheReadTokens,
        }),
        ...(totalCacheCreationTokens > 0 && {
          cacheCreationTokens: totalCacheCreationTokens,
        }),
      },
      responseTime,
      toolsUsed: externalToolCalls.map((tc) => tc.toolName),
      toolExecutions: resolveToolExecutionRecords(
        options,
        externalToolExecutions,
      ),
      enhancedWithTools: externalToolCalls.length > 0,
    };

    // Route through enhanceResult so analytics/evaluation/tracing are picked
    // up the same way the BaseProvider.generate() path picks them up. The
    // native Anthropic-on-Vertex path bypasses BaseProvider.generate(), so
    // enableAnalytics / enableEvaluation would otherwise be silently ignored.
    return this.enhanceResult(result, options, startTime);
  }

  /**
   * Process CSV files and append content to options.input.text
   * This ensures CSV data is available in the prompt for native Gemini 3 SDK calls
   * Returns a new options object with modified input (immutable pattern)
   */
  private async processCSVFilesForNativeSDK<
    T extends TextGenerationOptions | StreamOptions,
  >(options: T): Promise<T> {
    const input = options.input as
      | { text?: string; csvFiles?: Array<Buffer | string> }
      | undefined;

    if (!input?.csvFiles || input.csvFiles.length === 0) {
      return options;
    }

    logger.info(
      `[GoogleVertex] Processing ${input.csvFiles.length} CSV file(s) for native Gemini 3 SDK`,
    );

    let modifiedText = input.text || "";

    for (let i = 0; i < input.csvFiles.length; i++) {
      const csvFile = input.csvFiles[i];
      try {
        const result = await FileDetector.detectAndProcess(csvFile, {
          allowedTypes: ["csv"],
          csvOptions:
            "csvOptions" in options
              ? (options.csvOptions as Record<string, unknown>)
              : undefined,
        });

        // Extract filename for display
        const filename =
          typeof csvFile === "string"
            ? path.basename(csvFile)
            : `csv_file_${i + 1}.csv`;

        let csvSection = `\n\n## CSV Data from "${filename}":\n`;

        // Add metadata if available
        if (result.metadata) {
          const meta = result.metadata as Record<string, unknown>;
          if (meta.rowCount || meta.columnCount || meta.columnNames) {
            csvSection += `**File Info:**\n`;
            if (meta.rowCount) {
              csvSection += `- Rows: ${meta.rowCount}\n`;
            }
            if (meta.columnCount) {
              csvSection += `- Columns: ${meta.columnCount}\n`;
            }
            if (meta.columnNames && Array.isArray(meta.columnNames)) {
              csvSection += `- Column Names: ${meta.columnNames.join(", ")}\n`;
            }
            csvSection += "\n";
          }
        }

        // Add strong instructions to use the CSV data directly
        csvSection += `\n**CRITICAL INSTRUCTION**: The complete CSV data is included below. You MUST use this data directly from this prompt.\n`;
        csvSection += `DO NOT use any external tools (github, search_code, get_file_contents, etc.) to access this data.\n`;
        csvSection += `The data you need is right here in this message - read it carefully and answer based on it.\n\n`;

        csvSection += result.content;
        // Prepend CSV to ensure data appears before user's question
        modifiedText =
          csvSection + "\n\n---\n\n**USER QUESTION:**\n" + modifiedText;

        logger.info(`[GoogleVertex] ✅ Processed CSV: ${filename}`);
      } catch (error) {
        logger.error(
          `[GoogleVertex] ❌ Failed to process CSV file ${i + 1}:`,
          error,
        );
        const filename =
          typeof csvFile === "string"
            ? path.basename(csvFile)
            : `csv_file_${i + 1}.csv`;
        modifiedText += `\n\n## CSV Data Error: Failed to process "${filename}"\nReason: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    }

    // Return new options with modified input (immutable pattern)
    // Preserve the full type of options.input by spreading options.input directly
    // CRITICAL FIX: Also update 'prompt' field since executeNativeAnthropicGenerate
    // uses `options.prompt || options.input?.text` to build messages, and `prompt`
    // is already set from neurolink.ts baseOptions creation. Without updating both,
    // the CSV-enhanced text won't be sent to the model.
    return {
      ...options,
      prompt: modifiedText,
      input: { ...options.input, text: modifiedText },
    } as T;
  }

  /**
   * Override stream to handle image generation models
   * Image models don't support streaming, so we fall back to generate
   */
  async stream(optionsOrPrompt: StreamOptions | string): Promise<StreamResult> {
    // Normalize options
    const options =
      typeof optionsOrPrompt === "string"
        ? { input: { text: optionsOrPrompt } }
        : optionsOrPrompt;

    const modelName =
      options.model || this.modelName || getDefaultVertexModel();

    // Check if this is an image generation model - image models don't support streaming
    const isImageModel = IMAGE_GENERATION_MODELS.some((m) =>
      modelName.toLowerCase().startsWith(m.toLowerCase()),
    );

    if (isImageModel) {
      logger.warn(
        "[GoogleVertex] Image generation models don't support streaming, falling back to generate",
        { model: modelName },
      );

      // Convert stream options to text generation options
      const generateOptions: TextGenerationOptions = {
        prompt: options.input?.text || "",
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        input: options.input,
      };

      const result = await this.executeImageGeneration(generateOptions);

      // Return a mock stream result for compatibility
      const textContent = result?.content || "";
      const imageOutput = result?.imageOutput;

      return {
        stream: (async function* () {
          if (imageOutput) {
            yield {
              type: "image" as const,
              imageOutput: { base64: imageOutput.base64 || "" },
            };
          }
          yield { content: textContent };
        })(),
        provider: this.providerName,
        model: modelName,
        usage: result?.usage,
        finishReason: "stop",
      };
    }

    // For non-image models, call the parent stream method
    return super.stream(optionsOrPrompt);
  }

  /**
   * Override generate to route ALL models to native SDKs
   * No more @ai-sdk/google-vertex dependency
   */
  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
  ): Promise<EnhancedGenerateResult | null> {
    // Normalize options
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    const modelName =
      options.model || this.modelName || getDefaultVertexModel();

    // Wrap the entire generate path in a `neurolink.provider.generate` span
    // so observability tooling (test:tracing, Langfuse, OTEL collectors)
    // sees the same span hierarchy that BaseProvider.generate would create.
    // Vertex's generate() bypasses BaseProvider.generate entirely, so
    // without this wrapping the provider span never gets emitted.
    return withClientSpan(
      {
        name: "neurolink.provider.generate",
        tracer: tracers.provider,
        attributes: {
          [ATTR.GEN_AI_SYSTEM]: this.providerName,
          [ATTR.GEN_AI_MODEL]: modelName,
          [ATTR.GEN_AI_OPERATION]: "generate",
          [ATTR.NL_PROVIDER]: this.providerName,
        },
      },
      async (generateSpan) => {
        const generateStartTime = Date.now();

        // Video-mode requests must route through BaseProvider's
        // handleVideoGeneration (which loads the Veo 3 adapter). Vertex's
        // native @google/genai path is text/image only — without this
        // gate, video requests fall through to gemini-2.5-flash and the
        // model politely declines ("I cannot create animations") instead
        // of producing video bytes.
        if (options.output?.mode === "video") {
          logger.info(
            "[GoogleVertex] Routing video-mode generate to handleVideoGeneration",
            { model: modelName },
          );
          const videoResult = await this.handleVideoGeneration(
            options,
            generateStartTime,
          );
          this.attachUsageAndCostAttributes(
            generateSpan,
            modelName,
            videoResult?.usage,
          );
          this.emitGenerationEnd(
            modelName,
            videoResult,
            generateStartTime,
            true,
          );
          return videoResult;
        }

        // TTS direct-synthesis mode: when caller passes `tts.enabled` without
        // `tts.useAiResponse`, route to the shared `handleDirectTTSSynthesis`
        // (synthesise the input text directly; no LLM call). BaseProvider's
        // standard generate() does the same dispatch — we replicate it here
        // because Vertex's override bypasses that path.
        if (options.tts?.enabled && !options.tts?.useAiResponse) {
          logger.info(
            "[GoogleVertex] Routing TTS direct-synthesis to handleDirectTTSSynthesis",
            { model: modelName },
          );
          const ttsResult = await this.handleDirectTTSSynthesis(
            options,
            generateStartTime,
          );
          this.emitGenerationEnd(modelName, ttsResult, generateStartTime, true);
          return ttsResult;
        }

        // Check if this is an image generation model - route to executeImageGeneration without tools
        const isImageModel = IMAGE_GENERATION_MODELS.some((m) =>
          modelName.toLowerCase().startsWith(m.toLowerCase()),
        );

        if (isImageModel) {
          logger.info(
            "[GoogleVertex] Routing image generation model to executeImageGeneration",
            { model: modelName },
          );
          const imageResult = await this.executeImageGeneration(options);
          this.attachUsageAndCostAttributes(
            generateSpan,
            modelName,
            imageResult?.usage,
          );
          this.emitGenerationEnd(
            modelName,
            imageResult,
            generateStartTime,
            true,
          );
          return imageResult;
        }

        // Merge registered (built-in / MCP) tools with caller-supplied
        // tools. Vertex's generate() bypasses BaseProvider.generate(), so
        // the BaseProvider tool-merge that normally pulls registered
        // tools from the ToolsManager never runs here. Without this call,
        // sdk.registerTool() entries silently never reach Gemini's
        // function-calling path.
        const baseTools = !options.disableTools
          ? await this.getToolsForStream(options)
          : {};

        // Process the unified `input.files` array before routing to the
        // native SDK. BaseProvider.generate() runs this preprocessing via
        // buildMultimodalMessagesArray, but Vertex's override skips it,
        // which would otherwise drop text-file content (and the
        // mimetype-hint contract) on the floor. Mutates options.input.text /
        // options.input.images / options.input.pdfFiles in place.
        if (options.input?.files && options.input.files.length > 0) {
          try {
            await processUnifiedFilesArray(
              options as Parameters<typeof processUnifiedFilesArray>[0],
              100 * 1024 * 1024,
              this.providerName,
            );
          } catch (fileError) {
            logger.warn(
              `[GoogleVertex] processUnifiedFilesArray threw, continuing without file content: ${fileError instanceof Error ? fileError.message : String(fileError)}`,
            );
          }
        }

        // Emit a `neurolink.message.build` span so observability tooling
        // sees the message-construction phase even on the native (Pipeline B)
        // Vertex path. Pipeline A normally produces this via MessageBuilder;
        // the native path builds contents directly so we record an explicit
        // span here. Without this the test:tracing "Message Build Span"
        // assertion has to skip on every native-Vertex run.
        const processedOptions = await withSpan(
          {
            name: "neurolink.message.build",
            tracer: tracers.provider,
            attributes: {
              [ATTR.NL_PROVIDER]: this.providerName,
              "message.count": 1,
              "message.build.count": 1,
              "message.build.path": "vertex.native",
            },
          },
          async () => this.processCSVFilesForNativeSDK(options),
        );

        const mergedOptions = {
          ...processedOptions,
          tools: baseTools,
        };

        // Capture the user's prompt up-front so the Pipeline B listener
        // sets `input` on the model.generation span — without this the
        // observability harness reports "input capture not working".
        const inputPrompt =
          (mergedOptions.input as { text?: string } | undefined)?.text ||
          (mergedOptions as { prompt?: string }).prompt ||
          "";

        // Set generation input before the call so error paths still carry the
        // request; output is set after the native call resolves.
        const generationInputAttribute = spanJsonAttribute({
          ...(mergedOptions.systemPrompt
            ? { system: mergedOptions.systemPrompt }
            : {}),
          prompt: inputPrompt,
        });
        generateSpan.setAttribute(
          LANGFUSE_ATTR.OBSERVATION_INPUT,
          generationInputAttribute,
        );

        try {
          let result: EnhancedGenerateResult;
          // Wrap the actual native generate call in `neurolink.executeGeneration`
          // so the observability span chain (tested by
          // "Tracing: Generate Span Chain") sees a third inner span on the
          // native @google/genai / @anthropic-ai/vertex-sdk path — Pipeline A
          // gets this for free from GenerationHandler.executeGeneration.
          result = await withSpan(
            {
              name: "neurolink.executeGeneration",
              tracer: tracers.provider,
              attributes: {
                [ATTR.GEN_AI_SYSTEM]: this.providerName,
                [ATTR.GEN_AI_MODEL]: modelName,
                "neurolink.path": isAnthropicModel(modelName)
                  ? "native.anthropic"
                  : "native.google-genai",
                [LANGFUSE_ATTR.OBSERVATION_INPUT]: generationInputAttribute,
              },
            },
            async (executionSpan) => {
              let nativeResult: EnhancedGenerateResult;
              if (isAnthropicModel(modelName)) {
                logger.info(
                  "[GoogleVertex] Routing Claude generate to native @anthropic-ai/vertex-sdk",
                  {
                    model: modelName,
                    totalToolCount: Object.keys(mergedOptions.tools).length,
                  },
                );
                nativeResult =
                  await this.executeNativeAnthropicGenerate(mergedOptions);
              } else {
                logger.info(
                  "[GoogleVertex] Routing Gemini generate to native @google/genai",
                  {
                    model: modelName,
                    totalToolCount: Object.keys(mergedOptions.tools).length,
                  },
                );
                try {
                  nativeResult =
                    await this.executeNativeGemini3Generate(mergedOptions);
                } catch (nativeError) {
                  // Vertex rejects over-constrained responseSchemas with a
                  // deterministic 400 ("too many states" — constrained-decoding
                  // state explosion). Re-sending the same schema can never
                  // succeed, so retry ONCE with the schema dropped but JSON
                  // mode kept: output.format "json" still sets
                  // responseMimeType application/json on the no-tools path,
                  // so the model is forced to emit JSON — just without the
                  // offending schema constraints. The NeuroLink layer then
                  // coerces the JSON text into the caller's original schema
                  // (generate({schema}) guarantee holds).
                  const requestedStructured =
                    mergedOptions.schema !== undefined ||
                    mergedOptions.output?.format === "json";
                  // Tools present → the executor skips responseMimeType, so a
                  // schema-less retry would NOT actually run in JSON mode and
                  // the structured-output contract would silently degrade to
                  // prose. Only the no-tools case retries faithfully; with
                  // tools, surface the 400 to the caller instead.
                  const hasTools =
                    !mergedOptions.disableTools &&
                    Object.keys(mergedOptions.tools ?? {}).length > 0;
                  if (
                    requestedStructured &&
                    !hasTools &&
                    isSchemaComplexityError(nativeError)
                  ) {
                    logger.warn(
                      "[GoogleVertex] responseSchema too complex for constrained decoding — retrying native generate in schema-less JSON mode",
                      {
                        model: modelName,
                        error:
                          nativeError instanceof Error
                            ? nativeError.message
                            : String(nativeError),
                      },
                    );
                    nativeResult = await this.executeNativeGemini3Generate({
                      ...mergedOptions,
                      schema: undefined,
                      output: { format: "json" },
                    });
                  } else {
                    throw nativeError;
                  }
                }
              }
              executionSpan.setAttribute(
                LANGFUSE_ATTR.OBSERVATION_OUTPUT,
                spanJsonAttribute(nativeResult?.content ?? ""),
              );
              return nativeResult;
            },
          );
          this.attachUsageAndCostAttributes(
            generateSpan,
            modelName,
            result?.usage,
          );
          // Pipe through TTS-of-AI-response when caller asks for it. The
          // shared `synthesizeAIResponseIfNeeded` no-ops when tts is not
          // enabled / useAiResponse is false, so the cost is zero on
          // non-TTS paths.
          result = await this.synthesizeAIResponseIfNeeded(result, options);
          generateSpan.setAttribute(
            LANGFUSE_ATTR.OBSERVATION_OUTPUT,
            spanJsonAttribute(result?.content ?? ""),
          );
          // Fire onFinish lifecycle callback for the native generate path.
          // Pipeline A providers get this for free via the AI SDK middleware
          // wrapper (LifecycleMiddleware); native @google/genai bypasses
          // that wrapper, so we have to invoke the callback ourselves.
          this.fireGenerateOnFinish(options, result, generateStartTime);
          this.emitGenerationEnd(
            modelName,
            result,
            generateStartTime,
            true,
            undefined,
            inputPrompt,
          );
          return result;
        } catch (error) {
          this.fireGenerateOnError(options, error, generateStartTime);
          this.emitGenerationEnd(
            modelName,
            null,
            generateStartTime,
            false,
            error,
            inputPrompt,
          );
          throw error;
        }
      },
    );
  }

  /**
   * Invoke `options.onFinish` with the lifecycle payload shape consumers
   * (and `test:middleware`) expect. Pulled out so generate / image-gen /
   * Anthropic / Gemini code paths share one implementation. Errors thrown
   * by the user's callback are swallowed so they cannot poison the
   * primary generate path — same contract as the AI SDK middleware
   * wrapGenerate uses.
   */
  private fireGenerateOnFinish(
    options: TextGenerationOptions,
    result: EnhancedGenerateResult | null,
    startTime: number,
  ): void {
    const onFinish = (options as { onFinish?: (payload: unknown) => unknown })
      .onFinish;
    if (typeof onFinish !== "function") {
      return;
    }
    try {
      const usage = result?.usage as
        | { input?: number; output?: number; total?: number }
        | undefined;
      const callbackResult = onFinish({
        text: result?.content || "",
        usage: usage
          ? {
              promptTokens: usage.input ?? 0,
              completionTokens: usage.output ?? 0,
            }
          : undefined,
        duration: Date.now() - startTime,
        finishReason: result?.finishReason ?? "stop",
      });
      Promise.resolve(callbackResult).catch((err) =>
        logger.warn(
          `[GoogleVertex] onFinish callback rejected: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    } catch (err) {
      logger.warn(
        `[GoogleVertex] onFinish callback threw: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Invoke `options.onError` with the lifecycle payload shape consumers
   * (and `test:middleware`) expect. Mirrors {@link fireGenerateOnFinish}.
   */
  private fireGenerateOnError(
    options: TextGenerationOptions | StreamOptions,
    error: unknown,
    startTime: number,
  ): void {
    const onError = (options as { onError?: (payload: unknown) => unknown })
      .onError;
    if (typeof onError !== "function") {
      return;
    }
    try {
      const err = error instanceof Error ? error : new Error(String(error));
      const callbackResult = onError({
        error: err,
        duration: Date.now() - startTime,
        recoverable: false,
      });
      Promise.resolve(callbackResult).catch((e) =>
        logger.warn(
          `[GoogleVertex] onError callback rejected: ${e instanceof Error ? e.message : String(e)}`,
        ),
      );
    } catch (e) {
      logger.warn(
        `[GoogleVertex] onError callback threw: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /**
   * Wrap a {@link StreamResult} so each text chunk drives `options.onChunk`
   * and the final yield drives `options.onFinish`. Pipeline A providers get
   * this for free via the AI SDK `wrapStream` middleware; native @google/genai
   * bypasses that wrapper, so native consumers need their lifecycle
   * callbacks invoked from here.
   */
  private wrapStreamResultWithLifecycle(
    options: StreamOptions,
    result: StreamResult,
    startTime: number,
  ): StreamResult {
    const onChunk = (
      options as {
        onChunk?: (payload: unknown) => unknown;
      }
    ).onChunk;
    const onFinish = (options as { onFinish?: (payload: unknown) => unknown })
      .onFinish;
    const onError = (options as { onError?: (payload: unknown) => unknown })
      .onError;
    if (
      typeof onChunk !== "function" &&
      typeof onFinish !== "function" &&
      typeof onError !== "function"
    ) {
      return result;
    }

    const originalIterable = result.stream;
    let accumulated = "";
    let sequence = 0;
    const provider = this.providerName;
    const fireOnChunk = (payload: unknown) => {
      if (typeof onChunk !== "function") {
        return;
      }
      try {
        const cbResult = onChunk(payload);
        Promise.resolve(cbResult).catch((err) =>
          logger.warn(
            `[GoogleVertex] onChunk callback rejected: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
      } catch (err) {
        logger.warn(
          `[GoogleVertex] onChunk callback threw: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    };
    const fireOnFinish = (payload: unknown) => {
      if (typeof onFinish !== "function") {
        return;
      }
      try {
        const cbResult = onFinish(payload);
        Promise.resolve(cbResult).catch((err) =>
          logger.warn(
            `[GoogleVertex] onFinish callback rejected: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
      } catch (err) {
        logger.warn(
          `[GoogleVertex] onFinish callback threw: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    };

    const wrappedIterable: AsyncIterable<{ content?: string }> = {
      async *[Symbol.asyncIterator]() {
        try {
          for await (const chunk of originalIterable as AsyncIterable<{
            content?: string;
          }>) {
            const text =
              typeof chunk?.content === "string" ? chunk.content : "";
            if (text) {
              accumulated += text;
              fireOnChunk({
                type: "text-delta",
                textDelta: text,
                sequenceNumber: sequence++,
              });
            }
            yield chunk;
          }
          fireOnFinish({
            text: accumulated,
            usage: result.usage
              ? {
                  promptTokens: (result.usage as { input?: number }).input ?? 0,
                  completionTokens:
                    (result.usage as { output?: number }).output ?? 0,
                }
              : undefined,
            duration: Date.now() - startTime,
            finishReason: result.finishReason || "stop",
          });
        } catch (err) {
          if (typeof onError === "function") {
            try {
              const errInst =
                err instanceof Error ? err : new Error(String(err));
              const cbResult = onError({
                error: errInst,
                duration: Date.now() - startTime,
                recoverable: false,
              });
              Promise.resolve(cbResult).catch((e) =>
                logger.warn(
                  `[${provider}] onError callback rejected: ${e instanceof Error ? e.message : String(e)}`,
                ),
              );
            } catch (e) {
              logger.warn(
                `[${provider}] onError callback threw: ${e instanceof Error ? e.message : String(e)}`,
              );
            }
          }
          throw err;
        }
      },
    };

    return this.preserveStreamResultAccessors(result, {
      ...result,
      stream: wrappedIterable as StreamResult["stream"],
    });
  }

  /**
   * Re-apply getter-based accessor properties from a source StreamResult onto
   * a wrapper copy. Wrapper spreads (`{ ...result }`) invoke and SNAPSHOT
   * enumerable getters at wrap time — for background-loop streams (the native
   * Anthropic path) that resolve finishReason / structuredOutput / toolCalls
   * only as the consumer drains, the snapshot is permanently undefined/empty.
   * Copying the accessor descriptors keeps the wrapped result live. Results
   * built from plain data properties (the buffered Gemini paths) have no
   * getters and pass through untouched.
   */
  private preserveStreamResultAccessors(
    source: StreamResult,
    wrapped: StreamResult,
  ): StreamResult {
    for (const key of [
      "finishReason",
      "structuredOutput",
      "toolCalls",
      "toolsUsed",
      "toolExecutions",
    ] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(source, key);
      if (descriptor?.get) {
        Object.defineProperty(wrapped, key, descriptor);
      }
    }
    return wrapped;
  }

  /**
   * Attach `gen_ai.usage.*` and `neurolink.cost` attributes to a span.
   * Pulled out so the generate / stream / image-gen paths share one
   * implementation, and so observability/tracing tests find consistent
   * attributes regardless of which native sub-route fulfilled the request.
   */
  private attachUsageAndCostAttributes(
    span: import("@opentelemetry/api").Span | undefined,
    modelName: string,
    usage:
      | {
          input?: number;
          output?: number;
          total?: number;
          inputTokens?: number;
          outputTokens?: number;
          totalTokens?: number;
          cacheReadTokens?: number;
          cacheCreationTokens?: number;
        }
      | undefined,
  ): void {
    if (!span || !usage) {
      return;
    }
    const inputTokens = usage.input ?? usage.inputTokens ?? 0;
    const outputTokens = usage.output ?? usage.outputTokens ?? 0;
    const totalTokens =
      usage.total ?? usage.totalTokens ?? inputTokens + outputTokens;
    const cacheReadTokens = usage.cacheReadTokens ?? 0;
    const cacheCreationTokens = usage.cacheCreationTokens ?? 0;
    if (inputTokens > 0) {
      span.setAttribute("gen_ai.usage.input_tokens", inputTokens);
    }
    if (outputTokens > 0) {
      span.setAttribute("gen_ai.usage.output_tokens", outputTokens);
    }
    if (totalTokens > 0) {
      span.setAttribute("gen_ai.usage.total_tokens", totalTokens);
    }
    if (cacheReadTokens > 0) {
      span.setAttribute(
        "gen_ai.usage.cache_read_input_tokens",
        cacheReadTokens,
      );
    }
    if (cacheCreationTokens > 0) {
      span.setAttribute(
        "gen_ai.usage.cache_creation_input_tokens",
        cacheCreationTokens,
      );
    }
    try {
      // Pass cache tokens through so calculateCost prices the ~0.1x cache-read
      // and ~1.25x cache-write tiers instead of billing cached content at the
      // full input rate.
      const cost = calculateCost(this.providerName, modelName, {
        input: inputTokens,
        output: outputTokens,
        total: totalTokens,
        cacheReadTokens,
        cacheCreationTokens,
      });
      if (typeof cost === "number" && cost > 0) {
        span.setAttribute("neurolink.cost", cost);
      }
    } catch {
      // Pricing table miss is not fatal — leave the attribute unset.
    }
  }

  /**
   * Emit `generation:end` so the Pipeline B observability listener creates
   * the corresponding `model.generation` span. Vertex bypasses the AI SDK
   * (and therefore the experimental_telemetry plumbing), so this hand-off
   * is the only way native Vertex calls show up in Langfuse / Pipeline B
   * exporters. Mirrors the Bedrock + Ollama pattern.
   */
  private emitGenerationEnd(
    modelName: string,
    result: EnhancedGenerateResult | null,
    startTime: number,
    success: boolean,
    error?: unknown,
    prompt?: string,
  ): void {
    const emitter = this.neurolink?.getEventEmitter();
    if (!emitter) {
      return;
    }
    const usage =
      result?.usage && typeof result.usage === "object"
        ? result.usage
        : { input: 0, output: 0, total: 0 };
    emitter.emit("generation:end", {
      provider: this.providerName,
      responseTime: Date.now() - startTime,
      timestamp: Date.now(),
      // The Pipeline B listener reads `data.prompt` to populate the
      // `input` attribute on the model.generation span; without it the
      // Observability Spans regression check fails.
      prompt: prompt || "",
      result: {
        content: result?.content || "",
        usage,
        model: modelName,
        provider: this.providerName,
        finishReason: success ? (result?.finishReason ?? "stop") : "error",
      },
      success,
      ...(error
        ? { error: error instanceof Error ? error.message : String(error) }
        : {}),
    });
    // Mark on the result so the SDK-level runStandardGenerateRequest knows
    // this provider already emitted `generation:end` itself and skips its
    // own duplicate emission. Without this flag the public event listener
    // (and the observability test) would see two events per generate call.
    if (result && typeof result === "object") {
      (result as { _generationEndEmitted?: boolean })._generationEndEmitted =
        true;
    }
  }

  /**
   * Emit a `turn:lifecycle` event on the SDK emitter (alongside
   * tool:start/tool:end) so loop conditions that previously only reached
   * process logs — step-cap, time-limit, stall, abort, tool timeouts,
   * malformed-call retries — are observable by consumers' own pipelines.
   */
  private emitTurnEvent(payload: {
    phase:
      | "step-cap"
      | "context-cap"
      | "time-limit"
      | "stalled"
      | "aborted"
      | "provider-error"
      | "tool-timeout"
      | "malformed-retry";
    step?: number;
    maxSteps?: number;
    toolName?: string;
    toolCallCount?: number;
    elapsedMs?: number;
  }): void {
    try {
      this.neurolink?.getEventEmitter()?.emit("turn:lifecycle", {
        provider: this.providerName,
        timestamp: Date.now(),
        ...payload,
      });
    } catch {
      /* listener errors are non-fatal */
    }
  }

  /**
   * Pick the honest terminal message for a native-loop exit by its ACTUAL
   * cause. The step-cap text is the fallback for genuine budget exhaustion
   * only — time/stall/abort exits must never claim a step limit was reached
   * (the 2026-07-03 "reached the 200-step limit" incident was a wall-clock
   * abort wearing the cap message).
   */
  private buildLoopExitMessage(params: {
    turnClock: { timedOut: boolean; stalled: boolean; elapsedMs(): number };
    wasAborted: boolean;
    stallTimeoutMs?: number;
    maxSteps: number;
    toolCallCount: number;
  }): string {
    if (params.turnClock.timedOut) {
      return buildTurnTimeoutMessage(
        params.turnClock.elapsedMs(),
        params.toolCallCount,
      );
    }
    if (params.turnClock.stalled) {
      return buildTurnStalledMessage(
        params.stallTimeoutMs ?? 0,
        params.toolCallCount,
      );
    }
    if (params.wasAborted) {
      return buildAbortedTurnMessage(params.toolCallCount);
    }
    return buildToolLoopCapMessage(params.maxSteps, params.toolCallCount);
  }

  protected formatProviderError(error: unknown): Error {
    const errorRecord = error as UnknownRecord;
    if (
      typeof errorRecord?.name === "string" &&
      errorRecord.name === "TimeoutError"
    ) {
      return new NetworkError(
        `Google Vertex AI request timed out. Consider increasing timeout or using a lighter model.`,
        this.providerName,
      );
    }

    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error occurred";
    const statusCode =
      typeof errorRecord?.status === "number"
        ? errorRecord.status
        : typeof errorRecord?.statusCode === "number"
          ? errorRecord.statusCode
          : undefined;

    // Authentication and permission errors
    if (
      message.includes("PERMISSION_DENIED") ||
      message.includes("UNAUTHENTICATED") ||
      message.includes("Invalid API key") ||
      statusCode === 401 ||
      statusCode === 403
    ) {
      return new AuthenticationError(
        `Google Vertex AI Permission Denied. Your Google Cloud credentials don't have permission to access Vertex AI. ` +
          `Required Steps: 1. Ensure your service account has Vertex AI User role ` +
          `2. Check if Vertex AI API is enabled in your project ` +
          `3. Verify your project ID is correct ` +
          `4. Confirm your location/region has Vertex AI available`,
        this.providerName,
      );
    }

    // Model not found errors
    if (
      message.includes("NOT_FOUND") ||
      message.includes("model not found") ||
      message.includes("Model not found") ||
      statusCode === 404
    ) {
      const modelSuggestions = this.getModelSuggestions(this.modelName);
      return new InvalidModelError(
        `Model '${this.modelName}' is not available in region ${this.location}. ` +
          `Suggested alternatives: ${modelSuggestions}. ` +
          `Troubleshooting: 1. Check model name spelling and format ` +
          `2. Verify model is available in your region ` +
          `3. Ensure your project has access to the model ` +
          `4. For Claude models, enable Anthropic integration in Google Cloud Console`,
        this.providerName,
      );
    }

    // Rate limit / quota / capacity errors. Anthropic-on-Vertex capacity
    // exhaustion surfaces as overloaded_error (HTTP 529) — same operational
    // meaning as a 429, so classify it here instead of the generic 5xx branch.
    if (
      message.includes("QUOTA_EXCEEDED") ||
      message.includes("RATE_LIMIT_EXCEEDED") ||
      message.includes("rate limit") ||
      message.includes("429") ||
      statusCode === 429 ||
      statusCode === 529 ||
      /overloaded/i.test(message)
    ) {
      // Surface retry guidance when the SDK error carries it. @google/genai
      // ApiError nests RetryInfo inside the JSON error body's details array,
      // so fall back to scraping retryDelay out of the raw message.
      const retryDelay =
        typeof errorRecord?.retryDelay === "string"
          ? errorRecord.retryDelay
          : (/["']?retryDelay["']?\s*[:=]\s*["']?(\d+(?:\.\d+)?s)/.exec(
              message,
            )?.[1] ?? undefined);
      // Prefer the per-request context the native catches attach to the
      // error (this.modelName can be stale when options.model overrides the
      // instance default). Gemini models are force-routed to the "global"
      // endpoint regardless of configured location — report the region the
      // request actually hit.
      const requestModel =
        typeof errorRecord?.requestModel === "string"
          ? errorRecord.requestModel
          : this.modelName;
      const effectiveRegion =
        typeof errorRecord?.requestRegion === "string"
          ? errorRecord.requestRegion
          : resolveVertexRegionForModel(requestModel, this.location);
      return new RateLimitError(
        `Google Vertex AI rate limit / shared-capacity exhausted (429 RESOURCE_EXHAUSTED / overloaded) ` +
          `for model '${requestModel}' in region '${effectiveRegion}'.` +
          (retryDelay
            ? ` Upstream suggests retrying after ${retryDelay}.`
            : "") +
          ` Solutions: 1. Retry with backoff ` +
          `2. Check your Vertex AI quotas in Google Cloud Console (shared-capacity 429s can occur below quota) ` +
          `3. Try a different region or model ` +
          `4. Request provisioned throughput for sustained load`,
        this.providerName,
      );
    }

    // Network connectivity errors
    if (
      message.includes("ECONNRESET") ||
      message.includes("ENOTFOUND") ||
      message.includes("ETIMEDOUT") ||
      message.includes("ECONNREFUSED") ||
      message.includes("network") ||
      message.includes("connection")
    ) {
      return new NetworkError(
        `Connection error: ${message}`,
        this.providerName,
      );
    }

    // Server errors (5xx)
    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504") ||
      message.includes("server error") ||
      message.includes("Internal Server Error") ||
      message.includes("INTERNAL") ||
      message.includes("UNAVAILABLE") ||
      (statusCode && statusCode >= 500 && statusCode < 600)
    ) {
      return new ProviderError(
        `Google Vertex AI server error: ${message}. Please try again later.`,
        this.providerName,
      );
    }

    // Invalid argument errors
    if (message.includes("INVALID_ARGUMENT")) {
      return new ProviderError(
        `Google Vertex AI Invalid Request: ${message}. ` +
          `Check: 1. Request parameters are within model limits ` +
          `2. Input text is properly formatted ` +
          `3. Temperature and other settings are valid ` +
          `4. Model supports your request type`,
        this.providerName,
      );
    }

    return new ProviderError(
      `Google Vertex AI error: ${message}`,
      this.providerName,
    );
  }

  /**
   * Memory-safe cache management for model configurations
   * Implements LRU eviction to prevent memory leaks in long-running processes
   */
  private static evictLRUCacheEntries<K, V>(cache: Map<K, V>): void {
    if (cache.size <= GoogleVertexProvider.MAX_CACHE_SIZE) {
      return;
    }

    // Evict oldest entries (first entries in Map are oldest in insertion order)
    const entriesToRemove =
      cache.size - GoogleVertexProvider.MAX_CACHE_SIZE + 5; // Remove extra to avoid frequent evictions
    let removed = 0;

    for (const key of cache.keys()) {
      if (removed >= entriesToRemove) {
        break;
      }
      cache.delete(key);
      removed++;
    }

    logger.debug("GoogleVertexProvider: Evicted LRU cache entries", {
      entriesRemoved: removed,
      currentCacheSize: cache.size,
    });
  }

  /**
   * Access and refresh cache entry (moves to end for LRU)
   */
  private static accessCacheEntry<K, V>(
    cache: Map<K, V>,
    key: K,
  ): V | undefined {
    const value = cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      cache.delete(key);
      cache.set(key, value);
    }
    return value;
  }

  /**
   * Memory-safe cached check for whether maxTokens should be set for the given model
   * Optimized for streaming performance with LRU eviction to prevent memory leaks
   */
  private shouldSetMaxTokensCached(modelName: string): boolean {
    const now = Date.now();

    // Check if cache is valid (within 5 minutes)
    if (
      now - GoogleVertexProvider.maxTokensCacheTime >
      GoogleVertexProvider.CACHE_DURATION
    ) {
      // Cache expired, refresh all cached results
      GoogleVertexProvider.maxTokensCache.clear();
      GoogleVertexProvider.maxTokensCacheTime = now;
    }

    // Check if we have cached result for this model (with LRU access)
    const cachedResult = GoogleVertexProvider.accessCacheEntry(
      GoogleVertexProvider.maxTokensCache,
      modelName,
    );
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    // Calculate and cache the result with memory management
    const shouldSet = !this.modelHasMaxTokensIssues(modelName);
    GoogleVertexProvider.maxTokensCache.set(modelName, shouldSet);

    // Prevent memory leaks by evicting old entries if cache grows too large
    GoogleVertexProvider.evictLRUCacheEntries(
      GoogleVertexProvider.maxTokensCache,
    );

    return shouldSet;
  }

  /**
   * Memory-safe check if model has maxTokens issues using configuration-based approach
   * This replaces hardcoded model-specific logic with configurable behavior
   * Includes LRU caching to avoid repeated configuration lookups during streaming
   */
  private modelHasMaxTokensIssues(modelName: string): boolean {
    const now = Date.now();
    const cacheKey = "google-vertex-config";

    // Check if cache is valid (within 5 minutes)
    if (
      now - GoogleVertexProvider.modelConfigCacheTime >
      GoogleVertexProvider.CACHE_DURATION
    ) {
      // Cache expired, refresh it with memory management
      GoogleVertexProvider.modelConfigCache.clear();
      const config = ModelConfigurationManager.getInstance();
      const vertexConfig = config.getProviderConfiguration("google-vertex");
      GoogleVertexProvider.modelConfigCache.set(cacheKey, vertexConfig);
      GoogleVertexProvider.modelConfigCacheTime = now;
    }

    // Access cached config with LRU behavior
    const vertexConfig = GoogleVertexProvider.accessCacheEntry(
      GoogleVertexProvider.modelConfigCache,
      cacheKey,
    ) as { modelBehavior?: { maxTokensIssues?: string[] } } | undefined;

    // Check if model is in the list of models with maxTokens issues
    const modelsWithIssues = vertexConfig?.modelBehavior?.maxTokensIssues || [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
    ];

    return modelsWithIssues.some((problematicModel: string) =>
      modelName.includes(problematicModel),
    );
  }

  /**
   * Check if Anthropic models are available
   * @returns Promise<boolean> indicating if Anthropic support is available
   */
  async hasAnthropicSupport(): Promise<boolean> {
    return hasAnthropicSupport();
  }

  /**
   * @deprecated This method is no longer used. Claude models now use native @anthropic-ai/vertex-sdk
   * via executeNativeAnthropicStream and executeNativeAnthropicGenerate.
   */
  async createAnthropicModel(
    _modelName: string,
  ): Promise<LanguageModel | null> {
    // This method is dead code - all Claude models now route to native SDK methods.
    // Throwing an error to catch any unexpected calls to this method.
    throw new NeuroLinkError({
      code: ERROR_CODES.INVALID_CONFIGURATION,
      message:
        "createAnthropicModel is deprecated. Use executeNativeAnthropicStream or executeNativeAnthropicGenerate instead.",
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.CRITICAL,
      retriable: false,
      context: { provider: this.providerName },
    });
  }

  /**
   * Validate Vertex AI authentication configuration
   */
  private async validateVertexAuthentication(): Promise<{
    isValid: boolean;
    method: string;
    issues: string[];
  }> {
    const result = {
      isValid: false,
      method: "none",
      issues: [] as string[],
    };

    try {
      // Check for service account file authentication (preferred)
      if (
        process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS
      ) {
        const credentialsPath = process.env
          .GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK
          ? process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK
          : process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
        try {
          if (fs.existsSync(credentialsPath)) {
            // Validate JSON structure
            const credentialsContent = fs.readFileSync(credentialsPath, "utf8");
            const credentials = JSON.parse(credentialsContent);

            if (
              credentials.type === "service_account" &&
              credentials.project_id &&
              credentials.client_email &&
              credentials.private_key
            ) {
              result.isValid = true;
              result.method = "service_account_file";
              return result;
            } else if (
              credentials.client_id &&
              credentials.client_secret &&
              credentials.refresh_token &&
              credentials.type !== "service_account"
            ) {
              result.isValid = true;
              result.method = "application_default_credentials";
              return result;
            } else {
              result.issues.push(
                "Credentials file missing required fields (not service account or ADC format)",
              );
            }
          } else {
            result.issues.push(
              `Service account file not found: ${credentialsPath}`,
            );
          }
        } catch (fileError) {
          result.issues.push(
            `Service account file validation failed: ${fileError}`,
          );
        }
      }

      // Check for individual environment variables
      if (
        process.env.GOOGLE_AUTH_CLIENT_EMAIL &&
        process.env.GOOGLE_AUTH_PRIVATE_KEY
      ) {
        const email = process.env.GOOGLE_AUTH_CLIENT_EMAIL;
        const privateKey = process.env.GOOGLE_AUTH_PRIVATE_KEY;

        if (email.includes("@") && privateKey.includes("BEGIN PRIVATE KEY")) {
          result.isValid = true;
          result.method = "environment_variables";
          return result;
        } else {
          result.issues.push("Individual credentials format validation failed");
        }
      } else {
        result.issues.push(
          "Missing individual credential environment variables",
        );
      }

      if (!result.isValid) {
        result.issues.push("No valid authentication method found");
      }
    } catch (error) {
      result.issues.push(`Authentication validation error: ${error}`);
    }

    return result;
  }

  /**
   * Validate Vertex AI project configuration
   */
  private async validateVertexProjectConfiguration(): Promise<{
    isValid: boolean;
    projectId: string | undefined;
    region: string | undefined;
    issues: string[];
  }> {
    const result = {
      isValid: false,
      projectId: undefined as string | undefined,
      region: undefined as string | undefined,
      issues: [] as string[],
    };

    // Check project ID
    const projectId =
      process.env.GOOGLE_VERTEX_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT_ID ||
      process.env.GOOGLE_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT;

    if (projectId) {
      result.projectId = projectId;

      // Validate project ID format
      const projectIdPattern = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
      if (projectIdPattern.test(projectId)) {
        result.isValid = true;
      } else {
        result.issues.push(`Invalid project ID format: ${projectId}`);
      }
    } else {
      result.issues.push("No project ID configured");
    }

    // Check region/location
    const region =
      process.env.GOOGLE_CLOUD_LOCATION ||
      process.env.VERTEX_LOCATION ||
      process.env.GOOGLE_VERTEX_LOCATION ||
      "us-central1";

    result.region = region;

    // Validate region format (regional format like us-central1 or global endpoint)
    const regionPattern = /^([a-z]+-[a-z]+\d+|global)$/;
    if (!regionPattern.test(region)) {
      result.issues.push(
        `Invalid region format: ${region} (expected format: 'us-central1' or 'global')`,
      );
      result.isValid = false;
    }

    return result;
  }

  /**
   * Check if the specified region supports Anthropic models
   */
  private async checkVertexRegionalSupport(
    region: string = "us-central1",
  ): Promise<boolean> {
    // Based on Google Cloud documentation, these regions support Anthropic models
    const supportedRegions = [
      // North America
      "us-central1",
      "us-east1",
      "us-east4",
      "us-east5",
      "us-south1",
      "us-west1",
      "us-west4",
      "northamerica-northeast1",
      "northamerica-northeast2",
      // Europe
      "europe-west1",
      "europe-west2",
      "europe-west3",
      "europe-west4",
      "europe-west6",
      "europe-west8",
      "europe-west9",
      "europe-north1",
      "europe-central2",
      "europe-southwest1",
      // Asia Pacific
      "asia-east1",
      "asia-east2",
      "asia-northeast1",
      "asia-northeast2",
      "asia-northeast3",
      "asia-south1",
      "asia-southeast1",
      "asia-southeast2",
      "australia-southeast1",
      "australia-southeast2",
      // Middle East & Africa
      "me-west1",
      "me-central1",
      "africa-south1",
      // South America
      "southamerica-east1",
      "southamerica-west1",
    ];

    return supportedRegions.includes(region);
  }

  /**
   * Validate Anthropic model name format and availability
   */
  private validateAnthropicModelName(modelName: string): {
    isValid: boolean;
    issue?: string;
  } {
    if (!modelName || typeof modelName !== "string") {
      return {
        isValid: false,
        issue: "Model name is required and must be a string",
      };
    }

    // Check if it's a Claude model
    if (!modelName.toLowerCase().includes("claude")) {
      return {
        isValid: false,
        issue: 'Model name must be a Claude model (should contain "claude")',
      };
    }

    // Validate against known Claude model patterns
    const validPatterns = [
      /^claude-sonnet-4@\d{8}$/,
      /^claude-sonnet-4-5@\d{8}$/,
      /^claude-opus-4@\d{8}$/,
      /^claude-opus-4-1@\d{8}$/,
      /^claude-3-7-sonnet@\d{8}$/,
      /^claude-3-5-sonnet-\d{8}$/,
      /^claude-3-5-haiku-\d{8}$/,
      /^claude-3-sonnet-\d{8}$/,
      /^claude-3-haiku-\d{8}$/,
      /^claude-3-opus-\d{8}$/,
    ];

    const isValidFormat = validPatterns.some((pattern) =>
      pattern.test(modelName),
    );

    if (!isValidFormat) {
      return {
        isValid: false,
        issue: `Model name format not recognized. Expected formats like "claude-3-5-sonnet-20241022" or "claude-sonnet-4@20250514"`,
      };
    }

    return { isValid: true };
  }

  /**
   * Analyze Anthropic model creation errors for detailed troubleshooting
   */
  private analyzeAnthropicCreationError(
    error: unknown,
    context: {
      validationId: string;
      modelName: string;
      projectId?: string;
      region?: string;
      authMethod: string;
    },
  ) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";

    const analysis = {
      error: errorMessage,
      errorName,
      errorType: "UNKNOWN",
      isNetworkError: false,
      isAuthError: false,
      isConfigurationError: false,
      isModelError: false,
      isRegionalError: false,
      specificIssue: "Unknown error occurred",
      errorStack: error instanceof Error ? error.stack : undefined,
    };

    // Network-related errors
    if (
      errorMessage.includes("ETIMEDOUT") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("timeout")
    ) {
      analysis.errorType = "NETWORK";
      analysis.isNetworkError = true;
      analysis.specificIssue =
        "Network connectivity issue - cannot reach Google Cloud endpoints";
    }
    // Authentication errors
    else if (
      errorMessage.includes("PERMISSION_DENIED") ||
      errorMessage.includes("401") ||
      errorMessage.includes("403") ||
      errorMessage.includes("Unauthorized") ||
      errorMessage.includes("Forbidden")
    ) {
      analysis.errorType = "AUTHENTICATION";
      analysis.isAuthError = true;
      analysis.specificIssue =
        "Authentication failed - invalid credentials or insufficient permissions";
    }
    // Model availability errors
    else if (
      errorMessage.includes("NOT_FOUND") ||
      errorMessage.includes("404") ||
      (errorMessage.includes("model") && errorMessage.includes("not available"))
    ) {
      analysis.errorType = "MODEL_AVAILABILITY";
      analysis.isModelError = true;
      analysis.specificIssue = `Model "${context.modelName}" not available in region "${context.region}"`;
    }
    // Regional/quota errors
    else if (
      errorMessage.includes("QUOTA_EXCEEDED") ||
      errorMessage.includes("quota") ||
      errorMessage.includes("limit")
    ) {
      analysis.errorType = "QUOTA";
      analysis.isRegionalError = true;
      analysis.specificIssue = "Quota exceeded or rate limit reached";
    }
    // Configuration errors
    else if (
      errorMessage.includes("INVALID_ARGUMENT") ||
      errorMessage.includes("BadRequest") ||
      errorMessage.includes("400")
    ) {
      analysis.errorType = "CONFIGURATION";
      analysis.isConfigurationError = true;
      analysis.specificIssue = "Invalid configuration or request parameters";
    }

    return analysis;
  }

  /**
   * Get detailed troubleshooting steps based on error analysis
   */
  private getAnthropicTroubleshootingSteps(errorAnalysis: {
    errorType: string;
    [key: string]: unknown;
  }): string[] {
    const steps: string[] = [];

    switch (errorAnalysis.errorType) {
      case "NETWORK":
        steps.push(
          "🌐 Network Troubleshooting:",
          "1. Check internet connectivity",
          "2. Verify proxy configuration if behind corporate firewall",
          "3. Ensure firewall allows HTTPS to *.googleapis.com",
          "4. Try different network or wait for network issues to resolve",
          "5. Check if using VPN that might block Google Cloud endpoints",
        );
        break;

      case "AUTHENTICATION":
        steps.push(
          "🔐 Authentication Troubleshooting:",
          "1. Verify GOOGLE_APPLICATION_CREDENTIALS file exists and is valid",
          "2. Check individual credentials: GOOGLE_AUTH_CLIENT_EMAIL, GOOGLE_AUTH_PRIVATE_KEY",
          '3. Ensure service account has "Vertex AI User" role',
          "4. Verify project ID matches the one in your credentials",
          "5. Enable Vertex AI API: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com",
        );
        break;

      case "MODEL_AVAILABILITY":
        steps.push(
          "🤖 Model Availability Troubleshooting:",
          "1. Verify model name format and spelling",
          "2. Check if Anthropic integration is enabled in your project",
          "3. Enable Claude models: https://console.cloud.google.com/vertex-ai/publishers/anthropic",
          "4. Try a different region if current region lacks Anthropic support",
          "5. Accept Anthropic terms and conditions in Google Cloud Console",
        );
        break;

      case "QUOTA":
        steps.push(
          "📊 Quota Troubleshooting:",
          "1. Check Vertex AI quotas in Google Cloud Console",
          "2. Request quota increase if needed",
          "3. Try a different model with lower resource requirements",
          "4. Wait before retrying if rate limited",
          "5. Consider using a different region with available quota",
        );
        break;

      case "CONFIGURATION":
        steps.push(
          "⚙️ Configuration Troubleshooting:",
          "1. Verify all required environment variables are set",
          "2. Check project ID and region format",
          "3. Ensure model name follows correct format",
          "4. Verify request parameters are within model limits",
          "5. Verify @google-cloud/vertexai and @anthropic-ai/vertex-sdk versions",
        );
        break;

      default:
        steps.push(
          "🔧 General Troubleshooting:",
          "1. Verify native SDK packages are properly installed",
          "2. Check Google Cloud service status",
          "3. Verify all authentication and configuration",
          "4. Try with a simple Claude model like claude-3-haiku-20240307",
          "5. Enable debug logging with NEUROLINK_DEBUG=true",
        );
    }

    return steps;
  }

  /**
   * Register a tool with the AI provider
   * @param name The name of the tool
   * @param schema The Zod schema defining the tool's parameters
   * @param description A description of what the tool does
   * @param handler The function to execute when the tool is called
   */
  registerTool(
    name: string,
    schema: ZodType<unknown>,
    description: string,
    handler: (params: Record<string, unknown>) => Promise<unknown>,
  ): void {
    const functionTag = "GoogleVertexProvider.registerTool";

    try {
      const tool = {
        description,
        parameters: schema,
        execute: async (params: Record<string, unknown>) => {
          try {
            const contextEnrichedParams = {
              ...params,
              __context: this.toolContext,
            };
            return await handler(contextEnrichedParams);
          } catch (error) {
            logger.error(`${functionTag}: Tool execution error`, {
              toolName: name,
              error: error instanceof Error ? error.message : String(error),
            });
            throw error;
          }
        },
      };

      this.registeredTools.set(name, tool);

      logger.debug(`${functionTag}: Tool registered`, {
        toolName: name,
        modelName: this.modelName,
      });
    } catch (error) {
      logger.error(`${functionTag}: Tool registration error`, {
        toolName: name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Set the context for tool execution
   * @param context The context to use for tool execution
   */
  setToolContext(context: Record<string, unknown>): void {
    this.toolContext = { ...this.toolContext, ...context };
    logger.debug("GoogleVertexProvider.setToolContext: Tool context set", {
      contextKeys: Object.keys(context),
    });
  }

  /**
   * Get the current tool execution context
   * @returns The current tool execution context
   */
  getToolContext(): Record<string, unknown> {
    return { ...this.toolContext };
  }

  /**
   * Set the tool executor function for custom tool execution
   * This method is called by BaseProvider.setupToolExecutor()
   * @param executor Function to execute tools by name
   */
  setToolExecutor(
    executor: (toolName: string, params: unknown) => Promise<unknown>,
  ): void {
    this.toolExecutor = executor;
    logger.debug("GoogleVertexProvider.setToolExecutor: Tool executor set", {
      hasExecutor: typeof executor === "function",
    });
  }

  /**
   * Clear all static caches - useful for testing and memory cleanup
   * Public method to allow external cache management
   */
  static clearCaches(): void {
    GoogleVertexProvider.modelConfigCache.clear();
    GoogleVertexProvider.maxTokensCache.clear();
    GoogleVertexProvider.modelConfigCacheTime = 0;
    GoogleVertexProvider.maxTokensCacheTime = 0;

    logger.debug("GoogleVertexProvider: All caches cleared", {
      clearedAt: Date.now(),
    });
  }

  /**
   * Get cache statistics for monitoring and debugging
   */
  static getCacheStats(): {
    modelConfigCacheSize: number;
    maxTokensCacheSize: number;
    maxCacheSize: number;
    cacheAge: { modelConfig: number; maxTokens: number };
  } {
    const now = Date.now();
    return {
      modelConfigCacheSize: GoogleVertexProvider.modelConfigCache.size,
      maxTokensCacheSize: GoogleVertexProvider.maxTokensCache.size,
      maxCacheSize: GoogleVertexProvider.MAX_CACHE_SIZE,
      cacheAge: {
        modelConfig: now - GoogleVertexProvider.modelConfigCacheTime,
        maxTokens: now - GoogleVertexProvider.maxTokensCacheTime,
      },
    };
  }

  /**
   * Detect image MIME type from buffer
   */
  private detectImageType(buffer: Buffer): string {
    return detectImageMimeType(buffer);
  }

  /**
   * Estimate token count from text (simple character-based estimation)
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Build image parts for multimodal content
   */

  /**
   * Overrides the BaseProvider's image generation method to implement it for Vertex AI.
   * Uses REST API approach with google-auth-library for authentication.
   * Supports PDF input for image generation with gemini-3-pro-image-preview (Nano Banana Pro).
   * @param options The generation options containing the prompt and optional PDF files.
   * @returns A promise that resolves to the generation result, including the image data.
   */
  protected async executeImageGeneration(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    const prompt = options.prompt || options.input?.text || "";
    const pdfFiles = options.input?.pdfFiles || [];
    const inputImages = options.input?.images || [];
    const hasPdfInput = pdfFiles.length > 0;
    const hasImageInput = inputImages.length > 0;

    // Validate that we have at least a prompt or PDF/image input
    if (!prompt.trim() && !hasPdfInput && !hasImageInput) {
      throw new ProviderError(
        "Image generation requires either a prompt, PDF file, or image as input",
        this.providerName,
      );
    }

    // Select appropriate model - use gemini-3-pro-image-preview for PDF input
    let imageModelName =
      options.model || this.modelName || "gemini-3-pro-image-preview";

    // If PDF files are provided, ensure we use a model that supports PDF input
    if (hasPdfInput && !imageModelName.includes("gemini-3-pro-image")) {
      imageModelName = "gemini-3-pro-image-preview";
    }

    // Determine location - some image models require 'global' location
    // Check if the model is in GLOBAL_LOCATION_MODELS array (includes gemini-3-pro-image-preview, gemini-2.5-flash-image, etc.)
    const imageLocation = process.env.GOOGLE_VERTEX_IMAGE_LOCATION || "global";
    const requiresGlobalLocation = GLOBAL_LOCATION_MODELS.some(
      (model) =>
        imageModelName.includes(model) || model.includes(imageModelName),
    );
    const location = requiresGlobalLocation ? imageLocation : this.location;

    const startTime = Date.now();

    logger.info("🎨 Starting Vertex AI image generation (REST API)", {
      model: imageModelName,
      prompt: prompt.substring(0, 100),
      provider: this.providerName,
      projectId: this.projectId,
      location: location,
      hasPdfInput,
      pdfCount: pdfFiles.length,
      hasImageInput,
      imageCount: inputImages.length,
    });

    try {
      // Import google-auth-library dynamically
      const { GoogleAuth } = await import("google-auth-library");

      // Determine which credentials file to use
      // Priority: GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK > GOOGLE_APPLICATION_CREDENTIALS
      const credentialsPath =
        process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS;

      // Initialize GoogleAuth with credentials
      // Use keyFilename to explicitly specify the credentials file to avoid using wrong service account
      const auth = new GoogleAuth({
        ...(credentialsPath && { keyFilename: credentialsPath }),
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });

      // Get access token
      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();

      if (!accessToken.token) {
        throw new AuthenticationError(
          "Failed to obtain access token from Google Auth",
          this.providerName,
        );
      }

      // Build parts array - supports text prompt and optional PDF files
      const parts: Array<{
        text?: string;
        inlineData?: { mimeType: string; data: string };
      }> = [];

      // Add text prompt
      if (prompt) {
        parts.push({ text: prompt });
      }

      // Add PDF files as inline data (for gemini-3-pro-image-preview)
      if (hasPdfInput) {
        for (const pdfFile of pdfFiles) {
          let pdfBase64: string;

          if (Buffer.isBuffer(pdfFile)) {
            pdfBase64 = pdfFile.toString("base64");
          } else if (typeof pdfFile === "string") {
            // Check if it's already base64 or a file path
            // Supports absolute paths, Windows paths, and relative paths
            const isFilePath =
              pdfFile.startsWith("/") ||
              /^[a-zA-Z]:\\/.test(pdfFile) ||
              pdfFile.startsWith("./") ||
              pdfFile.startsWith("../") ||
              pdfFile.startsWith("..\\") ||
              pdfFile.startsWith(".\\");
            if (isFilePath) {
              // Validate and normalize the path for security
              const normalizedPath = path.resolve(pdfFile);
              const cwd = process.cwd();

              // Security: Ensure path is within current working directory
              if (
                !normalizedPath.startsWith(cwd + path.sep) &&
                normalizedPath !== cwd
              ) {
                throw new ProviderError(
                  `PDF file path must be within current directory for security`,
                  this.providerName,
                );
              }

              // Security: Validate file exists before reading
              if (!fs.existsSync(normalizedPath)) {
                throw new ProviderError(
                  `PDF file not found: ${normalizedPath}`,
                  this.providerName,
                );
              }

              // Read the file
              const pdfBuffer = fs.readFileSync(normalizedPath);
              pdfBase64 = pdfBuffer.toString("base64");
            } else {
              // Assume it's already base64
              pdfBase64 = pdfFile;
            }
          } else {
            logger.warn("Invalid PDF file format, skipping", {
              type: typeof pdfFile,
            });
            continue;
          }
          parts.push({
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBase64,
            },
          });
          logger.debug("Added PDF file to request", {
            dataLength: pdfBase64.length,
          });
        }
      }

      // Add images (including those converted from PDF by baseProvider)
      // This handles the case where PDFs are converted to images for models that don't support native PDF
      if (hasImageInput) {
        for (let i = 0; i < inputImages.length; i++) {
          const image = inputImages[i];
          let imageBase64: string;
          let mimeType: string;

          if (Buffer.isBuffer(image)) {
            imageBase64 = image.toString("base64");
            mimeType = this.detectImageType(image);
          } else if (typeof image === "string") {
            // Check if it's a file path or already base64
            const isFilePath =
              image.startsWith("/") ||
              /^[a-zA-Z]:\\/.test(image) ||
              image.startsWith("./") ||
              image.startsWith("../") ||
              image.startsWith("..\\") ||
              image.startsWith(".\\");

            if (isFilePath) {
              // Read from file path
              const normalizedPath = path.resolve(image);
              if (!fs.existsSync(normalizedPath)) {
                logger.warn(
                  `Image file not found: ${normalizedPath}, skipping`,
                );
                continue;
              }
              const imageBuffer = fs.readFileSync(normalizedPath);
              imageBase64 = imageBuffer.toString("base64");
              mimeType = this.detectImageType(imageBuffer);
            } else if (image.startsWith("data:")) {
              // Data URL format: data:image/png;base64,<base64data>
              const matches = image.match(/^data:([^;]+);base64,(.+)$/);
              if (matches) {
                mimeType = matches[1];
                imageBase64 = matches[2];
              } else {
                logger.warn("Invalid data URL format, skipping image", {
                  index: i,
                });
                continue;
              }
            } else if (
              image.startsWith("http://") ||
              image.startsWith("https://")
            ) {
              // Image URL — fetch the bytes and base64-encode them.
              // Without this, the URL string itself ends up in
              // inline_data.data and Vertex rejects with
              // "Base64 decoding failed for <url>".
              try {
                const response = await fetch(image);
                if (!response.ok) {
                  logger.warn(
                    `Image fetch failed: ${response.status} ${response.statusText}, skipping`,
                    { url: image, index: i },
                  );
                  continue;
                }
                const arrayBuffer = await response.arrayBuffer();
                const fetchedBuffer = Buffer.from(arrayBuffer);
                imageBase64 = fetchedBuffer.toString("base64");
                const headerMime = response.headers.get("content-type");
                mimeType =
                  headerMime && headerMime.startsWith("image/")
                    ? headerMime.split(";")[0]
                    : this.detectImageType(fetchedBuffer);
              } catch (fetchError) {
                logger.warn(
                  `Image URL fetch threw, skipping: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
                  { url: image, index: i },
                );
                continue;
              }
            } else {
              // Assume it's already base64 encoded
              imageBase64 = image;
              // Try to detect type from base64 data
              const decodedBuffer = Buffer.from(imageBase64, "base64");
              mimeType = this.detectImageType(decodedBuffer);
            }
          } else {
            logger.warn("Invalid image format, skipping", {
              type: typeof image,
              index: i,
            });
            continue;
          }

          parts.push({
            inlineData: {
              mimeType: mimeType,
              data: imageBase64,
            },
          });

          logger.debug("Added image to request", {
            index: i,
            mimeType,
            dataLength: imageBase64.length,
          });
        }
      }

      // Build request body with CRITICAL response_modalities setting
      const requestBody = {
        contents: [
          {
            role: "user",
            parts: parts,
          },
        ],
        generation_config: {
          response_modalities: ["TEXT", "IMAGE"], // CRITICAL for image generation
          temperature: options.temperature || 0.7,
          candidate_count: 1,
        },
      };

      // Construct Vertex AI endpoint - use appropriate base URL for location
      let url: string;
      if (location === "global") {
        // Global endpoint doesn't have region prefix
        url = `https://aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/global/publishers/google/models/${imageModelName}:generateContent`;
      } else {
        url = `https://${location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${location}/publishers/google/models/${imageModelName}:generateContent`;
      }

      logger.debug("Making REST API call to Vertex AI", {
        url,
        model: imageModelName,
        hasAccessToken: !!accessToken.token,
      });

      // Add timeout protection (120 seconds for image generation)
      // Note: Using Promise.race instead of createTimeoutController because:
      // 1. This is a one-off REST API call (not streaming) where fetch completion is atomic
      // 2. AbortController mid-request cancellation isn't beneficial for image generation
      //    since the server generates the full image before responding
      // 3. The simpler Promise.race pattern is sufficient for this use case
      const timeoutMs = 120000;

      const fetchPromise = fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new TimeoutError(
              `Vertex AI image generation timed out after ${timeoutMs}ms`,
              timeoutMs,
            ),
          );
        }, timeoutMs);
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        const errorText = await response.text();
        throw new ProviderError(
          `Vertex AI API error (${response.status}): ${errorText}`,
          this.providerName,
        );
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              inlineData?: { data: string; mimeType?: string };
              inline_data?: { data: string; mime_type?: string };
              text?: string;
            }>;
          };
        }>;
      };

      // Extract image from response (handle both inlineData and inline_data formats)
      const candidate = data.candidates?.[0];
      if (!candidate?.content?.parts) {
        throw new ProviderError(
          "No content parts in Vertex AI response",
          this.providerName,
        );
      }

      // Find image part (check both camelCase and snake_case)
      const imagePart = candidate.content.parts.find(
        (part) =>
          (part.inlineData || part.inline_data) &&
          ((part.inlineData && part.inlineData.mimeType) ||
            (part.inline_data && part.inline_data.mime_type)) &&
          ((part.inlineData &&
            part.inlineData.mimeType?.startsWith("image/")) ||
            (part.inline_data &&
              part.inline_data.mime_type?.startsWith("image/"))),
      );

      if (!imagePart) {
        // Dual-mode image models (gemini-3.1-flash-image-preview,
        // gemini-2.5-flash-image, gemini-3-pro-image-preview) decide
        // per-request whether to emit inlineData (image bytes) or text.
        // For a text-only prompt the model legitimately answers with
        // text parts and no image. Treat this as a normal text fallback
        // instead of throwing — otherwise simple queries like "What is
        // the capital of France?" against an image-capable model burn
        // retries on a question the model already answered.
        const textFallback = candidate.content.parts
          .map((part) => part.text)
          .filter((t): t is string => Boolean(t))
          .join("");

        if (textFallback) {
          logger.info("[GoogleVertex] Image-gen route returned text fallback", {
            model: imageModelName,
            length: textFallback.length,
          });
          const textResult: EnhancedGenerateResult = {
            content: textFallback,
            provider: this.providerName,
            model: imageModelName,
            usage: {
              input: this.estimateTokenCount(prompt),
              output: this.estimateTokenCount(textFallback),
              total:
                this.estimateTokenCount(prompt) +
                this.estimateTokenCount(textFallback),
            },
          };
          return await this.enhanceResult(textResult, options, startTime);
        }

        throw new ProviderError(
          `Image generation completed but no image data was returned. Model: ${imageModelName}`,
          this.providerName,
        );
      }

      // Extract image data (handle both formats)
      const imageData =
        imagePart.inlineData?.data || imagePart.inline_data?.data;
      const mimeType =
        imagePart.inlineData?.mimeType ||
        imagePart.inline_data?.mime_type ||
        "image/png";

      if (!imageData) {
        throw new ProviderError(
          "Image part found but no data available",
          this.providerName,
        );
      }

      logger.info("Image generation successful", {
        model: imageModelName,
        mimeType,
        dataLength: imageData.length,
        responseTime: Date.now() - startTime,
      });

      // Return result structure
      const result: EnhancedGenerateResult = {
        content: `Generated image using ${imageModelName} (${mimeType})`,
        imageOutput: {
          base64: imageData,
        },
        provider: this.providerName,
        model: imageModelName,
        usage: {
          input: this.estimateTokenCount(prompt),
          output: 0,
          total: this.estimateTokenCount(prompt),
        },
      };

      return await this.enhanceResult(result, options, startTime);
    } catch (error) {
      logger.error("Image generation failed", {
        error: error instanceof Error ? error.message : String(error),
        model: imageModelName,
        prompt: prompt.substring(0, 100),
      });

      throw this.handleProviderError(error);
    }
  }

  /**
   * Get model suggestions when a model is not found
   */
  private getModelSuggestions(requestedModel: string | undefined): string {
    const availableModels = {
      google: [
        "gemini-3-pro-preview-11-2025",
        "gemini-3-pro-latest",
        "gemini-3-pro-preview",
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash-001",
        "gemini-2.0-flash-lite",
        "gemini-1.5-pro",
        "gemini-1.5-flash",
      ],
      claude: [
        "claude-sonnet-4-5@20250929",
        "claude-sonnet-4@20250514",
        "claude-opus-4@20250514",
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307",
        "claude-3-opus-20240229",
      ],
    };

    let suggestions = "\n🤖 Google Models (always available):\n";
    availableModels.google.forEach((model) => {
      suggestions += `  • ${model}\n`;
    });

    suggestions += "\n🧠 Claude Models (requires Anthropic integration):\n";
    availableModels.claude.forEach((model) => {
      suggestions += `  • ${model}\n`;
    });

    // If the requested model looks like a Claude model, provide specific guidance
    if (requestedModel && requestedModel.toLowerCase().includes("claude")) {
      suggestions += `\n💡 Tip: "${requestedModel}" appears to be a Claude model.\n`;
      suggestions +=
        "Ensure Anthropic integration is enabled in your Google Cloud project.\n";
      suggestions += "Try using an available Claude model from the list above.";
    }

    return suggestions;
  }

  /**
   * Generate an embedding for `text` using Vertex via @google/genai.
   *
   * Replaces the previous `@ai-sdk/google-vertex` text embedding model
   * path. Without this, RAG indexing falls through to BaseProvider.embed()
   * which throws "Embedding generation is not supported by the vertex
   * provider", and `neurolink rag index --provider=vertex` fails even
   * though the SDK conceptually supports it.
   */
  async embed(text: string, modelName?: string): Promise<number[]> {
    const embeddingModelName =
      modelName || this.getDefaultEmbeddingModel() || "text-embedding-004";

    logger.debug("Generating embedding", {
      provider: this.providerName,
      model: embeddingModelName,
      textLength: text.length,
    });

    try {
      const effectiveLocation = resolveVertexRegionForModel(
        embeddingModelName,
        undefined,
      );
      const client = await this.createVertexGenAIClient(effectiveLocation);

      const result = await client.models.embedContent({
        model: embeddingModelName,
        contents: [text],
      });

      const embedding = result.embeddings?.[0]?.values;
      if (!embedding || embedding.length === 0) {
        throw new ProviderError(
          "No embedding returned from Vertex AI",
          this.providerName,
        );
      }

      logger.debug("Embedding generated successfully", {
        provider: this.providerName,
        model: embeddingModelName,
        embeddingDimension: embedding.length,
      });

      return embedding;
    } catch (error) {
      logger.error("Embedding generation failed", {
        error: error instanceof Error ? error.message : String(error),
        model: embeddingModelName,
        textLength: text.length,
      });

      throw this.handleProviderError(error);
    }
  }

  /**
   * Batch-embed an array of strings via Vertex @google/genai.
   * Mirrors {@link embed} but returns one vector per input string.
   */
  async embedMany(texts: string[], modelName?: string): Promise<number[][]> {
    const embeddingModelName =
      modelName || this.getDefaultEmbeddingModel() || "text-embedding-004";

    logger.debug("Generating batch embeddings", {
      provider: this.providerName,
      model: embeddingModelName,
      count: texts.length,
    });

    try {
      const effectiveLocation = resolveVertexRegionForModel(
        embeddingModelName,
        undefined,
      );
      const client = await this.createVertexGenAIClient(effectiveLocation);

      const result = await client.models.embedContent({
        model: embeddingModelName,
        contents: texts,
      });

      const embeddings = (result.embeddings || []).map(
        (e: { values?: number[] }) => e.values || [],
      );

      logger.debug("Batch embeddings generated successfully", {
        provider: this.providerName,
        model: embeddingModelName,
        count: embeddings.length,
        embeddingDimension: embeddings[0]?.length,
      });

      return embeddings;
    } catch (error) {
      logger.error("Batch embedding generation failed", {
        error: error instanceof Error ? error.message : String(error),
        model: embeddingModelName,
        count: texts.length,
      });

      throw this.handleProviderError(error);
    }
  }
}

export default GoogleVertexProvider;

// Re-export for compatibility
export { GoogleVertexProvider as GoogleVertexAI };
