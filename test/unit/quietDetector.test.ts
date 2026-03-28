import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
} from "vitest";
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/**
 * Test strategy:
 * We mock `node:os` homedir() to point at a temp directory so the module
 * resolves its log path to a location we control. Each test creates/removes
 * the expected log file with controlled content.
 *
 * For the tail-read verification test, we check that a large file (>4 KB)
 * still returns the correct last-line result and verify the file size exceeds
 * the 4 KB tail buffer -- proving only the tail was needed.
 */

// Stable temp root for all tests in this suite
const TEST_HOME = join(tmpdir(), `quiet-detector-test-${process.pid}`);
const LOG_DIR = join(TEST_HOME, ".neurolink", "logs");

function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

function logFilePath(): string {
  return join(LOG_DIR, `proxy-debug-${todayDateString()}.jsonl`);
}

function makeLogLine(
  timestamp: string,
  extra: Record<string, unknown> = {},
): string {
  return JSON.stringify({ timestamp, requestId: "test-req", ...extra });
}

// Mock homedir before the module under test resolves its path
vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return {
    ...actual,
    homedir: () => TEST_HOME,
  };
});

// Track all readSync calls: capture the length argument
const readSyncLengths: number[] = [];

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    readSync: (...args: Parameters<typeof actual.readSync>): number => {
      // args: (fd, buffer, offset, length, position)
      const length = args[3] as number;
      readSyncLengths.push(length);
      return actual.readSync(...args);
    },
  };
});

// Type for the module under test
type QuietDetectorModule =
  typeof import("../../src/lib/proxy/quietDetector.js");
let checkTrafficQuiet: QuietDetectorModule["checkTrafficQuiet"];

beforeAll(async () => {
  const mod = await import("../../src/lib/proxy/quietDetector.js");
  checkTrafficQuiet = mod.checkTrafficQuiet;
});

