/**
 * NeuroLink MCP Session Management System
 * Enables continuous tool calling with persistent state across executions
 * Based on patterns from Cline's session management implementation
 */

import type { NeuroLinkExecutionContext, ToolResult } from "./factory.js";
import { v4 as uuidv4 } from "uuid";
import {
  SessionPersistence,
  initializeSessionPersistence,
  type PersistenceOptions,
} from "./session-persistence.js";

/**
 * Session state for orchestrator operations
 */
export interface OrchestratorSession {
  id: string;
  context: NeuroLinkExecutionContext;
  toolHistory: ToolResult[];
  state: Map<string, any>;
  metadata: {
    userAgent?: string;
    origin?: string;
    tags?: string[];
  };
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
}

/**
 * Session creation options
 */
export interface SessionOptions {
  ttl?: number; // Time to live in milliseconds
  metadata?: {
    userAgent?: string;
    origin?: string;
    tags?: string[];
  };
}

/**
 * Session statistics
 */
export interface SessionStats {
  activeSessions: number;
  totalSessionsCreated: number;
  totalSessionsExpired: number;
  averageSessionDuration: number;
  averageToolsPerSession: number;
  peakConcurrentSessions: number;
  lastCleanup: number;
}

/**
 * Session Manager for maintaining state across tool executions
 * Implements session lifecycle management with automatic cleanup
 */
export class SessionManager {
  private sessions: Map<string, OrchestratorSession> = new Map();
  private sessionCounter: number = 0;
  private stats: SessionStats = {
    activeSessions: 0,
    totalSessionsCreated: 0,
    totalSessionsExpired: 0,
    averageSessionDuration: 0,
    averageToolsPerSession: 0,
    peakConcurrentSessions: 0,
    lastCleanup: Date.now(),
  };
  private cleanupInterval: NodeJS.Timeout | null = null;
  private defaultTTL: number = 3600000; // 1 hour default
  private cleanupIntervalMs: number = 300000; // 5 minutes
  private persistence: SessionPersistence | null = null;
  private persistenceEnabled: boolean = false;

  constructor(
    defaultTTL?: number,
    cleanupIntervalMs?: number,
    autoCleanup: boolean = true,
    enablePersistence: boolean = true,
  ) {
    if (defaultTTL) {
      this.defaultTTL = defaultTTL;
    }
    if (cleanupIntervalMs) {
      this.cleanupIntervalMs = cleanupIntervalMs;
    }
    if (autoCleanup) {
      this.startAutoCleanup();
    }
    this.persistenceEnabled = enablePersistence;
  }

  /**
   * Initialize session manager with persistence
   */
  async initialize(persistenceOptions?: PersistenceOptions): Promise<void> {
    if (this.persistenceEnabled && !this.persistence) {
      this.persistence = await initializeSessionPersistence(
        this.sessions,
        persistenceOptions,
      );

      if (process.env.NEUROLINK_DEBUG === "true") {
        console.log("[SessionManager] Persistence layer initialized");
      }
    }
  }

  /**
   * Create a new session
   *
   * @param context Execution context for the session
   * @param options Session configuration options
   * @returns Created session
   */
  createSession(
    context: NeuroLinkExecutionContext,
    options: SessionOptions = {},
  ): OrchestratorSession {
    const sessionId =
      options.metadata?.tags?.includes("custom-id") && context.sessionId
        ? context.sessionId
        : this.generateSessionId();

    const now = Date.now();
    const ttl = options.ttl || this.defaultTTL;

    const session: OrchestratorSession = {
      id: sessionId,
      context: {
        ...context,
        sessionId, // Ensure context has the session ID
      },
      toolHistory: [],
      state: new Map(),
      metadata: options.metadata || {},
      createdAt: now,
      lastActivity: now,
      expiresAt: now + ttl,
    };

    this.sessions.set(sessionId, session);
    this.updateStats("create");

    // Save to disk if persistence is enabled
    if (this.persistence) {
      this.persistence.saveSession(sessionId, session).catch(console.error);
    }

    if (process.env.NEUROLINK_DEBUG === "true") {
      console.log(
        `[SessionManager] Created session ${sessionId} with TTL ${ttl}ms`,
      );
    }

    return session;
  }

