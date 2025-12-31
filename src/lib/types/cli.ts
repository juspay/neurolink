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
  export interface SetupOptions {
    checkOnly?: boolean;
    interactive?: boolean;
  }

  export interface SetupArgv {
    check?: boolean;
    nonInteractive?: boolean;
  }

  export interface Config {
    apiKey?: string;
    organization?: string;
    model?: string;
    isReconfiguring?: boolean;
  }
}

/**
 * Anthropic setup configuration types
 */
export namespace AnthropicSetup {
  export interface SetupOptions {
    checkOnly?: boolean;
    interactive?: boolean;
  }

  export interface SetupArgv {
    check?: boolean;
    nonInteractive?: boolean;
  }

  export interface Config {
    apiKey?: string;
    model?: string;
    isReconfiguring?: boolean;
  }
}

/**
 * Google AI setup configuration types
 */
export namespace GoogleAISetup {
  export interface SetupOptions {
    checkOnly?: boolean;
    interactive?: boolean;
  }

  export interface SetupArgv {
    check?: boolean;
    nonInteractive?: boolean;
  }

  export interface Config {
    apiKey?: string;
    model?: string;
    isReconfiguring?: boolean;
  }
}

/**
 * Azure setup configuration types
 */
export namespace AzureSetup {
  export interface SetupOptions {
    checkOnly?: boolean;
    interactive?: boolean;
  }

  export interface SetupArgv {
    check?: boolean;
    nonInteractive?: boolean;
  }

  export interface Config {
    apiKey?: string;
    endpoint?: string;
    deploymentName?: string;
    apiVersion?: string;
    model?: string;
    isReconfiguring?: boolean;
  }
}

/**
 * AWS Bedrock setup configuration types
 */
export namespace BedrockSetup {
  export interface SetupOptions {
    checkOnly?: boolean;
    interactive?: boolean;
  }

  export interface SetupArgv {
    check?: boolean;
    nonInteractive?: boolean;
  }

  export interface ConfigData {
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    model?: string;
  }

  export interface ConfigStatus {
    hasCredentials: boolean;
    hasRegion: boolean;
    hasModel: boolean;
    isReconfiguring?: boolean;
  }
}

/**
 * GCP/Vertex AI setup configuration types
 */
export namespace GCPSetup {
  export interface SetupOptions {
    checkOnly?: boolean;
    interactive?: boolean;
  }

  export interface SetupArgv {
    check?: boolean;
    nonInteractive?: boolean;
  }

  export interface AuthMethodStatus {
    hasServiceAccount: boolean;
    hasGcloudAuth: boolean;
    hasApplicationDefault: boolean;
    preferredMethod?: "service-account" | "gcloud" | "adc";
  }
}

/**
 * Hugging Face setup configuration types
 */
export namespace HuggingFaceSetup {
  export interface SetupArgs {
    check?: boolean;
    nonInteractive?: boolean;
    help?: boolean;
  }
}

/**
 * Mistral setup configuration types
 */
export namespace MistralSetup {
  export interface SetupArgs {
    check?: boolean;
    nonInteractive?: boolean;
    help?: boolean;
  }
}
