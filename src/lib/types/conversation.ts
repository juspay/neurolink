/**
 * Conversation Memory Types for NeuroLink
 * Provides type-safe conversation storage and context management
 *
 * ## Timestamp Conventions
 *
 * NeuroLink uses two timestamp formats throughout the conversation system:
 *
 * ### Unix Milliseconds (number)
 * Used for internal storage, event timestamps, and performance-critical operations.
 * - `SessionMemory.createdAt` - Session creation time as Unix epoch milliseconds
 * - `SessionMemory.lastActivity` - Last activity time as Unix epoch milliseconds
 * - `SessionMemory.lastCountedAt` - Token count timestamp as Unix epoch milliseconds
 * - `ConversationMemoryEvents.*.timestamp` - Event timestamps as Unix epoch milliseconds
 * - `ChatMessage.metadata.timestamp` - Optional numeric timestamp for internal tracking
 *
 * Example: `1735689600000` represents January 1, 2025, 00:00:00 UTC
 *
 * ### ISO 8601 String (string)
 * Used for human-readable fields and API responses.
 * - `ChatMessage.timestamp` - Message timestamp as ISO 8601 string
 * - `ConversationBase.createdAt` - Conversation creation as ISO 8601 string
 * - `ConversationBase.updatedAt` - Last update as ISO 8601 string
 * - `ConversationSummary.firstMessage.timestamp` - Message preview timestamp
 * - `ConversationSummary.lastMessage.timestamp` - Message preview timestamp
 *
 * Example: `"2025-01-01T00:00:00.000Z"`
 *
 * ### Conversion Guidelines
 * - Unix ms to ISO: `new Date(unixMs).toISOString()`
 * - ISO to Unix ms: `new Date(isoString).getTime()`
 * - Current time (Unix ms): `Date.now()`
 * - Current time (ISO): `new Date().toISOString()`
 */

import type { HippocampusMemory, HippocampusStorageConfig } from "./memory.js";
import type { ObservabilityConfig } from "./observability.js";

// Message and content primitives. Today these resolve through the upstream
// generation library; the layout is stable enough for consumers to import
// from the package barrel without caring about the source module.
export type {
  ModelMessage,
  SystemModelMessage,
  UserModelMessage,
  AssistantModelMessage,
  ToolModelMessage,
  TextPart,
  ImagePart,
  FilePart,
  ToolCallPart,
  ToolResultPart,
  AssistantContent,
  UserContent,
  ToolContent,
  DataContent,
} from "ai";

/**
 * Legacy public alias for the Hippocampus storage configuration.
 * The structural definition lives in `./memory.ts`; this re-export keeps
 * the SDK surface stable for callers who imported `StorageConfig` from
 * the package barrel. Defined as a `type` alias rather than a re-export
 * so the canonical `HippocampusStorageConfig` name is the one ESLint
 * uniqueness checks see.
 */
export type StorageConfig = HippocampusStorageConfig;

/**
 * Configuration for conversation memory feature
 */
