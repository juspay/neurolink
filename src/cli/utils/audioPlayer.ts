/**
 * Audio playback utilities for CLI
 *
 * Provides functionality for playing TTS audio using platform-specific
 * CLI tools with proper cleanup and error handling.
 *
 * @module cli/utils/audioPlayer
 */

import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import type { AudioFormat } from "../../lib/types/index.js";

const execFileAsync = promisify(execFile);

/**
 * Get the file extension for an audio format
 *
 * @param format - Audio format
 * @returns File extension string (e.g., "mp3", "wav")
 */
export function getAudioExtension(format: AudioFormat): string {
  switch (format) {
    case "mp3":
      return "mp3";
    case "wav":
      return "wav";
    case "ogg":
      return "ogg";
    case "opus":
      return "opus";
    default:
      return "mp3";
  }
}

/**
 * Get the platform-specific audio player command and arguments
 *
 * @param filePath - Path to the audio file
 * @param format - Audio format
 * @returns Object with command and args for execFile
 */
function getPlayerCommand(
  filePath: string,
  format: AudioFormat,
): { command: string; args: string[] } {
  const platform = process.platform;

  switch (platform) {
    case "darwin":
      return { command: "afplay", args: [filePath] };

    case "linux":
      if (format === "wav") {
        return { command: "aplay", args: [filePath] };
      }
      return { command: "paplay", args: [filePath] };

    case "win32":
      if (format === "wav") {
        return {
          command: "powershell",
          args: [
            "-NoProfile",
            "-Command",
            `(New-Object System.Media.SoundPlayer '${filePath}').PlaySync()`,
          ],
        };
      }
      return {
        command: "powershell",
        args: [
          "-NoProfile",
          "-Command",
          `$player = New-Object -ComObject WMPlayer.OCX; $player.URL = '${filePath}'; $player.controls.play(); Start-Sleep -Seconds 1; while ($player.playState -eq 3) { Start-Sleep -Milliseconds 100 }; $player.close()`,
        ],
      };

    default:
      throw new Error(
        `Unsupported platform: ${platform}. Audio playback is supported on macOS, Linux, and Windows.`,
      );
  }
}

/**
 * Play audio from a buffer using platform-specific CLI tools
 *
 * Writes the buffer to a temporary file, plays it using the appropriate
 * system audio player, and cleans up the temp file afterward.
 *
 * Supported platforms:
 * - macOS: uses `afplay` (built-in, supports mp3/wav/aac/flac)
 * - Linux: uses `paplay` for non-wav, `aplay` for wav
 * - Windows: uses PowerShell SoundPlayer (wav) or WMPlayer.OCX (mp3)
 *
 * @param buffer - Audio data buffer
 * @param format - Audio format (mp3, wav, ogg, opus)
 * @throws Error if playback fails or platform is unsupported
 *
 * @example
 * ```typescript
 * await playAudio(audioBuffer, "mp3");
 * ```
 */
export async function playAudio(
  buffer: Buffer,
  format: AudioFormat,
): Promise<void> {
  const ext = getAudioExtension(format);
  const tempFile = path.join(os.tmpdir(), `nl-tts-${Date.now()}.${ext}`);

  try {
    // Write audio buffer to temp file
    await fs.promises.writeFile(tempFile, buffer);

    const { command, args } = getPlayerCommand(tempFile, format);

    try {
      await execFileAsync(command, args);
    } catch (execError) {
      const err = execError as NodeJS.ErrnoException;

      // Handle binary not found
      if (err.code === "ENOENT") {
        if (process.platform === "linux" && command === "paplay") {
          // Fallback to aplay on Linux
          try {
            await execFileAsync("aplay", [tempFile]);
            return;
          } catch (fallbackError) {
            const fbErr = fallbackError as NodeJS.ErrnoException;
            if (fbErr.code === "ENOENT") {
              throw new Error(
                "Neither paplay nor aplay found. Install PulseAudio (paplay) or ALSA (aplay) for audio playback.",
                { cause: fallbackError },
              );
            }
            throw fallbackError;
          }
        }

        throw new Error(
          `Audio player '${command}' not found. Ensure it is installed and available in PATH.`,
          { cause: execError },
        );
      }

      throw execError;
    }
  } finally {
    // Always clean up temp file
    try {
      await fs.promises.unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}
