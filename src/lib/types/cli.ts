/**
 * CLI-specific type definitions for NeuroLink
 */

import type { UnknownRecord, JsonValue } from "./common.js";
import type { AnalyticsData, TokenUsage } from "./analytics.js";
import type { EvaluationData } from "../index.js";
import type { ToolCall, ToolResult } from "./tools.js";

/**
 * Ollama command utilities type
 */
export type AllowedCommand =
  | "ollama"
  | "curl"
  | "systemctl"
  | "pkill"
  | "killall"
  | "open"
  | "taskkill"
  | "start";

/**
 * Defines the schema for a session variable or a generation option.
 */
export type OptionSchema = {
  type: "string" | "boolean" | "number";
  description: string;
  allowedValues?: string[];
};

/**
 * Base command arguments type
 */
export type BaseCommandArgs = {
  /** Enable debug output */
  debug?: boolean;
  /** Output format */
  format?: "text" | "json" | "table" | "yaml";
  /** Verbose output */
  verbose?: boolean;
  /** Quiet mode */
  quiet?: boolean;
  /** Index signature to allow additional properties */
  [key: string]: unknown;
};

/**
 * Generate command arguments
 */
export type GenerateCommandArgs = BaseCommandArgs & {
  /** Input text or prompt */
  input?: string;
  /** AI provider to use */
  provider?: string;
  /** Model name */
  model?: string;
  /** System prompt */
  system?: string;
  /** Temperature setting */
  temperature?: number;
  /** Maximum tokens */
  maxTokens?: number;
  /** Enable analytics */
  analytics?: boolean;
  /** Enable evaluation */
  evaluation?: boolean;
  /** Context data */
  context?: string;
  /** Disable tools */
  disableTools?: boolean;
  /** Maximum steps for multi-turn */
  maxSteps?: number;
  /** Output file */
  output?: string;
  /** Enable extended thinking/reasoning */
  thinking?: boolean;
  /** Token budget for thinking */
  thinkingBudget?: number;
  /** Thinking level for extended reasoning */
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
  /** Vertex AI region */
  region?: string;
  // Video generation options (Veo 3.1)
  /** Output mode - 'text' for standard generation, 'video' for video generation, 'ppt' for presentation */
  outputMode?: "text" | "video" | "ppt";
  /** Path to save generated video file */
  videoOutput?: string;
  /** Video output resolution (720p or 1080p) */
  videoResolution?: "720p" | "1080p";
  /** Video duration in seconds (4, 6, or 8) */
  videoLength?: 4 | 6 | 8;
  /** Video aspect ratio (9:16 for portrait, 16:9 for landscape) */
  videoAspectRatio?: "9:16" | "16:9";
  /** Enable/disable audio generation in video */
  videoAudio?: boolean;
  // PPT generation options
  /** Number of slides to generate (5-50) */
  pptPages?: number;
  /** Presentation theme/style */
  pptTheme?: "modern" | "corporate" | "creative" | "minimal" | "dark";
  /** Target audience */
  pptAudience?: "business" | "students" | "technical" | "general";
  /** Presentation tone/style */
  pptTone?: "professional" | "casual" | "educational" | "persuasive";
  /** Path to save generated PPTX file */
  pptOutput?: string;
  /** PPT aspect ratio */
  pptAspectRatio?: "16:9" | "4:3";
  /** Disable AI image generation for PPT slides */
  pptNoImages?: boolean;
  /** Custom path for generated image output */
  imageOutput?: string;
};

/**
 * Stream command arguments
 */
export type StreamCommandArgs = BaseCommandArgs & {
  /** Input text or prompt */
  input?: string;
  /** AI provider to use */
  provider?: string;
  /** Model name */
  model?: string;
  /** System prompt */
  system?: string;
  /** Temperature setting */
  temperature?: number;
  /** Maximum tokens */
  maxTokens?: number;
  /** Disable tools */
  disableTools?: boolean;
  /** Enable extended thinking/reasoning */
  thinking?: boolean;
  /** Token budget for thinking */
  thinkingBudget?: number;
  /** Thinking level for extended reasoning */
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
  /** Vertex AI region */
  region?: string;
};