export type ConversationMemoryConfig = {
  /** Enable conversation memory feature */
  enabled: boolean;

  /** Maximum number of sessions to keep in memory (default: 50) */
  maxSessions?: number;

  /** Enable automatic summarization */
  enableSummarization?: boolean;

  /** Token threshold to trigger summarization (optional - defaults to 80% of model context) */
  tokenThreshold?: number;

  /** Provider to use for summarization */
  summarizationProvider?: string;

  /** Model to use for summarization */
  summarizationModel?: string;

  /** Memory SDK config (condensed key-value memory per user). Set enabled: true to activate. */
  memory?: HippocampusMemory;

  /** Redis configuration (optional) - overrides environment variables */
  redisConfig?: RedisStorageConfig;

  /** Context compaction configuration */
  contextCompaction?: {
    /** Enable auto-compaction (default: true when summarization enabled) */
    enabled?: boolean;
    /** Compaction trigger threshold (0.0-1.0, default: 0.80) */
    threshold?: number;
    /** Enable tool output pruning (default: true) */
    enablePruning?: boolean;
    /** Enable file read deduplication (default: true) */
    enableDeduplication?: boolean;
    /** Enable sliding window fallback (default: true) */
    enableSlidingWindow?: boolean;
    /** Tool output max size in bytes (default: 50KB) */
    maxToolOutputBytes?: number;
    /** Tool output max lines (default: 2000) */
    maxToolOutputLines?: number;

    /**
     * When true, buildContextMessages() returns the head/tail preview instead of
     * the full tool output for tool_result messages. Default: false (full output sent to LLM).
     * When false (default), the AI receives the complete tool output in content.
     * When true, the AI receives the truncated preview and can use the retrieve_context
     * tool to access full output if needed.
     */
    sendToolPreview?: boolean;

    /** File read budget as fraction of remaining context (default: 0.60) */
    fileReadBudgetPercent?: number;
  };

  /** Configuration for automatic file content summarization when files exceed context budget */
  fileSummarization?: {
    enabled?: boolean;
    provider?: string;
    model?: string;
    threshold?: number;
    minTokensPerFile?: number;
    maxTokensPerFile?: number;
  };

  /** @deprecated Use tokenThreshold instead - Maximum number of conversation turns to keep per session (default: 20) */
  maxTurnsPerSession?: number;

  /** @deprecated Use tokenThreshold instead - Turn count to trigger summarization */
  summarizationThresholdTurns?: number;

  /** @deprecated Use tokenThreshold instead - Target turn count for the summary */
  summarizationTargetTurns?: number;
};
/**
 * Complete memory for a conversation session
 * ULTRA-OPTIMIZED: Direct ChatMessage[] storage - zero conversion overhead
 */
export type SessionMemory = {
  /** Unique session identifier */
  sessionId: string;

  /** User identifier (optional) */
  userId?: string;

  /** Auto-generated conversation title (created on first user message) */
  title?: string;

  /** Direct message storage - ready for immediate AI consumption */
  messages: ChatMessage[];

  /**
   * When this session was created.
   * Format: Unix epoch milliseconds (number).
   * Example: 1735689600000 for January 1, 2025, 00:00:00 UTC.
   */
  createdAt: number;

  /**
   * When this session was last active.
   * Format: Unix epoch milliseconds (number).
   * Updated on every message addition or session interaction.
   */
  lastActivity: number;

  /** Pointer to last summarized message ID (NEW - for token-based memory) */
  summarizedUpToMessageId?: string;

  /** Stored summary message that condenses conversation history up to summarizedUpToMessageId */
  summarizedMessage?: string;

  /** Per-session token threshold override (NEW - for token-based memory) */
  tokenThreshold?: number;

  /** Cached token count for performance (NEW - for token-based memory) */
  lastTokenCount?: number;

  /** When token count was last calculated (NEW - for token-based memory) */
  lastCountedAt?: number;

  /** API-reported token count from last request (most accurate) */
  lastApiTokenCount?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };

  /** Optional session metadata */
  metadata?: {
    /** User role or permissions */
    userRole?: string;

    /** Tags for categorizing this session */
    tags?: string[];

    /** Custom data specific to the organization */
    customData?: Record<string, unknown>;
  };
};

/**
 * Statistics about conversation memory usage (simplified for pure in-memory storage)
 */
export type ConversationMemoryStats = {
  /** Total number of active sessions */
  totalSessions: number;

  /** Total number of conversation turns across all sessions */
  totalTurns: number;
};

/**
 * Stream event for event sequence tracking
 * Used to reconstruct exact flow of streaming responses with proper ordering
 * @since 8.21.0
 */
export type StreamEventSequence = {
  /** Event type (text-chunk, ui-component, tool:start, tool:end, hitl:confirmation-request, etc.) */
  type: string;
  /** Sequence number for ordering events */
  seq: number;
  /** Timestamp when event occurred */
  timestamp: number;
  /** Event-specific data */
  [key: string]: unknown;
};

