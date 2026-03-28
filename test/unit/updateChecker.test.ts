import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UpdateCheckResult } from "../../src/lib/proxy/updateChecker.js";

// ---------------------------------------------------------------------------
// Mocks — vi.mock calls are hoisted, so only string literals / vi.hoisted
// values can be used as the first argument.
// ---------------------------------------------------------------------------

const execFileMock = vi.hoisted(() => vi.fn());

// Mock the logger (path relative to the source file's import location).
vi.mock("../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock `node:child_process`.
vi.mock("node:child_process", () => ({
  execFile: execFileMock,
}));

// Mock `node:util` — promisify wraps execFileMock in a promise-returning fn.
vi.mock("node:util", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:util")>();
  return {
    ...original,
    promisify: (_fn: unknown) => {
      return (cmd: string, args: string[], opts: Record<string, unknown>) =>
        new Promise((resolve, reject) => {
          execFileMock(
            cmd,
            args,
            opts,
            (err: Error | null, stdout?: string, stderr?: string) => {
              if (err) {
                return reject(err);
              }
              resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
            },
          );
        });
    },
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Make `execFileMock` invoke its callback with the given stdout. */
function mockNpmOutput(stdout: string): void {
  execFileMock.mockImplementation(
    (
      _cmd: string,
      _args: string[],
      _opts: Record<string, unknown>,
      cb: (err: Error | null, stdout: string, stderr: string) => void,
    ) => {
      cb(null, stdout, "");
    },
  );
}

/** Make `execFileMock` invoke its callback with an error. */
function mockNpmError(error: Error): void {
  execFileMock.mockImplementation(
    (
      _cmd: string,
      _args: string[],
      _opts: Record<string, unknown>,
      cb: (err: Error | null, stdout: string, stderr: string) => void,
    ) => {
      cb(error, "", "");
    },
  );
}

// ---------------------------------------------------------------------------
// Module import
// ---------------------------------------------------------------------------

let checkForUpdate: (version: string) => Promise<UpdateCheckResult>;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("../../src/lib/proxy/updateChecker.js");
  checkForUpdate = mod.checkForUpdate;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("checkForUpdate", () => {
  // ---- happy path: newer version available ---------------------------------

  it("returns updateAvailable=true when latest > current", async () => {
    mockNpmOutput(JSON.stringify("2.0.0"));

    const result = await checkForUpdate("1.0.0");

    expect(result).toEqual<UpdateCheckResult>({
      currentVersion: "1.0.0",
      latestVersion: "2.0.0",
      updateAvailable: true,
    });
  });

  it("returns updateAvailable=true for minor bump", async () => {
    mockNpmOutput(JSON.stringify("1.2.0"));

    const result = await checkForUpdate("1.1.0");

    expect(result).toEqual<UpdateCheckResult>({
      currentVersion: "1.1.0",
      latestVersion: "1.2.0",
      updateAvailable: true,
    });
  });

  it("returns updateAvailable=true for patch bump", async () => {
    mockNpmOutput(JSON.stringify("1.0.2"));

    const result = await checkForUpdate("1.0.1");

    expect(result).toEqual<UpdateCheckResult>({
      currentVersion: "1.0.1",
      latestVersion: "1.0.2",
      updateAvailable: true,
    });
  });

  // ---- same version --------------------------------------------------------

  it("returns updateAvailable=false when latest === current", async () => {
    mockNpmOutput(JSON.stringify("1.0.0"));

    const result = await checkForUpdate("1.0.0");

    expect(result).toEqual<UpdateCheckResult>({
      currentVersion: "1.0.0",
      latestVersion: "1.0.0",
      updateAvailable: false,
    });
  });

  // ---- downgrade (latest < current) ----------------------------------------

  it("returns updateAvailable=false when latest < current", async () => {
    mockNpmOutput(JSON.stringify("0.9.0"));

    const result = await checkForUpdate("1.0.0");

    expect(result).toEqual<UpdateCheckResult>({
      currentVersion: "1.0.0",
      latestVersion: "0.9.0",
      updateAvailable: false,
    });
  });

  // ---- npm command failure -------------------------------------------------

  it("returns updateAvailable=false on npm command failure", async () => {
    mockNpmError(new Error("npm ERR! code E404"));

    const result = await checkForUpdate("1.0.0");

    expect(result).toEqual<UpdateCheckResult>({
      currentVersion: "1.0.0",
      latestVersion: "1.0.0",
      updateAvailable: false,
    });
  });

  it("returns updateAvailable=false on non-zero exit code", async () => {
    const err = Object.assign(new Error("Command failed"), { code: 1 });
    mockNpmError(err);

    const result = await checkForUpdate("1.0.0");

    expect(result).toEqual<UpdateCheckResult>({
      currentVersion: "1.0.0",
      latestVersion: "1.0.0",
      updateAvailable: false,
    });
  });

  // ---- timeout -------------------------------------------------------------

  it("returns updateAvailable=false on timeout", async () => {
    const err = Object.assign(new Error("timed out"), { killed: true });
    mockNpmError(err);

    const result = await checkForUpdate("1.0.0");

    expect(result).toEqual<UpdateCheckResult>({
      currentVersion: "1.0.0",
      latestVersion: "1.0.0",
      updateAvailable: false,
    });
  });

  // ---- malformed JSON output -----------------------------------------------

  it("returns updateAvailable=false on malformed JSON output", async () => {
    mockNpmOutput("this is not json");

    const result = await checkForUpdate("1.0.0");

    expect(result).toEqual<UpdateCheckResult>({
      currentVersion: "1.0.0",
      latestVersion: "1.0.0",
      updateAvailable: false,
    });
  });

  it("returns updateAvailable=false when JSON is a number instead of string", async () => {
    mockNpmOutput("42");

    const result = await checkForUpdate("1.0.0");

    expect(result).toEqual<UpdateCheckResult>({
      currentVersion: "1.0.0",
      latestVersion: "1.0.0",
      updateAvailable: false,
    });
  });

  it("returns updateAvailable=false when JSON is an array", async () => {
    mockNpmOutput(JSON.stringify(["1.0.0", "2.0.0"]));

    const result = await checkForUpdate("1.0.0");

    expect(result).toEqual<UpdateCheckResult>({
      currentVersion: "1.0.0",
      latestVersion: "1.0.0",
      updateAvailable: false,
    });
  });

  it("returns updateAvailable=false for malformed version string", async () => {
    mockNpmOutput(JSON.stringify("not.a.version"));

    const result = await checkForUpdate("1.0.0");

    expect(result).toEqual<UpdateCheckResult>({
      currentVersion: "1.0.0",
      latestVersion: "1.0.0",
      updateAvailable: false,
    });
  });
});
