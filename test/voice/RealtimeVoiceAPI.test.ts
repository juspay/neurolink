/**
 * Realtime Voice API Tests
 *
 * Unit tests for Realtime voice processor and handler interface.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  RealtimeProcessor,
  BaseRealtimeHandler,
  type RealtimeHandler,
} from "../../src/lib/voice/RealtimeVoiceAPI.js";
import { RealtimeError, REALTIME_ERROR_CODES } from "../../src/lib/voice/errors.js";
import type {
  RealtimeConfig,
  RealtimeSession,
  RealtimeAudioChunk,
  RealtimeEventHandlers,
  AudioFormat,
} from "../../src/lib/voice/types/voiceTypes.js";

/**
 * Mock Realtime Handler for testing
 */
class MockRealtimeHandler extends BaseRealtimeHandler {
  readonly name = "mock-realtime";
  private configured = true;

  connect = vi.fn(async (config: RealtimeConfig): Promise<RealtimeSession> => {
    this.session = this.createSession(`session-${Date.now()}`, config);
    this.emitStateChange("connected");
    return this.session;
  });

  disconnect = vi.fn(async (): Promise<void> => {
    this.emitStateChange("disconnecting");
    this.session = null;
    this.emitStateChange("disconnected");
  });

  sendAudio = vi.fn(async (_audio: Buffer | RealtimeAudioChunk): Promise<void> => {
    // Mock audio sending
  });

  sendText = vi.fn(async (text: string): Promise<void> => {
    // Mock text sending
    this.emitText(`Response to: ${text}`, true);
  });

  triggerResponse = vi.fn(async (): Promise<void> => {
    // Mock response trigger
  });

  cancelResponse = vi.fn(async (): Promise<void> => {
    // Mock response cancellation
  });

  isConfigured(): boolean {
    return this.configured;
  }

  setConfigured(configured: boolean): void {
    this.configured = configured;
  }

  getSupportedFormats(): AudioFormat[] {
    return ["opus", "wav"];
  }

  // Test helpers
  simulateAudio(chunk: RealtimeAudioChunk): void {
    this.emitAudio(chunk);
  }

  simulateTranscript(text: string, isFinal: boolean): void {
    this.emitTranscript(text, isFinal);
  }

  simulateError(error: Error): void {
    this.emitError(error);
  }

  simulateTurnStart(): void {
    this.emitTurnStart();
  }

  simulateTurnEnd(): void {
    this.emitTurnEnd();
  }
}

