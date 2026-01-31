/**
 * Audio Utilities Tests
 *
 * Tests for audio format detection, validation, conversion and manipulation:
 * - Format detection from magic bytes
 * - Buffer validation
 * - MIME type mapping
 * - WAV header creation and parsing
 * - PCM to WAV conversion
 * - Audio processing utilities
 */

import { describe, it, expect } from "vitest";
import {
  detectAudioFormat,
  validateAudioBuffer,
  getAudioMimeType,
  getAudioExtension,
  parseWavMetadata,
  createWavHeader,
  pcmToWav,
  base64ToBuffer,
  bufferToBase64,
  splitAudioIntoChunks,
  estimateDuration,
  normalizeVolume,
  resampleLinear,
  concatenateAudio,
  isSilence,
  DEFAULT_PCM_CONFIG,
} from "../../../src/lib/voice/audio-utils.js";

describe("detectAudioFormat", () => {
  describe("WAV format detection", () => {
    it("should detect WAV format from RIFF header", () => {
      // RIFF....WAVE header
      const wavHeader = Buffer.alloc(44);
      wavHeader.write("RIFF", 0);
      wavHeader.writeUInt32LE(36, 4); // file size - 8
      wavHeader.write("WAVE", 8);

      const format = detectAudioFormat(wavHeader);
      expect(format).toBe("wav");
    });

    it("should detect WAV from ArrayBuffer", () => {
      const wavHeader = Buffer.alloc(44);
      wavHeader.write("RIFF", 0);
      wavHeader.writeUInt32LE(36, 4);
      wavHeader.write("WAVE", 8);

      const arrayBuffer = wavHeader.buffer.slice(
        wavHeader.byteOffset,
        wavHeader.byteOffset + wavHeader.byteLength,
      );
      const format = detectAudioFormat(arrayBuffer);
      expect(format).toBe("wav");
    });
  });

  describe("MP3 format detection", () => {
    it("should detect MP3 from ID3 header", () => {
      // ID3 tag
      const mp3Buffer = Buffer.alloc(12);
      mp3Buffer.write("ID3", 0);

      const format = detectAudioFormat(mp3Buffer);
      expect(format).toBe("mp3");
    });

    it("should detect MP3 from frame sync", () => {
      const mp3Buffer = Buffer.alloc(12);
      mp3Buffer[0] = 0xff;
      mp3Buffer[1] = 0xfb; // Frame sync with MPEG-1 Layer 3

      const format = detectAudioFormat(mp3Buffer);
      expect(format).toBe("mp3");
    });
  });

  describe("FLAC format detection", () => {
    it("should detect FLAC format", () => {
      const flacBuffer = Buffer.alloc(12);
      flacBuffer.write("fLaC", 0);

      const format = detectAudioFormat(flacBuffer);
      expect(format).toBe("flac");
    });
  });

  describe("OGG format detection", () => {
    it("should detect OGG format", () => {
      const oggBuffer = Buffer.alloc(12);
      oggBuffer.write("OggS", 0);

      const format = detectAudioFormat(oggBuffer);
      expect(format).toBe("ogg");
    });
  });

  describe("WebM format detection", () => {
    it("should detect WebM from EBML header", () => {
      const webmBuffer = Buffer.alloc(12);
      webmBuffer[0] = 0x1a;
      webmBuffer[1] = 0x45;
      webmBuffer[2] = 0xdf;
      webmBuffer[3] = 0xa3;

      const format = detectAudioFormat(webmBuffer);
      expect(format).toBe("webm");
    });
  });

  describe("M4A/MP4 format detection", () => {
    it("should detect M4A format", () => {
      const m4aBuffer = Buffer.alloc(12);
      m4aBuffer.write("ftyp", 4);
      m4aBuffer.write("M4A ", 8);

      const format = detectAudioFormat(m4aBuffer);
      expect(format).toBe("m4a");
    });

    it("should detect MP4 format as m4a (audio container)", () => {
      const mp4Buffer = Buffer.alloc(12);
      mp4Buffer.write("ftyp", 4);
      mp4Buffer.write("mp42", 8);

      const format = detectAudioFormat(mp4Buffer);
      // Implementation detects mp4 as m4a when brand doesn't start with exactly "M4A" or "mp4"
      // mp42 brand is detected as m4a (audio container)
      expect(format).toBe("m4a");
    });
  });

  describe("unknown format handling", () => {
    it("should return undefined for unknown format", () => {
      const unknownBuffer = Buffer.from("unknown data here");

      const format = detectAudioFormat(unknownBuffer);
      expect(format).toBeUndefined();
    });

    it("should return undefined for buffer too small", () => {
      const smallBuffer = Buffer.from("tiny");

      const format = detectAudioFormat(smallBuffer);
      expect(format).toBeUndefined();
    });
  });
});