  /**
   * Get an existing session
   *
   * @param sessionId Session identifier
   * @param extend Whether to extend the session's expiration
   * @returns Session if found and not expired
   */
  getSession(
    sessionId: string,
    extend: boolean = true,
  ): OrchestratorSession | null {
    const session = this.sessions.get(sessionId) || null;

    // For sync compatibility, skip disk loading in getSession
    // Use async getSessionAsync() for full persistence features

    if (!session) {
      return null;
    }

    // Check if expired
    if (session.expiresAt < Date.now()) {
      this.removeSession(sessionId);
      return null;
    }

    // Update activity and optionally extend expiration
    session.lastActivity = Date.now();
    if (extend) {
      const ttl = session.expiresAt - session.createdAt;
      session.expiresAt = Date.now() + ttl;

      // Save updated expiration to disk
      if (this.persistence) {
        this.persistence.saveSession(sessionId, session).catch(console.error);
      }
    }

    return session;
  }

  /**
   * Update session with new tool result
   *
   * @param sessionId Session identifier
   * @param toolResult Result from tool execution
   * @returns Updated session or null if not found
   */
  updateSession(
    sessionId: string,
    toolResult: ToolResult,
  ): OrchestratorSession | null {
    const session = this.getSession(sessionId);

    if (!session) {
      return null;
    }

    // Add to tool history
    session.toolHistory.push(toolResult);
    session.lastActivity = Date.now();

    // Update stats
    this.updateStats("update", session);

    // Save to disk if persistence is enabled
    if (this.persistence) {
      this.persistence.saveSession(sessionId, session).catch(console.error);
    }

    if (process.env.NEUROLINK_DEBUG === "true") {
      console.log(
        `[SessionManager] Updated session ${sessionId} with tool result`,
      );
    }

    return session;
  }

  /**
   * Set session state value
   *
   * @param sessionId Session identifier
   * @param key State key
   * @param value State value
   * @returns Updated session or null if not found
   */
  setSessionState(
    sessionId: string,
    key: string,
    value: any,
  ): OrchestratorSession | null {
    const session = this.getSession(sessionId);

    if (!session) {
      return null;
    }

    session.state.set(key, value);
    session.lastActivity = Date.now();

    // Save to disk if persistence is enabled
    if (this.persistence) {
      this.persistence.saveSession(sessionId, session).catch(console.error);
    }

    return session;
  }

  /**
   * Get session state value
   *
   * @param sessionId Session identifier
   * @param key State key
   * @returns State value or undefined
   */
  getSessionState(sessionId: string, key: string): any {
    const session = this.getSession(sessionId, false);
    return session?.state.get(key);
  }

  /**
   * Remove a session
   *
   * @param sessionId Session identifier
   * @returns True if session was removed
   */
  removeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    this.sessions.delete(sessionId);
    this.updateStats("remove", session);

    // Delete from disk if persistence is enabled (fire-and-forget)
    if (this.persistence) {
      this.persistence.deleteSession(sessionId).catch(console.error);
    }

    if (process.env.NEUROLINK_DEBUG === "true") {
      console.log(`[SessionManager] Removed session ${sessionId}`);
    }