describe("RealtimeProcessor", () => {
  beforeEach(() => {
    RealtimeProcessor.clearHandlers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("registerHandler", () => {
    it("should register a realtime handler", () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("mock", handler);

      expect(RealtimeProcessor.supports("mock")).toBe(true);
    });

    it("should normalize provider names to lowercase", () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("MOCK", handler);

      expect(RealtimeProcessor.supports("mock")).toBe(true);
      expect(RealtimeProcessor.supports("MOCK")).toBe(true);
    });

    it("should throw error when provider name is empty", () => {
      const handler = new MockRealtimeHandler();

      expect(() => RealtimeProcessor.registerHandler("", handler)).toThrow(
        "Provider name is required",
      );
    });

    it("should throw error when handler is null", () => {
      expect(() =>
        RealtimeProcessor.registerHandler("mock", null as unknown as RealtimeHandler),
      ).toThrow("Handler is required");
    });
  });

  describe("supports", () => {
    it("should return true for registered providers", () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("openai", handler);

      expect(RealtimeProcessor.supports("openai")).toBe(true);
    });

    it("should return false for unregistered providers", () => {
      expect(RealtimeProcessor.supports("unknown")).toBe(false);
    });
  });

  describe("getProviders", () => {
    it("should return list of registered providers", () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("provider1", handler);
      RealtimeProcessor.registerHandler("provider2", handler);

      const providers = RealtimeProcessor.getProviders();

      expect(providers).toContain("provider1");
      expect(providers).toContain("provider2");
    });
  });

  describe("connect", () => {
    it("should connect to a session successfully", async () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("mock", handler);

      const session = await RealtimeProcessor.connect("mock", {
        provider: "openai",
        voice: "alloy",
      });

      expect(session.id).toBeDefined();
      expect(session.state).toBe("connected");
      expect(handler.connect).toHaveBeenCalled();
    });

    it("should register event handlers when provided", async () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("mock", handler);

      const onAudio = vi.fn();
      const onTranscript = vi.fn();

      await RealtimeProcessor.connect(
        "mock",
        { provider: "openai" },
        { onAudio, onTranscript },
      );

      // Simulate receiving audio
      handler.simulateAudio({
        data: Buffer.from("audio data"),
        index: 0,
        isFinal: false,
        format: "opus",
      });

      expect(onAudio).toHaveBeenCalled();
    });

    it("should throw error for unsupported provider", async () => {
      await expect(
        RealtimeProcessor.connect("unknown", { provider: "openai" }),
      ).rejects.toThrow(RealtimeError);

      await expect(
        RealtimeProcessor.connect("unknown", { provider: "openai" }),
      ).rejects.toMatchObject({
        code: REALTIME_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
      });
    });

    it("should throw error for unconfigured provider", async () => {
      const handler = new MockRealtimeHandler();
      handler.setConfigured(false);
      RealtimeProcessor.registerHandler("mock", handler);

      await expect(
        RealtimeProcessor.connect("mock", { provider: "openai" }),
      ).rejects.toMatchObject({
        code: REALTIME_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      });
    });

    it("should throw error when session already active", async () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("mock", handler);

      await RealtimeProcessor.connect("mock", { provider: "openai" });

      await expect(
        RealtimeProcessor.connect("mock", { provider: "openai" }),
      ).rejects.toMatchObject({
        code: REALTIME_ERROR_CODES.SESSION_ALREADY_ACTIVE,
      });
    });
  });

  describe("disconnect", () => {
    it("should disconnect successfully", async () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("mock", handler);

      await RealtimeProcessor.connect("mock", { provider: "openai" });
      await RealtimeProcessor.disconnect("mock");

      expect(handler.disconnect).toHaveBeenCalled();
      expect(RealtimeProcessor.isConnected("mock")).toBe(false);
    });

    it("should handle disconnect when no active session", async () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("mock", handler);

      // Should not throw
      await RealtimeProcessor.disconnect("mock");
    });

    it("should throw error for unsupported provider", async () => {
      await expect(RealtimeProcessor.disconnect("unknown")).rejects.toThrow(
        RealtimeError,
      );
    });
  });

  describe("sendAudio", () => {
    it("should send audio successfully", async () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("mock", handler);

      await RealtimeProcessor.connect("mock", { provider: "openai" });
      await RealtimeProcessor.sendAudio("mock", Buffer.from("audio data"));

      expect(handler.sendAudio).toHaveBeenCalled();
    });

    it("should throw error when no active session", async () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("mock", handler);

      await expect(
        RealtimeProcessor.sendAudio("mock", Buffer.from("audio")),
      ).rejects.toMatchObject({
        code: REALTIME_ERROR_CODES.SESSION_NOT_ACTIVE,
      });
    });

    it("should accept RealtimeAudioChunk", async () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("mock", handler);

      await RealtimeProcessor.connect("mock", { provider: "openai" });

      const chunk: RealtimeAudioChunk = {
        data: Buffer.from("audio"),
        index: 0,
        isFinal: false,
        format: "opus",
        sampleRate: 24000,
      };

      await RealtimeProcessor.sendAudio("mock", chunk);

      expect(handler.sendAudio).toHaveBeenCalledWith(chunk);
    });
  });

  describe("sendText", () => {
    it("should send text successfully", async () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("mock", handler);

      await RealtimeProcessor.connect("mock", { provider: "openai" });
      await RealtimeProcessor.sendText("mock", "Hello, AI!");

      expect(handler.sendText).toHaveBeenCalledWith("Hello, AI!");
    });

    it("should throw error when no active session", async () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("mock", handler);

      await expect(
        RealtimeProcessor.sendText("mock", "Hello"),
      ).rejects.toMatchObject({
        code: REALTIME_ERROR_CODES.SESSION_NOT_ACTIVE,
      });
    });
  });

  describe("triggerResponse", () => {
    it("should trigger response successfully", async () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("mock", handler);

      await RealtimeProcessor.connect("mock", { provider: "openai" });
      await RealtimeProcessor.triggerResponse("mock");

      expect(handler.triggerResponse).toHaveBeenCalled();
    });
  });

  describe("cancelResponse", () => {
    it("should cancel response successfully", async () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("mock", handler);

      await RealtimeProcessor.connect("mock", { provider: "openai" });
      await RealtimeProcessor.cancelResponse("mock");

      expect(handler.cancelResponse).toHaveBeenCalled();
    });

    it("should not throw when no active session", async () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("mock", handler);

      await RealtimeProcessor.cancelResponse("mock");
      // Should not throw
    });
  });

  describe("getSession", () => {
    it("should return current session", async () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("mock", handler);

      await RealtimeProcessor.connect("mock", { provider: "openai" });

      const session = RealtimeProcessor.getSession("mock");

      expect(session).toBeDefined();
      expect(session?.state).toBe("connected");
    });

    it("should return null when no session", () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("mock", handler);

      expect(RealtimeProcessor.getSession("mock")).toBeNull();
    });
  });

  describe("isConnected", () => {
    it("should return true when connected", async () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("mock", handler);

      await RealtimeProcessor.connect("mock", { provider: "openai" });

      expect(RealtimeProcessor.isConnected("mock")).toBe(true);
    });

    it("should return false when not connected", () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("mock", handler);

      expect(RealtimeProcessor.isConnected("mock")).toBe(false);
    });
  });

  describe("getSupportedFormats", () => {
    it("should return supported formats", () => {
      const handler = new MockRealtimeHandler();
      RealtimeProcessor.registerHandler("mock", handler);

      const formats = RealtimeProcessor.getSupportedFormats("mock");

      expect(formats).toContain("opus");
      expect(formats).toContain("wav");
    });

    it("should return empty array for unknown provider", () => {
      expect(RealtimeProcessor.getSupportedFormats("unknown")).toEqual([]);
    });
  });
});

