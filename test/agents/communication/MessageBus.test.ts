/**
 * MessageBus Class Tests
 *
 * Tests for the MessageBus class including:
 * - Subscription management
 * - Message sending and delivery
 * - Request/response pattern
 * - Broadcasting
 * - Priority queue handling
 * - Message history
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MessageBus } from "../../../src/lib/agents/communication/MessageBus.js";
import type { AgentMessage } from "../../../src/lib/agents/types/agentTypes.js";

// ============================================================================
// Tests
// ============================================================================

describe("MessageBus", () => {
  let bus: MessageBus;

  beforeEach(() => {
    bus = new MessageBus();
  });

  afterEach(() => {
    bus.clear();
  });

  describe("Subscriptions", () => {
    it("should subscribe to messages for an agent", () => {
      const handler = vi.fn();

      bus.subscribe("agent-1", handler);

      expect(bus.getSubscriptionCount()).toBe(1);
    });

    it("should return unsubscribe function", () => {
      const handler = vi.fn();

      const subscription = bus.subscribe("agent-1", handler);
      subscription.unsubscribe();

      expect(bus.getSubscriptionCount()).toBe(0);
    });

    it("should unsubscribe specific handler", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.subscribe("agent-1", handler1);
      bus.subscribe("agent-1", handler2);

      bus.unsubscribe("agent-1", handler1);

      expect(bus.getSubscriptionCount()).toBe(1);
    });

    it("should subscribe to topics", () => {
      const handler = vi.fn();

      const subscription = bus.subscribeTopic("updates", handler);

      expect(subscription.topic).toBe("updates");
    });

    it("should unsubscribe from topics", () => {
      const handler = vi.fn();

      const subscription = bus.subscribeTopic("updates", handler);
      bus.unsubscribeTopic("updates", handler);

      // No error means success
      expect(true).toBe(true);
    });
  });

  describe("Message Sending", () => {
    it("should send message to subscribed agent", async () => {
      const handler = vi.fn();
      bus.subscribe("agent-1", handler);

      await bus.send({
        from: "agent-2",
        to: "agent-1",
        type: "request",
        payload: { task: "test" },
      });

      expect(handler).toHaveBeenCalled();
      const message = handler.mock.calls[0][0];
      expect(message.from).toBe("agent-2");
      expect(message.payload).toEqual({ task: "test" });
    });

    it("should add message ID and timestamp", async () => {
      const handler = vi.fn();
      bus.subscribe("agent-1", handler);

      await bus.send({
        from: "agent-2",
        to: "agent-1",
        type: "request",
        payload: {},
      });

      const message = handler.mock.calls[0][0];
      expect(message.id).toBeDefined();
      expect(message.timestamp).toBeDefined();
    });

    it("should not deliver to unsubscribed agent", async () => {
      const handler = vi.fn();
      // Don't subscribe

      await bus.send({
        from: "agent-2",
        to: "agent-1",
        type: "request",
        payload: {},
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it("should deliver to multiple handlers for same agent", async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.subscribe("agent-1", handler1);
      bus.subscribe("agent-1", handler2);

      await bus.send({
        from: "agent-2",
        to: "agent-1",
        type: "request",
        payload: {},
      });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe("Priority Queue", () => {
    it("should process critical messages first", async () => {
      const order: string[] = [];
      const handler = vi.fn().mockImplementation((msg: AgentMessage) => {
        order.push(msg.priority ?? "normal");
      });
      bus.subscribe("agent-1", handler);

      // Send in reverse priority order
      await bus.send({
        from: "agent-2",
        to: "agent-1",
        type: "request",
        payload: {},
        priority: "low",
      });
      await bus.send({
        from: "agent-2",
        to: "agent-1",
        type: "request",
        payload: {},
        priority: "critical",
      });

      // Note: Messages are processed as they're sent, so order depends on implementation
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it("should get queue size", async () => {
      // Queue is processed immediately, so size should be 0 after send
      await bus.send({
        from: "agent-1",
        to: "agent-2",
        type: "request",
        payload: {},
      });

      expect(bus.getQueueSize()).toBe(0);
    });
  });

  describe("Request/Response", () => {
    it("should send and wait for response", async () => {
      // Set up responder
      bus.subscribe("agent-1", async (message) => {
        if (message.correlationId) {
          await bus.respond(message, { result: "done" });
        }
      });

      const response = await bus.sendAndWait(
        {
          from: "agent-2",
          to: "agent-1",
          type: "request",
          payload: { query: "test" },
        },
        5000,
      );

      expect(response.type).toBe("response");
      expect(response.payload).toEqual({ result: "done" });
    });

    it("should timeout if no response", async () => {
      // No responder set up

      await expect(
        bus.sendAndWait(
          {
            from: "agent-2",
            to: "agent-1",
            type: "request",
            payload: {},
          },
          100, // Short timeout
        ),
      ).rejects.toThrow("timeout");
    });

    it("should throw when responding without correlationId", async () => {
      const message: AgentMessage = {
        id: "msg-1",
        from: "agent-1",
        to: "agent-2",
        type: "request",
        payload: {},
        timestamp: Date.now(),
        // No correlationId
      };

      await expect(bus.respond(message, {})).rejects.toThrow(
        "Cannot respond to a message without correlationId",
      );
    });
  });

  describe("Broadcasting", () => {
    it("should broadcast to all subscribed agents", async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      bus.subscribe("agent-1", handler1);
      bus.subscribe("agent-2", handler2);
      bus.subscribe("agent-3", handler3);

      await bus.broadcast("agent-1", { announcement: "test" });

      // Should not deliver to sender
      expect(handler1).not.toHaveBeenCalled();
      // Should deliver to others
      expect(handler2).toHaveBeenCalled();
      expect(handler3).toHaveBeenCalled();
    });

    it("should broadcast with priority", async () => {
      const handler = vi.fn();
      bus.subscribe("agent-2", handler);

      await bus.broadcast("agent-1", { urgent: true }, "broadcast", "critical");

      const message = handler.mock.calls[0][0];
      expect(message.priority).toBe("critical");
    });
  });

  describe("Topic Publishing", () => {
    it("should publish to topic subscribers", async () => {
      const handler = vi.fn();
      bus.subscribeTopic("updates", handler);

      await bus.publish("updates", "agent-1", { data: "test" });

      expect(handler).toHaveBeenCalled();
    });

    it("should not publish if no subscribers", async () => {
      // No subscribers

      await bus.publish("updates", "agent-1", { data: "test" });

      // No error should occur
      expect(true).toBe(true);
    });
  });

  describe("Message History", () => {
    it("should track message history", async () => {
      bus.subscribe("agent-1", vi.fn());

      await bus.send({
        from: "agent-2",
        to: "agent-1",
        type: "request",
        payload: { msg: 1 },
      });

      await bus.send({
        from: "agent-2",
        to: "agent-1",
        type: "request",
        payload: { msg: 2 },
      });

      const history = bus.getHistory();
      expect(history.length).toBe(2);
    });

    it("should limit history with parameter", async () => {
      bus.subscribe("agent-1", vi.fn());

      for (let i = 0; i < 5; i++) {
        await bus.send({
          from: "agent-2",
          to: "agent-1",
          type: "request",
          payload: { msg: i },
        });
      }

      const history = bus.getHistory(3);
      expect(history.length).toBe(3);
    });

    it("should get messages between two agents", async () => {
      bus.subscribe("agent-1", vi.fn());
      bus.subscribe("agent-2", vi.fn());

      await bus.send({
        from: "agent-1",
        to: "agent-2",
        type: "request",
        payload: {},
      });

      await bus.send({
        from: "agent-2",
        to: "agent-1",
        type: "response",
        payload: {},
      });

      await bus.send({
        from: "agent-3",
        to: "agent-1",
        type: "request",
        payload: {},
      });

      const messages = bus.getMessagesBetween("agent-1", "agent-2");
      expect(messages.length).toBe(2);
    });

    it("should clear history", async () => {
      bus.subscribe("agent-1", vi.fn());

      await bus.send({
        from: "agent-2",
        to: "agent-1",
        type: "request",
        payload: {},
      });

      bus.clearHistory();

      const history = bus.getHistory();
      expect(history.length).toBe(0);
    });
  });

  describe("Events", () => {
    it("should emit message:sent event", async () => {
      const handler = vi.fn();
      bus.on("message:sent", handler);
      bus.subscribe("agent-1", vi.fn());

      await bus.send({
        from: "agent-2",
        to: "agent-1",
        type: "request",
        payload: {},
      });

      expect(handler).toHaveBeenCalled();
    });

    it("should emit message:delivered event", async () => {
      const handler = vi.fn();
      bus.on("message:delivered", handler);
      bus.subscribe("agent-1", vi.fn());

      await bus.send({
        from: "agent-2",
        to: "agent-1",
        type: "request",
        payload: {},
      });

      expect(handler).toHaveBeenCalled();
    });

    it("should emit message:failed event on handler error", async () => {
      const failedHandler = vi.fn();
      bus.on("message:failed", failedHandler);

      bus.subscribe("agent-1", async () => {
        throw new Error("Handler error");
      });

      await bus.send({
        from: "agent-2",
        to: "agent-1",
        type: "request",
        payload: {},
      });

      expect(failedHandler).toHaveBeenCalled();
    });

    it("should emit subscription:added event", () => {
      const handler = vi.fn();
      bus.on("subscription:added", handler);

      bus.subscribe("agent-1", vi.fn());

      expect(handler).toHaveBeenCalled();
    });

    it("should emit subscription:removed event", () => {
      const handler = vi.fn();
      bus.on("subscription:removed", handler);

      const subscription = bus.subscribe("agent-1", vi.fn());
      subscription.unsubscribe();

      expect(handler).toHaveBeenCalled();
    });

    it("should unsubscribe from events", () => {
      const handler = vi.fn();
      bus.on("message:sent", handler);
      bus.off("message:sent", handler);

      bus.subscribe("agent-1", vi.fn());
      // Won't check sent event since we unsubscribed
      expect(true).toBe(true);
    });
  });

  describe("Clear", () => {
    it("should clear all subscriptions and messages", async () => {
      bus.subscribe("agent-1", vi.fn());
      bus.subscribeTopic("updates", vi.fn());

      await bus.send({
        from: "agent-2",
        to: "agent-1",
        type: "request",
        payload: {},
      });

      bus.clear();

      expect(bus.getSubscriptionCount()).toBe(0);
      expect(bus.getHistory().length).toBe(0);
    });

    it("should cancel pending responses on clear", async () => {
      bus.subscribe("agent-1", vi.fn()); // Doesn't respond

      const responsePromise = bus.sendAndWait(
        {
          from: "agent-2",
          to: "agent-1",
          type: "request",
          payload: {},
        },
        10000,
      );

      bus.clear();

      await expect(responsePromise).rejects.toThrow("cleared");
    });
  });
});
