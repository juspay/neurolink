/**
 * Conversation Memory Types for NeuroLink
 * Provides type-safe conversation storage and context management
 */

import type { MemoryConfig } from "mem0ai/oss";

/**
 * Mem0 configuration interface matching mem0ai/oss MemoryConfig structure
 */

/**
 * Configuration for conversation memory feature
 */
export interface ConversationMemoryConfig {
  /** Enable conversation memory feature */
  enabled: boolean;

  /** Maximum number of sessions to keep in memory (default: 50) */
  maxSessions?: number;

  /** Maximum number of conversation turns to keep per session (default: 20) */
  maxTurnsPerSession?: number;

  /** Enable automatic summarization */
  enableSummarization?: boolean;

  /** Turn count to trigger summarization */
  summarizationThresholdTurns?: number;

  /** Target turn count for the summary */
  summarizationTargetTurns?: number;

  /** Provider to use for summarization */
  summarizationProvider?: string;

  /** Model to use for summarization */
  summarizationModel?: string;

  /** Enable mem0 integration for conversation memory */
  mem0Enabled?: boolean;

  /** Configuration for mem0 integration */
  mem0Config?: MemoryConfig;
}
/**
 * Complete memory for a conversation session
 * ULTRA-OPTIMIZED: Direct ChatMessage[] storage - zero conversion overhead
 */
export interface SessionMemory {
  /** Unique session identifier */
  sessionId: string;

  /** User identifier (optional) */
  userId?: string;

  /** Auto-generated conversation title (created on first user message) */
  title?: string;

  /** Direct message storage - ready for immediate AI consumption */
  messages: ChatMessage[];

  /** When this session was created */
  createdAt: number;

  /** When this session was last active */
  lastActivity: number;

  /** Optional session metadata */
  metadata?: {
    /** User role or permissions */
    userRole?: string;

    /** Tags for categorizing this session */
    tags?: string[];

    /** Custom data specific to the organization */
    customData?: Record<string, unknown>;
  };
}

/**
 * Statistics about conversation memory usage (simplified for pure in-memory storage)
 */
export interface ConversationMemoryStats {
  /** Total number of active sessions */
  totalSessions: number;

  /** Total number of conversation turns across all sessions */
  totalTurns: number;
}

/**
 * Chat message format for conversation history
 */
export interface ChatMessage {
  /** Role/type of the message */
  role: "user" | "assistant" | "system" | "tool_call" | "tool_result";

  /** Content of the message */
  content: string;

  /** Message ID (optional) - for new format */
  id?: string;

  /** Timestamp (optional) - for new format */
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
}

/**
 * Content format for multimodal messages (used internally)
 */
export interface MessageContent {
  type: string;
  text?: string;
  image?: string;
  mimeType?: string;
  [key: string]: unknown; // Index signature for compatibility with Vercel AI SDK
}

/**
 * Extended chat message for multimodal support (internal use)
 */
export interface MultimodalChatMessage {
  /** Role of the message sender */
  role: "user" | "assistant" | "system";

  /** Content of the message - can be text or multimodal content array */
  content: string | MessageContent[];
}

/**
 * Events emitted by conversation memory system
 */
export interface ConversationMemoryEvents {
  /** Emitted when a new session is created */
  "session:created": {
    sessionId: string;
    userId?: string;
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
}

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
export interface NeurolinkOptions {
  /** Conversation memory configuration */
  conversationMemory?: ConversationMemoryConfig;

  /** Session identifier for conversation context */
  sessionId?: string;

  /** Observability configuration */
  observability?: import("./observability.js").ObservabilityConfig;
}

/**
 * Session identifier for Redis storage operations
 */
export type SessionIdentifier = {
  sessionId: string;
  userId?: string;
};

/**
 * Lightweight session metadata for efficient session listing
 * Contains only essential information without heavy message arrays
 */
export interface SessionMetadata {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Base conversation metadata (shared fields across all conversation types)
 * Contains essential conversation information without heavy data arrays
 */
export interface ConversationBase {
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
}

/**
 * Redis conversation storage object format
 * Contains conversation metadata and full message history
 */
export interface RedisConversationObject extends ConversationBase {
  /** Array of conversation messages */
  messages: ChatMessage[];
}

/**
 * Full conversation data for session restoration and manipulation
 * Extends Redis storage object with additional loop mode metadata
 */
export interface ConversationData extends RedisConversationObject {
  /** Optional metadata for session variables and other loop mode data */
  metadata?: {
    /** Session variables set during loop mode */
    sessionVariables?: Record<string, string | number | boolean>;
    /** Message count (for compatibility) */
    messageCount?: number;
    /** Additional metadata can be added here */
    [key: string]: unknown;
  };
}

/**
 * Conversation summary for listing and selection
 * Contains conversation preview information without heavy message arrays
 */
export interface ConversationSummary extends ConversationBase {
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
}

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