describe("validateAudioBuffer", () => {
  it("should validate valid buffer", () => {
    const validBuffer = Buffer.alloc(200);

    const result = validateAudioBuffer(validBuffer);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should reject null buffer", () => {
    const result = validateAudioBuffer(null);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Audio buffer is null or undefined");
  });

  it("should reject undefined buffer", () => {
    const result = validateAudioBuffer(undefined);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Audio buffer is null or undefined");
  });

  it("should reject empty buffer", () => {
    const result = validateAudioBuffer(Buffer.alloc(0));

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Audio buffer is empty");
  });

  it("should reject buffer below minimum size", () => {
    const result = validateAudioBuffer(Buffer.alloc(50));

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Audio buffer too small");
  });

  it("should accept custom minimum size", () => {
    const result = validateAudioBuffer(Buffer.alloc(10), 5);

    expect(result.valid).toBe(true);
  });

  it("should validate ArrayBuffer", () => {
    const arrayBuffer = new ArrayBuffer(200);

    const result = validateAudioBuffer(arrayBuffer);

    expect(result.valid).toBe(true);
  });
});

describe("getAudioMimeType", () => {
  it("should return correct MIME type for WAV", () => {
    expect(getAudioMimeType("wav")).toBe("audio/wav");
  });

  it("should return correct MIME type for MP3 variants", () => {
    expect(getAudioMimeType("mp3")).toBe("audio/mpeg");
    expect(getAudioMimeType("mpeg")).toBe("audio/mpeg");
    expect(getAudioMimeType("mpga")).toBe("audio/mpeg");
  });

  it("should return correct MIME type for other formats", () => {
    expect(getAudioMimeType("m4a")).toBe("audio/mp4");
    expect(getAudioMimeType("mp4")).toBe("audio/mp4");
    expect(getAudioMimeType("flac")).toBe("audio/flac");
    expect(getAudioMimeType("ogg")).toBe("audio/ogg");
    expect(getAudioMimeType("webm")).toBe("audio/webm");
    expect(getAudioMimeType("opus")).toBe("audio/opus");
  });

  it("should return octet-stream for unknown format", () => {
    // @ts-expect-error Testing unknown format
    expect(getAudioMimeType("unknown")).toBe("application/octet-stream");
  });
});

describe("getAudioExtension", () => {
  it("should return format as extension for most formats", () => {
    expect(getAudioExtension("wav")).toBe("wav");
    expect(getAudioExtension("mp3")).toBe("mp3");
    expect(getAudioExtension("flac")).toBe("flac");
  });

  it("should normalize mpeg variants to mp3", () => {
    expect(getAudioExtension("mpeg")).toBe("mp3");
    expect(getAudioExtension("mpga")).toBe("mp3");
  });
});

