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

import type { Mem0Config } from "../memory/mem0Initializer.js";

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

  /** Enable mem0 integration for conversation memory */
  mem0Enabled?: boolean;

  /** Configuration for mem0 cloud API integration */
  mem0Config?: Mem0Config;

  /** Redis configuration (optional) - overrides environment variables */
  redisConfig?: RedisStorageConfig;

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

  /** Tool result (optional) - for tool_result messages */
  result?: {
    success?: boolean;
    expression?: string;
    result?: unknown;
    type?: string;
    error?: string;
  };

  /** Message metadata (NEW - for token-based memory) */
  metadata?: {
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
  };
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
  observability?: import("./observability.js").ObservabilityConfig;
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
