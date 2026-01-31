/**
 * Message Bus Implementation
 *
 * MessageBus provides inter-agent communication capabilities including
 * publish/subscribe messaging, request/response patterns, and broadcasting.
 */

import { randomUUID } from "crypto";
import { TypedEventEmitter } from "../../core/infrastructure/typedEventEmitter.js";
import type {
  AgentMessage,
  AgentMessageType,
  MessagePriority,
  MessageHandler,
  MessageSubscription,
} from "../types/agentTypes.js";
import { MessageDeliveryError } from "../errors/agentErrors.js";
import { logger } from "../../utils/logger.js";

// ============================================================================
// Message Bus Events
// ============================================================================

/**
 * Events emitted by the MessageBus
 */
interface MessageBusEvents {
  "message:sent": [AgentMessage];
  "message:received": [AgentMessage];
  "message:delivered": [{ messageId: string; to: string }];
  "message:failed": [{ messageId: string; error: string }];
  "subscription:added": [{ topic: string; agentId: string }];
  "subscription:removed": [{ topic: string; agentId: string }];
}

// ============================================================================
// Message Queue
// ============================================================================

/**
 * Priority queue for messages
 */
class PriorityMessageQueue {
  private queues: Map<MessagePriority, AgentMessage[]> = new Map([
    ["critical", []],
    ["high", []],
    ["normal", []],
    ["low", []],
  ]);

  enqueue(message: AgentMessage): void {
    const priority = message.priority ?? "normal";
    const queue = this.queues.get(priority);
    if (queue) {
      queue.push(message);
    }
  }

  dequeue(): AgentMessage | undefined {
    // Process in priority order
    const priorities: MessagePriority[] = ["critical", "high", "normal", "low"];
    for (const priority of priorities) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        return queue.shift();
      }
    }
    return undefined;
  }

  isEmpty(): boolean {
    for (const queue of this.queues.values()) {
      if (queue.length > 0) {
        return false;
      }
    }
    return true;
  }

  size(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  clear(): void {
    for (const queue of this.queues.values()) {
      queue.length = 0;
    }
  }
}

// ============================================================================
// Message Bus Class
// ============================================================================

/**
 * MessageBus for inter-agent communication
 *
 * @example
 * ```typescript
 * const bus = new MessageBus();
 *
 * // Subscribe to messages
 * const subscription = bus.subscribe('agent-1', async (message) => {
 *   console.log('Received:', message);
 * });
 *
 * // Send a message
 * await bus.send({
 *   from: 'agent-2',
 *   to: 'agent-1',
 *   type: 'request',
 *   payload: { task: 'analyze data' }
 * });
 *
 * // Broadcast to all
 * await bus.broadcast('agent-2', { type: 'status', data: 'ready' });
 * ```
 */
export class MessageBus {
  private subscriptions: Map<string, Set<MessageHandler>> = new Map();
  private topicSubscriptions: Map<string, Set<MessageHandler>> = new Map();
  private pendingResponses: Map<
    string,
    {
      resolve: (response: AgentMessage) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();
  private messageQueue: PriorityMessageQueue = new PriorityMessageQueue();
  private emitter: TypedEventEmitter<MessageBusEvents>;
  private processing: boolean = false;
  private messageHistory: AgentMessage[] = [];
  private maxHistorySize: number = 1000;

  constructor() {
    this.emitter = new TypedEventEmitter<MessageBusEvents>();
  }

  /**
   * Subscribe to messages for a specific agent
   */
  subscribe(agentId: string, handler: MessageHandler): MessageSubscription {
    if (!this.subscriptions.has(agentId)) {
      this.subscriptions.set(agentId, new Set());
    }
    this.subscriptions.get(agentId)!.add(handler);

    this.emitter.emit("subscription:added", { topic: agentId, agentId });

    logger.debug(`[MessageBus] Agent subscribed: ${agentId}`);

    return {
      topic: agentId,
      handler,
      unsubscribe: () => {
        this.unsubscribe(agentId, handler);
      },
    };
  }

  /**
   * Subscribe to a topic
   */
  subscribeTopic(topic: string, handler: MessageHandler): MessageSubscription {
    if (!this.topicSubscriptions.has(topic)) {
      this.topicSubscriptions.set(topic, new Set());
    }
    this.topicSubscriptions.get(topic)!.add(handler);

    logger.debug(`[MessageBus] Topic subscription added: ${topic}`);

    return {
      topic,
      handler,
      unsubscribe: () => {
        this.unsubscribeTopic(topic, handler);
      },
    };
  }

  /**
   * Unsubscribe from messages
   */
  unsubscribe(agentId: string, handler: MessageHandler): void {
    const handlers = this.subscriptions.get(agentId);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscriptions.delete(agentId);
      }
    }

