/**
 * Audio playback utilities for CLI
 *
 * Provides functionality for playing TTS audio using platform-specific
 * CLI tools with proper cleanup and error handling.
 *
 * @module cli/utils/audioPlayer
 */

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import type {
  TTSAudioFormat,
  CliAudioPlayerCommand,
} from "../../lib/types/index.js";

const execFileAsync = promisify(execFile);

/** Wall-clock cap on a single player invocation; a hung decoder must not block the CLI forever. */
const PLAYER_TIMEOUT_MS = 30_000;

/**
 * Single source of truth for format -> temp-file-extension. Formats outside this
 * playback-supported set (m4a, flac, webm, mp4, mpeg, mpga, pcm16) fall back to
 * "mp3" — `playAudio` only ever receives the four formats below in practice.
 */
const AUDIO_EXTENSIONS: Partial<Record<TTSAudioFormat, string>> = {
  mp3: "mp3",
  wav: "wav",
  ogg: "ogg",
  opus: "opus",
};

/**
 * Get the file extension for an audio format
 *
 * @param format - Audio format
 * @returns File extension string (e.g., "mp3", "wav")
 */
export function getAudioExtension(format: TTSAudioFormat): string {
  return AUDIO_EXTENSIONS[format] ?? "mp3";
}

/** ffmpeg's ffplay decodes every format we emit; quiet + auto-exit for CLI use. */
function ffplayCommand(filePath: string): CliAudioPlayerCommand {
  return {
    command: "ffplay",
    args: ["-nodisp", "-autoexit", "-loglevel", "quiet", filePath],
  };
}

/**
 * Escape a value for interpolation inside a single-quoted PowerShell string.
 * PowerShell's single-quoted strings only treat `''` as a literal `'` — unlike
 * shell/execFile argv, this string is parsed by powershell.exe itself, so an
 * unescaped quote (e.g. a Windows username like `O'Brien` under `%TEMP%`)
 * would break out of the string and let the remainder run as PS code.
 */