/** Structured metadata for tool_result messages. */
export type ToolResultData = {
  /** Whether the tool execution succeeded */
  success?: boolean;
  /** Expression that was evaluated (for calculation tools) */
  expression?: string;
  /**
   * The tool execution result.
   * @deprecated Read from ChatMessage.content instead. This field is dynamically
   * populated from content for backward compatibility and will be removed in a future version.
   */
  result?: unknown;
  /** Result type hint */
  type?: string;
  /** Error message if execution failed */
  error?: string;
};

/** Metadata associated with a ChatMessage. */
export type ChatMessageMetadata = {
  /** Is this a summary message? */
  isSummary?: boolean;
  /** First message ID that this summary covers */
  summarizesFrom?: string;
  /** Last message ID that this summary covers */
  summarizesTo?: string;
  /** Was this message truncated due to token limits? */
  truncated?: boolean;
  /** Source of the message (e.g., provider name, user input) */
  source?: string;
  /** Language of the message content */
  language?: string;
  /** Confidence score for AI-generated content */
  confidence?: number;
  /**
   * Numeric timestamp for internal tracking and efficient comparisons.
   * Format: Unix epoch milliseconds (number).
   * Complements the ISO string `ChatMessage.timestamp` field.
   * Use this for sorting, filtering, and performance-critical operations.
   */
  timestamp?: number;
  /** Model used to generate this message */
  modelUsed?: string;
  /** Unique signature identifying thought/reasoning patterns */
  thoughtSignature?: string;
  /** Hash of the thinking/reasoning content for deduplication */
  thoughtHash?: string;
  /** Whether extended thinking was used for this message */
  thinkingExpanded?: boolean;
  /** Step index for reconstructing parallel vs sequential tool calls */
  stepIndex?: number;

  // --- Tool output management (SDK-2) ---

  /**
   * Head/tail preview of a large tool output.
   * Only present on tool_result messages where the output exceeded truncation limits.
   * When `sendToolPreview` is enabled in config, `buildContextMessages()` returns
   * this value as the message content instead of the full output.
   */
  toolOutputPreview?: string;
  /** Original byte size of the full tool output before any truncation */
  originalSize?: number;
  /**
   * Artifact store ID for an externalized MCP tool output.
   * Set when `mcp.outputLimits.strategy = "externalize"` and the tool output
   * exceeded `maxBytes`. Use retrieve_context with this ID to fetch the full
   * payload from the local artifact store.
   */
  artifactId?: string;
};

/**
 * Chat message format for conversation history
 */
export type ChatMessage = {
  /** Unique message identifier (required for token-based memory) */
  id: string;

  /** Role/type of the message */
  role: "user" | "assistant" | "system" | "tool_call" | "tool_result";

  /** Content of the message */
  content: string;

  /**
   * Message timestamp.
   * Format: ISO 8601 string (e.g., "2025-01-01T12:30:00.000Z").
   * Optional - may be omitted for system-generated messages.
   * Use `metadata.timestamp` for numeric Unix ms representation.
   */
  timestamp?: string;

  /** Tool name (optional) - for tool_call/tool_result messages */
  tool?: string;

  /** Tool arguments (optional) - for tool_call messages */
  args?: Record<string, unknown>;

  /** Tool result metadata (optional) - for tool_result messages */
  result?: ToolResultData;

  /**
   * Event sequence for rich history reconstruction
   * Stores ordered events (text-chunk, ui-component, tool calls, HITL, etc.)
   * Enables proper ordering and complete context restoration
   * @since 8.21.0
   */
  events?: StreamEventSequence[];

  /** Message metadata */
  metadata?: ChatMessageMetadata;

  /** UUID identifying this condensation group */
  condenseId?: string;
  /** Points to summary that replaces this message */
  condenseParent?: string;
  /** UUID identifying this truncation group */
  truncationId?: string;
  /** Points to truncation marker that hides this message */
  truncationParent?: string;
  /** Marks this message as a truncation boundary marker */
  isTruncationMarker?: boolean;
};

