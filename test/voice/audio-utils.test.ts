/**
 * Audio Utilities Tests
 *
 * Unit tests for audio format detection, conversion, and streaming utilities.
 */

import { describe, it, expect } from "vitest";
import {
  detectAudioFormat,
  calculateDuration,
  createPcmBuffer,
  extractPcmSamples,
  resamplePcm,
  normalizeAudio,
  createWavHeader,
  createWavFile,
  splitIntoChunks,
  AUDIO_SIGNATURES,
  MIME_TYPES,
} from "../../src/lib/voice/audio-utils.js";

describe("Audio Utilities", () => {
  describe("detectAudioFormat", () => {
    it("should detect WAV format", () => {
      // WAV header: RIFF....WAVE
      const wavBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x00, 0x00, 0x00, 0x00, // file size
        0x57, 0x41, 0x56, 0x45, // WAVE
      ]);

      expect(detectAudioFormat(wavBuffer)).toBe("wav");
    });

    it("should detect MP3 format with ID3 header", () => {
      // ID3 header
      const mp3Buffer = Buffer.from([0x49, 0x44, 0x33, 0x00, 0x00]);

      expect(detectAudioFormat(mp3Buffer)).toBe("mp3");
    });

    it("should detect MP3 format with frame sync", () => {
      // MP3 frame sync
      const mp3Buffer = Buffer.from([0xff, 0xfb, 0x90, 0x00]);

      expect(detectAudioFormat(mp3Buffer)).toBe("mp3");
    });

    it("should detect OGG format", () => {
      // OggS header
      const oggBuffer = Buffer.from([0x4f, 0x67, 0x67, 0x53, 0x00]);

      expect(detectAudioFormat(oggBuffer)).toBe("ogg");
    });

    it("should detect OPUS format in OGG container", () => {
      // OggS with OpusHead
      const opusBuffer = Buffer.alloc(36);
      opusBuffer.write("OggS", 0);
      opusBuffer.write("OpusHead", 28);

      expect(detectAudioFormat(opusBuffer)).toBe("opus");
    });

    it("should return null for unknown format", () => {
      const unknownBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);

      expect(detectAudioFormat(unknownBuffer)).toBeNull();
    });

    it("should return null for empty buffer", () => {
      expect(detectAudioFormat(Buffer.alloc(0))).toBeNull();
    });

    it("should return null for buffer too small", () => {
      expect(detectAudioFormat(Buffer.from([0x52]))).toBeNull();
    });
  });

  describe("calculateDuration", () => {
    it("should calculate duration for WAV format", () => {
      // 16000 samples/sec, 2 bytes/sample, 1 channel = 32000 bytes/sec
      // 64000 bytes = 2 seconds
      const sampleRate = 16000;
      const bytesPerSample = 2;
      const bufferSize = 64000;
      const buffer = Buffer.alloc(bufferSize);

      const duration = calculateDuration(buffer, "wav", sampleRate);

      expect(duration).toBeCloseTo(2.0, 1);
    });

    it("should calculate duration with custom bytes per sample", () => {
      const sampleRate = 24000;
      const buffer = Buffer.alloc(48000); // 1 second at 24kHz mono 16-bit

      const duration = calculateDuration(buffer, "wav", sampleRate);

      expect(duration).toBeCloseTo(1.0, 1);
    });

    it("should return 0 for empty buffer", () => {
      expect(calculateDuration(Buffer.alloc(0), "wav", 16000)).toBe(0);
    });

    it("should handle MP3 format (estimate)", () => {
      const buffer = Buffer.alloc(128000); // ~10 seconds at 128kbps

      const duration = calculateDuration(buffer, "mp3", 16000);

      expect(duration).toBeGreaterThan(0);
    });
  });

  describe("createPcmBuffer", () => {
    it("should create PCM buffer from samples", () => {
      const samples = [0, 0.5, 1.0, -0.5, -1.0];
      const buffer = createPcmBuffer(samples);

      expect(buffer.length).toBe(samples.length * 2); // 16-bit = 2 bytes/sample
    });

    it("should handle empty array", () => {
      const buffer = createPcmBuffer([]);

      expect(buffer.length).toBe(0);
    });

    it("should clamp values outside [-1, 1]", () => {
      const samples = [2.0, -2.0];
      const buffer = createPcmBuffer(samples);

      // Read as 16-bit signed integers
      expect(buffer.readInt16LE(0)).toBe(32767); // Clamped to max
      expect(buffer.readInt16LE(2)).toBe(-32768); // Clamped to min
    });
  });

  describe("extractPcmSamples", () => {
    it("should extract samples from PCM buffer", () => {
      const originalSamples = [0, 0.5, -0.5];
      const buffer = createPcmBuffer(originalSamples);

      const extracted = extractPcmSamples(buffer);

      expect(extracted.length).toBe(originalSamples.length);
      expect(extracted[0]).toBeCloseTo(0, 2);
      expect(extracted[1]).toBeCloseTo(0.5, 1);
      expect(extracted[2]).toBeCloseTo(-0.5, 1);
    });

    it("should handle empty buffer", () => {
      const samples = extractPcmSamples(Buffer.alloc(0));

      expect(samples).toEqual([]);
    });
  });

  describe("resamplePcm", () => {
    it("should upsample PCM data", () => {
      const samples = [0, 0.5, 1.0, 0.5, 0];
      const buffer = createPcmBuffer(samples);

      const resampled = resamplePcm(buffer, 16000, 32000);

      // Upsampling doubles the length
      expect(resampled.length).toBe(buffer.length * 2);
    });

    it("should downsample PCM data", () => {
      const samples = new Array(100).fill(0).map((_, i) => Math.sin(i / 10));
      const buffer = createPcmBuffer(samples);

      const resampled = resamplePcm(buffer, 32000, 16000);

      // Downsampling halves the length
      expect(resampled.length).toBe(buffer.length / 2);
    });

    it("should return same buffer when rates are equal", () => {
      const samples = [0, 0.5, 1.0];
      const buffer = createPcmBuffer(samples);

      const resampled = resamplePcm(buffer, 16000, 16000);

      expect(resampled.length).toBe(buffer.length);
    });
  });

  describe("normalizeAudio", () => {
    it("should normalize audio to target peak", () => {
      // Audio with peak at 0.5
      const samples = [0, 0.25, 0.5, 0.25, 0];
      const buffer = createPcmBuffer(samples);

      const normalized = normalizeAudio(buffer, 1.0);
      const normalizedSamples = extractPcmSamples(normalized);

      // Peak should now be close to 1.0
      const peak = Math.max(...normalizedSamples.map(Math.abs));
      expect(peak).toBeCloseTo(1.0, 1);
    });

    it("should handle silent audio", () => {
      const buffer = Buffer.alloc(10);

      const normalized = normalizeAudio(buffer);

      expect(normalized.length).toBe(buffer.length);
    });

    it("should handle already normalized audio", () => {
      const samples = [0, 0.5, 1.0, 0.5, 0];
      const buffer = createPcmBuffer(samples);

      const normalized = normalizeAudio(buffer, 1.0);

      expect(normalized.length).toBe(buffer.length);
    });
  });

  describe("createWavHeader", () => {
    it("should create valid WAV header", () => {
      const header = createWavHeader(44100, 16, 2, 88200);

      // Check RIFF signature
      expect(header.slice(0, 4).toString()).toBe("RIFF");
      // Check WAVE signature
      expect(header.slice(8, 12).toString()).toBe("WAVE");
      // Check fmt signature
      expect(header.slice(12, 16).toString()).toBe("fmt ");
      // Check data signature
      expect(header.slice(36, 40).toString()).toBe("data");
    });

    it("should create 44-byte header", () => {
      const header = createWavHeader(16000, 16, 1, 32000);

      expect(header.length).toBe(44);
    });

    it("should encode sample rate correctly", () => {
      const sampleRate = 48000;
      const header = createWavHeader(sampleRate, 16, 1, 1000);

      expect(header.readUInt32LE(24)).toBe(sampleRate);
    });

    it("should encode channel count correctly", () => {
      const header = createWavHeader(16000, 16, 2, 1000);

      expect(header.readUInt16LE(22)).toBe(2);
    });

    it("should encode bits per sample correctly", () => {
      const header = createWavHeader(16000, 24, 1, 1000);

      expect(header.readUInt16LE(34)).toBe(24);
    });
  });

  describe("createWavFile", () => {
    it("should create complete WAV file", () => {
      const samples = [0, 0.5, 1.0, 0.5, 0];
      const pcmBuffer = createPcmBuffer(samples);

      const wavFile = createWavFile(pcmBuffer, 16000, 16, 1);

      // Should have header + data
      expect(wavFile.length).toBe(44 + pcmBuffer.length);
      // Check RIFF signature
      expect(wavFile.slice(0, 4).toString()).toBe("RIFF");
    });

    it("should use default parameters", () => {
      const pcmBuffer = Buffer.alloc(100);

      const wavFile = createWavFile(pcmBuffer);

      expect(wavFile.length).toBe(44 + 100);
    });
  });

  describe("splitIntoChunks", () => {
    it("should split buffer into equal chunks", () => {
      const buffer = Buffer.alloc(1000);
      const chunkSize = 200;

      const chunks = splitIntoChunks(buffer, chunkSize);

      expect(chunks.length).toBe(5);
      chunks.forEach((chunk) => {
        expect(chunk.length).toBe(chunkSize);
      });
    });

    it("should handle non-even division", () => {
      const buffer = Buffer.alloc(1000);
      const chunkSize = 300;

      const chunks = splitIntoChunks(buffer, chunkSize);

      expect(chunks.length).toBe(4);
      expect(chunks[0].length).toBe(300);
      expect(chunks[1].length).toBe(300);
      expect(chunks[2].length).toBe(300);
      expect(chunks[3].length).toBe(100); // Last chunk is smaller
    });

    it("should return single chunk when buffer smaller than chunk size", () => {
      const buffer = Buffer.alloc(100);

      const chunks = splitIntoChunks(buffer, 200);

      expect(chunks.length).toBe(1);
      expect(chunks[0].length).toBe(100);
    });

    it("should handle empty buffer", () => {
      const chunks = splitIntoChunks(Buffer.alloc(0), 100);

      expect(chunks.length).toBe(0);
    });
  });

  describe("AUDIO_SIGNATURES", () => {
    it("should have WAV signature", () => {
      expect(AUDIO_SIGNATURES.wav).toBeDefined();
      expect(AUDIO_SIGNATURES.wav.primary).toEqual([0x52, 0x49, 0x46, 0x46]);
    });

    it("should have MP3 signatures", () => {
      expect(AUDIO_SIGNATURES.mp3).toBeDefined();
      expect(AUDIO_SIGNATURES.mp3.id3).toEqual([0x49, 0x44, 0x33]);
    });

    it("should have OGG signature", () => {
      expect(AUDIO_SIGNATURES.ogg).toBeDefined();
      expect(AUDIO_SIGNATURES.ogg.primary).toEqual([0x4f, 0x67, 0x67, 0x53]);
    });
  });

  describe("MIME_TYPES", () => {
    it("should have standard MIME types", () => {
      expect(MIME_TYPES.wav).toBe("audio/wav");
      expect(MIME_TYPES.mp3).toBe("audio/mpeg");
      expect(MIME_TYPES.ogg).toBe("audio/ogg");
      expect(MIME_TYPES.opus).toBe("audio/opus");
    });
  });
});
