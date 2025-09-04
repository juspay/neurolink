/**
 * CLI-specific type definitions for NeuroLink
 */

import type { UnknownRecord, JsonValue } from "./common.js";
import type { AnalyticsData, TokenUsage } from "./analytics.js";
import type { EvaluationData } from "../index.js";
import type { ToolCall, ToolResult } from "./tools.js";

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