/**
 * Multimodal message types - Re-exported from multimodal.ts
 * @deprecated Import from './multimodal.js' instead for better organization
 */
export type { MessageContent, MultimodalChatMessage } from "./multimodal.js";

/**
 * Events emitted by conversation memory system
 */
export type ConversationMemoryEvents = {
  /**
   * Emitted when a new session is created.
   * The timestamp field is Unix epoch milliseconds.
   */
  "session:created": {
    sessionId: string;
    userId?: string;
    /** Event timestamp as Unix epoch milliseconds */
    timestamp: number;
  };

  /** Emitted when a conversation turn is stored */
  "turn:stored": {
    sessionId: string;
    turnIndex: number;
    timestamp: number;
  };

  /** Emitted when a session is cleaned up */
  "session:cleanup": {
    sessionId: string;
    reason: "expired" | "limit_exceeded";
    timestamp: number;
  };

  /** Emitted when context is injected */
  "context:injected": {
    sessionId: string;
    turnsIncluded: number;
    timestamp: number;
  };
};

/**
 * Error types specific to conversation memory
 */
export class ConversationMemoryError extends Error {
  constructor(
    message: string,
    public code:
      | "STORAGE_ERROR"
      | "CONFIG_ERROR"
      | "SESSION_NOT_FOUND"
      | "CLEANUP_ERROR",
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ConversationMemoryError";
  }
}

/**
 * NeuroLink initialization options
 * Configuration for creating NeuroLink instances with conversation memory
 */
export type NeurolinkOptions = {
  /** Conversation memory configuration */
  conversationMemory?: ConversationMemoryConfig;

  /** Session identifier for conversation context */
  sessionId?: string;

  /** Observability configuration */
  observability?: ObservabilityConfig;
};

/**
 * Session identifier for Redis storage operations
 */
export type SessionIdentifier = {
  sessionId: string;
  userId?: string;
};

/**
 * Options for storing a conversation turn
 */
export type StoreConversationTurnOptions = {
  sessionId: string;
  userId?: string;
  userMessage: string;
  aiResponse: string;
  startTimeStamp?: Date;
  providerDetails?: ProviderDetails;
  enableSummarization?: boolean;
  events?: StreamEventSequence[];
  /** Observability request identifier for log correlation */
  requestId?: string;
  /** API-reported token usage from provider response */
  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
  /** Gemini 3 thought signature for reasoning continuity across turns */
  thoughtSignature?: string;
};

/**
 * Lightweight session metadata for efficient session listing
 * Contains only essential information without heavy message arrays
 */
export type SessionMetadata = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  /** Additional metadata including agentic loop reports */
  metadata?: {
    agenticLoopReports?: AgenticLoopReportMetadata[];
  };
};

/**
 * Report type for agentic loop reports
 * Identifies the platform or category of the report
 */
export type AgenticLoopReportType =
  | "META"
  | "GOOGLEADS"
  | "GOOGLEGA4"
  | "OTHER";

/**
 * Status of an agentic loop report
 */
export type AgenticLoopReportStatus =
  | "INPROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

/**
 * Metadata for an individual agentic loop report
 * A conversation session can have multiple reports tracked via this type
 */
export type AgenticLoopReportMetadata = {
  /** Unique identifier for this report */
  reportId: string;
  /** Platform/category of the report */
  reportType: AgenticLoopReportType;
  /** Current status of the report */
  reportStatus: AgenticLoopReportStatus;
  /** Optional audit period date range for the report */
  auditPeriod?: {
    startDate: string;
    endDate: string;
  };
};

/**
 * Base conversation metadata (shared fields across all conversation types)
 * Contains essential conversation information without heavy data arrays
 */