export function escapePowerShellSingleQuoted(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Build the ordered list of player commands to try for a file.
 *
 * The list is tried in order until one succeeds; a missing binary (ENOENT) or a
 * decode failure simply advances to the next candidate.
 *
 * The Linux ordering is the crux of the mp3-playback fix (#1138): `paplay`
 * (PulseAudio) and `aplay` (ALSA) only decode libsndfile/PCM formats and
 * **cannot** decode mp3/AAC. Since `--tts-format` defaults to mp3, compressed
 * formats must lead with real decoders (ffplay/mpv/mpg123/cvlc); paplay/aplay
 * remain only as last-resort fallbacks (and still work for wav/ogg).
 *
 * @param filePath - Path to the audio file
 * @param format - Audio format
 * @param platform - Platform id (defaults to `process.platform`; injectable for tests)
 * @returns Ordered player commands; empty for unsupported platforms
 */
export function getPlayerCandidates(
  filePath: string,
  format: TTSAudioFormat,
  platform: NodeJS.Platform = process.platform,
): CliAudioPlayerCommand[] {
  const isWav = format === "wav";

  switch (platform) {
    case "darwin":
      // afplay decodes mp3/wav/aac/flac natively.
      return [{ command: "afplay", args: [filePath] }];

    case "linux":
      if (isWav) {
        // WAV/PCM: ALSA and PulseAudio both decode it; ffplay as a backstop.
        return [
          { command: "aplay", args: [filePath] },
          { command: "paplay", args: [filePath] },
          ffplayCommand(filePath),
        ];
      }
      // Compressed formats (mp3/ogg/opus): lead with decoders that actually
      // handle them, then fall back to paplay/aplay (which work for some
      // formats but never mp3).
      return [
        ffplayCommand(filePath),
        {
          command: "mpv",
          args: ["--no-video", "--really-quiet", filePath],
        },
        ...(format === "mp3"
          ? [{ command: "mpg123", args: ["-q", filePath] }]
          : []),
        {
          command: "cvlc",
          args: ["--play-and-exit", "--no-loop", "--intf", "dummy", filePath],
        },
        { command: "paplay", args: [filePath] },
        { command: "aplay", args: [filePath] },
      ];

    case "win32": {
      // filePath is embedded inside a single-quoted PS string below, so it must
      // be escaped — a Windows username with an apostrophe (e.g. `O'Brien`,
      // present in `%TEMP%`) would otherwise break out of the string.
      const psPath = escapePowerShellSingleQuoted(filePath);
      if (isWav) {
        return [
          {
            command: "powershell",
            args: [
              "-NoProfile",
              "-Command",
              `(New-Object System.Media.SoundPlayer '${psPath}').PlaySync()`,
            ],
          },
        ];
      }
      return [
        {
          command: "powershell",
          args: [
            "-NoProfile",
            "-Command",
            `$player = New-Object -ComObject WMPlayer.OCX; $player.URL = '${psPath}'; $player.controls.play(); Start-Sleep -Seconds 1; while ($player.playState -eq 3) { Start-Sleep -Milliseconds 100 }; $player.close()`,
          ],
        },
      ];
    }

    default:
      return [];
  }
}

/**
 * Build a helpful, format-aware error message when no player could decode the file.
 *
 * Exported for testing: the message a user sees when Linux mp3 playback finds no
 * decoder must name the real fix (ffmpeg/mpv/mpg123/VLC or `--tts-format wav`),
 * not the misleading "install PulseAudio" that paplay-only routing produced (#1138).
 */
export function buildPlaybackErrorMessage(
  platform: NodeJS.Platform,
  format: TTSAudioFormat,
  attempts: string[],
): string {
  const tried = attempts.length ? ` (tried: ${attempts.join("; ")})` : "";

  if (platform === "linux") {
    if (format === "wav") {
      return `Could not play wav audio${tried}. Install ALSA (aplay) or PulseAudio (paplay).`;
    }
    // mpg123 only decodes mp3 (see getPlayerCandidates) — recommending it for
    // ogg/opus failures would send users chasing a decoder that can't help.
    if (format === "mp3") {
      return `Could not play mp3 audio${tried}. paplay/aplay cannot decode mp3; install one of: ffmpeg (ffplay), mpv, mpg123, or VLC (cvlc) — or use --tts-format wav.`;
    }
    return `Could not play ${format} audio${tried}. Install ffmpeg (ffplay), mpv, or VLC (cvlc) — or use --tts-format wav.`;
  }

  return `Could not play ${format} audio${tried}. Ensure a system audio player is installed and available in PATH.`;
}

/**
 * Play audio from a buffer using platform-specific CLI tools
 *
 * Writes the buffer to a temporary file, plays it using the first available
 * system audio player that can decode the format, and cleans up the temp file.
 *
 * Supported platforms:
 * - macOS: `afplay` (built-in; decodes mp3/wav/aac/flac)
 * - Linux: real decoders (ffplay/mpv/mpg123/cvlc) for compressed formats,
 *   aplay/paplay for wav — falling through the list until one works
 * - Windows: PowerShell SoundPlayer (wav) or WMPlayer.OCX (compressed)
 *
 * @param buffer - Audio data buffer
 * @param format - Audio format (mp3, wav, ogg, opus)
 * @throws Error if no available player can play the audio, or platform is unsupported
 *
 * @example
 * ```typescript
 * await playAudio(audioBuffer, "mp3");
 * ```
 */
export async function playAudio(
  buffer: Buffer,
  format: TTSAudioFormat,
): Promise<void> {
  const ext = getAudioExtension(format);
  // randomUUID (not just Date.now()) avoids two concurrent calls in the same
  // millisecond racing on the same temp path.
  const tempFile = path.join(os.tmpdir(), `nl-tts-${randomUUID()}.${ext}`);

  try {
    // Write audio buffer to temp file
    await fs.promises.writeFile(tempFile, buffer);

    const candidates = getPlayerCandidates(tempFile, format);

    if (candidates.length === 0) {
      throw new Error(
        `Unsupported platform: ${process.platform}. Audio playback is supported on macOS, Linux, and Windows.`,
      );
    }

    const attempts: string[] = [];

    for (const { command, args } of candidates) {
      try {
        // `timeout` guards against a hung decoder (e.g. blocked on the audio
        // device) so playback can't stall the CLI forever; SIGTERM lets the
        // player shut down cleanly before Node force-kills it.
        await execFileAsync(command, args, {
          timeout: PLAYER_TIMEOUT_MS,
          killSignal: "SIGTERM",
        });
        return; // Played successfully.
      } catch (execError) {
        const err = execError as NodeJS.ErrnoException & { killed?: boolean };
        // Every failure (missing binary, decode error, or timeout) is
        // recorded and surfaced in the final error below — none are lost.
        // We still advance to the next candidate rather than aborting on the
        // first non-ENOENT failure: `command` existing but failing on this
        // particular file (e.g. a corrupt stream, or one decoder lacking
        // codec support) doesn't mean the *next* candidate will fail too,
        // and failing fast here would defeat the multi-decoder fallback
        // that #1138 exists to provide.
        const detail = err.killed
          ? `timed out after ${PLAYER_TIMEOUT_MS}ms`
          : err.code === "ENOENT"
            ? "not installed"
            : (err.message ?? "failed");
        attempts.push(`${command}: ${detail}`);
      }
    }

    throw new Error(
      buildPlaybackErrorMessage(process.platform, format, attempts),
    );
  } finally {
    // Always clean up temp file
    try {
      await fs.promises.unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}
