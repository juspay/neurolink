/**
 * Audio decoding for the Whistle engine: anything in, 16 kHz mono Float32 out.
 *
 * WAV (PCM 8/16/24/32-bit integer or 32/64-bit float, any sample rate and
 * channel count, including WAVE_FORMAT_EXTENSIBLE) and raw `pcm16` (PCM16LE
 * mono at `options.sampleRate`, default 16 kHz) are decoded here with no
 * dependencies. Compressed formats (mp3, m4a, ogg/opus, webm, flac, mp4 …) go
 * through ffmpeg — `FFMPEG_PATH`, then the optional `ffmpeg-static` package,
 * then `ffmpeg` on `PATH` — and are refused with a clear error when none of
 * those exists.
 *
 * @module voice/whistle/audio
 */

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TTSAudioFormat } from "../../types/index.js";
import { STT_ERROR_CODES } from "../../types/index.js";
import { tryImport } from "../../utils/tryImport.js";
import { STTError } from "../errors.js";

/** Formats Whistle decodes without any external tool. */
export const WHISTLE_NATIVE_FORMATS: readonly TTSAudioFormat[] = [
  "wav",
  "pcm16",
];

/** Formats Whistle decodes through ffmpeg when it is available. */
export const WHISTLE_FFMPEG_FORMATS: readonly TTSAudioFormat[] = [
  "mp3",
  "m4a",
  "mp4",
  "ogg",
  "opus",
  "webm",
  "flac",
  "mpeg",
  "mpga",
];

/** The engine's fixed input rate. */
export const WHISTLE_SAMPLE_RATE = 16_000;

const FFMPEG_TIMEOUT_MS = 5 * 60_000;

/**
 * Decode `audio` to 16 kHz mono Float32 samples in [-1, 1]. `format` is a
 * hint; a RIFF/WAVE header is recognised whatever it says.
 */
export async function decodeToWhistlePcm(
  audio: Buffer,
  format: TTSAudioFormat | undefined,
  sampleRate: number | undefined,
): Promise<Float32Array> {
  if (isWav(audio)) {
    return decodeWav(audio);
  }
  if (format === "pcm16") {
    return decodePcm16(audio, sampleRate ?? WHISTLE_SAMPLE_RATE);
  }
  if (format === "wav") {
    throw STTError.invalidFormat(
      "wav (no RIFF/WAVE header found)",
      [...WHISTLE_NATIVE_FORMATS, ...WHISTLE_FFMPEG_FORMATS],
      "whistle",
    );
  }
  return decodeWithFfmpeg(audio, format);
}

function isWav(buf: Buffer): boolean {
  return (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WAVE"
  );
}

/** PCM16LE frames (as streamed by microphones and the chunked adapter) → 16 kHz Float32. */
export function decodePcm16(buf: Buffer, sampleRate: number): Float32Array {
  const n = buf.length >> 1;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = buf.readInt16LE(i * 2) / 32768;
  }
  return resampleTo16k(out, sampleRate);
}

function decodeWav(buf: Buffer): Float32Array {
  let offset = 12;
  let fmt:
    | { format: number; channels: number; rate: number; bits: number }
    | undefined;
  let data: { start: number; size: number } | undefined;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt " && body + 16 <= buf.length) {
      let format = buf.readUInt16LE(body);
      // WAVE_FORMAT_EXTENSIBLE: the real format is the first two bytes of the sub-format GUID.
      if (format === 0xfffe && size >= 26 && body + 26 <= buf.length) {
        format = buf.readUInt16LE(body + 24);
      }
      fmt = {
        format,
        channels: buf.readUInt16LE(body + 2),
        rate: buf.readUInt32LE(body + 4),
        bits: buf.readUInt16LE(body + 14),
      };
    } else if (id === "data") {
      // Streamed WAVs leave the size at 0 or 0xFFFFFFFF; read to the end then.
      const available = buf.length - body;
      data = {
        start: body,
        size: size === 0 || size > available ? available : size,
      };
      break;
    }
    offset = body + size + (size & 1);
  }
  if (!fmt || !data) {
    throw STTError.invalidFormat("wav (missing fmt or data chunk)", "whistle");
  }
  const { format, channels, rate, bits } = fmt;
  const isFloat = format === 3;
  if (
    channels < 1 ||
    rate < 1 ||
    !(
      (format === 1 && [8, 16, 24, 32].includes(bits)) ||
      (isFloat && (bits === 32 || bits === 64))
    )
  ) {
    throw STTError.invalidFormat(
      `wav (format ${format}, ${bits}-bit) — Whistle reads PCM 8/16/24/32-bit and 32/64-bit float WAV`,
      "whistle",
    );
  }
  const bytes = bits / 8;
  const frameBytes = bytes * channels;
  const frames = Math.floor(data.size / frameBytes);
  const mono = new Float32Array(frames);
  const read = (pos: number): number => {
    if (isFloat) {
      return bits === 32 ? buf.readFloatLE(pos) : buf.readDoubleLE(pos);
    }
    switch (bits) {
      case 8:
        return (buf[pos] - 128) / 128;
      case 16:
        return buf.readInt16LE(pos) / 32768;
      case 24:
        return buf.readIntLE(pos, 3) / 8388608;
      default:
        return buf.readInt32LE(pos) / 2147483648;
    }
  };
  for (let f = 0; f < frames; f++) {
    const base = data.start + f * frameBytes;
    let sum = 0;
    for (let c = 0; c < channels; c++) {
      sum += read(base + c * bytes);
    }
    mono[f] = sum / channels;
  }
  return resampleTo16k(mono, rate);
}