    return true;
  }

  /**
   * Clean up expired sessions
   *
   * @returns Number of sessions cleaned up
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAt < now) {
        this.removeSession(sessionId);
        cleaned++;
      }
    }

    this.stats.lastCleanup = now;

    if (cleaned > 0 && process.env.NEUROLINK_DEBUG === "true") {
      console.log(`[SessionManager] Cleaned up ${cleaned} expired sessions`);
    }

    return cleaned;
  }

  /**
   * Get an existing session with async persistence loading
   *
   * @param sessionId Session identifier
   * @param extend Whether to extend the session's expiration
   * @returns Session if found and not expired, or null
   */
  async getSessionAsync(
    sessionId: string,
    extend: boolean = true,
  ): Promise<OrchestratorSession | null> {
    let session = this.sessions.get(sessionId) || null;

    // If not in memory and persistence is enabled, try loading from disk
    if (!session && this.persistence) {
      try {
        session = await this.persistence.loadSession(sessionId);
        if (session) {
          // Add to memory cache
          this.sessions.set(sessionId, session);
          if (process.env.NEUROLINK_DEBUG === "true") {
            console.log(
              `[SessionManager] Loaded session ${sessionId} from persistence`,
            );
          }
        }
      } catch (error) {
        if (process.env.NEUROLINK_DEBUG === "true") {
          console.log(
            `[SessionManager] Failed to load session ${sessionId} from persistence:`,
            error,
          );
        }
      }
    }

    if (!session) {
      return null;
    }

    // Check if session has expired
    if (session.expiresAt < Date.now()) {
      this.sessions.delete(sessionId);
      if (this.persistence) {
        this.persistence.deleteSession(sessionId).catch(console.error);
      }
      return null;
    }

    // Extend session if requested
    if (extend && session.expiresAt > Date.now()) {
      // Calculate remaining TTL and extend by the same amount
      const remainingTtl = session.expiresAt - Date.now();
      const originalTtl = session.expiresAt - session.createdAt;
      if (originalTtl > 0) {
        session.expiresAt = Date.now() + originalTtl;
        if (this.persistence) {
          this.persistence.saveSession(sessionId, session).catch(console.error);
        }
      }
    }

    session.lastActivity = Date.now();
    return session;
  }

  /**
   * Get all active sessions
   *
   * @returns Array of active sessions
   */
  async getActiveSessions(): Promise<OrchestratorSession[]> {
    await this.cleanup(); // Clean up first
    return Array.from(this.sessions.values());
  }

  /**
   * Get session statistics
   *
   * @returns Session statistics
   */
  getStats(): SessionStats {
    return { ...this.stats };
  }

  /**
   * Clear all sessions
   */
  clearAll(): void {
    const count = this.sessions.size;
    this.sessions.clear();
    this.stats.totalSessionsExpired += count;
    this.stats.activeSessions = 0;

    if (process.env.NEUROLINK_DEBUG === "true") {
      console.log(`[SessionManager] Cleared all ${count} sessions`);
    }
  }

  /**
   * Start automatic cleanup interval
   *
   * @private
   */
  private startAutoCleanup(): void {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(async () => {
      await this.cleanup();
    }, this.cleanupIntervalMs);

    if (process.env.NEUROLINK_DEBUG === "true") {
      console.log(
        `[SessionManager] Started auto-cleanup with ${this.cleanupIntervalMs}ms interval`,
      );
    }
  }

  /**
   * Stop automatic cleanup interval
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;

      if (process.env.NEUROLINK_DEBUG === "true") {
        console.log("[SessionManager] Stopped auto-cleanup");
      }
    }
  }

  /**
   * Generate unique session ID
   *
   * @private
   */
  private generateSessionId(): string {
    this.sessionCounter++;
    return `nlsess-${Date.now()}-${this.sessionCounter}-${uuidv4().substring(0, 8)}`;
  }

  /**
   * Update statistics
   *
   * @private
   */
  private updateStats(
    action: "create" | "update" | "remove",
    session?: OrchestratorSession,
  ): void {
    switch (action) {
      case "create":
        this.stats.totalSessionsCreated++;
        this.stats.activeSessions = this.sessions.size;
        if (this.sessions.size > this.stats.peakConcurrentSessions) {
          this.stats.peakConcurrentSessions = this.sessions.size;
        }
        break;

      case "update":
        if (session) {
          // Update average tools per session
          const totalTools = Array.from(this.sessions.values()).reduce(
            (sum, s) => sum + s.toolHistory.length,
            0,
          );
          this.stats.averageToolsPerSession =
            this.sessions.size > 0 ? totalTools / this.sessions.size : 0;
        }
        break;

      case "remove":
        this.stats.totalSessionsExpired++;
        this.stats.activeSessions = this.sessions.size;
        if (session) {
          // Update average session duration
          const duration = session.lastActivity - session.createdAt;
          const totalDuration =
            this.stats.averageSessionDuration *
              (this.stats.totalSessionsExpired - 1) +
            duration;
          this.stats.averageSessionDuration =
            totalDuration / this.stats.totalSessionsExpired;
        }
        break;
    }
  }
}

/**
 * Default session manager instance
 */
export const defaultSessionManager = new SessionManager();

/**
 * Utility function to create session with default manager
 *
 * @param context Execution context
 * @param options Session options
 * @returns Created session
 */
export async function createSession(
  context: NeuroLinkExecutionContext,
  options?: SessionOptions,
): Promise<OrchestratorSession> {
  return defaultSessionManager.createSession(context, options);
}

/**
 * Utility function to get session with default manager
 *
 * @param sessionId Session identifier
 * @param extend Whether to extend expiration
 * @returns Session or null
 */
export async function getSession(
  sessionId: string,
  extend?: boolean,
): Promise<OrchestratorSession | null> {
  return defaultSessionManager.getSession(sessionId, extend);
}
