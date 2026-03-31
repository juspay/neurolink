// src/lib/auth/sessionManager.ts

import type { RedisClientType } from "redis";
import type {
  AuthUser,
  AuthSession,
  SessionConfig,
} from "../types/authTypes.js";
import { withTimeout } from "../utils/async/withTimeout.js";
import { logger } from "../utils/logger.js";

/** Mask an identifier for safe logging: show first 4 chars + "***" */
function maskId(id: string): string {
  if (id.length <= 4) {
    return "***";
  }
  return `${id.slice(0, 4)}***`;
}

const REDIS_CONNECT_TIMEOUT_MS = 5000;
type RedisClient = RedisClientType;

/**
 * Session storage interface for SessionManager
 *
 * Defines the contract for session storage backends (memory, Redis, custom).
 * Note: This is a SessionManager-specific interface that uses `set()`/`getUserSessions()`/
 * `deleteUserSessions()`/`isHealthy()` method names, which differ from the canonical
 * `SessionStorage` type in `../types/authTypes.js` (which uses `save()`/`getForUser()`/
 * `deleteAllForUser()`/`exists()`/`touch()`). Both interfaces coexist because
 * SessionManager and BaseAuthProvider have separate storage patterns.
 */
export interface SessionManagerStorage {
  /** Get a session by ID */
  get(sessionId: string): Promise<AuthSession | null>;

  /** Store a session */
  set(session: AuthSession): Promise<void>;

  /** Delete a session */
  delete(sessionId: string): Promise<void>;

  /** Get all sessions for a user */
  getUserSessions(userId: string): Promise<AuthSession[]>;

  /** Delete all sessions for a user */
  deleteUserSessions(userId: string): Promise<void>;

  /** Clear all sessions (for cleanup) */
  clear(): Promise<void>;

  /** Health check */
  isHealthy(): Promise<boolean>;
}

/**
 * In-memory session storage
 *
 * Simple session storage using Map. Suitable for single-instance deployments
 * or development. Sessions are lost on restart.
 */
export class MemorySessionStorage implements SessionManagerStorage {
  private sessions: Map<string, AuthSession> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();

  async get(sessionId: string): Promise<AuthSession | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check expiration
    if (session.expiresAt && new Date() > session.expiresAt) {
      await this.delete(sessionId);
      return null;
    }