/**
 * Resample to 16 kHz: a box filter over each output sample's footprint when
 * downsampling (a cheap anti-alias), linear interpolation when upsampling.
 */
export function resampleTo16k(input: Float32Array, rate: number): Float32Array {
  if (rate === WHISTLE_SAMPLE_RATE || input.length === 0) {
    return input;
  }
  const ratio = rate / WHISTLE_SAMPLE_RATE;
  const outLength = Math.floor(input.length / ratio);
  const out = new Float32Array(outLength);
  if (ratio > 1) {
    for (let i = 0; i < outLength; i++) {
      const from = Math.floor(i * ratio);
      const to = Math.min(
        input.length,
        Math.max(from + 1, Math.floor((i + 1) * ratio)),
      );
      let sum = 0;
      for (let j = from; j < to; j++) {
        sum += input[j];
      }
      out[i] = sum / (to - from);
    }
  } else {
    for (let i = 0; i < outLength; i++) {
      const pos = i * ratio;
      const j = Math.floor(pos);
      const frac = pos - j;
      const a = input[j];
      const b = j + 1 < input.length ? input[j + 1] : a;
      out[i] = a + (b - a) * frac;
    }
  }
  return out;
}

async function resolveFfmpeg(): Promise<string> {
  const fromEnv = process.env.FFMPEG_PATH?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  try {
    const mod = await tryImport<{ default?: unknown }>(
      "ffmpeg-static",
      "Whistle compressed-audio decoding",
    );
    if (typeof mod.default === "string" && mod.default.length > 0) {
      return mod.default;
    }
  } catch {
    // Optional: fall back to a system ffmpeg.
  }
  return "ffmpeg";
}

function ffmpegUnavailable(
  format: string | undefined,
  cause?: Error,
): STTError {
  return new STTError({
    code: STT_ERROR_CODES.INVALID_AUDIO_FORMAT,
    message:
      `Whistle cannot decode ${format ?? "this"} audio without ffmpeg. It reads WAV ` +
      "(PCM or float, any rate and channel count) and raw pcm16 by itself; for " +
      `${WHISTLE_FFMPEG_FORMATS.join(", ")} install ffmpeg (pnpm add ffmpeg-static, ` +
      "or put ffmpeg on PATH, or set FFMPEG_PATH), or convert the audio to WAV first.",
    context: {
      provider: "whistle",
      format,
      supportedFormats: [...WHISTLE_NATIVE_FORMATS, ...WHISTLE_FFMPEG_FORMATS],
    },
    originalError: cause,
  });
}

async function decodeWithFfmpeg(
  audio: Buffer,
  format: TTSAudioFormat | undefined,
): Promise<Float32Array> {
  const binary = await resolveFfmpeg();
  // A file, not a pipe: MP4/M4A often keep their index at the end, which a pipe cannot seek to.
  const input = join(
    tmpdir(),
    `neurolink-whistle-${randomUUID()}.${format ?? "bin"}`,
  );
  await writeFile(input, audio);
  try {
    const raw = await new Promise<Buffer>((resolvePromise, reject) => {
      const proc = spawn(
        binary,
        [
          "-nostdin",
          "-hide_banner",
          "-loglevel",
          "error",
          "-i",
          input,
          "-f",
          "f32le",
          "-ac",
          "1",
          "-ar",
          String(WHISTLE_SAMPLE_RATE),
          "pipe:1",
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      const out: Buffer[] = [];
      let err = "";
      const timer = setTimeout(() => proc.kill("SIGKILL"), FFMPEG_TIMEOUT_MS);
      proc.stdout.on("data", (c: Buffer) => out.push(c));
      proc.stderr.on("data", (c: Buffer) => {
        err = (err + c.toString("utf8")).slice(-2000);
      });
      proc.on("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
      proc.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolvePromise(Buffer.concat(out));
        } else {
          reject(new Error(`ffmpeg exited with code ${code}: ${err.trim()}`));
        }
      });
    });
    const samples = new Float32Array(raw.length >> 2);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = raw.readFloatLE(i * 4);
    }
    return samples;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw ffmpegUnavailable(
        format,
        error instanceof Error ? error : undefined,
      );
    }
    throw STTError.invalidFormat(
      `${format ?? "unknown"} (ffmpeg could not decode it: ${error instanceof Error ? error.message : String(error)})`,
      [...WHISTLE_NATIVE_FORMATS, ...WHISTLE_FFMPEG_FORMATS],
      "whistle",
    );
  } finally {
    await rm(input, { force: true }).catch(() => undefined);
  }
}
