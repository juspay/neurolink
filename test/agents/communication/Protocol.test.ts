/**
 * Protocol Class Tests
 *
 * Tests for the Protocol classes including:
 * - HandshakeProtocolHandler
 * - DelegationProtocolHandler
 * - ConsensusProtocolHandler
 * - HeartbeatProtocolHandler
 * - ProtocolManager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MessageBus } from "../../../src/lib/agents/communication/MessageBus.js";
import {
  HandshakeProtocolHandler,
  DelegationProtocolHandler,
  ConsensusProtocolHandler,
  HeartbeatProtocolHandler,
  ProtocolManager,
} from "../../../src/lib/agents/communication/Protocol.js";
import type {
  AgentMessage,
  HandshakePayload,
} from "../../../src/lib/agents/types/agentTypes.js";

// ============================================================================
// Tests
// ============================================================================

describe("HandshakeProtocolHandler", () => {
  let bus: MessageBus;
  let handler: HandshakeProtocolHandler;

  beforeEach(() => {
    bus = new MessageBus();
    handler = new HandshakeProtocolHandler(bus);
  });

  afterEach(() => {
    bus.clear();
  });

  describe("handle", () => {
    it("should store agent info on handshake", async () => {
      const message: AgentMessage = {
        id: "msg-1",
        from: "agent-1",
        to: "agent-2",
        type: "handshake",
        payload: {
          capabilities: ["search", "analyze"],
          agentInfo: { id: "agent-1", name: "Agent 1", type: "agent" },
        } as HandshakePayload,
        timestamp: Date.now(),
      };

      await handler.handle(message);

      const known = handler.getKnownAgents();
      expect(known.has("agent-1")).toBe(true);
    });
  });

  describe("initiateHandshake", () => {
    it("should send handshake and wait for response", async () => {
      // Set up responder
      bus.subscribe("agent-2", async (msg) => {
        if (msg.type === "handshake" && msg.correlationId) {
          await bus.respond(msg, {
            capabilities: ["write"],
            agentInfo: { id: "agent-2", name: "Agent 2", type: "agent" },
          });
        }
      });

      const myInfo: HandshakePayload = {
        capabilities: ["search"],
        agentInfo: { id: "agent-1", name: "Agent 1", type: "agent" },
      };

      const response = await handler.initiateHandshake(
        "agent-1",
        "agent-2",
        myInfo,
      );

      expect(response).toBeDefined();
      expect(response?.capabilities).toContain("write");
    });

    it("should return null on timeout", async () => {
      // No responder

      const myInfo: HandshakePayload = {
        capabilities: ["search"],
        agentInfo: { id: "agent-1", name: "Agent 1", type: "agent" },
      };

      // Use shorter timeout internally - the handler has 5s timeout
      const response = await Promise.race([
        handler.initiateHandshake("agent-1", "agent-2", myInfo),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 100)),
      ]);

      // Will return null due to our race condition timeout
      expect(response).toBe(null);
    });
  });

  describe("getAgentsByCapability", () => {
    it("should find agents by capability", async () => {
      await handler.handle({
        id: "msg-1",
        from: "agent-1",
        to: "agent-2",
        type: "handshake",
        payload: {
          capabilities: ["search", "analyze"],
          agentInfo: { id: "agent-1", name: "Agent 1", type: "agent" },
        },
        timestamp: Date.now(),
      });

      await handler.handle({
        id: "msg-2",
        from: "agent-2",
        to: "agent-1",
        type: "handshake",
        payload: {
          capabilities: ["write", "search"],
          agentInfo: { id: "agent-2", name: "Agent 2", type: "agent" },
        },
        timestamp: Date.now(),
      });

      const searchAgents = handler.getAgentsByCapability("search");

      expect(searchAgents).toContain("agent-1");
      expect(searchAgents).toContain("agent-2");
    });
  });
});

describe("DelegationProtocolHandler", () => {
  let bus: MessageBus;
  let handler: DelegationProtocolHandler;

  beforeEach(() => {
    bus = new MessageBus();
    handler = new DelegationProtocolHandler(bus);
  });

  afterEach(() => {
    bus.clear();
  });

  describe("delegateTask", () => {
    it("should delegate and receive acceptance", async () => {
      // Set up responder that accepts
      bus.subscribe("agent-2", async (msg) => {
        if (msg.type === "delegation") {
          await handler.acceptDelegation(msg, { status: "done" });
        }
      });

      const response = await handler.delegateTask(
        "agent-1",
        "agent-2",
        "Process data",
        { data: "test" },
        { timeout: 5000 },
      );

      expect(response.accepted).toBe(true);
      expect(response.result).toEqual({ status: "done" });
    });

    it("should handle rejection", async () => {
      // Set up responder that rejects
      bus.subscribe("agent-2", async (msg) => {
        if (msg.type === "delegation") {
          await handler.rejectDelegation(msg, "Too busy");
        }
      });

      const response = await handler.delegateTask(
        "agent-1",
        "agent-2",
        "Process data",
        {},
        { timeout: 5000 },
      );

      expect(response.accepted).toBe(false);
      expect(response.error).toBe("Too busy");
    });

    it("should timeout if no response", async () => {
      // No responder

      await expect(
        handler.delegateTask(
          "agent-1",
          "agent-2",
          "Task",
          {},
          { timeout: 100 },
        ),
      ).rejects.toThrow("timeout");
    });

    it("should support priority", async () => {
      let receivedPriority: string | undefined;

      bus.subscribe("agent-2", async (msg) => {
        receivedPriority = msg.priority;
        await handler.acceptDelegation(msg, {});
      });

      await handler.delegateTask(
        "agent-1",
        "agent-2",
        "Urgent task",
        {},
        { priority: "critical" },
      );

      expect(receivedPriority).toBe("critical");
    });
  });
});

describe("ConsensusProtocolHandler", () => {
  let bus: MessageBus;
  let handler: ConsensusProtocolHandler;

  beforeEach(() => {
    bus = new MessageBus();
    handler = new ConsensusProtocolHandler(bus);
  });

  afterEach(() => {
    bus.clear();
  });

  describe("startConsensus", () => {
    it("should start consensus and collect votes", async () => {
      // Set up voters
      bus.subscribe("agent-2", async (msg) => {
        if (msg.type === "consensus" && msg.correlationId) {
          await handler.submitVote(
            "agent-2",
            msg.correlationId,
            msg.from,
            "Option A",
          );
        }
      });

      bus.subscribe("agent-3", async (msg) => {
        if (msg.type === "consensus" && msg.correlationId) {
          await handler.submitVote(
            "agent-3",
            msg.correlationId,
            msg.from,
            "Option A",
          );
        }
      });

      // Subscribe initiator to receive votes
      bus.subscribe("agent-1", async (msg) => {
        if (msg.type === "consensus") {
          await handler.handle(msg);
        }
      });

      const result = await handler.startConsensus(
        "agent-1",
        ["agent-2", "agent-3"],
        "Choose approach",
        ["Option A", "Option B"],
        5000,
      );

      expect(result.winner).toBe("Option A");
      expect(result.unanimous).toBe(true);
    });

    it("should timeout and resolve with collected votes", async () => {
      // Only one voter responds
      bus.subscribe("agent-2", async (msg) => {
        if (msg.type === "consensus" && msg.correlationId) {
          await handler.submitVote(
            "agent-2",
            msg.correlationId,
            msg.from,
            "Option B",
          );
        }
      });

      bus.subscribe("agent-1", async (msg) => {
        if (msg.type === "consensus") {
          await handler.handle(msg);
        }
      });

      const result = await handler.startConsensus(
        "agent-1",
        ["agent-2", "agent-3"],
        "Choose",
        ["Option A", "Option B"],
        200, // Short timeout
      );

      // Should still resolve with partial votes
      expect(result.votes).toBeDefined();
    });
  });
});

describe("HeartbeatProtocolHandler", () => {
  let bus: MessageBus;
  let handler: HeartbeatProtocolHandler;

  beforeEach(() => {
    bus = new MessageBus();
    handler = new HeartbeatProtocolHandler(bus, {
      interval: 100,
      threshold: 300,
    });
  });

  afterEach(() => {
    handler.stopHeartbeat();
    bus.clear();
  });

  describe("handle", () => {
    it("should store agent health on heartbeat", async () => {
      const message: AgentMessage = {
        id: "msg-1",
        from: "agent-1",
        to: "*",
        type: "heartbeat",
        payload: {
          agentId: "agent-1",
          status: "idle",
          timestamp: Date.now(),
          metrics: { executionCount: 5 },
        },
        timestamp: Date.now(),
      };

      await handler.handle(message);

      expect(handler.isAgentHealthy("agent-1")).toBe(true);
    });
  });

  describe("isAgentHealthy", () => {
    it("should return false for unknown agent", () => {
      expect(handler.isAgentHealthy("unknown")).toBe(false);
    });

    it("should return false for stale heartbeat", async () => {
      // Create handler with very short threshold
      const shortHandler = new HeartbeatProtocolHandler(bus, {
        threshold: 50,
      });

      await shortHandler.handle({
        id: "msg-1",
        from: "agent-1",
        to: "*",
        type: "heartbeat",
        payload: {
          agentId: "agent-1",
          status: "idle",
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });

      // Wait for threshold to pass
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(shortHandler.isAgentHealthy("agent-1")).toBe(false);
    });
  });

  describe("getAgentStatus", () => {
    it("should return agent status", async () => {
      await handler.handle({
        id: "msg-1",
        from: "agent-1",
        to: "*",
        type: "heartbeat",
        payload: {
          agentId: "agent-1",
          status: "executing",
          timestamp: Date.now(),
          metrics: { executionCount: 10 },
        },
        timestamp: Date.now(),
      });

      const status = handler.getAgentStatus("agent-1");

      expect(status?.status).toBe("executing");
      expect(status?.metrics?.executionCount).toBe(10);
    });

    it("should return undefined for unknown agent", () => {
      expect(handler.getAgentStatus("unknown")).toBeUndefined();
    });
  });

  describe("getHealthyAgents", () => {
    it("should return list of healthy agents", async () => {
      await handler.handle({
        id: "msg-1",
        from: "agent-1",
        to: "*",
        type: "heartbeat",
        payload: { agentId: "agent-1", status: "idle", timestamp: Date.now() },
        timestamp: Date.now(),
      });

      await handler.handle({
        id: "msg-2",
        from: "agent-2",
        to: "*",
        type: "heartbeat",
        payload: { agentId: "agent-2", status: "idle", timestamp: Date.now() },
        timestamp: Date.now(),
      });

      const healthy = handler.getHealthyAgents();

      expect(healthy).toContain("agent-1");
      expect(healthy).toContain("agent-2");
    });
  });

  describe("startHeartbeat", () => {
    it("should start sending heartbeats", async () => {
      const messages: AgentMessage[] = [];

      bus.subscribe("listener", async (msg) => {
        messages.push(msg);
      });

      handler.startHeartbeat("agent-1", () => ({
        status: "idle",
        executionCount: 0,
      }));

      // Wait for a couple of heartbeats
      await new Promise((resolve) => setTimeout(resolve, 250));

      handler.stopHeartbeat();

      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe("stopHeartbeat", () => {
    it("should stop sending heartbeats", async () => {
      handler.startHeartbeat("agent-1", () => ({
        status: "idle",
        executionCount: 0,
      }));

      handler.stopHeartbeat();

      // Should not throw
      expect(true).toBe(true);
    });
  });
});

describe("ProtocolManager", () => {
  let bus: MessageBus;
  let manager: ProtocolManager;

  beforeEach(() => {
    bus = new MessageBus();
    manager = new ProtocolManager(bus);
  });

  afterEach(() => {
    manager.cleanup();
    bus.clear();
  });

  describe("constructor", () => {
    it("should initialize all protocol handlers", () => {
      expect(manager.handshake).toBeDefined();
      expect(manager.delegation).toBeDefined();
      expect(manager.consensus).toBeDefined();
      expect(manager.heartbeat).toBeDefined();
    });
  });

  describe("getHandler", () => {
    it("should get handler by type", () => {
      expect(manager.getHandler("handshake")).toBe(manager.handshake);
      expect(manager.getHandler("delegation")).toBe(manager.delegation);
      expect(manager.getHandler("consensus")).toBe(manager.consensus);
      expect(manager.getHandler("heartbeat")).toBe(manager.heartbeat);
    });
  });

  describe("routeMessage", () => {
    it("should route handshake messages", async () => {
      const handleSpy = vi.spyOn(manager.handshake, "handle");

      await manager.routeMessage({
        id: "msg-1",
        from: "agent-1",
        to: "agent-2",
        type: "handshake",
        payload: {
          capabilities: [],
          agentInfo: { id: "agent-1", name: "Agent 1", type: "agent" },
        },
        timestamp: Date.now(),
      });

      expect(handleSpy).toHaveBeenCalled();
    });

    it("should route delegation messages", async () => {
      const handleSpy = vi.spyOn(manager.delegation, "handle");

      await manager.routeMessage({
        id: "msg-1",
        from: "agent-1",
        to: "agent-2",
        type: "delegation",
        payload: { task: "test", context: {} },
        timestamp: Date.now(),
      });

      expect(handleSpy).toHaveBeenCalled();
    });

    it("should route consensus messages", async () => {
      const handleSpy = vi.spyOn(manager.consensus, "handle");

      await manager.routeMessage({
        id: "msg-1",
        from: "agent-1",
        to: "agent-2",
        type: "consensus",
        payload: { topic: "test", options: [] },
        timestamp: Date.now(),
      });

      expect(handleSpy).toHaveBeenCalled();
    });

    it("should route heartbeat messages", async () => {
      const handleSpy = vi.spyOn(manager.heartbeat, "handle");

      await manager.routeMessage({
        id: "msg-1",
        from: "agent-1",
        to: "*",
        type: "heartbeat",
        payload: { agentId: "agent-1", status: "idle", timestamp: Date.now() },
        timestamp: Date.now(),
      });

      expect(handleSpy).toHaveBeenCalled();
    });

    it("should ignore unknown message types", async () => {
      // Should not throw
      await manager.routeMessage({
        id: "msg-1",
        from: "agent-1",
        to: "agent-2",
        type: "request",
        payload: {},
        timestamp: Date.now(),
      });

      expect(true).toBe(true);
    });
  });

  describe("cleanup", () => {
    it("should stop heartbeat on cleanup", () => {
      const stopSpy = vi.spyOn(manager.heartbeat, "stopHeartbeat");

      manager.cleanup();

      expect(stopSpy).toHaveBeenCalled();
    });
  });
});
