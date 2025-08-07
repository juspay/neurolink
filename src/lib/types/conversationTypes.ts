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

  /** Maximum number of sessions to keep in memory */
  maxSessions: number;

  /** Maximum number of conversation turns to keep per session */
  maxTurnsPerSession: number;

  /** Local directory to store conversation files */
  storageLocation: string;

  /** Automatically cleanup old conversations (default: true) */
  autoCleanup?: boolean;

  /** Context injection settings */
  contextInjection?: {
    /** Maximum number of previous turns to inject as context */
    maxContextTurns?: number;

    /** Maximum tokens to use for context (to prevent prompt overflow) */
    maxContextTokens?: number;

    /** Strategy for selecting relevant context */
    strategy?: "recent" | "relevant" | "smart";
  };
}

/**
 * Individual conversation turn between user and AI
 */
export interface ConversationTurn {
  /** Timestamp when this turn occurred */
  timestamp: number;

  /** The user's message */
  userMessage: string;

  /** The AI's response */
  aiResponse: string;

  /** Optional metadata about this turn */
  metadata?: {
    /** AI provider used for this response */
    provider?: string;

    /** Response time in milliseconds */
    responseTime?: number;

    /** Tools that were used in this turn */
    toolsUsed?: string[];

    /** Token count for this interaction */
    tokenCount?: {
      input?: number;
      output?: number;
      total?: number;
    };

    /** Model used for this response */
    model?: string;
  };
}

/**
 * Complete memory for a conversation session
 */
export interface SessionMemory {
  /** Unique session identifier */
  sessionId: string;

  /** User identifier (optional) */
  userId?: string;

  /** All conversation turns in chronological order */
  turns: ConversationTurn[];

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
 * Statistics about conversation memory usage
 */
export interface ConversationMemoryStats {
  /** Total number of active sessions */
  totalSessions: number;

  /** Total number of conversation turns across all sessions */
  totalTurns: number;

  /** Average turns per session */
  averageTurnsPerSession: number;

  /** Most active session ID */
  mostActiveSessionId?: string;

  /** Memory usage statistics */
  memoryUsage: {
    /** Estimated storage size in bytes */
    storageSize: number;

    /** Number of files on disk */
    fileCount: number;
  };

  /** When these stats were generated */
  generatedAt: number;
}

/**
 * Options for context injection
 */
export interface ContextInjectionOptions {
  /** Maximum number of turns to include */
  maxTurns?: number;

  /** Maximum tokens to use for context */
  maxTokens?: number;

  /** Include metadata in context */
  includeMetadata?: boolean;

  /** Custom format for context string */
  customFormat?: (turns: ConversationTurn[]) => string;
}

/**
 * Result of context injection
 */
export interface ContextInjectionResult {
  /** The formatted context string */
  contextString: string;

  /** Number of turns included in context */
  turnsIncluded: number;

  /** Estimated token count of context */
  estimatedTokens: number;

  /** Whether context was truncated due to limits */
  wasTruncated: boolean;
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