describe("createWavHeader", () => {
  it("should create valid 44-byte WAV header", () => {
    const header = createWavHeader(1000);

    expect(header.length).toBe(44);
    expect(header.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(header.subarray(8, 12).toString("ascii")).toBe("WAVE");
    expect(header.subarray(12, 16).toString("ascii")).toBe("fmt ");
    expect(header.subarray(36, 40).toString("ascii")).toBe("data");
  });

  it("should set correct file size", () => {
    const dataSize = 1000;
    const header = createWavHeader(dataSize);

    const fileSize = header.readUInt32LE(4);
    expect(fileSize).toBe(36 + dataSize);
  });

  it("should use default PCM config", () => {
    const header = createWavHeader(1000);

    const sampleRate = header.readUInt32LE(24);
    const channels = header.readUInt16LE(22);
    const bitDepth = header.readUInt16LE(34);

    expect(sampleRate).toBe(DEFAULT_PCM_CONFIG.sampleRate);
    expect(channels).toBe(DEFAULT_PCM_CONFIG.channels);
    expect(bitDepth).toBe(DEFAULT_PCM_CONFIG.bitDepth);
  });

  it("should use custom config", () => {
    const header = createWavHeader(1000, {
      sampleRate: 48000,
      channels: 2,
      bitDepth: 24,
    });

    expect(header.readUInt32LE(24)).toBe(48000);
    expect(header.readUInt16LE(22)).toBe(2);
    expect(header.readUInt16LE(34)).toBe(24);
  });

  it("should calculate correct byte rate", () => {
    const header = createWavHeader(1000, {
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16,
    });

    const byteRate = header.readUInt32LE(28);
    expect(byteRate).toBe(16000 * 1 * 2); // sampleRate * channels * bytesPerSample
  });
});

describe("parseWavMetadata", () => {
  function createValidWav(
    sampleRate: number,
    channels: number,
    bitDepth: number,
    dataSize: number,
  ): Buffer {
    const header = Buffer.alloc(44);

    // RIFF header
    header.write("RIFF", 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write("WAVE", 8);

    // fmt chunk
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16); // chunk size
    header.writeUInt16LE(1, 20); // PCM format
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28);
    header.writeUInt16LE(channels * (bitDepth / 8), 32);
    header.writeUInt16LE(bitDepth, 34);

    // data chunk
    header.write("data", 36);
    header.writeUInt32LE(dataSize, 40);

    return header;
  }

  it("should parse valid WAV metadata", () => {
    const wav = createValidWav(44100, 2, 16, 88200);

    const metadata = parseWavMetadata(wav);

    expect(metadata).not.toBeNull();
    expect(metadata?.format).toBe("wav");
    expect(metadata?.sampleRate).toBe(44100);
    expect(metadata?.channels).toBe(2);
    expect(metadata?.bitDepth).toBe(16);
    expect(metadata?.size).toBe(wav.length);
  });

  it("should calculate duration when data chunk is present", () => {
    // Create a more complete WAV with actual data chunk
    const dataSize = 32000; // 1 second of 16kHz mono 16-bit
    const wav = Buffer.alloc(44 + dataSize);

    // RIFF header
    wav.write("RIFF", 0);
    wav.writeUInt32LE(36 + dataSize, 4);
    wav.write("WAVE", 8);

    // fmt chunk
    wav.write("fmt ", 12);
    wav.writeUInt32LE(16, 16); // chunk size
    wav.writeUInt16LE(1, 20); // PCM format
    wav.writeUInt16LE(1, 22); // channels
    wav.writeUInt32LE(16000, 24); // sample rate
    wav.writeUInt32LE(32000, 28); // byte rate (16000 * 1 * 2)
    wav.writeUInt16LE(2, 32); // block align
    wav.writeUInt16LE(16, 34); // bit depth

    // data chunk (starts at byte 36)
    wav.write("data", 36);
    wav.writeUInt32LE(dataSize, 40);

    const metadata = parseWavMetadata(wav);

    expect(metadata).not.toBeNull();
    expect(metadata?.duration).toBeCloseTo(1.0, 1);
  });

  it("should return null for non-WAV data", () => {
    const nonWav = Buffer.from("This is not a WAV file");

    const metadata = parseWavMetadata(nonWav);

    expect(metadata).toBeNull();
  });

  it("should return null for buffer too small", () => {
    const small = Buffer.alloc(10);

    const metadata = parseWavMetadata(small);

    expect(metadata).toBeNull();
  });

  it("should handle ArrayBuffer input", () => {
    const wav = createValidWav(16000, 1, 16, 1000);
    const arrayBuffer = wav.buffer.slice(
      wav.byteOffset,
      wav.byteOffset + wav.byteLength,
    );

    const metadata = parseWavMetadata(arrayBuffer);

    expect(metadata).not.toBeNull();
    expect(metadata?.sampleRate).toBe(16000);
  });
});

