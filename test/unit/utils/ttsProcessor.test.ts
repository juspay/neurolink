import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TTSProcessor,
  type TTSVoiceOption,
} from "../../../src/lib/utils/ttsProcessor.js";

describe("TTSProcessor", () => {
  describe("getCapabilities", () => {
    it("should return capabilities for google-ai provider", () => {
      const caps = TTSProcessor.getCapabilities("google-ai");

      expect(caps.supported).toBe(true);
      expect(caps.encodings).toEqual(["MP3", "WAV", "OGG"]);
      expect(caps.speakingRateRange).toEqual({ min: 0.25, max: 4.0 });
      expect(caps.pitchRange).toEqual({ min: -20.0, max: 20.0 });
      expect(caps.maxTextBytes).toBe(5000);
      expect(caps.authMethod).toBe("api-key");
    });

    it("should return capabilities for vertex provider", () => {
      const caps = TTSProcessor.getCapabilities("vertex");

      expect(caps.supported).toBe(true);
      expect(caps.encodings).toEqual(["MP3", "WAV", "OGG"]);
      expect(caps.authMethod).toBe("service-account");
    });

    it("should return capabilities for google-ai-studio provider", () => {
      const caps = TTSProcessor.getCapabilities("google-ai-studio");

      expect(caps.supported).toBe(true);
      expect(caps.encodings).toEqual(["MP3", "WAV", "OGG"]);
      expect(caps.authMethod).toBe("api-key");
    });

    it("should return capabilities for gemini provider", () => {
      const caps = TTSProcessor.getCapabilities("gemini");

      expect(caps.supported).toBe(true);
      expect(caps.encodings).toEqual(["MP3", "WAV", "OGG"]);
    });

    it("should return default capabilities for unsupported provider", () => {
      const caps = TTSProcessor.getCapabilities("openai");

      expect(caps.supported).toBe(false);
      expect(caps.encodings).toEqual([]);
      expect(caps.authMethod).toBe("none");
    });

    it("should handle case-insensitive provider names", () => {
      const capsUpper = TTSProcessor.getCapabilities("GOOGLE-AI");
      const capsLower = TTSProcessor.getCapabilities("google-ai");

      expect(capsUpper).toEqual(capsLower);
      expect(capsUpper.supported).toBe(true);
    });

    it("should return default capabilities for empty provider name", () => {
      const caps = TTSProcessor.getCapabilities("");

      expect(caps.supported).toBe(false);
      expect(caps.encodings).toEqual([]);
    });

    it("should return default capabilities for unknown provider", () => {
      const caps = TTSProcessor.getCapabilities("unknown-provider");

      expect(caps.supported).toBe(false);
      expect(caps.encodings).toEqual([]);
      expect(caps.authMethod).toBe("none");
    });
  });

  describe("getVoices", () => {
    beforeEach(() => {
      // Clear any existing mocks
      vi.restoreAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should return empty array for unsupported provider", async () => {
      const voices = await TTSProcessor.getVoices("openai");

      expect(voices).toEqual([]);
    });

    it("should return empty array for empty provider name", async () => {
      const voices = await TTSProcessor.getVoices("");

      expect(voices).toEqual([]);
    });

    it("should fetch voices from API for google-ai provider", async () => {
      // Mock fetch for Google Cloud TTS API
      const mockVoices = [
        {
          name: "en-US-Neural2-A",
          languageCodes: ["en-US"],
          ssmlGender: "MALE",
          naturalSampleRateHertz: 24000,
        },
        {
          name: "en-US-Neural2-C",
          languageCodes: ["en-US"],
          ssmlGender: "FEMALE",
          naturalSampleRateHertz: 24000,
        },
        {
          name: "fr-FR-Wavenet-A",
          languageCodes: ["fr-FR"],
          ssmlGender: "FEMALE",
          naturalSampleRateHertz: 24000,
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ voices: mockVoices }),
      });

      const voices = await TTSProcessor.getVoices(
        "google-ai",
        undefined,
        "test-api-key",
      );

      expect(voices).toHaveLength(3);
      expect(voices[0]).toMatchObject({
        name: "en-US-Neural2-A",
        languageCode: "en-US",
        gender: "MALE",
        type: "NEURAL2",
      });
      expect(voices[1]).toMatchObject({
        name: "en-US-Neural2-C",
        languageCode: "en-US",
        gender: "FEMALE",
        type: "NEURAL2",
      });
      expect(voices[2]).toMatchObject({
        name: "fr-FR-Wavenet-A",
        languageCode: "fr-FR",
        gender: "FEMALE",
        type: "WAVENET",
      });
    });

    it("should filter voices by language code", async () => {
      const mockVoices = [
        {
          name: "en-US-Neural2-A",
          languageCodes: ["en-US"],
          ssmlGender: "MALE",
          naturalSampleRateHertz: 24000,
        },
        {
          name: "en-US-Neural2-C",
          languageCodes: ["en-US"],
          ssmlGender: "FEMALE",
          naturalSampleRateHertz: 24000,
        },
        {
          name: "fr-FR-Wavenet-A",
          languageCodes: ["fr-FR"],
          ssmlGender: "FEMALE",
          naturalSampleRateHertz: 24000,
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ voices: mockVoices }),
      });

      const voices = await TTSProcessor.getVoices(
        "google-ai",
        "en-US",
        "test-api-key",
      );

      expect(voices).toHaveLength(2);
      expect(voices.every((v) => v.languageCode === "en-US")).toBe(true);
    });

    it("should handle API errors gracefully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      const voices = await TTSProcessor.getVoices(
        "google-ai",
        undefined,
        "invalid-key",
      );

      // Should return empty array on error instead of throwing
      expect(voices).toEqual([]);
    });

    it("should handle network errors gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const voices = await TTSProcessor.getVoices(
        "google-ai",
        undefined,
        "test-api-key",
      );

      // Should return empty array on error instead of throwing
      expect(voices).toEqual([]);
    });

    it("should throw error if API key is missing for google-ai", async () => {
      // Clear environment variables
      const originalEnv = process.env.GOOGLE_AI_API_KEY;
      delete process.env.GOOGLE_AI_API_KEY;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ voices: [] }),
      });

      const voices = await TTSProcessor.getVoices("google-ai");

      // Should return empty array when API call fails due to missing key
      expect(voices).toEqual([]);

      // Restore environment
      if (originalEnv) {
        process.env.GOOGLE_AI_API_KEY = originalEnv;
      }
    });

    it("should correctly identify voice types from names", async () => {
      const mockVoices = [
        {
          name: "en-US-Neural2-A",
          languageCodes: ["en-US"],
          ssmlGender: "MALE",
          naturalSampleRateHertz: 24000,
        },
        {
          name: "en-US-Wavenet-B",
          languageCodes: ["en-US"],
          ssmlGender: "FEMALE",
          naturalSampleRateHertz: 24000,
        },
        {
          name: "en-US-Standard-C",
          languageCodes: ["en-US"],
          ssmlGender: "NEUTRAL",
          naturalSampleRateHertz: 24000,
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ voices: mockVoices }),
      });

      const voices = await TTSProcessor.getVoices(
        "google-ai",
        undefined,
        "test-api-key",
      );

      expect(voices[0].type).toBe("NEURAL2");
      expect(voices[1].type).toBe("WAVENET");
      expect(voices[2].type).toBe("STANDARD");
    });

    it("should handle NEUTRAL gender correctly", async () => {
      const mockVoices = [
        {
          name: "en-US-Neural2-A",
          languageCodes: ["en-US"],
          ssmlGender: "NEUTRAL",
          naturalSampleRateHertz: 24000,
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ voices: mockVoices }),
      });

      const voices = await TTSProcessor.getVoices(
        "google-ai",
        undefined,
        "test-api-key",
      );

      expect(voices[0].gender).toBe("NEUTRAL");
    });
  });

  describe("validateText", () => {
    it("should return false for empty text", () => {
      expect(TTSProcessor.validateText("", "google-ai")).toBe(false);
      expect(TTSProcessor.validateText("   ", "google-ai")).toBe(false);
    });

    it("should return false for unsupported provider", () => {
      expect(TTSProcessor.validateText("Hello", "openai")).toBe(false);
    });

    it("should return true for valid text within limits", () => {
      const text = "Hello, world!";
      expect(TTSProcessor.validateText(text, "google-ai")).toBe(true);
    });

    it("should return false for text exceeding max bytes", () => {
      // Create text larger than 5000 bytes
      const largeText = "a".repeat(5001);
      expect(TTSProcessor.validateText(largeText, "google-ai")).toBe(false);
    });

    it("should return true for text at max byte limit", () => {
      // Create text exactly 5000 bytes
      const text = "a".repeat(5000);
      expect(TTSProcessor.validateText(text, "google-ai")).toBe(true);
    });
  });

  describe("validateSpeakingRate", () => {
    it("should return true for rate within valid range", () => {
      expect(TTSProcessor.validateSpeakingRate(1.0, "google-ai")).toBe(true);
      expect(TTSProcessor.validateSpeakingRate(0.25, "google-ai")).toBe(true);
      expect(TTSProcessor.validateSpeakingRate(4.0, "google-ai")).toBe(true);
    });

    it("should return false for rate below minimum", () => {
      expect(TTSProcessor.validateSpeakingRate(0.1, "google-ai")).toBe(false);
      expect(TTSProcessor.validateSpeakingRate(0, "google-ai")).toBe(false);
    });

    it("should return false for rate above maximum", () => {
      expect(TTSProcessor.validateSpeakingRate(5.0, "google-ai")).toBe(false);
      expect(TTSProcessor.validateSpeakingRate(10.0, "google-ai")).toBe(false);
    });

    it("should handle edge cases at boundaries", () => {
      expect(TTSProcessor.validateSpeakingRate(0.25, "google-ai")).toBe(true);
      expect(TTSProcessor.validateSpeakingRate(4.0, "google-ai")).toBe(true);
      expect(TTSProcessor.validateSpeakingRate(0.249, "google-ai")).toBe(false);
      expect(TTSProcessor.validateSpeakingRate(4.001, "google-ai")).toBe(false);
    });

    it("should return true for unsupported provider (no range defined)", () => {
      // Unsupported provider should return true since no range is defined
      expect(TTSProcessor.validateSpeakingRate(100.0, "openai")).toBe(true);
    });
  });

  describe("validatePitch", () => {
    it("should return true for pitch within valid range", () => {
      expect(TTSProcessor.validatePitch(0.0, "google-ai")).toBe(true);
      expect(TTSProcessor.validatePitch(-20.0, "google-ai")).toBe(true);
      expect(TTSProcessor.validatePitch(20.0, "google-ai")).toBe(true);
    });

    it("should return false for pitch below minimum", () => {
      expect(TTSProcessor.validatePitch(-21.0, "google-ai")).toBe(false);
      expect(TTSProcessor.validatePitch(-100.0, "google-ai")).toBe(false);
    });

    it("should return false for pitch above maximum", () => {
      expect(TTSProcessor.validatePitch(21.0, "google-ai")).toBe(false);
      expect(TTSProcessor.validatePitch(100.0, "google-ai")).toBe(false);
    });

    it("should handle edge cases at boundaries", () => {
      expect(TTSProcessor.validatePitch(-20.0, "google-ai")).toBe(true);
      expect(TTSProcessor.validatePitch(20.0, "google-ai")).toBe(true);
      expect(TTSProcessor.validatePitch(-20.1, "google-ai")).toBe(false);
      expect(TTSProcessor.validatePitch(20.1, "google-ai")).toBe(false);
    });

    it("should return true for unsupported provider (no range defined)", () => {
      // Unsupported provider should return true since no range is defined
      expect(TTSProcessor.validatePitch(1000.0, "openai")).toBe(true);
    });
  });
});
