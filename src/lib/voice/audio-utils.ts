/**
 * Audio Utilities for Voice Module
 *
 * Provides audio format conversion, duration calculation, and buffer utilities.
 *
 * @module voice/audio-utils
 */

import type { AudioFormat } from "../types/index.js";
import { AUDIO_FORMAT_DETAILS } from "../types/index.js";
import { logger } from "../utils/logger.js";

/**
 * Detect audio format from buffer
 *
 * @param buffer - Audio data buffer
 * @returns Detected audio format or null
 */
export function detectAudioFormat(buffer: Buffer): AudioFormat | null {
  if (buffer.length < 12) {
    return null;
  }

  // Check for WAV (RIFF header)
  if (
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x41 && // A
    buffer[10] === 0x56 && // V
    buffer[11] === 0x45 // E
  ) {
    return "wav";
  }

  // Check for MP3 (ID3 tag or frame sync)
  if (
    (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) || // ID3
    (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) // Frame sync
  ) {
    return "mp3";
  }

  // Check for OGG (OggS header)
  if (
    buffer[0] === 0x4f && // O
    buffer[1] === 0x67 && // g
    buffer[2] === 0x67 && // g
    buffer[3] === 0x53 // S
  ) {
    // Could be Opus or Vorbis, check for Opus header
    // Opus has "OpusHead" in the first page
    const opusOffset = buffer.indexOf("OpusHead");
    if (opusOffset !== -1 && opusOffset < 200) {
      return "opus";
    }
    return "ogg";
  }

  return null;
}

/**
 * Get MIME type for audio format
 *
 * @param format - Audio format
 * @returns MIME type string
 */
export function getMimeType(format: AudioFormat): string {
  return AUDIO_FORMAT_DETAILS[format]?.mimeType ?? "application/octet-stream";
}

/**
 * Get file extension for audio format
 *
 * @param format - Audio format
 * @returns File extension with dot
 */
export function getFileExtension(format: AudioFormat): string {
  return AUDIO_FORMAT_DETAILS[format]?.extension ?? ".bin";
}

/**
 * Calculate audio duration from buffer
 *
 * @param buffer - Audio data buffer
 * @param format - Audio format (optional, will be detected if not provided)
 * @param sampleRate - Sample rate in Hz (optional, will be extracted if possible)
 * @returns Duration in seconds, or undefined if cannot be calculated
 */
export function calculateDuration(
  buffer: Buffer,
  format?: AudioFormat,
  sampleRate?: number,
): number | undefined {
  const detectedFormat = format ?? detectAudioFormat(buffer);

  if (!detectedFormat) {
    return undefined;
  }

  try {
    switch (detectedFormat) {
      case "wav":
        return calculateWavDuration(buffer);
      case "mp3":
        return estimateMp3Duration(buffer);
      case "ogg":
      case "opus":
        return estimateOpusDuration(buffer);
      default:
        // Estimate based on size and assumed bitrate
        if (sampleRate) {
          // Assume 16-bit mono
          return buffer.length / (sampleRate * 2);
        }
        return undefined;
    }
  } catch (err) {
    logger.debug(
      `[audio-utils] Failed to calculate duration: ${err instanceof Error ? err.message : String(err)}`,
    );
    return undefined;
  }
}

/**
 * Calculate WAV duration from header
 */
function calculateWavDuration(buffer: Buffer): number | undefined {
  if (buffer.length < 44) {
    return undefined;
  }

  // Find data chunk
  let offset = 12;
  while (offset < buffer.length - 8) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);

    if (chunkId === "fmt ") {
      const channels = buffer.readUInt16LE(offset + 10);
      const sampleRate = buffer.readUInt32LE(offset + 12);
      const bitsPerSample = buffer.readUInt16LE(offset + 22);

      // Find data chunk size
      let dataOffset = offset + 8 + chunkSize;
      while (dataOffset < buffer.length - 8) {
        const dataChunkId = buffer.toString(
          "ascii",
          dataOffset,
          dataOffset + 4,
        );
        const dataChunkSize = buffer.readUInt32LE(dataOffset + 4);

        if (dataChunkId === "data") {
          const bytesPerSample = (bitsPerSample / 8) * channels;
          const numSamples = dataChunkSize / bytesPerSample;
          return numSamples / sampleRate;
        }

        dataOffset += 8 + dataChunkSize;
      }
    }

    offset += 8 + chunkSize;
  }

  return undefined;
}

/**
 * Estimate MP3 duration (approximate)
 */