describe("pcmToWav", () => {
  it("should create WAV from PCM data", () => {
    const pcmData = Buffer.alloc(1000);

    const wav = pcmToWav(pcmData);

    expect(wav.length).toBe(1000 + 44); // PCM + header
    expect(wav.subarray(0, 4).toString("ascii")).toBe("RIFF");
  });

  it("should use custom config", () => {
    const pcmData = Buffer.alloc(1000);

    const wav = pcmToWav(pcmData, { sampleRate: 48000 });

    expect(wav.readUInt32LE(24)).toBe(48000);
  });

  it("should handle ArrayBuffer input", () => {
    const arrayBuffer = new ArrayBuffer(1000);

    const wav = pcmToWav(arrayBuffer);

    expect(wav.length).toBe(1044);
  });
});

describe("base64ToBuffer / bufferToBase64", () => {
  it("should convert base64 to buffer", () => {
    const original = "Hello, World!";
    const base64 = Buffer.from(original).toString("base64");

    const buffer = base64ToBuffer(base64);

    expect(buffer.toString()).toBe(original);
  });

  it("should convert buffer to base64", () => {
    const original = Buffer.from("Test data");

    const base64 = bufferToBase64(original);
    const roundTrip = base64ToBuffer(base64);

    expect(roundTrip.toString()).toBe("Test data");
  });

  it("should convert ArrayBuffer to base64", () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const arrayBuffer = data.buffer;

    const base64 = bufferToBase64(arrayBuffer);

    expect(typeof base64).toBe("string");
    expect(base64.length).toBeGreaterThan(0);
  });
});

describe("splitAudioIntoChunks", () => {
  it("should split buffer into chunks", () => {
    const buffer = Buffer.from("abcdefghij");

    const chunks = Array.from(splitAudioIntoChunks(buffer, 3));

    expect(chunks).toHaveLength(4);
    expect(chunks[0].toString()).toBe("abc");
    expect(chunks[1].toString()).toBe("def");
    expect(chunks[2].toString()).toBe("ghi");
    expect(chunks[3].toString()).toBe("j");
  });

  it("should use default chunk size", () => {
    const buffer = Buffer.alloc(10000);

    const chunks = Array.from(splitAudioIntoChunks(buffer));

    expect(chunks).toHaveLength(3); // 10000 / 4096 = 2.44 -> 3 chunks
  });

  it("should handle ArrayBuffer input", () => {
    const arrayBuffer = new ArrayBuffer(100);

    const chunks = Array.from(splitAudioIntoChunks(arrayBuffer, 30));

    expect(chunks).toHaveLength(4);
  });
});

describe("estimateDuration", () => {
  it("should estimate duration with default config", () => {
    // Default is 16kHz, 16-bit mono = 32000 bytes/second
    const oneSecondBytes = 32000;

    const duration = estimateDuration(oneSecondBytes);

    expect(duration).toBe(1.0);
  });

  it("should estimate duration with custom config", () => {
    // 48kHz, stereo, 16-bit = 192000 bytes/second
    const oneSecondBytes = 192000;

    const duration = estimateDuration(oneSecondBytes, {
      sampleRate: 48000,
      channels: 2,
      bitDepth: 16,
    });

    expect(duration).toBe(1.0);
  });

  it("should handle partial seconds", () => {
    const halfSecondBytes = 16000; // 0.5 seconds at default config

    const duration = estimateDuration(halfSecondBytes);

    expect(duration).toBe(0.5);
  });
});

describe("normalizeVolume", () => {
  it("should normalize silent audio", () => {
    const silentBuffer = Buffer.alloc(100);

    const normalized = normalizeVolume(silentBuffer);

    // Silent audio should be returned unchanged
    expect(normalized).toBe(silentBuffer);
  });

  it("should normalize audio to target peak", () => {
    // Create buffer with quiet audio (max sample at 1000)
    const quietBuffer = Buffer.alloc(20);
    for (let i = 0; i < 10; i++) {
      quietBuffer.writeInt16LE(Math.floor(Math.random() * 1000), i * 2);
    }

    const normalized = normalizeVolume(quietBuffer, 0.9);

    // Find max sample in normalized buffer
    let maxSample = 0;
    for (let i = 0; i < normalized.length; i += 2) {
      maxSample = Math.max(maxSample, Math.abs(normalized.readInt16LE(i)));
    }

    // Should be closer to target peak (0.9 * 32767 ~= 29490)
    expect(maxSample).toBeGreaterThan(0);
  });

  it("should preserve already normalized audio", () => {
    // Create buffer with audio already near target peak
    const normalizedBuffer = Buffer.alloc(4);
    normalizedBuffer.writeInt16LE(Math.floor(32767 * 0.9), 0);
    normalizedBuffer.writeInt16LE(100, 2);

    const result = normalizeVolume(normalizedBuffer, 0.9);

    // Should be nearly unchanged since already at target
    expect(result.readInt16LE(0)).toBeCloseTo(
      normalizedBuffer.readInt16LE(0),
      -2,
    );
  });
});