describe("BaseRealtimeHandler", () => {
  describe("event emission", () => {
    it("should emit audio events", async () => {
      const handler = new MockRealtimeHandler();
      const onAudio = vi.fn();

      handler.on({ onAudio });
      await handler.connect({ provider: "openai" });

      const chunk: RealtimeAudioChunk = {
        data: Buffer.from("test audio"),
        index: 0,
        isFinal: false,
        format: "opus",
      };

      handler.simulateAudio(chunk);

      expect(onAudio).toHaveBeenCalledWith(chunk);
    });

    it("should emit transcript events", async () => {
      const handler = new MockRealtimeHandler();
      const onTranscript = vi.fn();

      handler.on({ onTranscript });
      await handler.connect({ provider: "openai" });

      handler.simulateTranscript("Hello, world!", true);

      expect(onTranscript).toHaveBeenCalledWith("Hello, world!", true);
    });

    it("should emit state change events", async () => {
      const handler = new MockRealtimeHandler();
      const onStateChange = vi.fn();

      handler.on({ onStateChange });
      await handler.connect({ provider: "openai" });

      expect(onStateChange).toHaveBeenCalledWith("connected");
    });

    it("should emit error events", async () => {
      const handler = new MockRealtimeHandler();
      const onError = vi.fn();

      handler.on({ onError });
      await handler.connect({ provider: "openai" });

      const error = new Error("Test error");
      handler.simulateError(error);

      expect(onError).toHaveBeenCalledWith(error);
    });

    it("should emit turn events", async () => {
      const handler = new MockRealtimeHandler();
      const onTurnStart = vi.fn();
      const onTurnEnd = vi.fn();

      handler.on({ onTurnStart, onTurnEnd });
      await handler.connect({ provider: "openai" });

      handler.simulateTurnStart();
      expect(onTurnStart).toHaveBeenCalled();

      handler.simulateTurnEnd();
      expect(onTurnEnd).toHaveBeenCalled();
    });

    it("should clear event handlers on off()", async () => {
      const handler = new MockRealtimeHandler();
      const onAudio = vi.fn();

      handler.on({ onAudio });
      handler.off();

      handler.simulateAudio({
        data: Buffer.alloc(0),
        index: 0,
        isFinal: false,
        format: "opus",
      });

      expect(onAudio).not.toHaveBeenCalled();
    });
  });

  describe("session management", () => {
    it("should create session with correct properties", async () => {
      const handler = new MockRealtimeHandler();

      const session = await handler.connect({
        provider: "openai",
        model: "gpt-4o-realtime",
        voice: "alloy",
      });

      expect(session.id).toBeDefined();
      expect(session.state).toBe("connected");
      expect(session.provider).toBe("mock-realtime");
      expect(session.model).toBe("gpt-4o-realtime");
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.lastActivityAt).toBeInstanceOf(Date);
    });

    it("should update session state on disconnect", async () => {
      const handler = new MockRealtimeHandler();

      await handler.connect({ provider: "openai" });
      expect(handler.isConnected()).toBe(true);

      await handler.disconnect();
      expect(handler.isConnected()).toBe(false);
      expect(handler.getSession()).toBeNull();
    });
  });
});

describe("RealtimeHandler Interface", () => {
  it("should implement all required methods", () => {
    const handler = new MockRealtimeHandler();

    expect(handler.name).toBeDefined();
    expect(typeof handler.connect).toBe("function");
    expect(typeof handler.disconnect).toBe("function");
    expect(typeof handler.isConnected).toBe("function");
    expect(typeof handler.getSession).toBe("function");
    expect(typeof handler.sendAudio).toBe("function");
    expect(typeof handler.on).toBe("function");
    expect(typeof handler.off).toBe("function");
    expect(typeof handler.isConfigured).toBe("function");
    expect(typeof handler.getSupportedFormats).toBe("function");
  });

  it("should have optional methods", () => {
    const handler = new MockRealtimeHandler();

    expect(typeof handler.sendText).toBe("function");
    expect(typeof handler.triggerResponse).toBe("function");
    expect(typeof handler.cancelResponse).toBe("function");
  });
});