/**
 * Batch command arguments
 */
export type BatchCommandArgs = BaseCommandArgs & {
  /** Input file path */
  file?: string;
  /** AI provider to use */
  provider?: string;
  /** Model name */
  model?: string;
  /** System prompt */
  system?: string;
  /** Temperature setting */
  temperature?: number;
  /** Maximum tokens */
  maxTokens?: number;
  /** Delay between requests (ms) */
  delay?: number;
  /** Output file */
  output?: string;
  /** Disable tools */
  disableTools?: boolean;
};

/**
 * MCP command arguments - Enhanced with transport and server management
 */
export type MCPCommandArgs = BaseCommandArgs & {
  /** MCP server name */
  server?: string;
  /** MCP server name (alias for server) */
  serverName?: string;
  /** Tool name to execute */
  tool?: string;
  /** Tool parameters as JSON string */
  params?: string;
  /** List available tools */
  list?: boolean;
  /** List only specific category */
  listOnly?: boolean;
  /** Discover MCP servers */
  discover?: boolean;
  /** Show server information */
  info?: boolean;
  /** Transport type for server connection */
  transport?: "stdio" | "websocket" | "tcp" | "unix";
  /** Server description */
  description?: string;
  /** Command/executable for stdio transport */
  command?: string;
  /** Arguments for server command */
  args?: string[];
  /** Environment variables for server (JSON string) */
  env?: string;
  /** Server URL for network transports */
  url?: string;
  /** Server name for add command */
  name?: string;
  /** Show detailed information */
  detailed?: boolean;
  /** Force operation without confirmation */
  force?: boolean;
  /** Auto install discovered servers */
  autoInstall?: boolean;
  /** Discovery source */
  source?: string;
  /** Connection timeout */
  timeout?: number;
};

/**
 * Models command arguments - Enhanced for model management
 */
export type ModelsCommandArgs = Omit<BaseCommandArgs, "format"> & {
  // List command options
  /** AI provider to query (single or array) */
  provider?: string | string[];
  /** Model category filter */
  category?: string;
  /** Model capability filter (array) */
  capability?: string[];
  /** Include deprecated models */
  deprecated?: boolean;

  // Search command options
  /** Search query (capability, use case, or model name) */
  query?: string;
  /** Model use case filter */
  useCase?: string;
  /** Maximum cost per 1K tokens (USD) */
  maxCost?: number;
  /** Minimum context window size (tokens) */
  minContext?: number;
  /** Maximum context window size (tokens) */
  maxContext?: number;
  /** Required performance level */
  performance?: "fast" | "medium" | "slow" | "high" | "low";

  // Best command options
  /** Optimize for code generation and programming */
  coding?: boolean;
  /** Optimize for creative writing and content */
  creative?: boolean;
  /** Optimize for data analysis and research */
  analysis?: boolean;
  /** Optimize for conversational interactions */
  conversation?: boolean;
  /** Optimize for logical reasoning tasks */
  reasoning?: boolean;
  /** Optimize for language translation */
  translation?: boolean;
  /** Optimize for text summarization */
  summarization?: boolean;
  /** Prioritize cost-effectiveness */
  costEffective?: boolean;
  /** Prioritize output quality over cost */
  highQuality?: boolean;
  /** Prioritize response speed */
  fast?: boolean;
  /** Require vision/image processing capability */
  requireVision?: boolean;
  /** Require function calling capability */
  requireFunctionCalling?: boolean;
  /** Exclude specific providers */
  excludeProviders?: string[];
  /** Prefer local/offline models */
  preferLocal?: boolean;

  // Resolve command options
  /** Model name, alias, or partial match to resolve */
  model?: string;
  /** Enable fuzzy matching for partial names */
  fuzzy?: boolean;

  // Compare command options
  /** Model IDs or aliases to compare */
  models?: string[];

  // Stats command options
  /** Show detailed statistics breakdown */
  detailed?: boolean;

  // Output formatting (overrides BaseCommandArgs format)
  /** Output format for models command */
  format?: "table" | "json" | "compact";

  // Legacy options (for backward compatibility)
  /** List all available models */
  list?: boolean;
  /** Show model statistics */
  stats?: boolean;
  /** Show model pricing */
  pricing?: boolean;
  /** Resolve best model for criteria */
  resolve?: boolean;
  /** Maximum tokens filter */
  maxTokens?: number;
};

