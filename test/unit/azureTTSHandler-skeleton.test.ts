/**
 * Azure TTS Handler Skeleton Tests
 *
 * Tests to validate the AzureTTSHandler skeleton implementation.
 * This covers the TTS-015 implementation requirements.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AzureTTSHandler } from "../../src/lib/adapters/tts/azureTTSHandler.js";
import { TTSError, TTS_ERROR_CODES } from "../../src/lib/utils/ttsProcessor.js";

describe("AzureTTSHandler Skeleton - TTS-015", () => {
  describe("Constructor", () => {
    it("should create instance without parameters", () => {
      const handler = new AzureTTSHandler();
      expect(handler).toBeInstanceOf(AzureTTSHandler);
    });

    it("should accept optional key parameter", () => {
      const handler = new AzureTTSHandler("test-key");
      expect(handler).toBeInstanceOf(AzureTTSHandler);
    });

    it("should accept optional key and region parameters", () => {
      const handler = new AzureTTSHandler("test-key", "test-region");
      expect(handler).toBeInstanceOf(AzureTTSHandler);
    });

    it("should read from environment variables if no parameters provided", () => {
      // Save existing env vars
      const oldKey = process.env.AZURE_SPEECH_KEY;
      const oldRegion = process.env.AZURE_SPEECH_REGION;

      try {
        // Test without env vars
        delete process.env.AZURE_SPEECH_KEY;
        delete process.env.AZURE_SPEECH_REGION;

        const handler1 = new AzureTTSHandler();
        expect(handler1.isConfigured()).toBe(false);

        // Test with env vars
        process.env.AZURE_SPEECH_KEY = "env-test-key";
        process.env.AZURE_SPEECH_REGION = "env-test-region";

        const handler2 = new AzureTTSHandler();
        expect(handler2).toBeInstanceOf(AzureTTSHandler);
      } finally {
        // Restore env vars
        if (oldKey) {
          process.env.AZURE_SPEECH_KEY = oldKey;
        } else {
          delete process.env.AZURE_SPEECH_KEY;
        }

        if (oldRegion) {
          process.env.AZURE_SPEECH_REGION = oldRegion;
        } else {
          delete process.env.AZURE_SPEECH_REGION;
        }
      }
    });
  });

  describe("TTSHandler interface implementation", () => {
    it("should implement isConfigured method", () => {
      const handler = new AzureTTSHandler();
      expect(typeof handler.isConfigured).toBe("function");
      expect(typeof handler.isConfigured()).toBe("boolean");
    });

    it("should implement synthesize method", () => {
      const handler = new AzureTTSHandler();
      expect(typeof handler.synthesize).toBe("function");
    });

    it("should implement getVoices method", () => {
      const handler = new AzureTTSHandler();
      expect(typeof handler.getVoices).toBe("function");
    });

    it("should have maxTextLength property", () => {
      const handler = new AzureTTSHandler();
      expect(typeof handler.maxTextLength).toBe("number");
      expect(handler.maxTextLength).toBeGreaterThan(0);
    });
  });

  describe("isConfigured", () => {
    it("should return false when credentials not provided", () => {
      const handler = new AzureTTSHandler();
      expect(handler.isConfigured()).toBe(false);
    });

    it("should return true when valid credentials provided", () => {
      const handler = new AzureTTSHandler("test-key", "test-region");
      // Should be true since we're creating a SpeechConfig (even if credentials are invalid)
      expect(handler.isConfigured()).toBe(true);
    });
  });

  describe("synthesize - Not Implemented", () => {
    it("should throw 'not configured' error when handler not configured", async () => {
      const handler = new AzureTTSHandler();

      await expect(
        handler.synthesize("Hello world", { enabled: true }),
      ).rejects.toThrow(TTSError);

      try {
        await handler.synthesize("Hello world", { enabled: true });
      } catch (err) {
        expect(err).toBeInstanceOf(TTSError);
        expect((err as TTSError).code).toBe(
          TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        );
      }
    });

    it("should throw 'not implemented yet' error when handler is configured", async () => {
      const handler = new AzureTTSHandler("test-key", "test-region");

      await expect(
        handler.synthesize("Hello world", { enabled: true }),
      ).rejects.toThrow(TTSError);

      try {
        await handler.synthesize("Hello world", { enabled: true });
      } catch (err) {
        expect(err).toBeInstanceOf(TTSError);
        expect((err as TTSError).code).toBe(TTS_ERROR_CODES.SYNTHESIS_FAILED);
        expect((err as TTSError).message).toContain("not implemented yet");
      }
    });
  });

  describe("getVoices - Not Implemented", () => {
    it("should throw 'not configured' error when handler not configured", async () => {
      const handler = new AzureTTSHandler();

      await expect(handler.getVoices()).rejects.toThrow(TTSError);

      try {
        await handler.getVoices();
      } catch (err) {
        expect(err).toBeInstanceOf(TTSError);
        expect((err as TTSError).code).toBe(
          TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        );
      }
    });

    it("should throw 'not implemented yet' error when handler is configured", async () => {
      const handler = new AzureTTSHandler("test-key", "test-region");

      await expect(handler.getVoices()).rejects.toThrow(TTSError);

      try {
        await handler.getVoices();
      } catch (err) {
        expect(err).toBeInstanceOf(TTSError);
        expect((err as TTSError).code).toBe(TTS_ERROR_CODES.SYNTHESIS_FAILED);
        expect((err as TTSError).message).toContain("not implemented yet");
      }
    });

    it("should accept optional languageCode parameter", async () => {
      const handler = new AzureTTSHandler("test-key", "test-region");

      await expect(handler.getVoices("en-US")).rejects.toThrow(TTSError);

      try {
        await handler.getVoices("en-US");
      } catch (err) {
        expect(err).toBeInstanceOf(TTSError);
        expect((err as TTSError).message).toContain("not implemented yet");
      }
    });
  });

  describe("maxTextLength property", () => {
    it("should have a reasonable default max text length", () => {
      const handler = new AzureTTSHandler();
      expect(handler.maxTextLength).toBe(10000);
    });

    it("should be greater than Google's limit (shows Azure supports longer text)", () => {
      const handler = new AzureTTSHandler();
      // Google has 5000 byte limit, Azure should support more
      expect(handler.maxTextLength).toBeGreaterThan(5000);
    });
  });
});
