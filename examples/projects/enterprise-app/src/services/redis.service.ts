import { randomUUID } from "crypto";
import Redis from "ioredis";

type ConversationMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
};

type ConversationSession = {
  id: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
};

export class RedisService {
  private client: Redis | null = null;
  private readonly redisUrl: string;
  private readonly keyPrefix = "neurolink:";

  constructor(redisUrl: string) {
    this.redisUrl = redisUrl;
  }

  async connect(): Promise<void> {
    this.client = new Redis(this.redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
    });

    await this.client.connect();
    console.log("Redis connected successfully");

    this.client.on("error", (err) => {
      console.error("Redis error:", err);
    });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  // Session Management
  async createSession(
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    const sessionId = `session_${Date.now()}_${randomUUID()}`;
    const session: ConversationSession = {
      id: sessionId,
      userId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata,
    };

    await this.client!.set(
      this.key(`session:${sessionId}`),
      JSON.stringify(session),
      "EX",
      86400 * 7, // 7 days TTL
    );

    // Add to user's session list
    await this.client!.sadd(this.key(`user:${userId}:sessions`), sessionId);

    return sessionId;
  }

  async getSession(sessionId: string): Promise<ConversationSession | null> {
    const data = await this.client!.get(this.key(`session:${sessionId}`));
    return data ? JSON.parse(data) : null;
  }

  async addMessage(
    sessionId: string,
    message: Omit<ConversationMessage, "timestamp">,
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.messages.push({
      ...message,
      timestamp: new Date().toISOString(),
    });
    session.updatedAt = new Date().toISOString();

    await this.client!.set(
      this.key(`session:${sessionId}`),
      JSON.stringify(session),
      "EX",
      86400 * 7,
    );
  }

  async getMessages(
    sessionId: string,
    limit?: number,
  ): Promise<ConversationMessage[]> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return [];
    }

    const messages = session.messages;
    return limit ? messages.slice(-limit) : messages;
  }

  async getUserSessions(userId: string): Promise<string[]> {
    return await this.client!.smembers(this.key(`user:${userId}:sessions`));
  }

  // Rate Limiting
  async checkRateLimit(
    userId: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    const key = this.key(`ratelimit:${userId}`);
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Remove old entries
    await this.client!.zremrangebyscore(key, 0, windowStart);

    // Count current requests
    const count = await this.client!.zcard(key);

    if (count >= limit) {
      const oldestEntry = await this.client!.zrange(key, 0, 0, "WITHSCORES");
      const resetAt =
        oldestEntry.length > 1
          ? parseInt(oldestEntry[1]) + windowSeconds * 1000
          : now + windowSeconds * 1000;

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Add new request
    await this.client!.zadd(key, now, `${now}`);
    await this.client!.expire(key, windowSeconds);

    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt: now + windowSeconds * 1000,
    };
  }

  // Cache for AI responses
  async cacheResponse(
    key: string,
    response: any,
    ttlSeconds: number = 3600,
  ): Promise<void> {
    await this.client!.set(
      this.key(`cache:${key}`),
      JSON.stringify(response),
      "EX",
      ttlSeconds,
    );
  }

  async getCachedResponse(key: string): Promise<any | null> {
    const data = await this.client!.get(this.key(`cache:${key}`));
    return data ? JSON.parse(data) : null;
  }

  private key(suffix: string): string {
    return `${this.keyPrefix}${suffix}`;
  }
}