/**
 * Ollama command arguments
 */
export type OllamaCommandArgs = BaseCommandArgs & {
  /** Ollama model name */
  model?: string;
  /** List available models */
  list?: boolean;
  /** Pull a model */
  pull?: boolean;
  /** Remove a model */
  remove?: boolean;
  /** Show model information */
  show?: boolean;
};

/**
 * SageMaker command arguments
 */
export type SageMakerCommandArgs = BaseCommandArgs & {
  /** SageMaker endpoint name */
  endpoint?: string;
  /** Model name for the endpoint */
  model?: string;
  /** Test prompt for endpoint testing */
  prompt?: string;
  /** List endpoints */
  list?: boolean;
  /** Show configuration */
  config?: boolean;
  /** Setup configuration */
  setup?: boolean;
  /** Clear configuration cache */
  clearCache?: boolean;
  /** Run benchmark test */
  benchmark?: boolean;
  /** Duration for benchmark test (in seconds) */
  duration?: number;
  /** Concurrency level for benchmark */
  concurrency?: number;
  /** Number of requests for benchmark */
  requests?: number;
  /** Maximum tokens per request */
  maxTokens?: number;
  /** Validate endpoint configuration */
  validate?: boolean;
  /** AWS region override */
  region?: string;
  /** Force operation without confirmation */
  force?: boolean;
};

/**
 * Secure configuration container that avoids process.env exposure
 */
export type SecureConfiguration = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  endpointName: string;
  timeout: number;
  maxRetries: number;
  sessionId: string;
  createdAt: number;
};

/**
 * Provider status command arguments
 */
export type ProviderStatusArgs = BaseCommandArgs & {
  /** Specific provider to check */
  provider?: string;
  /** Check all providers */
  all?: boolean;
};

/**
 * CLI command result
 */
export type CommandResult = {
  /** Command success status */
  success: boolean;
  /** Result data */
  data?: unknown;
  /** Error message if failed */
  error?: string;
  /** Output content */
  content?: string;
  /** Execution metadata */
  metadata?: {
    executionTime?: number;
    timestamp?: number;
    command?: string;
  };
};

/**
 * Generate command result
 */
export type GenerateResult = CommandResult & {
  content: string;
  provider?: string;
  model?: string;
  usage?: TokenUsage;
  responseTime?: number;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  analytics?: AnalyticsData;
  evaluation?: EvaluationData;
  toolsUsed?: string[];
  toolExecutions?: Array<{
    toolName: string;
    args: UnknownRecord;
    result: unknown;
    executionTime: number;
  }>;
  enhancedWithTools?: boolean;
  availableTools?: Array<{
    name: string;
    description: string;
  }>;
  /** TTS audio result when TTS is enabled */
  audio?: import("./index.js").TTSResult;
  /** Video generation result when video mode is enabled */
  video?: import("./multimodal.js").VideoGenerationResult;
  /** PPT generation result when ppt mode is enabled */
  ppt?: import("./pptTypes.js").PPTGenerationResult;
  imageOutput?: {
    base64: string;
    savedPath?: string; // Local file path where image was saved
  } | null; // Image generation output
};

/**
 * Stream result chunk
 */
export type StreamChunk = {
  content?: string;
  delta?: string;
  done?: boolean;
  metadata?: UnknownRecord;
};

/**
 * CLI output formatting options
 */
export type OutputOptions = {
  format: "text" | "json" | "table" | "yaml";
  pretty?: boolean;
  color?: boolean;
  compact?: boolean;
};

/**
 * Command handler function type
 */
export type CommandHandler<TArgs = BaseCommandArgs, TResult = CommandResult> = (
  args: TArgs,
) => Promise<TResult>;

/**
 * Command definition
 */
