/**
 * Conversation Memory Types for NeuroLink
 * Provides type-safe conversation storage and context management
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
 * New Redis conversation storage object format
 * Contains conversation metadata and history in a single object
 */
export type RedisConversationObject = {
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

  /** Array of conversation messages */
  messages: ChatMessage[];
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