    this.emitter.emit("subscription:removed", { topic: agentId, agentId });
    logger.debug(`[MessageBus] Agent unsubscribed: ${agentId}`);
  }

  /**
   * Unsubscribe from a topic
   */
  unsubscribeTopic(topic: string, handler: MessageHandler): void {
    const handlers = this.topicSubscriptions.get(topic);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.topicSubscriptions.delete(topic);
      }
    }
  }

  /**
   * Send a message to a specific agent
   */
  async send(message: Omit<AgentMessage, "id" | "timestamp">): Promise<void> {
    const fullMessage: AgentMessage = {
      ...message,
      id: randomUUID(),
      timestamp: Date.now(),
    };

    this.messageQueue.enqueue(fullMessage);
    this.emitter.emit("message:sent", fullMessage);
    this.addToHistory(fullMessage);

    await this.processQueue();
  }

  /**
   * Send a message and wait for a response
   */
  async sendAndWait(
    message: Omit<AgentMessage, "id" | "timestamp" | "correlationId">,
    timeout: number = 30000,
  ): Promise<AgentMessage> {
    const correlationId = randomUUID();
    const fullMessage: AgentMessage = {
      ...message,
      id: randomUUID(),
      timestamp: Date.now(),
      correlationId,
    };

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        this.pendingResponses.delete(correlationId);
        reject(
          new MessageDeliveryError("Message response timeout", {
            messageId: fullMessage.id,
            fromAgent: fullMessage.from,
            toAgent: fullMessage.to,
          }),
        );
      }, timeout);

      // Store pending response handler
      this.pendingResponses.set(correlationId, {
        resolve,
        reject,
        timeout: timeoutHandle,
      });

      // Send the message
      this.messageQueue.enqueue(fullMessage);
      this.emitter.emit("message:sent", fullMessage);
      this.addToHistory(fullMessage);
      this.processQueue().catch((error) => {
        this.pendingResponses.delete(correlationId);
        clearTimeout(timeoutHandle);
        reject(error);
      });
    });
  }

  /**
   * Respond to a message
   */
  async respond(
    originalMessage: AgentMessage,
    payload: unknown,
  ): Promise<void> {
    if (!originalMessage.correlationId) {
      throw new Error("Cannot respond to a message without correlationId");
    }

    await this.send({
      from: originalMessage.to,
      to: originalMessage.from,
      type: "response",
      payload,
      correlationId: originalMessage.correlationId,
      priority: originalMessage.priority,
    });
  }

  /**
   * Broadcast a message to all subscribed agents
   */
  async broadcast(
    from: string,
    payload: unknown,
    type: AgentMessageType = "broadcast",
    priority?: MessagePriority,
  ): Promise<void> {
    const message: AgentMessage = {
      id: randomUUID(),
      from,
      to: "*",
      type,
      payload,
      timestamp: Date.now(),
      priority,
    };

    this.emitter.emit("message:sent", message);
    this.addToHistory(message);

    // Deliver to all subscribed agents
    const deliveryPromises: Promise<void>[] = [];
    for (const [agentId, handlers] of this.subscriptions.entries()) {
      if (agentId !== from) {
        for (const handler of handlers) {
          deliveryPromises.push(
            this.deliverMessage({ ...message, to: agentId }, handler),
          );
        }
      }
    }

    await Promise.all(deliveryPromises);
  }

  /**
   * Publish to a topic
   */
  async publish(topic: string, from: string, payload: unknown): Promise<void> {
    const handlers = this.topicSubscriptions.get(topic);
    if (!handlers || handlers.size === 0) {
      return;
    }

    const message: AgentMessage = {
      id: randomUUID(),
      from,
      to: topic,
      type: "broadcast",
      payload,
      timestamp: Date.now(),
    };

    this.emitter.emit("message:sent", message);
    this.addToHistory(message);

    const deliveryPromises: Promise<void>[] = [];
    for (const handler of handlers) {
      deliveryPromises.push(this.deliverMessage(message, handler));
    }

    await Promise.all(deliveryPromises);
  }

  /**
   * Process the message queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      while (!this.messageQueue.isEmpty()) {
        const message = this.messageQueue.dequeue();
        if (!message) {
          break;
        }

        await this.deliverToAgent(message);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Deliver a message to an agent
   */
  private async deliverToAgent(message: AgentMessage): Promise<void> {
    // Check for response to pending request
    if (
      message.type === "response" &&
      message.correlationId &&
      this.pendingResponses.has(message.correlationId)
    ) {
      const pending = this.pendingResponses.get(message.correlationId)!;
      clearTimeout(pending.timeout);
      this.pendingResponses.delete(message.correlationId);
      pending.resolve(message);
      return;
    }

    // Get handlers for the target agent
    const handlers = this.subscriptions.get(message.to);
    if (!handlers || handlers.size === 0) {
      this.emitter.emit("message:failed", {
        messageId: message.id,
        error: `No handlers for agent: ${message.to}`,
      });
      return;
    }

    // Deliver to all handlers
    for (const handler of handlers) {
      await this.deliverMessage(message, handler);
    }
  }

  /**
   * Deliver a message to a handler
   */
  private async deliverMessage(
    message: AgentMessage,
    handler: MessageHandler,
  ): Promise<void> {
    try {
      this.emitter.emit("message:received", message);
      await handler(message);
      this.emitter.emit("message:delivered", {
        messageId: message.id,
        to: message.to,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.emitter.emit("message:failed", {
        messageId: message.id,
        error: errorMessage,
      });
      logger.error(`[MessageBus] Message delivery failed`, {
        messageId: message.id,
        error: errorMessage,
      });
    }
  }

  /**
   * Add message to history
   */
  private addToHistory(message: AgentMessage): void {
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }
  }

  /**
   * Get message history
   */
  getHistory(limit?: number): AgentMessage[] {
    if (limit) {
      return this.messageHistory.slice(-limit);
    }
    return [...this.messageHistory];
  }

  /**
   * Get messages between two agents
   */
  getMessagesBetween(
    agent1: string,
    agent2: string,
    limit?: number,
  ): AgentMessage[] {
    const messages = this.messageHistory.filter(
      (m) =>
        (m.from === agent1 && m.to === agent2) ||
        (m.from === agent2 && m.to === agent1),
    );

    if (limit) {
      return messages.slice(-limit);
    }
    return messages;
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.messageQueue.size();
  }

  /**
   * Get number of subscriptions
   */
  getSubscriptionCount(): number {
    let count = 0;
    for (const handlers of this.subscriptions.values()) {
      count += handlers.size;
    }
    return count;
  }

  /**
   * Subscribe to bus events
   */
  on<K extends keyof MessageBusEvents>(
    event: K,
    handler: (...args: MessageBusEvents[K]) => void,
  ): this {
    this.emitter.on(event, handler);
    return this;
  }

  /**
   * Unsubscribe from bus events
   */
  off<K extends keyof MessageBusEvents>(
    event: K,
    handler: (...args: MessageBusEvents[K]) => void,
  ): this {
    this.emitter.off(event, handler);
    return this;
  }

  /**
   * Clear all subscriptions and pending messages
   */
  clear(): void {
    this.subscriptions.clear();
    this.topicSubscriptions.clear();
    this.messageQueue.clear();
    this.messageHistory = [];

    // Cancel pending responses
    for (const pending of this.pendingResponses.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("MessageBus cleared"));
    }
    this.pendingResponses.clear();

    logger.debug("[MessageBus] Cleared all subscriptions and messages");
  }
}