export type CommandDefinition<TArgs = BaseCommandArgs> = {
  name: string;
  description: string;
  aliases?: string[];
  args?: {
    [K in keyof TArgs]: {
      type: "string" | "number" | "boolean";
      description: string;
      required?: boolean;
      default?: TArgs[K];
    };
  };
  handler: CommandHandler<TArgs>;
};

/**
 * CLI context
 */
export type CLIContext = {
  cwd: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  exitCode?: number;
};

/**
 * Color mapping for CLI output
 */
export type ColorMap = {
  [severity: string]: {
    color: string;
    symbol?: string;
  };
};

/**
 * Display severity colors (for evaluation display)
 */
export type SeverityColors = {
  [key: string]: {
    color: string;
    symbol: string;
  };
};

/**
 * JSON output structure
 */
export type JSONOutput = {
  success: boolean;
  data?: JsonValue;
  error?: string;
  metadata?: {
    timestamp: number;
    command: string;
    version?: string;
  };
};

/**
 * Console override for quiet mode
 */
export type ConsoleOverride = {
  [method: string]: (() => void) | undefined;
};

/**
 * Conversation choice for inquirer prompt
 */
export type ConversationChoice = {
  name: string;
  value: string | "NEW_CONVERSATION";
  short: string;
};

/**
 * Session restore result
 */
export type SessionRestoreResult = {
  success: boolean;
  sessionId: string;
  messageCount: number;
  error?: string;
  lastActivity?: string;
};

/**
 * Tool context for restored sessions
 */
export type RestorationToolContext = Record<string, unknown> & {
  sessionId: string;
  userId: string;
  source: string;
  restored: boolean;
  timestamp: string;
};

/**
 * Type guard for generate result
 */
export function isGenerateResult(value: unknown): value is GenerateResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "content" in value &&
    typeof (value as GenerateResult).content === "string"
  );
}

/**
 * Type guard for command result
 */
export function isCommandResult(value: unknown): value is CommandResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof (value as CommandResult).success === "boolean"
  );
}

// ============================================================================
// CLI Setup and Utility Types (moved from CLI modules)
// ============================================================================

/**
 * Environment file backup result
 */
export type EnvBackupResult = {
  backupPath?: string;
  existed: boolean;
};

/**
 * Environment file update result
 */
export type EnvUpdateResult = {
  backup: EnvBackupResult;
  updated: string[];
  added: string[];
  unchanged: string[];
  deleted: string[];
};

/**
 * Provider configuration for interactive setup
 */
export type CLIProviderConfig = {
  id: string;
  name: string;
  description: string;
  envVars: Array<{
    key: string;
    prompt: string;
    secure?: boolean;
    default?: string;
    optional?: boolean;
  }>;
};

/**
 * Interactive setup result
 */
export type CLISetupResult = {
  selectedProviders: string[];
  credentials: Record<string, string>;
  envFileBackup?: string;
  testResults: Array<{
    provider: string;
    status: "working" | "failed";
    error?: string;
    responseTime?: number;
  }>;
};

/**
 * Main setup command arguments
 */
export type SetupArgs = {
  provider?: string;
  list?: boolean;
  status?: boolean;
  interactive?: boolean;
  help?: boolean;
};

/**
 * Provider information for setup display
 */
export type ProviderInfo = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  setupTime: string;
  cost: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  features?: string[];
  bestFor?: string;
  models?: string;
  strengths?: string;
  pricing?: string;
  setupCommand?: string;
  handler?: (argv: {
    check?: boolean;
    nonInteractive?: boolean;
  }) => Promise<void>;
};

/**
 * Setup command factory arguments
 */
export type SetupCommandArgs = BaseCommandArgs & {
  provider?: string;
  check?: boolean;
  list?: boolean;
  status?: boolean;
  interactive?: boolean;
  nonInteractive?: boolean;
};

/**
 * MCP server configuration for CLI
 */
export type CLIMCPServerConfig = {
  name: string;
  transport: "stdio" | "websocket" | "tcp" | "unix";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  description?: string;
};

// ============================================================================
// Provider-Specific Setup Types
// ============================================================================

/**
 * OpenAI setup configuration types
 */
export namespace OpenAISetup {
  export type SetupOptions = {
    checkOnly?: boolean;
    interactive?: boolean;
  };

