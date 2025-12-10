import { describe, it, expect } from "vitest";
import type {
  FileType,
  FileDetectionResult,
  FileProcessingResult,
  AudioProcessorOptions,
  FileDetectorOptions,
} from "../../../src/lib/types/index.js";

describe("FileType exports from main index", () => {
  it("should export FileType with audio included", () => {
    const audioType: FileType = "audio";
    expect(audioType).toBe("audio");
  });

  it("should export AudioProcessorOptions", () => {
    const audioOptions: AudioProcessorOptions = {
      provider: "openai",
      transcriptionModel: "whisper-1",
      language: "en",
      maxDurationSeconds: 600,
    };

    expect(audioOptions.provider).toBe("openai");
    expect(audioOptions.transcriptionModel).toBe("whisper-1");
  });

  it("should allow audio in FileDetectorOptions.allowedTypes", () => {
    const options: FileDetectorOptions = {
      allowedTypes: ["audio", "image", "pdf"],
      audioOptions: {
        provider: "openai",
        language: "en",
      },
    };

    expect(options.allowedTypes).toContain("audio");
    expect(options.audioOptions?.provider).toBe("openai");
  });

  it("should allow audio in FileDetectionResult", () => {
    const result: FileDetectionResult = {
      type: "audio",
      mimeType: "audio/mpeg",
      extension: "mp3",
      source: "path",
      metadata: {
        confidence: 95,
        size: 1024000,
        filename: "test.mp3",
      },
    };

    expect(result.type).toBe("audio");
    expect(result.mimeType).toBe("audio/mpeg");
  });

  it("should allow audio in FileProcessingResult", () => {
    const result: FileProcessingResult = {
      type: "audio",
      content: Buffer.from("audio-data"),
      mimeType: "audio/wav",
      metadata: {
        confidence: 90,
        size: 2048000,
        filename: "recording.wav",
      },
    };

    expect(result.type).toBe("audio");
    expect(result.content).toBeInstanceOf(Buffer);
  });
});
