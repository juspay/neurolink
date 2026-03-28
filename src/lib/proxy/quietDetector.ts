/**
 * Proxy Quiet Detector
 * Determines whether the proxy has been idle (no traffic) for a given
 * threshold by efficiently reading only the tail of today's debug log file.
 * Used by the auto-update system to find safe windows for restarts.
 */

import { openSync, readSync, closeSync, fstatSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

/** Result of a traffic-quiet check. */
export interface QuietStatus {
  isQuiet: boolean;
  lastActivityAt: Date | null;
  silenceDurationMs: number;
}

/** Default quiet threshold: 2 minutes of no traffic. */
const DEFAULT_QUIET_THRESHOLD_MS = 120_000;

/** Maximum bytes to read from the tail of the log file. */
const TAIL_READ_SIZE = 4096;

/**
 * Build the path to today's proxy debug log file.
 * Format: ~/.neurolink/logs/proxy-debug-YYYY-MM-DD.jsonl
 */
function getTodayLogPath(): string {
  const today = new Date().toISOString().split("T")[0];
  return join(homedir(), ".neurolink", "logs", `proxy-debug-${today}.jsonl`);
}

/**
 * Read the last complete line(s) from a file efficiently.
 * Uses low-level fs to seek to end and read only the last TAIL_READ_SIZE bytes.
 * Returns an array of the last non-empty lines (up to 2 for fallback).
 */
function readTailLines(filePath: string): string[] {
  let fd: number | null = null;
  try {
    fd = openSync(filePath, "r");
    const stat = fstatSync(fd);

    if (stat.size === 0) {
      return [];
    }

    const readSize = Math.min(TAIL_READ_SIZE, stat.size);
    const offset = stat.size - readSize;
    const buffer = Buffer.alloc(readSize);

    readSync(fd, buffer, 0, readSize, offset);

    const chunk = buffer.toString("utf-8");

    // Split into lines, filter out empty trailing entries
    const lines = chunk.split("\n").filter((line) => line.trim().length > 0);

    // Return last 2 lines (last + fallback)
    return lines.slice(-2);
  } finally {
    if (fd !== null) {
      closeSync(fd);
    }
  }
}

/**
 * Try to parse a JSON line and extract its ISO timestamp.
 * Returns the timestamp as epoch ms, or null if parsing fails.
 */
function extractTimestamp(line: string): number | null {
  try {
    const parsed = JSON.parse(line) as { timestamp?: string };
    if (typeof parsed.timestamp === "string") {
      const ms = Date.parse(parsed.timestamp);
      if (!Number.isNaN(ms)) {
        return ms;
      }
    }
  } catch {
    // Malformed JSON — caller will handle fallback
  }
  return null;
}

/**
 * Check whether proxy traffic has been quiet (no requests) for at least
 * `quietThresholdMs` milliseconds.
 *
 * Reads only the tail of today's debug log file for efficiency.
 *
 * @param quietThresholdMs  Silence duration (ms) to consider "quiet". Default: 120 000 (2 min).
 * @returns QuietStatus with the idle analysis.
 */
export function checkTrafficQuiet(
  quietThresholdMs: number = DEFAULT_QUIET_THRESHOLD_MS,
): QuietStatus {
  const noActivityResult: QuietStatus = {
    isQuiet: true,
    lastActivityAt: null,
    silenceDurationMs: Infinity,
  };

  const logPath = getTodayLogPath();

  if (!existsSync(logPath)) {
    return noActivityResult;
  }

  const tailLines = readTailLines(logPath);

  if (tailLines.length === 0) {
    return noActivityResult;
  }

  // Try last line first, then fall back to the one before it
  let timestampMs: number | null = null;

  for (let i = tailLines.length - 1; i >= 0; i--) {
    timestampMs = extractTimestamp(tailLines[i]);
    if (timestampMs !== null) {
      break;
    }
  }

  if (timestampMs === null) {
    // All tail lines are malformed — treat as quiet
    return noActivityResult;
  }

  const silenceDurationMs = Date.now() - timestampMs;

  return {
    isQuiet: silenceDurationMs >= quietThresholdMs,
    lastActivityAt: new Date(timestampMs),
    silenceDurationMs,
  };
}