  export type SetupArgv = {
    check?: boolean;
    nonInteractive?: boolean;
  };

  export type Config = {
    apiKey?: string;
    organization?: string;
    model?: string;
    isReconfiguring?: boolean;
  };
}

/**
 * Anthropic setup configuration types
 */
export namespace AnthropicSetup {
  export type SetupOptions = {
    checkOnly?: boolean;
    interactive?: boolean;
  };

  export type SetupArgv = {
    check?: boolean;
    nonInteractive?: boolean;
  };

  export type Config = {
    apiKey?: string;
    model?: string;
    isReconfiguring?: boolean;
  };
}

/**
 * Google AI setup configuration types
 */
export namespace GoogleAISetup {
  export type SetupOptions = {
    checkOnly?: boolean;
    interactive?: boolean;
  };

  export type SetupArgv = {
    check?: boolean;
    nonInteractive?: boolean;
  };

  export type Config = {
    apiKey?: string;
    model?: string;
    isReconfiguring?: boolean;
  };
}

/**
 * Azure setup configuration types
 */
export namespace AzureSetup {
  export type SetupOptions = {
    checkOnly?: boolean;
    interactive?: boolean;
  };

  export type SetupArgv = {
    check?: boolean;
    nonInteractive?: boolean;
  };

  export type Config = {
    apiKey?: string;
    endpoint?: string;
    deploymentName?: string;
    apiVersion?: string;
    model?: string;
    isReconfiguring?: boolean;
  };
}

/**
 * AWS Bedrock setup configuration types
 */
export namespace BedrockSetup {
  export type SetupOptions = {
    checkOnly?: boolean;
    interactive?: boolean;
  };

  export type SetupArgv = {
    check?: boolean;
    nonInteractive?: boolean;
  };

  export type ConfigData = {
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    model?: string;
  };

  export type ConfigStatus = {
    hasCredentials: boolean;
    hasRegion: boolean;
    hasModel: boolean;
    isReconfiguring?: boolean;
  };
}

/**
 * GCP/Vertex AI setup configuration types
 */
export namespace GCPSetup {
  export type SetupOptions = {
    checkOnly?: boolean;
    interactive?: boolean;
  };

  export type SetupArgv = {
    check?: boolean;
    nonInteractive?: boolean;
  };

  export type AuthMethodStatus = {
    hasServiceAccount: boolean;
    hasGcloudAuth: boolean;
    hasApplicationDefault: boolean;
    preferredMethod?: "service-account" | "gcloud" | "adc";
  };
}

/**
 * Hugging Face setup configuration types
 */
export namespace HuggingFaceSetup {
  export type SetupArgs = {
    check?: boolean;
    nonInteractive?: boolean;
    help?: boolean;
  };
}

/**
 * Mistral setup configuration types
 */
export namespace MistralSetup {
  export type SetupArgs = {
    check?: boolean;
    nonInteractive?: boolean;
    help?: boolean;
  };
}

// ============================================================================
// PROXY CLI TYPES (moved from src/cli/commands/proxy.ts)
// ============================================================================

/** Arguments accepted by `neurolink proxy start` */
export type ProxyStartArgs = {
  port?: number;
  host?: string;
  strategy?: string;
  healthInterval?: number;
  quiet?: boolean;
  debug?: boolean;
  config?: string;
};

/** Arguments accepted by `neurolink proxy status` */
export type ProxyStatusArgs = {
  format?: "text" | "json";
  quiet?: boolean;
};

/** Arguments accepted by hidden `neurolink proxy guard` command */
export type ProxyGuardArgs = {
  host?: string;
  port?: number;
  parentPid?: number;
  maxWaitMs?: number;
  failureThreshold?: number;
  pollIntervalMs?: number;
  quiet?: boolean;
};

/** A fallback chain entry (serialisable subset of FallbackEntry) */
export type FallbackInfo = { provider: string; model: string };

