// src/lib/auth/sessionManager.ts

import type {
  AuthUser,
  AuthSession,
  SessionConfig,
} from "../types/authTypes.js";
import { logger } from "../utils/logger.js";

/**
 * Session storage interface
 *
 * Defines the contract for session storage backends (memory, Redis, custom).
 */
export interface SessionStorage {
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
export class MemorySessionStorage implements SessionStorage {
  private sessions: Map<string, AuthSession> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();

  async get(sessionId: string): Promise<AuthSession | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      await this.delete(sessionId);
      return null;
    }

    return session;
  }

  async set(session: AuthSession): Promise<void> {
    this.sessions.set(session.id, session);

    // Track user's sessions
    if (!this.userSessions.has(session.user.id)) {
      this.userSessions.set(session.user.id, new Set());
    }
    this.userSessions.get(session.user.id)!.add(session.id);
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
 * deployments. Uses the `redis` package (node-redis v4+).
 *
 * Note: Redis must be reachable at the configured URL.
 */
export class RedisSessionStorage implements SessionStorage {
  private prefix: string;
  private ttl: number;
  private redisUrl: string;
  private client: RedisClient | null = null;

  constructor(config: { url: string; prefix?: string; ttl?: number }) {
    this.redisUrl = config.url;
    this.prefix = config.prefix || "neurolink:sessions:";
    this.ttl = config.ttl || 3600;
  }

  private async getClient(): Promise<RedisClient> {
    if (!this.client) {
      try {
        const { createClient } = await import("redis");
        const client = createClient({ url: this.redisUrl });
        await client.connect();
        this.client = client as unknown as RedisClient;
      } catch {
        logger.error(
          'Redis client not available. Ensure the redis package is installed and Redis is reachable when using storage: "redis".',
        );
        throw new Error("Redis client not available");
      }
    }
    return this.client;
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

      const session = JSON.parse(data) as AuthSession;

      // Parse dates
      session.createdAt = new Date(session.createdAt);
      session.expiresAt = new Date(session.expiresAt);

      // Check expiration
      if (new Date() > session.expiresAt) {
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
      const ttlSeconds = Math.max(
        1,
        Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
      );

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
      const session = await this.get(sessionId);

      if (session) {
        await client.sRem(this.userSessionsKey(session.user.id), sessionId);
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
      const keys = await client.keys(`${this.prefix}*`);

      if (keys.length > 0) {
        await client.del(keys);
      }
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
    }
  }
}

/**
 * Minimal Redis client interface (node-redis v4 API)
 */
interface RedisClient {
  get(key: string): Promise<string | null>;
  setEx(key: string, ttl: number, value: string): Promise<string>;
  del(keys: string | string[]): Promise<number>;
  sAdd(key: string, members: string | string[]): Promise<number>;
  sRem(key: string, members: string | string[]): Promise<number>;
  sMembers(key: string): Promise<string[]>;
  expire(key: string, ttl: number): Promise<boolean>;
  keys(pattern: string): Promise<string[]>;
  ping(): Promise<string>;
  quit(): Promise<string>;
}

/**
 * Session Manager
 *
 * High-level session management that handles session lifecycle,
 * automatic refresh, and storage abstraction.
 */
export class SessionManager {
  private storage: SessionStorage;
  private config: SessionConfig;

  constructor(config: SessionConfig = {}) {
    this.config = {
      duration: config.duration || 3600,
      autoRefresh: config.autoRefresh ?? true,
      refreshThreshold: config.refreshThreshold || 300,
      storage: config.storage || "memory",
      ...config,
    };

    // Initialize storage based on config
    this.storage = this.createStorage();
  }

  private createStorage(): SessionStorage {
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
    logger.debug(`Session created: ${sessionId} for user: ${user.id}`);

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
    logger.debug(`Session refreshed: ${sessionId}`);

    return session;
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<void> {
    await this.storage.delete(sessionId);
    logger.debug(`Session destroyed: ${sessionId}`);
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
    logger.debug(`All sessions destroyed for user: ${userId}`);
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
export function createSessionStorage(config: SessionConfig): SessionStorage {
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
