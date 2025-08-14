/**
 * CLI-specific type definitions for NeuroLink
 */

import type { UnknownRecord, JsonValue } from "./common.js";
import type { AnalyticsData, EvaluationData, TokenUsage } from "./providers.js";
import type { ToolCall, ToolResult } from "./tools.js";

/**
 * Base command arguments interface
 */
export interface BaseCommandArgs {
  /** Enable debug output */
  debug?: boolean;
  /** Output format */
  format?: "text" | "json" | "table" | "yaml";
  /** Verbose output */
  verbose?: boolean;
  /** Quiet mode */
  quiet?: boolean;
}

/**
 * Generate command arguments
 */
export interface GenerateCommandArgs extends BaseCommandArgs {
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
}

/**
 * Stream command arguments
 */
export interface StreamCommandArgs extends BaseCommandArgs {
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
}

/**
 * MCP command arguments - Enhanced with transport and server management
 */
export interface MCPCommandArgs extends BaseCommandArgs {
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
}

/**
 * Models command arguments - Enhanced for model management
 */
export interface ModelsCommandArgs extends BaseCommandArgs {
  /** AI provider to query */
  provider?: string;
  /** Model capability filter */
  query?: string;
  /** Model use case filter */
  useCase?: string;
  /** Require vision capability */
  requireVision?: boolean;
  /** Require function calling capability */
  requireFunctionCalling?: boolean;
  /** List all available models */
  list?: boolean;
  /** Show model statistics */
  stats?: boolean;
  /** Show model pricing */
  pricing?: boolean;
  /** Resolve best model for criteria */
  resolve?: boolean;
  /** Maximum cost filter */
  maxCost?: number;
  /** Maximum tokens filter */
  maxTokens?: number;
}

/**
 * Ollama command arguments
 */
export interface OllamaCommandArgs extends BaseCommandArgs {
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
}

/**
 * SageMaker command arguments
 */
export interface SageMakerCommandArgs extends BaseCommandArgs {
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
}

/**
 * Provider status command arguments
 */
export interface ProviderStatusArgs extends BaseCommandArgs {
  /** Specific provider to check */
  provider?: string;
  /** Check all providers */
  all?: boolean;
}

/**
 * CLI command result
 */
export interface CommandResult {
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
}

/**
 * Generate command result
 */
export interface GenerateResult extends CommandResult {
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
}

/**
 * Stream result chunk
 */
export interface StreamChunk {
  content?: string;
  delta?: string;
  done?: boolean;
  metadata?: UnknownRecord;
}

/**
 * CLI output formatting options
 */
export interface OutputOptions {
  format: "text" | "json" | "table";
  pretty?: boolean;
  color?: boolean;
  compact?: boolean;
}

/**
 * Command handler function type
 */
export type CommandHandler<TArgs = BaseCommandArgs, TResult = CommandResult> = (
  args: TArgs,
) => Promise<TResult>;

/**
 * Command definition
 */
export interface CommandDefinition<TArgs = BaseCommandArgs> {
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
}

/**
 * CLI context
 */
export interface CLIContext {
  cwd: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  exitCode?: number;
}

/**
 * Color mapping for CLI output
 */
export interface ColorMap {
  [severity: string]: {
    color: string;
    symbol?: string;
  };
}

/**
 * Display severity colors (for evaluation display)
 */
export interface SeverityColors {
  [key: string]: {
    color: string;
    symbol: string;
  };
}

/**
 * JSON output structure
 */
export interface JSONOutput {
  success: boolean;
  data?: JsonValue;
  error?: string;
  metadata?: {
    timestamp: number;
    command: string;
    version?: string;
  };
}

/**
 * Console override for quiet mode
 */
export interface ConsoleOverride {
  [method: string]: (() => void) | undefined;
}

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