export type ConversationBase = {
  /** Unique conversation identifier (UUID v4) */
  id: string;

  /** Auto-generated conversation title */
  title: string;

  /** Session identifier */
  sessionId: string;

  /** User identifier */
  userId: string;

  /** When this conversation was first created */
  createdAt: string;

  /** When this conversation was last updated */
  updatedAt: string;

  /** Pointer to last summarized message (token-based memory) */
  summarizedUpToMessageId?: string;

  /** Stored summary message that condenses conversation history up to summarizedUpToMessageId */
  summarizedMessage?: string;

  /** Per-session token threshold override */
  tokenThreshold?: number;

  /** Cached token count for efficiency */
  lastTokenCount?: number;

  /** Timestamp of last token count */
  lastCountedAt?: number;

  /** API-reported token count from last request */
  lastApiTokenCount?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };

  /** Additional metadata for extensible conversation-level data */
  additionalMetadata?: {
    /** Agentic loop reports associated with this conversation */
    agenticLoopReports?: AgenticLoopReportMetadata[];
    /** Allow future extensibility */
    [key: string]: unknown;
  };
};

/**
 * Redis conversation storage object format
 * Contains conversation metadata and full message history
 */
export type RedisConversationObject = ConversationBase & {
  /** Array of conversation messages */
  messages: ChatMessage[];
};

/**
 * Full conversation data for session restoration and manipulation
 * Extends Redis storage object with additional loop mode metadata
 */
export type ConversationData = RedisConversationObject & {
  /** Optional metadata for session variables and other loop mode data */
  metadata?: {
    /** Session variables set during loop mode */
    sessionVariables?: Record<string, string | number | boolean>;
    /** Message count (for compatibility) */
    messageCount?: number;
    /** Additional metadata can be added here */
    [key: string]: unknown;
  };
};

/**
 * Conversation summary for listing and selection
 * Contains conversation preview information without heavy message arrays
 */
export type ConversationSummary = ConversationBase & {
  /** First message preview (for conversation preview) */
  firstMessage: {
    content: string;
    timestamp: string;
  };

  /** Last message preview (for conversation preview) */
  lastMessage: {
    content: string;
    timestamp: string;
  };

  /** Total number of messages in conversation */
  messageCount: number;

  /** Human-readable time since last update (e.g., "2 hours ago") */
  duration: string;
};

/**
 * Redis storage configuration
 */
export type RedisStorageConfig = {
  /** Redis connection URL (e.g., 'rediss://host:6379' for TLS) */
  url?: string;

  /** Redis username for ACL authentication (optional) */
  username?: string;

  /** Redis host (default: 'localhost') */
  host?: string;

  /** Redis port (default: 6379) */
  port?: number;

  /** Redis password (optional) */
  password?: string;

  /** Redis database number (default: 0) */
  db?: number;

  /** Key prefix for Redis keys (default: 'neurolink:conversation:') */
  keyPrefix?: string;

  /** Key prefix for user sessions mapping (default: derived from keyPrefix) */
  userSessionsKeyPrefix?: string;

  /** Time-to-live in seconds (default: 86400, 24 hours) */
  ttl?: number;

  /** Additional Redis connection options */
  connectionOptions?: {
    connectTimeout?: number;
    lazyConnect?: boolean;
    retryDelayOnFailover?: number;
    maxRetriesPerRequest?: number;
    [key: string]: string | number | boolean | undefined;
  };
};

export type ProviderDetails = {
  provider: string;
  model: string;
};

/**
 * Reduced ChatMessage shape used by callers (typically tests and history
 * reconstructors) that pass synthetic entries into the Gemini history
 * reconstructor without filling every `ChatMessage` field. Mirrors the
 * fields actually read by `prependConversationMessages`.
 */
export type MinimalChatMessage = {
  role: ChatMessage["role"];
  content: string;
  tool?: string;
  args?: Record<string, unknown>;
  metadata?: {
    stepIndex?: number;
    thoughtSignature?: string;
  };
};