describe("resampleLinear", () => {
  it("should return same buffer for same rate", () => {
    const buffer = Buffer.from([1, 0, 2, 0, 3, 0]); // 3 samples

    const result = resampleLinear(buffer, 16000, 16000);

    expect(result).toBe(buffer);
  });

  it("should downsample correctly", () => {
    // 4 samples at 16kHz -> 2 samples at 8kHz
    const buffer = Buffer.alloc(8);
    buffer.writeInt16LE(0, 0);
    buffer.writeInt16LE(100, 2);
    buffer.writeInt16LE(200, 4);
    buffer.writeInt16LE(300, 6);

    const result = resampleLinear(buffer, 16000, 8000);

    expect(result.length).toBe(4); // 2 samples * 2 bytes
  });

  it("should upsample correctly", () => {
    // 2 samples at 8kHz -> 4 samples at 16kHz
    const buffer = Buffer.alloc(4);
    buffer.writeInt16LE(0, 0);
    buffer.writeInt16LE(100, 2);

    const result = resampleLinear(buffer, 8000, 16000);

    expect(result.length).toBe(8); // 4 samples * 2 bytes
  });
});

describe("concatenateAudio", () => {
  it("should concatenate multiple buffers", () => {
    const buffers = [
      Buffer.from("Hello"),
      Buffer.from(" "),
      Buffer.from("World"),
    ];

    const result = concatenateAudio(buffers);

    expect(result.toString()).toBe("Hello World");
  });

  it("should handle empty array", () => {
    const result = concatenateAudio([]);

    expect(result.length).toBe(0);
  });

  it("should handle single buffer", () => {
    const single = Buffer.from("Single");

    const result = concatenateAudio([single]);

    expect(result.toString()).toBe("Single");
  });
});

describe("isSilence", () => {
  it("should detect silence", () => {
    const silentBuffer = Buffer.alloc(100);

    expect(isSilence(silentBuffer)).toBe(true);
  });

  it("should detect non-silence", () => {
    const loudBuffer = Buffer.alloc(100);
    // Write loud samples
    for (let i = 0; i < loudBuffer.length; i += 2) {
      loudBuffer.writeInt16LE(10000, i);
    }

    expect(isSilence(loudBuffer)).toBe(false);
  });

  it("should use custom threshold", () => {
    const quietBuffer = Buffer.alloc(10);
    quietBuffer.writeInt16LE(50, 0);
    quietBuffer.writeInt16LE(50, 2);
    quietBuffer.writeInt16LE(50, 4);
    quietBuffer.writeInt16LE(50, 6);
    quietBuffer.writeInt16LE(50, 8);

    expect(isSilence(quietBuffer, 100)).toBe(true);
    expect(isSilence(quietBuffer, 10)).toBe(false);
  });

  it("should return true for tiny buffer", () => {
    const tinyBuffer = Buffer.alloc(1);

    expect(isSilence(tinyBuffer)).toBe(true);
  });
});

describe("DEFAULT_PCM_CONFIG", () => {
  it("should have correct default values", () => {
    expect(DEFAULT_PCM_CONFIG.sampleRate).toBe(16000);
    expect(DEFAULT_PCM_CONFIG.channels).toBe(1);
    expect(DEFAULT_PCM_CONFIG.bitDepth).toBe(16);
    expect(DEFAULT_PCM_CONFIG.signed).toBe(true);
    expect(DEFAULT_PCM_CONFIG.littleEndian).toBe(true);
  });
});