/** Persisted state for a running proxy instance */
export type ProxyState = {
  pid: number;
  port: number;
  host: string;
  strategy: string;
  startTime: string;
  /** Fallback chain from proxy config (persisted at start time) */
  fallbackChain?: FallbackInfo[];
  /** Optional fail-open guard PID that reverts Claude settings if proxy dies */
  guardPid?: number;
  /** How the proxy was launched — "launchd" if installed as service, "manual" otherwise */
  managedBy?: "launchd" | "manual";
};

// ============================================================================
// AUTH CLI TYPES (moved from src/cli/commands/auth.ts)
// ============================================================================

/** Stored credentials for an authenticated provider. */
export type StoredCredentials = {
  type: "api-key" | "oauth";
  apiKey?: string;
  oauth?: import("./subscriptionTypes.js").OAuthTokens;
  provider: string;
  subscriptionTier?: import("./subscriptionTypes.js").ClaudeSubscriptionTier;
  email?: string;
  createdAt: number;
  updatedAt: number;
};

/** Result of checking authentication status for a provider. */
export type AuthStatusResult = {
  provider: string;
  isAuthenticated: boolean;
  method: "api-key" | "oauth" | "none";
  subscriptionTier?: string;
  tokenExpiry?: string;
  hasRefreshToken?: boolean;
  needsRefresh?: boolean;
};

// ============================================================================
// AUTH COMMAND FACTORY TYPES (moved from src/cli/factories/authCommandFactory.ts)
// ============================================================================

/** Auth command arguments interface */
export type AuthCommandArgs = BaseCommandArgs & {
  provider?: string;
  method?: "api-key" | "oauth" | "create-api-key";
  format?: "text" | "json";
  quiet?: boolean;
  debug?: boolean;
  nonInteractive?: boolean;
  add?: boolean;
  label?: string;
  account?: string;
  force?: boolean;
  /** Yargs positional arguments */
  _?: (string | number)[];
};

// ============================================================================
// TELEMETRY CLI TYPES (moved from src/cli/commands/telemetry.ts)
// ============================================================================

/** Telemetry command arguments */
export type TelemetryCommandArgs = {
  format?: "text" | "json" | "table";
  quiet?: boolean;
};

/** Telemetry status sub-command args */
export type TelemetryStatusArgs = TelemetryCommandArgs;

/** Telemetry configure sub-command args */
export type TelemetryConfigureArgs = TelemetryCommandArgs & {
  exporter: string;
  config: string;
};

/** Telemetry list-exporters sub-command args */
export type TelemetryListExportersArgs = TelemetryCommandArgs;

/** Telemetry flush sub-command args */
export type TelemetryFlushArgs = TelemetryCommandArgs & {
  timeout?: number;
};

/** Telemetry stats sub-command args */
export type TelemetryStatsArgs = TelemetryCommandArgs & {
  detailed?: boolean;
  byModel?: boolean;
  byProvider?: boolean;
};

/** Available exporter names */
export type ExporterName =
  | "langfuse"
  | "langsmith"
  | "otel"
  | "datadog"
  | "sentry"
  | "braintrust"
  | "arize"
  | "posthog"
  | "laminar";

// ============================================================================
// OBSERVABILITY CLI TYPES (moved from src/cli/commands/observability.ts)
// Prefixed with "Observability" to avoid collision with telemetry types.
// ============================================================================

/** Observability command arguments */
export type ObservabilityCommandArgs = {
  format?: "text" | "json" | "table";
  quiet?: boolean;
};

/** Observability status sub-command args */
export type ObservabilityStatusArgs = ObservabilityCommandArgs;

/** Observability metrics sub-command args */
export type ObservabilityMetricsArgs = ObservabilityCommandArgs & {
  detailed?: boolean;
};

/** Observability exporters sub-command args */
export type ObservabilityExportersArgs = ObservabilityCommandArgs;

/** Observability costs sub-command args */
export type ObservabilityCostsArgs = ObservabilityCommandArgs & {
  byModel?: boolean;
  byProvider?: boolean;
};

// ============================================================================
// DOCS CLI TYPES (moved from src/cli/commands/docs.ts)
// ============================================================================

/** Docs command arguments */
export type DocsCommandArgs = {
  transport?: "stdio" | "http";
  port?: number;
};

// ============================================================================
// RAG CLI TYPES (moved from src/cli/commands/rag.ts)
// ============================================================================