function estimateMp3Duration(buffer: Buffer): number | undefined {
  // This is a rough estimate based on file size and assumed bitrate
  // For accurate duration, we would need to parse all frames

  // Check for ID3v2 tag and skip it
  let offset = 0;
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    // ID3v2 tag present
    const tagSize =
      ((buffer[6] & 0x7f) << 21) |
      ((buffer[7] & 0x7f) << 14) |
      ((buffer[8] & 0x7f) << 7) |
      (buffer[9] & 0x7f);
    offset = 10 + tagSize;
  }

  // Find first MP3 frame header
  while (offset < buffer.length - 4) {
    if (buffer[offset] === 0xff && (buffer[offset + 1] & 0xe0) === 0xe0) {
      // Found frame sync
      const version = (buffer[offset + 1] >> 3) & 0x03;
      const _layer = (buffer[offset + 1] >> 1) & 0x03;
      const bitrateIndex = (buffer[offset + 2] >> 4) & 0x0f;
      const sampleRateIndex = (buffer[offset + 2] >> 2) & 0x03;

      // Get sample rate
      const sampleRates: Record<number, number[]> = {
        3: [44100, 48000, 32000], // MPEG1
        2: [22050, 24000, 16000], // MPEG2
        0: [11025, 12000, 8000], // MPEG2.5
      };
      const sampleRate = sampleRates[version]?.[sampleRateIndex];

      // Get bitrate (MPEG1 Layer III)
      const bitrates = [
        0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
      ];
      const bitrate = bitrates[bitrateIndex];

      if (sampleRate && bitrate) {
        // Estimate duration: (file_size_bits) / bitrate
        const audioBytes = buffer.length - offset;
        return (audioBytes * 8) / (bitrate * 1000);
      }

      break;
    }
    offset++;
  }

  // Fallback: assume 128kbps
  return (buffer.length * 8) / 128000;
}

/**
 * Estimate Opus/OGG duration (approximate)
 */
function estimateOpusDuration(buffer: Buffer): number | undefined {
  // Opus typically uses 48kHz, estimate based on typical bitrate
  // For accurate duration, we would need to parse all pages

  // Assume average bitrate of 64kbps for voice
  return (buffer.length * 8) / 64000;
}

/**
 * Convert audio format (basic conversion)
 *
 * Note: For full format conversion, external tools like ffmpeg would be needed.
 * This provides basic PCM resampling only.
 *
 * @param buffer - Input audio buffer
 * @param fromFormat - Source format
 * @param toFormat - Target format
 * @param options - Conversion options
 * @returns Converted audio buffer
 */
export async function convertAudioFormat(
  buffer: Buffer,
  fromFormat: AudioFormat,
  toFormat: AudioFormat,
  _options: Record<string, unknown> = {},
): Promise<Buffer> {
  // If formats are the same, just return the buffer
  if (fromFormat === toFormat) {
    return buffer;
  }

  // For actual conversion, we would need to use external libraries
  // This is a placeholder that logs a warning
  logger.warn(
    `[audio-utils] Audio format conversion from ${fromFormat} to ${toFormat} not fully implemented. ` +
      `Consider using ffmpeg or similar tools for production use.`,
  );

  // Return original buffer
  return buffer;
}

/**
 * Create PCM audio buffer from raw samples
 *
 * @param samples - Array of sample values (-1 to 1)
 * @param sampleRate - Sample rate in Hz
 * @param bitDepth - Bit depth (8, 16, 24, or 32)
 * @returns PCM audio buffer
 */
export function createPcmBuffer(
  samples: number[],
  _sampleRate: number = 16000,
  bitDepth: 8 | 16 | 24 | 32 = 16,
): Buffer {
  const bytesPerSample = bitDepth / 8;
  const buffer = Buffer.alloc(samples.length * bytesPerSample);

  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const offset = i * bytesPerSample;

    switch (bitDepth) {
      case 8:
        buffer.writeUInt8(Math.round((sample + 1) * 127.5), offset);
        break;
      case 16:
        buffer.writeInt16LE(Math.round(sample * 32767), offset);
        break;
      case 24: {
        const val24 = Math.round(sample * 8388607);
        buffer.writeUInt8(val24 & 0xff, offset);
        buffer.writeUInt8((val24 >> 8) & 0xff, offset + 1);
        buffer.writeUInt8((val24 >> 16) & 0xff, offset + 2);
        break;
      }
      case 32:
        buffer.writeInt32LE(Math.round(sample * 2147483647), offset);
        break;
    }
  }

  return buffer;
}

/**
 * Extract PCM samples from buffer
 *
 * @param buffer - PCM audio buffer
 * @param bitDepth - Bit depth (8, 16, 24, or 32)
 * @returns Array of sample values (-1 to 1)
 */
export function extractPcmSamples(
  buffer: Buffer,
  bitDepth: 8 | 16 | 24 | 32 = 16,
): number[] {
  const bytesPerSample = bitDepth / 8;
  const numSamples = Math.floor(buffer.length / bytesPerSample);
  const samples: number[] = [];

  for (let i = 0; i < numSamples; i++) {
    const offset = i * bytesPerSample;

    switch (bitDepth) {
      case 8:
        samples.push(buffer.readUInt8(offset) / 127.5 - 1);
        break;
      case 16:
        samples.push(buffer.readInt16LE(offset) / 32767);
        break;
      case 24: {
        const val24 =
          buffer.readUInt8(offset) |
          (buffer.readUInt8(offset + 1) << 8) |
          (buffer.readUInt8(offset + 2) << 16);
        samples.push((val24 > 8388607 ? val24 - 16777216 : val24) / 8388607);
        break;
      }
      case 32:
        samples.push(buffer.readInt32LE(offset) / 2147483647);
        break;
    }
  }

  return samples;
}