    return session;
  }

  async set(session: AuthSession): Promise<void> {
    this.sessions.set(session.id, session);

    // Track user's sessions
    let sessionIds = this.userSessions.get(session.user.id);
    if (!sessionIds) {
      sessionIds = new Set();
      this.userSessions.set(session.user.id, sessionIds);
    }
    sessionIds.add(session.id);
  }

  async delete(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (session) {
      const userSessionSet = this.userSessions.get(session.user.id);
      if (userSessionSet) {
        userSessionSet.delete(sessionId);
        if (userSessionSet.size === 0) {
          this.userSessions.delete(session.user.id);
        }
      }
      this.sessions.delete(sessionId);
    }
  }

  async getUserSessions(userId: string): Promise<AuthSession[]> {
    const sessionIds = this.userSessions.get(userId);

    if (!sessionIds) {
      return [];
    }

    const sessions: AuthSession[] = [];
    for (const sessionId of sessionIds) {
      const session = await this.get(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  async deleteUserSessions(userId: string): Promise<void> {
    const sessionIds = this.userSessions.get(userId);

    if (sessionIds) {
      for (const sessionId of sessionIds) {
        this.sessions.delete(sessionId);
      }
      this.userSessions.delete(userId);
    }
  }

  async clear(): Promise<void> {
    this.sessions.clear();
    this.userSessions.clear();
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}

/**
 * Redis session storage
 *
 * Distributed session storage using Redis. Suitable for multi-instance
 * deployments. Requires the "redis" (node-redis) package.
 *
 * Note: Redis client must be provided or configured via environment.
 */
export class RedisSessionStorage implements SessionManagerStorage {
  private prefix: string;
  private ttl: number;
  private redisUrl: string;
  private client: RedisClient | null = null;
  private initPromise: Promise<RedisClient> | null = null;

  constructor(config: { url: string; prefix?: string; ttl?: number }) {
    this.redisUrl = config.url;
    this.prefix = config.prefix || "neurolink:sessions:";
    this.ttl = config.ttl || 3600;
  }

  private async getClient(): Promise<RedisClient> {
    if (this.client) {
      return this.client;
    }

    if (!this.initPromise) {
      this.initPromise = this.createClient();
    }

    return this.initPromise;
  }

  private async createClient(): Promise<RedisClient> {
    try {
      // Use variable indirection to prevent TypeScript from resolving the module at compile time
      const moduleName = "redis";
      const redisModule = (await import(
        /* @vite-ignore */ moduleName
      )) as typeof import("redis");
      const client: RedisClient = redisModule.createClient({
        url: this.redisUrl,
      });
      client.on("error", (err: Error) => {
        logger.error("Redis session client error:", err.message);
      });
      await withTimeout(
        client.connect(),
        REDIS_CONNECT_TIMEOUT_MS,
        `Redis session client connect timed out after ${REDIS_CONNECT_TIMEOUT_MS}ms`,
      );
      this.client = client;
      return client;
    } catch (error) {
      this.initPromise = null;
      logger.error(
        'Redis client not available. Ensure the "redis" package is installed and Redis is reachable when using storage: "redis".',
      );
      throw error instanceof Error
        ? error
        : new Error("Redis client not available");
    }
  }

  private sessionKey(sessionId: string): string {
    return `${this.prefix}${sessionId}`;
  }

  private userSessionsKey(userId: string): string {
    return `${this.prefix}user:${userId}`;
  }

  async get(sessionId: string): Promise<AuthSession | null> {
    try {
      const client = await this.getClient();
      const data = await client.get(this.sessionKey(sessionId));

      if (!data) {
        return null;
      }
      if (typeof data !== "string") {
        logger.warn("Unexpected Redis session payload type", {
          sessionId: maskId(sessionId),
          type: typeof data,
        });
        return null;
      }

      const session = JSON.parse(data) as AuthSession;

      // Parse dates
      session.createdAt = new Date(session.createdAt);
      if (session.expiresAt !== null && session.expiresAt !== undefined) {
        session.expiresAt = new Date(session.expiresAt);
      }

      // Check expiration
      if (session.expiresAt && new Date() > session.expiresAt) {
        await this.delete(sessionId);
        return null;
      }

      return session;
    } catch (error) {
      logger.error("Redis session get error:", error);
      return null;
    }
  }

  async set(session: AuthSession): Promise<void> {
    try {
      const client = await this.getClient();

      // Calculate TTL from session expiration
      const ttlSeconds = session.expiresAt
        ? Math.max(
            1,
            Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
          )
        : this.ttl;

      // Store session
      await client.setEx(
        this.sessionKey(session.id),
        ttlSeconds,
        JSON.stringify(session),
      );

      // Track user's sessions
      await client.sAdd(this.userSessionsKey(session.user.id), session.id);
      await client.expire(this.userSessionsKey(session.user.id), this.ttl);
    } catch (error) {
      logger.error("Redis session set error:", error);
      throw error;
    }
  }

  async delete(sessionId: string): Promise<void> {
    try {
      const client = await this.getClient();

      // Read the raw session data directly instead of calling this.get(),
      // which checks expiration and calls this.delete() — causing infinite
      // recursion for expired sessions.
      const data = await client.get(this.sessionKey(sessionId));

      if (data) {
        if (typeof data !== "string") {
          logger.warn("Unexpected Redis session payload type during delete", {
            sessionId: maskId(sessionId),
            type: typeof data,
          });
        } else {
          try {
            const session = JSON.parse(data) as AuthSession;
            await client.sRem(this.userSessionsKey(session.user.id), sessionId);
          } catch {
            // If parsing fails, we still delete the key below
            logger.warn(
              `Failed to parse session data for cleanup: ${maskId(sessionId)}`,
            );
          }
        }
      }

      await client.del(this.sessionKey(sessionId));
    } catch (error) {
      logger.error("Redis session delete error:", error);
    }
  }

  async getUserSessions(userId: string): Promise<AuthSession[]> {
    try {
      const client = await this.getClient();
      const sessionIds = await client.sMembers(this.userSessionsKey(userId));

      const sessions: AuthSession[] = [];
      for (const sessionId of sessionIds) {
        const session = await this.get(sessionId);
        if (session) {
          sessions.push(session);
        }
      }

      return sessions;
    } catch (error) {
      logger.error("Redis getUserSessions error:", error);
      return [];
    }
  }

  async deleteUserSessions(userId: string): Promise<void> {
    try {
      const client = await this.getClient();
      const sessionIds = await client.sMembers(this.userSessionsKey(userId));

      for (const sessionId of sessionIds) {
        await client.del(this.sessionKey(sessionId));
      }

      await client.del(this.userSessionsKey(userId));
    } catch (error) {
      logger.error("Redis deleteUserSessions error:", error);
    }
  }

  async clear(): Promise<void> {
    try {
      const client = await this.getClient();

      // Use SCAN instead of KEYS to avoid blocking Redis in production
      let cursor = "0";
      do {
        const result = await client.scan(cursor, {
          MATCH: `${this.prefix}*`,
          COUNT: 100,
        });
        cursor = result.cursor;

        if (result.keys.length > 0) {
          await client.del(result.keys);
        }
      } while (cursor !== "0");
    } catch (error) {
      logger.error("Redis clear error:", error);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const client = await this.getClient();
      const pong = await client.ping();
      return pong === "PONG";
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.initPromise = null;
    }
  }
}

/**
 * Session Manager
 *
 * High-level session management that handles session lifecycle,
 * automatic refresh, and storage abstraction.
 */
export class SessionManager {
  private storage: SessionManagerStorage;
  private config: SessionConfig;

  constructor(config: SessionConfig = {}) {
    this.config = {
      ...config,
      duration: config.duration || 3600,
      autoRefresh: config.autoRefresh ?? true,
      refreshThreshold: config.refreshThreshold || 300,
      storage: config.storage || "memory",
    };

    // Initialize storage based on config
    this.storage = this.createStorage();
  }

  private createStorage(): SessionManagerStorage {
    switch (this.config.storage) {
      case "redis":
        if (!this.config.redis?.url) {
          logger.warn("Redis URL not provided, falling back to memory storage");
          return new MemorySessionStorage();
        }
        return new RedisSessionStorage({
          url: this.config.redis.url,
          prefix: this.config.redis.prefix,
          ttl: this.config.redis.ttl || this.config.duration,
        });

      case "memory":
      default:
        return new MemorySessionStorage();
    }
  }

  /**
   * Create a new session
   */
  async createSession(
    user: AuthUser,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      deviceId?: string;
    },
  ): Promise<AuthSession> {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const duration = this.config.duration || 3600;

    const session: AuthSession = {
      id: sessionId,
      user,
      createdAt: now,
      expiresAt: new Date(now.getTime() + duration * 1000),
      isValid: true,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      deviceId: metadata?.deviceId,
    };

    await this.storage.set(session);
    logger.debug(
      `Session created: ${maskId(sessionId)} for user: ${maskId(user.id)}`,
    );

    return session;
  }

  /**
   * Get a session by ID
   *
   * Optionally auto-refreshes if close to expiration.
   */
  async getSession(
    sessionId: string,
    autoRefresh = this.config.autoRefresh,
  ): Promise<AuthSession | null> {
    const session = await this.storage.get(sessionId);

    if (!session) {
      return null;
    }

    // Auto-refresh if close to expiration
    if (autoRefresh && this.shouldRefresh(session)) {
      return this.refreshSession(sessionId);
    }

    return session;
  }

  /**
   * Check if session should be refreshed
   */
  private shouldRefresh(session: AuthSession): boolean {
    if (!session.expiresAt) {
      return false;
    }
    const threshold = this.config.refreshThreshold || 300;
    const timeUntilExpiry = (session.expiresAt.getTime() - Date.now()) / 1000;
    return timeUntilExpiry < threshold;
  }

  /**
   * Refresh a session
   */
  async refreshSession(sessionId: string): Promise<AuthSession | null> {
    const session = await this.storage.get(sessionId);

    if (!session) {
      return null;
    }

    const duration = this.config.duration || 3600;
    session.expiresAt = new Date(Date.now() + duration * 1000);

    await this.storage.set(session);
    logger.debug(`Session refreshed: ${maskId(sessionId)}`);

    return session;
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<void> {
    await this.storage.delete(sessionId);
    logger.debug(`Session destroyed: ${maskId(sessionId)}`);
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<AuthSession[]> {
    return this.storage.getUserSessions(userId);
  }

  /**
   * Destroy all sessions for a user (global logout)
   */
  async destroyAllUserSessions(userId: string): Promise<void> {
    await this.storage.deleteUserSessions(userId);
    logger.debug(`All sessions destroyed for user: ${maskId(userId)}`);
  }

  /**
   * Validate a session is still active
   */
  async validateSession(sessionId: string): Promise<boolean> {
    const session = await this.storage.get(sessionId);
    return session !== null && session.isValid;
  }

  /**
   * Update session metadata
   */
  async updateSessionMetadata(
    sessionId: string,
    metadata: Record<string, unknown>,
  ): Promise<AuthSession | null> {
    const session = await this.storage.get(sessionId);

    if (!session) {
      return null;
    }

    session.metadata = {
      ...session.metadata,
      ...metadata,
    };

    await this.storage.set(session);
    return session;
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    return this.storage.isHealthy();
  }

  /**
   * Clear all sessions (for testing/cleanup)
   */
  async clear(): Promise<void> {
    await this.storage.clear();
  }
}

/**
 * Create session storage based on configuration
 */
export function createSessionStorage(
  config: SessionConfig,
): SessionManagerStorage {
  switch (config.storage) {
    case "redis":
      if (!config.redis?.url) {
        logger.warn("Redis URL not provided, falling back to memory storage");
        return new MemorySessionStorage();
      }
      return new RedisSessionStorage({
        url: config.redis.url,
        prefix: config.redis.prefix,
        ttl: config.redis.ttl || config.duration,
      });

    case "memory":
    default:
      return new MemorySessionStorage();
  }
}
