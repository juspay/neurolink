/**
 * Piped CLI output must arrive whole.
 *
 * `generate` and `stream` print their result and then force `process.exit`.
 * When stdout is a pipe, Node queues a large write behind the pipe buffer, and
 * a forced exit discards whatever is still queued: the consumer receives
 * exactly 65,536 bytes of a document that no longer parses, with exit code 0.
 *
 * Offline and end-to-end: the built CLI talks to a loopback scripted endpoint
 * through the openai-compatible provider's base-URL variable. It is spawned
 * with `runCommand` rather than `runCLI` because it must run from an empty
 * temp directory with an empty HOME — the CLI loads `.env` from its cwd, and a
 * developer's local `.env` or `~/.neurolink` must not reach this test.
 *
 * Run: pnpm run test:cli-json-output
 */

import { resolve } from "node:path";
import {
  assert,
  defineSuite,
  runCommand,
  tempDir,
  type ProcessResult,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import {
  chatCompletion,
  startScriptedChatServer,
  startScriptedStreamingChatServer,
  type ScriptedChatServer,
} from "./helpers/mockChatServer.js";

assertDistFresh();

const { test, runSuite } = defineSuite("CLI piped output completeness", {
  offline: true,
  perTestTimeoutMs: 90_000,
});

const CLI_PATH = resolve("dist/cli/index.js");
const PIPE_BUFFER_BYTES = 65_536;
const LARGE_REPLY_CHARS = 90_000;
const SMALL_REPLY_CHARS = 1_024;
const END_MARKER = "FIXTURE-END-7d1c";

/** A reply of exactly `length` characters whose tail is a unique marker. */
const buildReply = (length: number): string =>
  "A".repeat(length - END_MARKER.length) + END_MARKER;

const DRAIN_WARNING =
  "neurolink: stdout drain timed out; output may be incomplete";
const DRAIN_TIMEOUT_OVERRIDE_MS = "1000";

const cliEnv = (
  server: ScriptedChatServer,
  home: string,
  extra: Record<string, string> = {},
): NodeJS.ProcessEnv =>
  ({
    ...process.env,
    HOME: home,
    OPENAI_COMPATIBLE_BASE_URL: server.baseURL.replace(/\/v1$/, ""),
    OPENAI_COMPATIBLE_API_KEY: "test-key",
    NEUROLINK_SKIP_MCP: "true",
    NEUROLINK_DISABLE_BUILTIN_TOOLS: "true",
    ...extra,
  }) as NodeJS.ProcessEnv;

const runCli = (
  server: ScriptedChatServer,
  args: string[],
): Promise<ProcessResult> => {
  const home = tempDir("neurolink-cli-output-");
  return runCommand("node", [CLI_PATH, ...args], {
    cwd: home,
    env: cliEnv(server, home),
    timeoutMs: 60_000,
  });
};

/**
 * Pipe the CLI into a reader that takes one byte and then stalls, so the stall
 * begins only once output exists. pipefail surfaces the CLI's own exit code.
 */
const runCliThroughStalledReader = (
  server: ScriptedChatServer,
  args: string[],
  stallSeconds: number,
): Promise<ProcessResult> => {
  const home = tempDir("neurolink-cli-output-");
  const script = `set -o pipefail; node "$@" | (dd bs=1 count=1 2>/dev/null; sleep ${stallSeconds}; cat)`;
  return runCommand("bash", ["-c", script, "bash", CLI_PATH, ...args], {
    cwd: home,
    env: cliEnv(server, home, {
      NEUROLINK_STDOUT_DRAIN_TIMEOUT_MS: DRAIN_TIMEOUT_OVERRIDE_MS,
    }),
    timeoutMs: 60_000,
  });
};

const COMMON_ARGS = [
  "--provider",
  "openai-compatible",
  "--model",
  "fixture-model",
  "--quiet",
  "--disableTools",
];

async function checkGenerate(length: number): Promise<void> {
  const reply = buildReply(length);
  const server = await startScriptedChatServer([
    chatCompletion({ content: reply }),
  ]);
  try {
    const result = await runCli(server, [
      "generate",
      "Return the fixture.",
      ...COMMON_ARGS,
      "--format",
      "json",
    ]);
    assert(
      server.requestCount() === 1,
      `precondition: expected exactly one model request, saw ${server.requestCount()}`,
    );
    assert(result.exitCode === 0, `CLI exited with code ${result.exitCode}`);
    const stdoutBytes = Buffer.byteLength(result.stdout);
    if (length > PIPE_BUFFER_BYTES) {
      assert(
        stdoutBytes > PIPE_BUFFER_BYTES,
        `stdout stopped at ${stdoutBytes} bytes; the reply alone is ${length}`,
      );
    }
    let parsed: { content?: unknown };
    try {
      parsed = JSON.parse(result.stdout) as { content?: unknown };
    } catch {
      throw new Error(
        `stdout (${stdoutBytes} bytes) is not a complete JSON document`,
      );
    }
    assert(
      typeof parsed.content === "string" && parsed.content === reply,
      `content is not the full reply (expected ${length} chars, got ${
        typeof parsed.content === "string" ? parsed.content.length : "none"
      })`,
    );
  } finally {
    await server.close();
  }
}

async function checkStream(length: number): Promise<void> {
  const reply = buildReply(length);
  const server = await startScriptedStreamingChatServer([
    chatCompletion({ content: reply }),
  ]);
  try {
    const result = await runCli(server, [
      "stream",
      "Return the fixture.",
      ...COMMON_ARGS,
    ]);
    assert(
      server.requestCount() === 1,
      `precondition: expected exactly one model request, saw ${server.requestCount()}`,
    );
    assert(result.exitCode === 0, `CLI exited with code ${result.exitCode}`);
    const stdoutBytes = Buffer.byteLength(result.stdout);
    assert(
      result.stdout.includes(reply),
      `stdout (${stdoutBytes} bytes) does not contain the full ${length}-char reply`,
    );
  } finally {
    await server.close();
  }
}

await test("generate --format json: a reply larger than the pipe buffer arrives whole", () =>
  checkGenerate(LARGE_REPLY_CHARS));

await test("stream: a reply larger than the pipe buffer arrives whole", () =>
  checkStream(LARGE_REPLY_CHARS));

await test("control: generate --format json with a 1 KiB reply parses", () =>
  checkGenerate(SMALL_REPLY_CHARS));

const GENERATE_JSON_ARGS = [
  "generate",
  "Return the fixture.",
  ...COMMON_ARGS,
  "--format",
  "json",
];

await test("a reader that stalls past the drain bound gets a non-zero exit and a warning", async () => {
  const reply = buildReply(LARGE_REPLY_CHARS);
  const server = await startScriptedChatServer([
    chatCompletion({ content: reply }),
  ]);
  try {
    const result = await runCliThroughStalledReader(
      server,
      GENERATE_JSON_ARGS,
      7,
    );
    assert(
      server.requestCount() === 1,
      `precondition: expected exactly one model request, saw ${server.requestCount()}`,
    );
    const stdoutBytes = Buffer.byteLength(result.stdout);
    assert(
      result.exitCode !== 0,
      `CLI exited 0 although the reader received ${stdoutBytes} bytes of a ${LARGE_REPLY_CHARS}-char reply`,
    );
    assert(
      result.stderr.includes(DRAIN_WARNING),
      "stderr lacks the stdout-drain timeout warning",
    );
  } finally {
    await server.close();
  }
});

await test("a reader that stalls briefly still gets the whole document and exit 0", async () => {
  const reply = buildReply(LARGE_REPLY_CHARS);
  const server = await startScriptedChatServer([
    chatCompletion({ content: reply }),
  ]);
  try {
    const result = await runCliThroughStalledReader(
      server,
      GENERATE_JSON_ARGS,
      0.2,
    );
    assert(
      server.requestCount() === 1,
      `precondition: expected exactly one model request, saw ${server.requestCount()}`,
    );
    assert(result.exitCode === 0, `CLI exited with code ${result.exitCode}`);
    assert(
      !result.stderr.includes(DRAIN_WARNING),
      "stderr carries the drain warning although the reader drained in time",
    );
    const stdoutBytes = Buffer.byteLength(result.stdout);
    let parsed: { content?: unknown };
    try {
      parsed = JSON.parse(result.stdout) as { content?: unknown };
    } catch {
      throw new Error(
        `stdout (${stdoutBytes} bytes) is not a complete JSON document`,
      );
    }
    assert(
      parsed.content === reply,
      `content is not the full ${LARGE_REPLY_CHARS}-char reply`,
    );
  } finally {
    await server.close();
  }
});

await runSuite();
