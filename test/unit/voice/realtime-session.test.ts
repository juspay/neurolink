/**
 * Realtime Session Tests
 *
 * Tests for realtime voice session lifecycle and operations:
 * - Session creation and connection
 * - Audio send/receive
 * - Event handling
 * - Session close and cleanup
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isRealtimeAudioEvent,
  isRealtimeTextEvent,
  isRealtimeErrorEvent,
  isRealtimeFunctionCallEvent,
  REALTIME_ERROR_CODES,
} from "../../../src/lib/types/realtimeTypes.js";
import type {
  RealtimeEvent,
  RealtimeAudioEvent,
  RealtimeTextEvent,
  RealtimeErrorEvent,
  RealtimeFunctionCallEvent,
  RealtimeSession,
  RealtimeConfig,
  RealtimeEventType,
} from "../../../src/lib/types/realtimeTypes.js";
import { RealtimeError } from "../../../src/lib/voice/errors.js";

// Mock realtime session for testing
function createMockRealtimeSession(): RealtimeSession & {
  _eventHandlers: Map<string, Set<(event: RealtimeEvent) => void>>;
  _triggerEvent: (event: RealtimeEvent) => void;
  _isOpen: boolean;
} {
  const eventHandlers = new Map<string, Set<(event: RealtimeEvent) => void>>();
  let isOpen = true;

  return {
    id: `session-${Date.now()}`,
    _eventHandlers: eventHandlers,
    _isOpen: isOpen,

    sendAudio: vi.fn((audio: Buffer | ArrayBuffer) => {
      if (!isOpen) {
        throw new Error("Session is closed");
      }
      return audio;
    }),

    commitAudio: vi.fn(() => {
      if (!isOpen) {
        throw new Error("Session is closed");
      }
    }),

    clearAudio: vi.fn(() => {
      if (!isOpen) {
        throw new Error("Session is closed");
      }
    }),

    sendText: vi.fn((text: string) => {
      if (!isOpen) {
        throw new Error("Session is closed");
      }
      return text;
    }),

    createResponse: vi.fn(() => {
      if (!isOpen) {
        throw new Error("Session is closed");
      }
    }),

    cancelResponse: vi.fn(() => {
      if (!isOpen) {
        throw new Error("Session is closed");
      }
    }),

    updateSession: vi.fn((_config: Partial<RealtimeConfig>) => {
      if (!isOpen) {
        throw new Error("Session is closed");
      }
    }),

    on: (event: RealtimeEventType, handler: (event: RealtimeEvent) => void) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set());
      }
      eventHandlers.get(event)!.add(handler);
    },

    off: (
      event: RealtimeEventType,
      handler: (event: RealtimeEvent) => void,
    ) => {
      eventHandlers.get(event)?.delete(handler);
    },

    close: vi.fn(() => {
      isOpen = false;
    }),

    isOpen: () => isOpen,

    _triggerEvent: (event: RealtimeEvent) => {
      const handlers = eventHandlers.get(event.type);
      if (handlers) {
        handlers.forEach((handler) => handler(event));
      }
    },
  };
}

describe("Realtime Session Lifecycle", () => {
  let session: ReturnType<typeof createMockRealtimeSession>;

  beforeEach(() => {
    session = createMockRealtimeSession();
  });

  describe("Session Creation", () => {
    it("should create session with unique ID", () => {
      expect(session.id).toBeDefined();
      expect(session.id).toMatch(/^session-\d+$/);
    });

    it("should start in open state", () => {
      expect(session.isOpen()).toBe(true);
    });
  });

  describe("Audio Operations", () => {
    it("should send audio buffer", () => {
      const audio = Buffer.from("test audio data");

      session.sendAudio(audio);

      expect(session.sendAudio).toHaveBeenCalledWith(audio);
    });

    it("should send ArrayBuffer audio", () => {
      const arrayBuffer = new ArrayBuffer(100);

      session.sendAudio(arrayBuffer);

      expect(session.sendAudio).toHaveBeenCalledWith(arrayBuffer);
    });

    it("should commit audio buffer", () => {
      session.commitAudio();

      expect(session.commitAudio).toHaveBeenCalled();
    });

    it("should clear audio buffer", () => {
      session.clearAudio();

      expect(session.clearAudio).toHaveBeenCalled();
    });

    it("should throw when sending audio to closed session", () => {
      session.close();

      expect(() => session.sendAudio(Buffer.from("test"))).toThrow(
        "Session is closed",
      );
    });
  });

  describe("Text Operations", () => {
    it("should send text message", () => {
      session.sendText("Hello, assistant!");

      expect(session.sendText).toHaveBeenCalledWith("Hello, assistant!");
    });

    it("should throw when sending text to closed session", () => {
      session.close();

      expect(() => session.sendText("test")).toThrow("Session is closed");
    });
  });

  describe("Response Control", () => {
    it("should create response", () => {
      session.createResponse();

      expect(session.createResponse).toHaveBeenCalled();
    });

    it("should cancel response", () => {
      session.cancelResponse();

      expect(session.cancelResponse).toHaveBeenCalled();
    });
  });

  describe("Session Configuration", () => {
    it("should update session config", () => {
      const newConfig: Partial<RealtimeConfig> = {
        voice: "alloy",
        temperature: 0.8,
      };

      session.updateSession(newConfig);

      expect(session.updateSession).toHaveBeenCalledWith(newConfig);
    });
  });

  describe("Event Handling", () => {
    it("should register event handler", () => {
      const handler = vi.fn();

      session.on("response.audio.delta", handler);

      // Trigger event
      session._triggerEvent({
        type: "response.audio.delta",
        data: { audio: "base64data" },
      });

      expect(handler).toHaveBeenCalled();
    });

    it("should unregister event handler", () => {
      const handler = vi.fn();

      session.on("response.text.delta", handler);
      session.off("response.text.delta", handler);

      session._triggerEvent({
        type: "response.text.delta",
        data: { text: "Hello" },
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it("should handle multiple event handlers", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      session.on("response.audio.delta", handler1);
      session.on("response.audio.delta", handler2);

      session._triggerEvent({
        type: "response.audio.delta",
        data: { audio: "data" },
      });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it("should handle audio events", () => {
      const audioChunks: string[] = [];

      session.on("response.audio.delta", (event) => {
        const audioEvent = event as RealtimeAudioEvent;
        if (audioEvent.data?.audio) {
          audioChunks.push(audioEvent.data.audio);
        }
      });

      session._triggerEvent({
        type: "response.audio.delta",
        data: { audio: "chunk1" },
      });
      session._triggerEvent({
        type: "response.audio.delta",
        data: { audio: "chunk2" },
      });

      expect(audioChunks).toEqual(["chunk1", "chunk2"]);
    });

    it("should handle text events", () => {
      let text = "";

      session.on("response.text.delta", (event) => {
        const textEvent = event as RealtimeTextEvent;
        text += textEvent.data?.text ?? "";
      });

      session._triggerEvent({
        type: "response.text.delta",
        data: { text: "Hello " },
      });
      session._triggerEvent({
        type: "response.text.delta",
        data: { text: "World" },
      });

      expect(text).toBe("Hello World");
    });

    it("should handle error events", () => {
      const errors: Array<{ code: string; message: string }> = [];

      session.on("error", (event) => {
        const errorEvent = event as RealtimeErrorEvent;
        errors.push({
          code: errorEvent.data.code,
          message: errorEvent.data.message,
        });
      });

      session._triggerEvent({
        type: "error",
        data: { code: "rate_limit", message: "Rate limit exceeded" },
      });

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe("rate_limit");
    });
  });

  describe("Session Close", () => {
    it("should close session", () => {
      session.close();

      expect(session.close).toHaveBeenCalled();
      expect(session.isOpen()).toBe(false);
    });

    it("should prevent operations after close", () => {
      session.close();

      expect(() => session.commitAudio()).toThrow("Session is closed");
      expect(() => session.clearAudio()).toThrow("Session is closed");
      expect(() => session.createResponse()).toThrow("Session is closed");
      expect(() => session.updateSession({})).toThrow("Session is closed");
    });
  });
});

describe("Realtime Event Type Guards", () => {
  describe("isRealtimeAudioEvent", () => {
    it("should return true for audio.delta events", () => {
      const event: RealtimeEvent = {
        type: "response.audio.delta",
        data: { audio: "base64" },
      };

      expect(isRealtimeAudioEvent(event)).toBe(true);
    });

    it("should return true for audio.done events", () => {
      const event: RealtimeEvent = {
        type: "response.audio.done",
        data: {},
      };

      expect(isRealtimeAudioEvent(event)).toBe(true);
    });

    it("should return false for non-audio events", () => {
      const event: RealtimeEvent = {
        type: "response.text.delta",
        data: { text: "Hello" },
      };

      expect(isRealtimeAudioEvent(event)).toBe(false);
    });
  });

  describe("isRealtimeTextEvent", () => {
    it("should return true for text.delta events", () => {
      const event: RealtimeEvent = {
        type: "response.text.delta",
        data: { text: "Hello" },
      };

      expect(isRealtimeTextEvent(event)).toBe(true);
    });

    it("should return true for text.done events", () => {
      const event: RealtimeEvent = {
        type: "response.text.done",
        data: { text: "Complete" },
      };

      expect(isRealtimeTextEvent(event)).toBe(true);
    });

    it("should return false for non-text events", () => {
      const event: RealtimeEvent = {
        type: "response.audio.delta",
        data: { audio: "data" },
      };

      expect(isRealtimeTextEvent(event)).toBe(false);
    });
  });

  describe("isRealtimeErrorEvent", () => {
    it("should return true for error events", () => {
      const event: RealtimeEvent = {
        type: "error",
        data: { code: "test", message: "Test error" },
      };

      expect(isRealtimeErrorEvent(event)).toBe(true);
    });

    it("should return true for session.error events", () => {
      const event: RealtimeEvent = {
        type: "session.error",
        data: { code: "session_error", message: "Session failed" },
      };

      expect(isRealtimeErrorEvent(event)).toBe(true);
    });

    it("should return false for non-error events", () => {
      const event: RealtimeEvent = {
        type: "response.done",
        data: {},
      };

      expect(isRealtimeErrorEvent(event)).toBe(false);
    });
  });

  describe("isRealtimeFunctionCallEvent", () => {
    it("should return true for function_call.arguments.delta events", () => {
      const event: RealtimeEvent = {
        type: "response.function_call.arguments.delta",
        data: { callId: "123", name: "test", arguments: '{"key":' },
      };

      expect(isRealtimeFunctionCallEvent(event)).toBe(true);
    });

    it("should return true for function_call.arguments.done events", () => {
      const event: RealtimeEvent = {
        type: "response.function_call.arguments.done",
        data: { callId: "123", name: "test", arguments: '{"key": "value"}' },
      };

      expect(isRealtimeFunctionCallEvent(event)).toBe(true);
    });

    it("should return false for non-function call events", () => {
      const event: RealtimeEvent = {
        type: "response.done",
        data: {},
      };

      expect(isRealtimeFunctionCallEvent(event)).toBe(false);
    });
  });
});

describe("RealtimeError", () => {
  describe("static factory methods", () => {
    it("should create connectionFailed error", () => {
      const error = RealtimeError.connectionFailed(
        "Network unreachable",
        undefined,
        "openai-realtime",
      );

      expect(error.code).toBe(REALTIME_ERROR_CODES.CONNECTION_FAILED);
      expect(error.message).toContain("Network unreachable");
      expect(error.provider).toBe("openai-realtime");
    });

    it("should create connectionClosed error", () => {
      const error = RealtimeError.connectionClosed(
        "Server terminated",
        "session-123",
        "openai-realtime",
      );

      expect(error.code).toBe(REALTIME_ERROR_CODES.CONNECTION_CLOSED);
      expect(error.message).toContain("Server terminated");
      expect(error.sessionId).toBe("session-123");
    });

    it("should create sessionError", () => {
      const error = RealtimeError.sessionError(
        "invalid_format",
        "Audio format not supported",
        "session-456",
      );

      expect(error.code).toBe(REALTIME_ERROR_CODES.SESSION_ERROR);
      expect(error.message).toContain("invalid_format");
      expect(error.sessionId).toBe("session-456");
    });

    it("should create notConfigured error", () => {
      const error = RealtimeError.notConfigured("gemini-live");

      expect(error.code).toBe(REALTIME_ERROR_CODES.PROVIDER_NOT_CONFIGURED);
      expect(error.message).toContain("gemini-live");
    });

    it("should create timeout error", () => {
      const error = RealtimeError.timeout("connect", 30000, "openai-realtime");

      expect(error.code).toBe(REALTIME_ERROR_CODES.TIMEOUT);
      expect(error.message).toContain("30000ms");
    });
  });
});

describe("Realtime Error Codes", () => {
  it("should have all expected error codes", () => {
    expect(REALTIME_ERROR_CODES.CONNECTION_FAILED).toBeDefined();
    expect(REALTIME_ERROR_CODES.CONNECTION_CLOSED).toBeDefined();
    expect(REALTIME_ERROR_CODES.SESSION_ERROR).toBeDefined();
    expect(REALTIME_ERROR_CODES.AUDIO_SEND_FAILED).toBeDefined();
    expect(REALTIME_ERROR_CODES.PROVIDER_NOT_CONFIGURED).toBeDefined();
    expect(REALTIME_ERROR_CODES.INVALID_CONFIGURATION).toBeDefined();
    expect(REALTIME_ERROR_CODES.TIMEOUT).toBeDefined();
  });
});

describe("Connection Interruption Handling", () => {
  let session: ReturnType<typeof createMockRealtimeSession>;

  beforeEach(() => {
    session = createMockRealtimeSession();
  });

  it("should detect connection close via event", () => {
    let disconnected = false;

    session.on("session.error", () => {
      disconnected = true;
    });

    // Simulate connection error
    session._triggerEvent({
      type: "session.error",
      data: { code: "connection_lost", message: "Connection lost" },
    });

    expect(disconnected).toBe(true);
  });

  it("should handle unexpected close gracefully", () => {
    const onClose = vi.fn();

    // Register a handler that might run after close
    session.on("response.audio.delta", () => {
      // This should not throw even if session closes
    });

    session.close();

    // Verify session is closed
    expect(session.isOpen()).toBe(false);
  });

  it("should accumulate audio during session", () => {
    const audioChunks: Buffer[] = [];

    session.on("response.audio.delta", (event) => {
      const audioEvent = event as RealtimeAudioEvent;
      if (audioEvent.data?.audio) {
        audioChunks.push(Buffer.from(audioEvent.data.audio, "base64"));
      }
    });

    // Simulate receiving audio chunks
    session._triggerEvent({
      type: "response.audio.delta",
      data: { audio: Buffer.from("chunk1").toString("base64") },
    });
    session._triggerEvent({
      type: "response.audio.delta",
      data: { audio: Buffer.from("chunk2").toString("base64") },
    });
    session._triggerEvent({
      type: "response.audio.done",
      data: {},
    });

    expect(audioChunks).toHaveLength(2);
    expect(audioChunks[0].toString()).toBe("chunk1");
    expect(audioChunks[1].toString()).toBe("chunk2");
  });
});

describe("RealtimeConfig Validation", () => {
  const validConfig: RealtimeConfig = {
    model: "gpt-4o-realtime",
    voice: "alloy",
    inputFormat: {
      encoding: "pcm16",
      sampleRate: 24000,
      channels: 1,
    },
    outputFormat: {
      encoding: "pcm16",
      sampleRate: 24000,
    },
    instructions: "You are a helpful assistant",
    turnDetection: "server_vad",
    vadThreshold: 0.5,
    transcribeInput: true,
    maxResponseOutputTokens: 4096,
    temperature: 0.7,
  };

  it("should accept valid configuration", () => {
    // Type check - this should compile without errors
    const config: RealtimeConfig = validConfig;
    expect(config.model).toBe("gpt-4o-realtime");
    expect(config.voice).toBe("alloy");
  });

  it("should accept minimal configuration", () => {
    const minimalConfig: RealtimeConfig = {};
    expect(minimalConfig).toBeDefined();
  });

  it("should accept infinite max tokens", () => {
    const config: RealtimeConfig = {
      maxResponseOutputTokens: "inf",
    };
    expect(config.maxResponseOutputTokens).toBe("inf");
  });

  it("should accept all audio encodings", () => {
    const pcm16Config: RealtimeConfig = {
      inputFormat: { encoding: "pcm16", sampleRate: 16000, channels: 1 },
    };
    const g711UlawConfig: RealtimeConfig = {
      inputFormat: { encoding: "g711_ulaw", sampleRate: 8000, channels: 1 },
    };
    const g711AlawConfig: RealtimeConfig = {
      inputFormat: { encoding: "g711_alaw", sampleRate: 8000, channels: 1 },
    };

    expect(pcm16Config.inputFormat?.encoding).toBe("pcm16");
    expect(g711UlawConfig.inputFormat?.encoding).toBe("g711_ulaw");
    expect(g711AlawConfig.inputFormat?.encoding).toBe("g711_alaw");
  });
});
