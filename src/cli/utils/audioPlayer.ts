/**
 * Cross-platform audio playback for CLI
 *
 * Plays TTS audio through the system speaker using platform-native tools.
 * No npm dependencies — uses only Node.js built-ins.
 *
 * @module cli/utils/audioPlayer
 */

import { execFile } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { AudioFormat } from "../../lib/types/index.js";

const execFileAsync = promisify(execFile);

/**
 * Plays an audio buffer through the system speaker.
 * Writes buffer to a temp file, plays it, then cleans up.
 *
 * @param buffer - Audio data to play
 * @param format - Audio format of the buffer
 */
export async function playAudio(
  buffer: Buffer,
  format: AudioFormat,
): Promise<void> {
  const ext = getExtension(format);
  const tmpFile = join(tmpdir(), `nl-tts-${Date.now()}.${ext}`);
  try {
    await fs.promises.writeFile(tmpFile, buffer);
    await executePlayer(tmpFile, format);
  } finally {
    try {
      await fs.promises.unlink(tmpFile);
    } catch {
      /* ignore cleanup errors */
    }
  }
}

function getExtension(format: AudioFormat): string {
  const map: Record<string, string> = {
    mp3: "mp3",
    wav: "wav",
    ogg: "ogg",
    opus: "opus",
  };
  return map[format] ?? "mp3";
}

async function executePlayer(
  filePath: string,
  format: AudioFormat,
): Promise<void> {
  const platform = process.platform;
  if (platform === "darwin") {
    // macOS: afplay is built-in, supports mp3/wav/aac/flac
    await execFileAsync("afplay", [filePath]);
  } else if (platform === "linux") {
    // Linux: try paplay (PulseAudio) first, fallback to aplay (ALSA) for WAV
    if (format === "wav") {
      await execFileAsync("aplay", [filePath]).catch(() =>
        execFileAsync("paplay", [filePath]),
      );
    } else {
      await execFileAsync("paplay", [filePath]).catch(() => {
        throw new Error(
          "Linux audio playback failed. Install PulseAudio (paplay) or use WAV format with ALSA (aplay).",
        );
      });
    }
  } else if (platform === "win32") {
    // Windows: PowerShell SoundPlayer for WAV, WMPlayer for other formats
    if (format === "wav") {
      await execFileAsync("powershell", [
        "-Command",
        `(New-Object Media.SoundPlayer '${filePath}').PlaySync()`,
      ]);
    } else {
      await execFileAsync("powershell", [
        "-Command",
        `$player = New-Object -ComObject WMPlayer.OCX; $player.URL = '${filePath}'; $player.controls.play(); Start-Sleep -Seconds 30`,
      ]);
    }
  } else {
    throw new Error(
      `Unsupported platform for audio playback: ${platform}. Supported: macOS, Linux, Windows.`,
    );
  }
}
