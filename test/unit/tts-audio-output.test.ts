/**
 * TTS Audio File Output Tests
 *
 * Tests to validate the CLI audio file saving functionality for TTS output.
 * This covers the TTS-024 implementation requirements.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  saveAudioToFile,
  formatFileSize,
  resolveOutputPath,
  normalizeOutputPath,
  ensureDirectoryExists,
  getAudioExtension,
} from "../../src/cli/utils/audioFileUtils.js";
import type { TTSResult, AudioFormat } from "../../src/lib/types/ttsTypes.js";
import { VALID_AUDIO_FORMATS } from "../../src/lib/types/ttsTypes.js";

describe("TTS Audio File Output - audioFileUtils", () => {
  // Test directory
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), `neurolink-tts-test-${Date.now()}`);
    await fs.promises.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("formatFileSize", () => {
    it("should format bytes correctly", () => {
      expect(formatFileSize(0)).toBe("0 B");
      expect(formatFileSize(512)).toBe("512 B");
    });

    it("should format kilobytes correctly", () => {
      expect(formatFileSize(1024)).toBe("1.0 KB");
      expect(formatFileSize(32768)).toBe("32.0 KB");
    });

    it("should format megabytes correctly", () => {
      expect(formatFileSize(1048576)).toBe("1.0 MB");
      expect(formatFileSize(1572864)).toBe("1.5 MB");
    });

    it("should format gigabytes correctly", () => {
      expect(formatFileSize(1073741824)).toBe("1.00 GB");
      expect(formatFileSize(2147483648)).toBe("2.00 GB");
    });
  });

  describe("resolveOutputPath", () => {
    it("should return absolute paths unchanged", () => {
      const absolutePath = "/home/user/audio.mp3";
      expect(resolveOutputPath(absolutePath)).toBe(absolutePath);
    });

    it("should resolve relative paths from cwd", () => {
      const relativePath = "output/audio.mp3";
      const resolved = resolveOutputPath(relativePath);
      expect(path.isAbsolute(resolved)).toBe(true);
      expect(resolved).toBe(path.resolve(process.cwd(), relativePath));
    });

    it("should handle dot-relative paths", () => {
      const dotPath = "./audio.mp3";
      const resolved = resolveOutputPath(dotPath);
      expect(path.isAbsolute(resolved)).toBe(true);
    });
  });

  describe("getAudioExtension", () => {
    it("should return correct extensions for all formats", () => {
      expect(getAudioExtension("mp3")).toBe(".mp3");
      expect(getAudioExtension("wav")).toBe(".wav");
      expect(getAudioExtension("ogg")).toBe(".ogg");
      expect(getAudioExtension("opus")).toBe(".opus");
    });

    it("should default to .mp3 for unknown formats", () => {
      // @ts-expect-error Testing invalid input
      expect(getAudioExtension("unknown")).toBe(".mp3");
    });
  });

  describe("normalizeOutputPath", () => {
    it("should add extension if missing", () => {
      const pathWithoutExt = path.join(testDir, "audio");
      const normalized = normalizeOutputPath(pathWithoutExt, "mp3");
      expect(normalized).toBe(path.join(testDir, "audio.mp3"));
    });

    it("should keep valid audio extension", () => {
      const pathWithExt = path.join(testDir, "audio.wav");
      const normalized = normalizeOutputPath(pathWithExt, "mp3");
      expect(normalized).toBe(path.join(testDir, "audio.wav"));
    });

    it("should handle paths with non-audio extensions", () => {
      const pathWithWrongExt = path.join(testDir, "audio.txt");
      const normalized = normalizeOutputPath(pathWithWrongExt, "ogg");
      expect(normalized).toBe(path.join(testDir, "audio.txt.ogg"));
    });
  });

  describe("ensureDirectoryExists", () => {
    it("should not throw for existing directories", async () => {
      const filePath = path.join(testDir, "audio.mp3");
      await expect(ensureDirectoryExists(filePath)).resolves.not.toThrow();
    });

    it("should create nested directories", async () => {
      const nestedPath = path.join(
        testDir,
        "deeply",
        "nested",
        "dir",
        "audio.mp3",
      );
      await ensureDirectoryExists(nestedPath);

      const dirPath = path.dirname(nestedPath);
      const stats = await fs.promises.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe("saveAudioToFile", () => {
    const createMockTTSResult = (
      content: string = "test audio content",
    ): TTSResult => ({
      buffer: Buffer.from(content),
      format: "mp3",
      size: Buffer.from(content).length,
    });

    it("should save audio file successfully", async () => {
      const audio = createMockTTSResult("Hello, this is test audio");
      const outputPath = path.join(testDir, "test-audio.mp3");

      const result = await saveAudioToFile(audio, outputPath);

      expect(result.success).toBe(true);
      expect(result.path).toBe(outputPath);
      expect(result.size).toBe(audio.buffer.length);

      // Verify file exists and has correct content
      const fileContent = await fs.promises.readFile(outputPath);
      expect(fileContent.toString()).toBe("Hello, this is test audio");
    });

    it("should support absolute paths", async () => {
      const audio = createMockTTSResult();
      const absolutePath = path.join(testDir, "absolute-test.mp3");

      const result = await saveAudioToFile(audio, absolutePath);

      expect(result.success).toBe(true);
      expect(result.path).toBe(absolutePath);
    });

    it("should support relative paths", async () => {
      const audio = createMockTTSResult();
      const originalCwd = process.cwd();

      try {
        // Change to test directory
        process.chdir(testDir);
        const relativePath = "./relative-test.mp3";

        const result = await saveAudioToFile(audio, relativePath);

        expect(result.success).toBe(true);
        expect(path.isAbsolute(result.path)).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("should create parent directories if needed", async () => {
      const audio = createMockTTSResult();
      const nestedPath = path.join(
        testDir,
        "new",
        "nested",
        "directory",
        "audio.mp3",
      );

      const result = await saveAudioToFile(audio, nestedPath);

      expect(result.success).toBe(true);
      expect(fs.existsSync(result.path)).toBe(true);
    });

    it("should add correct extension if missing", async () => {
      const audio = createMockTTSResult();
      audio.format = "wav";
      const pathWithoutExt = path.join(testDir, "no-extension");

      const result = await saveAudioToFile(audio, pathWithoutExt);

      expect(result.success).toBe(true);
      expect(result.path).toBe(path.join(testDir, "no-extension.wav"));
    });

    it("should handle different audio formats", async () => {
      for (const format of VALID_AUDIO_FORMATS) {
        const audio = createMockTTSResult(`audio in ${format} format`);
        audio.format = format;
        const outputPath = path.join(testDir, `test.${format}`);

        const result = await saveAudioToFile(audio, outputPath);

        expect(result.success).toBe(true);
        expect(result.path.endsWith(`.${format}`)).toBe(true);
      }
    });

    it("should return error for invalid path", async () => {
      const audio = createMockTTSResult();
      // Use a path that can't be written (null byte in path is invalid)
      const invalidPath = path.join(testDir, "\0invalid");

      const result = await saveAudioToFile(audio, invalidPath);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should preserve binary audio data", async () => {
      // Create binary buffer with non-text bytes
      const binaryData = Buffer.alloc(256);
      for (let i = 0; i < 256; i++) {
        binaryData[i] = i;
      }

      const audio: TTSResult = {
        buffer: binaryData,
        format: "mp3",
        size: binaryData.length,
      };
      const outputPath = path.join(testDir, "binary-audio.mp3");

      const result = await saveAudioToFile(audio, outputPath);

      expect(result.success).toBe(true);

      const savedData = await fs.promises.readFile(outputPath);
      expect(Buffer.compare(savedData, binaryData)).toBe(0);
    });
  });
});

describe("TTS Types", () => {
  describe("isTTSResult type guard", () => {
    it("should validate correct TTSResult objects", async () => {
      const { isTTSResult } = await import("../../src/lib/types/ttsTypes.js");

      const validResult: TTSResult = {
        buffer: Buffer.from("test"),
        format: "mp3",
        size: 4,
      };

      expect(isTTSResult(validResult)).toBe(true);
    });

    it("should reject invalid objects", async () => {
      const { isTTSResult } = await import("../../src/lib/types/ttsTypes.js");

      expect(isTTSResult(null)).toBe(false);
      expect(isTTSResult(undefined)).toBe(false);
      expect(isTTSResult({})).toBe(false);
      expect(isTTSResult({ buffer: "not a buffer" })).toBe(false);
      expect(isTTSResult({ buffer: Buffer.from("test"), format: 123 })).toBe(
        false,
      );
    });
  });

  describe("isValidTTSOptions type guard", () => {
    it("should validate correct TTSOptions", async () => {
      const { isValidTTSOptions } =
        await import("../../src/lib/types/ttsTypes.js");

      expect(isValidTTSOptions({})).toBe(true);
      expect(isValidTTSOptions({ enabled: true })).toBe(true);
      expect(isValidTTSOptions({ voice: "en-US-Neural2-C" })).toBe(true);
      expect(isValidTTSOptions({ format: "mp3" })).toBe(true);
      expect(isValidTTSOptions({ speed: 1.0 })).toBe(true);
      expect(isValidTTSOptions({ quality: "hd" })).toBe(true);
    });

    it("should reject invalid speed values", async () => {
      const { isValidTTSOptions } =
        await import("../../src/lib/types/ttsTypes.js");

      expect(isValidTTSOptions({ speed: 0.1 })).toBe(false); // Below 0.25
      expect(isValidTTSOptions({ speed: 5.0 })).toBe(false); // Above 4.0
      expect(isValidTTSOptions({ speed: -1 })).toBe(false); // Negative
    });

    it("should reject invalid format values", async () => {
      const { isValidTTSOptions } =
        await import("../../src/lib/types/ttsTypes.js");

      expect(isValidTTSOptions({ format: "invalid" })).toBe(false);
      expect(isValidTTSOptions({ format: "flac" })).toBe(false);
    });

    it("should reject invalid quality values", async () => {
      const { isValidTTSOptions } =
        await import("../../src/lib/types/ttsTypes.js");

      expect(isValidTTSOptions({ quality: "ultra" })).toBe(false);
      expect(isValidTTSOptions({ quality: "low" })).toBe(false);
    });
  });
});