// Note: ChunkArgs, IndexArgs, QueryArgs are defined as RAGCommandArgs in rag/types.ts
// These are the CLI-layer argument shapes.

// ============================================================================
// SERVER CLI TYPES (moved from src/cli/commands/server.ts)
// ============================================================================

/** Server command arguments */
export type ServerCommandArgs = {
  port?: number;
  host?: string;
  framework?: "hono" | "express" | "fastify" | "koa";
  basePath?: string;
  cors?: boolean;
  rateLimit?: boolean;
  quiet?: boolean;
  format?: "text" | "json" | "yaml";
  output?: string;
  debug?: boolean;
};

/** Server status stored in state file */
export type ServerState = {
  pid: number;
  port: number;
  host: string;
  framework: import("../server/types.js").ServerFramework;
  startTime: string;
  basePath: string;
};

/** Server configuration stored in config file */
export type ServerConfig = {
  defaultPort: number;
  defaultHost: string;
  defaultFramework: "hono" | "express" | "fastify" | "koa";
  defaultBasePath: string;
  cors: {
    enabled: boolean;
    origins?: string[];
  };
  rateLimit: {
    enabled: boolean;
    windowMs?: number;
    maxRequests?: number;
  };
  swagger: {
    enabled: boolean;
    path?: string;
  };
};

// ============================================================================
// SERVE CLI TYPES (moved from src/cli/commands/serve.ts)
// ============================================================================

/** Serve command arguments */
export type ServeCommandArgs = {
  port?: number;
  host?: string;
  framework?: import("../server/types.js").ServerFramework;
  basePath?: string;
  cors?: boolean;
  rateLimit?: number;
  swagger?: boolean;
  config?: string;
  watch?: boolean;
  quiet?: boolean;
  debug?: boolean;
  format?: "text" | "json";
};

/** Server configuration file format */
export type ServerConfigFile = {
  port?: number;
  host?: string;
  framework?: import("../server/types.js").ServerFramework;
  basePath?: string;
  cors?: {
    enabled?: boolean;
    origins?: string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
    maxAge?: number;
  };
  rateLimit?: {
    enabled?: boolean;
    windowMs?: number;
    maxRequests?: number;
    message?: string;
    skipPaths?: string[];
  };
  bodyParser?: {
    enabled?: boolean;
    maxSize?: string;
    jsonLimit?: string;
    urlEncoded?: boolean;
  };
  logging?: {
    enabled?: boolean;
    level?: "debug" | "info" | "warn" | "error";
    includeBody?: boolean;
    includeResponse?: boolean;
  };
  timeout?: number;
  enableMetrics?: boolean;
  enableSwagger?: boolean;
};

// ============================================================================
// CONVERSATION SELECTOR TYPES (moved from src/cli/loop/conversationSelector.ts)
// ============================================================================

/** Menu choice type for conversation selector (includes separators). */
export type MenuChoice =
  | ConversationChoice
  | { type: "separator"; line?: string };

// ============================================================================
// SAGEMAKER CLI TYPES (moved from src/cli/factories/sagemakerCommandFactory.ts)
// ============================================================================

/**
 * Type for language models that expose the low-level doGenerate method.
 * Used by SageMaker CLI commands for direct endpoint testing and benchmarking.
 */
export type DoGenerateModel = {
  doGenerate(options: Record<string, unknown>): Promise<{
    text?: string;
    finishReason?: string;
    usage: {
      /** Token count for the prompt (Vercel AI SDK convention) */
      promptTokens?: number;
      /** Token count for the completion (Vercel AI SDK convention) */
      completionTokens?: number;
      /** Token count for the input (SageMaker/provider convention) */
      inputTokens?: number;
      /** Token count for the output (SageMaker/provider convention) */
      outputTokens?: number;
      totalTokens?: number;
    };
  }>;
};

/** Redis client type (awaited return of createRedisClient). */
export type RedisClient = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: unknown) => Promise<unknown>;
  del: (key: string) => Promise<number>;
  keys: (pattern: string) => Promise<string[]>;
  quit: () => Promise<void>;
  [key: string]: unknown;
};
