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
  /** Role of the message sender */
  role: "user" | "assistant" | "system";

  /** Content of the message */
  content: string;
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