describe("checkTrafficQuiet", () => {
  beforeEach(() => {
    mkdirSync(LOG_DIR, { recursive: true });
    readSyncLengths.length = 0;
  });

  afterEach(() => {
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
  });

  // ---------------------------------------------------------------
  // 1. isQuiet=true when last activity was 3 minutes ago
  // ---------------------------------------------------------------
  it("returns isQuiet=true when last activity was 3 minutes ago", () => {
    const threeMinAgo = new Date(Date.now() - 3 * 60_000).toISOString();
    writeFileSync(logFilePath(), makeLogLine(threeMinAgo) + "\n");

    const result = checkTrafficQuiet();

    expect(result.isQuiet).toBe(true);
    expect(result.lastActivityAt).toBeInstanceOf(Date);
    expect(result.silenceDurationMs).toBeGreaterThanOrEqual(179_000);
    expect(result.silenceDurationMs).toBeLessThan(200_000);
  });

  // ---------------------------------------------------------------
  // 2. isQuiet=false when last activity was 30 seconds ago
  // ---------------------------------------------------------------
  it("returns isQuiet=false when last activity was 30 seconds ago", () => {
    const thirtySecAgo = new Date(Date.now() - 30_000).toISOString();
    writeFileSync(logFilePath(), makeLogLine(thirtySecAgo) + "\n");

    const result = checkTrafficQuiet();

    expect(result.isQuiet).toBe(false);
    expect(result.lastActivityAt).toBeInstanceOf(Date);
    expect(result.silenceDurationMs).toBeGreaterThanOrEqual(29_000);
    expect(result.silenceDurationMs).toBeLessThan(60_000);
  });

  // ---------------------------------------------------------------
  // 3. isQuiet=true when log file doesn't exist
  // ---------------------------------------------------------------
  it("returns isQuiet=true when log file does not exist", () => {
    const logFile = logFilePath();
    if (existsSync(logFile)) {
      rmSync(logFile);
    }

    const result = checkTrafficQuiet();

    expect(result.isQuiet).toBe(true);
    expect(result.lastActivityAt).toBeNull();
    expect(result.silenceDurationMs).toBe(Infinity);
  });

  // ---------------------------------------------------------------
  // 4. isQuiet=true when log file is empty
  // ---------------------------------------------------------------
  it("returns isQuiet=true when log file is empty", () => {
    writeFileSync(logFilePath(), "");

    const result = checkTrafficQuiet();

    expect(result.isQuiet).toBe(true);
    expect(result.lastActivityAt).toBeNull();
    expect(result.silenceDurationMs).toBe(Infinity);
  });

  // ---------------------------------------------------------------
  // 5. Handles malformed last line gracefully (falls back to previous)
  // ---------------------------------------------------------------
  it("handles malformed last line by falling back to the previous line", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    const lines =
      [makeLogLine(fiveMinAgo), "THIS IS NOT VALID JSON{{{"].join("\n") + "\n";

    writeFileSync(logFilePath(), lines);

    const result = checkTrafficQuiet();

    expect(result.isQuiet).toBe(true);
    expect(result.lastActivityAt).toBeInstanceOf(Date);
    expect(result.silenceDurationMs).toBeGreaterThanOrEqual(290_000);
  });

  it("returns isQuiet=true when ALL lines are malformed", () => {
    const lines = ["not json at all", "also broken {{{"].join("\n") + "\n";

    writeFileSync(logFilePath(), lines);

    const result = checkTrafficQuiet();

    expect(result.isQuiet).toBe(true);
    expect(result.lastActivityAt).toBeNull();
    expect(result.silenceDurationMs).toBe(Infinity);
  });

  // ---------------------------------------------------------------
  // 6. Reads only the tail of a large file (no full-file read)
  // ---------------------------------------------------------------
  it("reads only the tail of a large file, not the entire contents", () => {
    const oldTimestamp = new Date(Date.now() - 10 * 60_000).toISOString();
    const recentTimestamp = new Date(Date.now() - 15_000).toISOString();

    // Each line is ~130 bytes. 1000 lines = ~130 KB, well over 4 KB tail buffer.
    const oldLines = Array.from({ length: 1000 }, (_, i) =>
      makeLogLine(oldTimestamp, { seq: i, padding: "x".repeat(60) }),
    );
    oldLines.push(makeLogLine(recentTimestamp));
    const content = oldLines.join("\n") + "\n";
    writeFileSync(logFilePath(), content);

    const fileSize = statSync(logFilePath()).size;
    expect(fileSize).toBeGreaterThan(4096 * 5); // confirm file is large

    readSyncLengths.length = 0;

    const result = checkTrafficQuiet();

    // Correct result from the last line
    expect(result.isQuiet).toBe(false);
    expect(result.lastActivityAt).toBeInstanceOf(Date);
    expect(result.silenceDurationMs).toBeLessThan(30_000);

    // Verify readSync was called and each call read at most 4096 bytes
    expect(readSyncLengths.length).toBeGreaterThan(0);
    for (const len of readSyncLengths) {
      expect(len).toBeLessThanOrEqual(4096);
    }

    // Total bytes read should be far less than the file size
    const totalBytesRead = readSyncLengths.reduce((a, b) => a + b, 0);
    expect(totalBytesRead).toBeLessThan(fileSize / 2);
  });

  // ---------------------------------------------------------------
  // Additional: custom threshold
  // ---------------------------------------------------------------
  it("respects a custom quietThresholdMs", () => {
    const tenSecAgo = new Date(Date.now() - 10_000).toISOString();
    writeFileSync(logFilePath(), makeLogLine(tenSecAgo) + "\n");

    // With 5-second threshold, 10 seconds of silence should be quiet
    const resultQuiet = checkTrafficQuiet(5_000);
    expect(resultQuiet.isQuiet).toBe(true);

    // With 30-second threshold, 10 seconds of silence should NOT be quiet
    const resultNotQuiet = checkTrafficQuiet(30_000);
    expect(resultNotQuiet.isQuiet).toBe(false);
  });
});
