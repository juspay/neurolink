/**
 * Message Bus - Inter-agent communication infrastructure
 *
 * Provides a publish-subscribe message bus for agent-to-agent communication
 * with support for:
 * - Topic-based messaging
 * - Request-response patterns
 * - Broadcast messaging
 * - Message persistence and replay
 */

import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import { logger } from "../../utils/logger.js";
import type {
  AgentMessage,
  MessageHandler,
  SubscriptionOptions,
  MessageBusConfig,
  MessageBusSubscription,
} from "../../types/index.js";

/**
 * Message Bus - Central hub for agent communication
 */
export class MessageBus {
  private subscriptions: Map<string, MessageBusSubscription[]> = new Map();
  private messageHistory: AgentMessage[] = [];
  private pendingRequests: Map<
    string,
    {
      resolve: (msg: AgentMessage) => void;
      reject: (err: Error) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();
  private deadLetterQueue: AgentMessage[] = [];
  private config: Required<MessageBusConfig>;
  private emitter: EventEmitter;

  constructor(config?: MessageBusConfig) {
    this.config = {
      maxHistorySize: 1000,
      defaultTtl: 60000,
      enablePersistence: false,
      enableDeadLetterQueue: true,
      requestTimeout: 30000,
      ...config,
    };
    this.emitter = new EventEmitter();

    // Increase max listeners for large networks
    this.emitter.setMaxListeners(100);

    logger.debug("[MessageBus] Created with config", {
      maxHistorySize: this.config.maxHistorySize,
      enableDeadLetterQueue: this.config.enableDeadLetterQueue,
    });
  }

  /**
   * Subscribe to a topic
   */
  subscribe(
    topic: string,
    subscriberId: string,
    handler: MessageHandler,
    options?: SubscriptionOptions,
  ): string {
    const subscriptionId = randomUUID();
    const subscription: MessageBusSubscription = {
      id: subscriptionId,
      topic,
      handler,
      options: options ?? {},
      messageCount: 0,
      subscriberId,
    };

    const topicSubs = this.subscriptions.get(topic) ?? [];
    topicSubs.push(subscription);
    this.subscriptions.set(topic, topicSubs);

    logger.debug(`[MessageBus] Subscription created`, {
      subscriptionId,
      topic,
      subscriberId,
    });

    this.emitter.emit("subscription:created", {
      subscriptionId,
      topic,
      subscriberId,
    });
    return subscriptionId;
  }

  /**
   * Unsubscribe from a topic
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [topic, subs] of this.subscriptions) {
      const index = subs.findIndex((s) => s.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        if (subs.length === 0) {
          this.subscriptions.delete(topic);
        }
        logger.debug(`[MessageBus] Subscription removed`, {
          subscriptionId,
          topic,
        });
        return true;
      }
    }
    return false;
  }

  /**
   * Unsubscribe all subscriptions for an agent
   */
  unsubscribeAll(subscriberId: string): number {
    let count = 0;
    for (const [topic, subs] of this.subscriptions) {
      const filtered = subs.filter((s) => s.subscriberId !== subscriberId);
      count += subs.length - filtered.length;
      if (filtered.length === 0) {
        this.subscriptions.delete(topic);
      } else {
        this.subscriptions.set(topic, filtered);
      }
    }
    return count;
  }

  /**
   * Publish a message to a topic
   */
  async publish(
    topic: string,
    senderId: string,
    payload: unknown,
    options?: Partial<
      Omit<AgentMessage, "id" | "topic" | "senderId" | "payload" | "timestamp">
    >,
  ): Promise<void> {
    const message: AgentMessage = {
      id: randomUUID(),
      type: options?.type ?? "event",
      topic,
      senderId,
      payload,
      priority: options?.priority ?? "normal",
      timestamp: Date.now(),
      ttl: options?.ttl ?? this.config.defaultTtl,
      recipientId: options?.recipientId,
      correlationId: options?.correlationId,
      replyTo: options?.replyTo,
      metadata: options?.metadata,
    };

    await this.deliverMessage(message);
  }

  /**
   * Send a direct message to a specific agent
   */
  async sendDirect(
    senderId: string,
    recipientId: string,
    payload: unknown,
    options?: Partial<
      Omit<
        AgentMessage,
        "id" | "senderId" | "recipientId" | "payload" | "timestamp"
      >
    >,
  ): Promise<void> {
    const topic = `direct:${recipientId}`;
    const message: AgentMessage = {
      id: randomUUID(),
      type: "direct",
      topic,
      senderId,
      recipientId,
      payload,
      priority: options?.priority ?? "normal",
      timestamp: Date.now(),
      ttl: options?.ttl ?? this.config.defaultTtl,
      metadata: options?.metadata,
    };

    await this.deliverMessage(message);
  }

  /**
   * Send a request and wait for response
   */
  async request(
    topic: string,
    senderId: string,
    payload: unknown,
    timeout?: number,
  ): Promise<AgentMessage> {
    const correlationId = randomUUID();
    const replyTo = `reply:${correlationId}`;

    // Create a promise that will resolve when we get the response
    const responsePromise = new Promise<AgentMessage>((resolve, reject) => {
      const timeoutMs = timeout ?? this.config.requestTimeout;
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        this.unsubscribeByTopic(replyTo, senderId);
        reject(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(correlationId, {
        resolve,
        reject,
        timeout: timeoutHandle,
      });
    });

    // Subscribe to reply topic
    this.subscribe(replyTo, senderId, (msg) => {
      const pending = this.pendingRequests.get(correlationId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(correlationId);
        this.unsubscribeByTopic(replyTo, senderId);
        pending.resolve(msg);
      }
    });

    // Send the request
    await this.publish(topic, senderId, payload, {
      type: "request",
      correlationId,
      replyTo,
    });

    return responsePromise;
  }

  /**
   * Reply to a request
   */
  async reply(
    originalMessage: AgentMessage,
    senderId: string,
    payload: unknown,
  ): Promise<void> {
    if (!originalMessage.replyTo) {
      throw new Error("Cannot reply to message without replyTo field");
    }

    await this.publish(originalMessage.replyTo, senderId, payload, {
      type: "response",
      correlationId: originalMessage.correlationId,
    });
  }

  /**
   * Broadcast a message to all subscribers
   */
  async broadcast(
    senderId: string,
    payload: unknown,
    excludeTopics?: string[],
  ): Promise<void> {
    const message: AgentMessage = {
      id: randomUUID(),
      type: "broadcast",
      topic: "broadcast",
      senderId,
      payload,
      priority: "normal",
      timestamp: Date.now(),
      ttl: this.config.defaultTtl,
    };

    // Deliver to all topics except excluded ones
    for (const topic of this.subscriptions.keys()) {
      if (excludeTopics?.includes(topic)) {
        continue;
      }
      if (topic.startsWith("reply:") || topic.startsWith("direct:")) {
        continue;
      }

      await this.deliverMessage({ ...message, topic });
    }
  }

  /**
   * Deliver a message to subscribers
   */
  private async deliverMessage(message: AgentMessage): Promise<void> {
    // Add to history
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.config.maxHistorySize) {
      this.messageHistory.shift();
    }

    // Check if message has expired
    if (message.ttl && Date.now() - message.timestamp > message.ttl) {
      logger.debug(`[MessageBus] Message expired`, { messageId: message.id });
      return;
    }

    const subs = this.subscriptions.get(message.topic) ?? [];
    const deliveryPromises: Promise<void>[] = [];

    for (const sub of subs) {
      // Check if subscription should receive this message
      if (!this.shouldDeliver(message, sub)) {
        continue;
      }

      // Check max messages limit
      if (
        sub.options.maxMessages !== undefined &&
        sub.options.maxMessages !== -1 &&
        sub.messageCount >= sub.options.maxMessages
      ) {
        continue;
      }

      sub.messageCount++;

      deliveryPromises.push(
        Promise.resolve(sub.handler(message)).catch((error) => {
          logger.error(`[MessageBus] Message delivery failed`, {
            messageId: message.id,
            subscriptionId: sub.id,
            error: error instanceof Error ? error.message : String(error),
          });

          // Add to dead letter queue if enabled
          if (this.config.enableDeadLetterQueue) {
            this.deadLetterQueue.push(message);
          }
        }),
      );
    }

    await Promise.all(deliveryPromises);
    this.emitter.emit("message:delivered", {
      messageId: message.id,
      topic: message.topic,
    });
  }

  /**
   * Check if message should be delivered to subscription
   */
  private shouldDeliver(
    message: AgentMessage,
    sub: MessageBusSubscription,
  ): boolean {
    const opts = sub.options;

    // Filter by sender
    if (
      opts.filterBySender &&
      !opts.filterBySender.includes(message.senderId)
    ) {
      return false;
    }

    // Filter by type
    if (opts.filterByType && !opts.filterByType.includes(message.type)) {
      return false;
    }

    // Filter by priority
    if (
      opts.filterByPriority &&
      !opts.filterByPriority.includes(message.priority)
    ) {
      return false;
    }

    // Custom filter
    if (opts.customFilter && !opts.customFilter(message)) {
      return false;
    }

    // Direct messages: check recipient
    if (message.type === "direct" && message.recipientId !== sub.subscriberId) {
      return false;
    }

    return true;
  }

  /**
   * Unsubscribe by topic for a specific subscriber
   */
  private unsubscribeByTopic(topic: string, subscriberId: string): void {
    const subs = this.subscriptions.get(topic);
    if (subs) {
      const filtered = subs.filter((s) => s.subscriberId !== subscriberId);
      if (filtered.length === 0) {
        this.subscriptions.delete(topic);
      } else {
        this.subscriptions.set(topic, filtered);
      }
    }
  }

  /**
   * Get message history for a topic
   */
  getHistory(topic?: string, limit?: number): AgentMessage[] {
    let messages = topic
      ? this.messageHistory.filter((m) => m.topic === topic)
      : this.messageHistory;

    if (limit) {
      messages = messages.slice(-limit);
    }

    return messages;
  }

  /**
   * Get dead letter queue messages
   */
  getDeadLetterQueue(): AgentMessage[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
  }

  /**
   * Replay messages from history
   */
  async replayHistory(
    topic: string,
    subscriberId: string,
    since?: number,
  ): Promise<void> {
    const messages = this.messageHistory.filter(
      (m) => m.topic === topic && (!since || m.timestamp >= since),
    );

    const subs =
      this.subscriptions
        .get(topic)
        ?.filter((s) => s.subscriberId === subscriberId) ?? [];

    for (const message of messages) {
      for (const sub of subs) {
        if (this.shouldDeliver(message, sub)) {
          await Promise.resolve(sub.handler(message)).catch(() => {
            // Ignore replay errors
          });
        }
      }
    }
  }

  /**
   * Get all topics
   */
  getTopics(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Get subscriber count for a topic
   */
  getSubscriberCount(topic: string): number {
    return this.subscriptions.get(topic)?.length ?? 0;
  }

  /**
   * Get statistics
   */
  getStats(): {
    topicCount: number;
    totalSubscriptions: number;
    historySize: number;
    deadLetterQueueSize: number;
    pendingRequests: number;
  } {
    let totalSubscriptions = 0;
    for (const subs of this.subscriptions.values()) {
      totalSubscriptions += subs.length;
    }

    return {
      topicCount: this.subscriptions.size,
      totalSubscriptions,
      historySize: this.messageHistory.length,
      deadLetterQueueSize: this.deadLetterQueue.length,
      pendingRequests: this.pendingRequests.size,
    };
  }

  /**
   * Subscribe to bus events
   */
  on(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.on(event, handler);
  }

  /**
   * Unsubscribe from bus events
   */
  off(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.off(event, handler);
  }

  /**
   * Shutdown the message bus
   */
  shutdown(): void {
    // Clear pending requests
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Message bus shutdown"));
    }
    this.pendingRequests.clear();

    // Clear subscriptions
    this.subscriptions.clear();

    logger.debug("[MessageBus] Shutdown complete");
  }
}