/**
 * Resample PCM audio
 *
 * @param samples - Input samples
 * @param fromSampleRate - Source sample rate
 * @param toSampleRate - Target sample rate
 * @returns Resampled samples
 */
export function resamplePcm(
  samples: number[],
  fromSampleRate: number,
  toSampleRate: number,
): number[] {
  if (fromSampleRate <= 0 || toSampleRate <= 0) {
    return samples;
  }
  if (fromSampleRate === toSampleRate) {
    return samples;
  }

  const ratio = fromSampleRate / toSampleRate;
  const newLength = Math.round(samples.length / ratio);
  const resampled: number[] = [];

  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, samples.length - 1);
    const fraction = srcIndex - srcIndexFloor;

    // Linear interpolation
    const value =
      samples[srcIndexFloor] * (1 - fraction) +
      samples[srcIndexCeil] * fraction;
    resampled.push(value);
  }

  return resampled;
}

/**
 * Normalize audio levels
 *
 * @param samples - Input samples
 * @param targetPeak - Target peak level (0 to 1)
 * @returns Normalized samples
 */
export function normalizeAudio(
  samples: number[],
  targetPeak: number = 0.95,
): number[] {
  if (samples.length === 0) {
    return samples;
  }

  // Find current peak
  let peak = 0;
  for (const sample of samples) {
    peak = Math.max(peak, Math.abs(sample));
  }

  if (peak === 0) {
    return samples;
  }

  // Calculate gain
  const gain = targetPeak / peak;

  // Apply gain
  return samples.map((s) => s * gain);
}

/**
 * Create a WAV header
 *
 * @param dataSize - Size of audio data in bytes
 * @param sampleRate - Sample rate in Hz
 * @param channels - Number of channels
 * @param bitDepth - Bit depth
 * @returns WAV header buffer
 */
export function createWavHeader(
  dataSize: number,
  sampleRate: number = 16000,
  channels: number = 1,
  bitDepth: number = 16,
): Buffer {
  const header = Buffer.alloc(44);

  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);

  // RIFF header
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);

  // fmt chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (PCM)
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);

  // data chunk
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return header;
}

/**
 * Create a complete WAV file from PCM data
 *
 * @param pcmData - PCM audio data
 * @param sampleRate - Sample rate in Hz
 * @param channels - Number of channels
 * @param bitDepth - Bit depth
 * @returns Complete WAV file buffer
 */
export function createWavFile(
  pcmData: Buffer,
  sampleRate: number = 16000,
  channels: number = 1,
  bitDepth: number = 16,
): Buffer {
  const header = createWavHeader(
    pcmData.length,
    sampleRate,
    channels,
    bitDepth,
  );
  return Buffer.concat([header, pcmData]);
}

/**
 * Split audio buffer into chunks
 *
 * @param buffer - Audio buffer to split
 * @param chunkDurationMs - Duration of each chunk in milliseconds
 * @param sampleRate - Sample rate in Hz
 * @param bytesPerSample - Bytes per sample (channels * bitDepth / 8)
 * @returns Array of audio chunks
 */
export function splitIntoChunks(
  buffer: Buffer,
  chunkDurationMs: number,
  sampleRate: number = 16000,
  bytesPerSample: number = 2,
): Buffer[] {
  if (chunkDurationMs <= 0 || sampleRate <= 0 || bytesPerSample <= 0) {
    return [buffer];
  }
  const bytesPerMs = (sampleRate * bytesPerSample) / 1000;
  const chunkSize = Math.round(chunkDurationMs * bytesPerMs);
  if (chunkSize <= 0) {
    return [buffer];
  }
  const chunks: Buffer[] = [];

  for (let offset = 0; offset < buffer.length; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, buffer.length);
    chunks.push(buffer.subarray(offset, end));
  }

  return chunks;
}

/**
 * Audio format signatures for detection
 */
export const AUDIO_SIGNATURES = {
  wav: Buffer.from([0x52, 0x49, 0x46, 0x46]), // RIFF
  mp3: {
    id3: Buffer.from([0x49, 0x44, 0x33]), // ID3
    frameSync: Buffer.from([0xff, 0xe0]), // Frame sync mask
  },
  ogg: Buffer.from([0x4f, 0x67, 0x67, 0x53]), // OggS
} as const;

/**
 * MIME types for audio formats
 */
export const MIME_TYPES = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  opus: "audio/opus",
} as const;
