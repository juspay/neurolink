#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Background Commands + read-only git toolset (N4)
 *
 * Drives the shipped surface only — `NeuroLink` from `../dist/index.js`:
 *   registerBackgroundCommandTools() / startBackgroundCommand() /
 *   getBackgroundCommandStatus() / awaitBackgroundCommand() /
 *   killBackgroundCommand() / readBackgroundCommandOutput() as the host API,
 *   executeTool("run_command_bg" | "command_status" | "command_output" |
 *   "command_kill" | "git_*") as the exact path a model call takes, and
 *   executeTool("retrieve_context") as the path a read-back takes.
 *
 * Two contracts are under test and both are checked by construction, not by
 * eyeball:
 *
 *  1. **Nothing is discarded.** A command's full output is on disk and banked;
 *     previews are bounded and the FILES are not. So the load-bearing
 *     assertions are byte-exact digests and exact byte counts — including at
 *     the output cap, where "we stopped at exactly N bytes and said so" is a
 *     different fact from "we truncated something".
 *  2. **Execution is a contract.** argv only, an exact-match allowlist, a
 *     realpath cwd sandbox (symlinks included), timeouts that actually kill
 *     even a process that ignores SIGTERM, and git tools that take values
 *     rather than flags.
 *
 * NO CREDENTIALS ARE NEEDED. Every case here is mechanical and must always
 * run; there is no live-model case and nothing in this file can SKIP.
 *
 * Run: pnpm run test:background-commands
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  defineSuite,
  assert,
  assertEqual,
  assertIncludes,
  runCommand,
  tempDir,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { NeuroLink } from "../dist/index.js";
import type {
  BackgroundCommandStatus,
  GitToolResult,
} from "../src/lib/types/index.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { test, runSuite, section } = defineSuite("Background Commands", {
  perTestTimeoutMs: 90_000,
  offline: true,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Host = InstanceType<typeof NeuroLink>;

/** The registry wraps every tool result: `{ success, data, usage, metadata }`. */
type ToolEnvelope = { success?: boolean; data?: unknown };

type Refusal = { isError?: boolean; error?: string };

function unwrap(envelope: unknown): unknown {
  const record = envelope as ToolEnvelope | undefined;
  return record && typeof record === "object" && "data" in record
    ? record.data
    : envelope;
}

function asRecord(envelope: unknown): Record<string, unknown> {
  const payload = unwrap(envelope);
  assert(
    !!payload && typeof payload === "object",
    "a tool must return an object",
  );
  return payload as Record<string, unknown>;
}

function refusalOf(envelope: unknown): string {
  const payload = unwrap(envelope) as Refusal;
  assert(
    !!payload && payload.isError === true && typeof payload.error === "string",
    "expected a refusal carrying recovery text",
  );
  return payload.error ?? "";
}

/** Compare large strings by digest — never by pasting them into a message. */
function digest(value: string): string {
  return createHash("sha256").update(value, "utf-8").digest("hex").slice(0, 16);
}

const NODE = process.execPath;

/** A sandbox root plus a host whose policy permits only this node binary. */
function hostWithPolicy(extraExecutables: string[] = []): {
  host: Host;
  root: string;
} {
  const root = tempDir("neurolink-bgcmd-");
  const host = new NeuroLink();
  host.registerBackgroundCommandTools({
    allowedExecutables: [NODE, ...extraExecutables],
    cwdRoot: root,
  });
  return { host, root };
}

/** Run a node one-liner in the background. */
function startNode(
  host: Host,
  root: string,
  script: string,
  options: { timeoutMs?: number; maxOutputBytes?: number } = {},
): Promise<{ taskId: string }> {
  return host.startBackgroundCommand([NODE, "-e", script], {
    cwd: root,
    ...options,
  });
}

/** Walk a command's stream back one window at a time, exactly as a model would. */
async function pageStream(
  host: Host,
  taskId: string,
  stream: "stdout" | "stderr",
  window: number,
): Promise<{ content: string; pages: number; totalSize: number }> {
  let content = "";
  let offset = 0;
  let pages = 0;
  for (;;) {
    const page = await host.readBackgroundCommandOutput(taskId, {
      stream,
      offset,
      limit: window,
    });
    content += page.content;
    pages += 1;
    if (!page.hasMore) {
      return { content, pages, totalSize: page.totalSize };
    }
    offset += page.content.length;
    assert(pages < 2000, "paging failed to terminate");
  }
}

/** The same walk, but through the model-facing tool and its result envelope. */
async function pageStreamThroughTool(
  host: Host,
  taskId: string,
  window: number,
): Promise<string> {
  let content = "";
  let offset = 0;
  for (let page = 0; page < 2000; page += 1) {
    const result = asRecord(
      await host.executeTool("command_output", {
        taskId,
        stream: "stdout",
        offset,
        limit: window,
      }),
    );
    content += String(result.content ?? "");
    if (result.hasMore !== true) {
      return content;
    }
    offset += String(result.content ?? "").length;
  }
  throw new Error("paging through command_output failed to terminate");
}

async function toolNames(host: Host): Promise<string[]> {
  const tools = await host.getAllAvailableTools();
  return tools.map((tool: { name: string }) => tool.name);
}

/**
 * A real git repository: two commits on main, one on a branch, so merge-base,
 * blame and a two-sided diff all have something true to say.
 */
async function makeGitFixture(): Promise<{
  root: string;
  firstSha: string;
  mainSha: string;
}> {
  const root = tempDir("neurolink-gitfx-");
  const git = (args: string[]): Promise<{ stdout: string; exitCode: number }> =>
    runCommand("git", args, { cwd: root, timeoutMs: 30_000 });

  await git(["init", "--initial-branch=main"]);
  await git(["config", "user.email", "fixture@example.invalid"]);
  await git(["config", "user.name", "Fixture Author"]);
  await git(["config", "commit.gpgsign", "false"]);

  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "auth.ts"), "export const a = 1;\n");
  writeFileSync(join(root, "README.md"), "# fixture\n");
  await git(["add", "."]);
  await git(["commit", "-m", "first commit"]);
  const first = await git(["rev-parse", "HEAD"]);

  writeFileSync(
    join(root, "src", "auth.ts"),
    "export const a = 1;\nexport const b = 2;\n",
  );
  await git(["add", "."]);
  await git(["commit", "-m", "second commit"]);
  const main = await git(["rev-parse", "HEAD"]);

  await git(["checkout", "-b", "feature", first.stdout.trim()]);
  writeFileSync(join(root, "src", "feature.ts"), "export const f = 3;\n");
  await git(["add", "."]);
  await git(["commit", "-m", "feature commit"]);
  await git(["checkout", "main"]);

  return {
    root,
    firstSha: first.stdout.trim(),
    mainSha: main.stdout.trim(),
  };
}

const MB = 1_048_576;

/** Output cap for the capping case — deliberately not a multiple of 64 KB. */
const CAP_BYTES = 1_000_000;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

await runSuite(async () => {
  section("A command runs detached and settles with everything banked");

  await test("start returns a handle before the command has finished", async () => {
    const { host, root } = hostWithPolicy();
    const handle = await startNode(
      host,
      root,
      "setTimeout(() => console.log('late'), 400)",
    );
    const immediate = host.getBackgroundCommandStatus(handle.taskId);
    assert(
      immediate.state === "queued" || immediate.state === "running",
      `a freshly started command must not already be settled (was ${immediate.state})`,
    );
    assertEqual(immediate.exitCode, undefined, "no exit code before it exits");
    assertEqual(
      immediate.stdout,
      undefined,
      "nothing is banked until the command settles",
    );

    const settled = await host.awaitBackgroundCommand(handle.taskId);
    assertEqual(settled.state, "exited");
    assertEqual(settled.exitCode, 0);
    assertIncludes(settled.tailPreview, "late");
  });

  await test("both streams are banked in full and read back byte-exact", async () => {
    const { host, root } = hostWithPolicy();
    const handle = await startNode(
      host,
      root,
      "process.stdout.write('OUT-'.repeat(10)); process.stderr.write('ERR!'); process.exit(7)",
    );
    const status = await host.awaitBackgroundCommand(handle.taskId);

    assertEqual(status.state, "exited");
    assertEqual(status.exitCode, 7);
    assertEqual(status.stdoutBytes, 40);
    assertEqual(status.stderrBytes, 4);
    assert(!!status.stdout, "stdout must be banked once settled");
    assert(!!status.stderr, "stderr must be banked once settled");
    assertEqual(status.stdout?.kind, "command-output");
    assertEqual(status.stdout?.sizeBytes, 40);

    assertEqual(
      await host.readArtifact(status.stdout?.artifactId ?? ""),
      "OUT-".repeat(10),
    );
    assertEqual(
      await host.readArtifact(status.stderr?.artifactId ?? ""),
      "ERR!",
    );
  });

  await test("a settled command's artifacts read back through retrieve_context", async () => {
    const { host, root } = hostWithPolicy();
    const handle = await startNode(host, root, "console.log('MARKER-RC')");
    const status = await host.awaitBackgroundCommand(handle.taskId);
    const page = asRecord(
      await host.executeTool("retrieve_context", {
        artifactId: status.stdout?.artifactId,
        offset: 0,
        limit: 1000,
      }),
    );
    assertEqual(page.content, "MARKER-RC\n");
    assertEqual(page.hasMore, false);
  });

  await test("a nonzero exit is reported as data, not as a throw", async () => {
    const { host, root } = hostWithPolicy();
    const handle = await startNode(host, root, "process.exit(42)");
    const status = await host.awaitBackgroundCommand(handle.taskId);
    assertEqual(status.state, "exited");
    assertEqual(status.exitCode, 42);
    assertEqual(status.error, undefined, "a failing command is not an error");
  });

  section("Long-running commands are monitored, not waited on");

  await test("a long-running command is polled to completion while output grows", async () => {
    const { host, root } = hostWithPolicy();
    const handle = await startNode(
      host,
      root,
      "let n = 0; const t = setInterval(() => { console.log('tick ' + (++n)); " +
        "if (n === 12) { clearInterval(t); } }, 60);",
    );

    let sawRunning = false;
    let sawPartialOutput = false;
    let settled: BackgroundCommandStatus | undefined;
    for (let poll = 0; poll < 200; poll += 1) {
      const status = host.getBackgroundCommandStatus(handle.taskId);
      if (status.state === "running") {
        sawRunning = true;
        const partial = await host.readBackgroundCommandOutput(handle.taskId, {
          stream: "stdout",
        });
        if (
          partial.content.includes("tick 1") &&
          !partial.content.includes("tick 12")
        ) {
          sawPartialOutput = true;
        }
      }
      if (status.state !== "queued" && status.state !== "running") {
        settled = status;
        break;
      }
      await new Promise((r) => setTimeout(r, 25));
    }

    assert(sawRunning, "the command must be observable while it is running");
    assert(
      sawPartialOutput,
      "output must be readable BEFORE the command finishes — that is the monitor",
    );
    assert(!!settled, "the polled command must reach a settled state");
    assertEqual(settled?.state, "exited");
    assertEqual(settled?.exitCode, 0);
    const full = await pageStream(host, handle.taskId, "stdout", 4096);
    assertIncludes(full.content, "tick 12");
  });

  section(
    "Big output: capped loudly, banked in full, byte-exact on the way back",
  );

  await test("3 MB of output banks whole and pages back byte-exact", async () => {
    const { host, root } = hostWithPolicy();
    const handle = await startNode(
      host,
      root,
      "const line = 'x'.repeat(1023) + '\\n'; " +
        "for (let i = 0; i < 3072; i++) { process.stdout.write(line); } " +
        "process.stdout.write('DEEP-MARKER\\n');",
    );
    const status = await host.awaitBackgroundCommand(handle.taskId);
    assertEqual(status.state, "exited");
    assertEqual(status.stdoutBytes, 3072 * 1024 + 12);
    assertEqual(status.stdout?.sizeBytes, 3072 * 1024 + 12);

    const walked = await pageStream(host, handle.taskId, "stdout", 200_000);
    assertEqual(walked.totalSize, 3072 * 1024 + 12);
    assert(walked.pages > 10, "a 3 MB stream must take more than one page");

    const banked = await host.readArtifact(status.stdout?.artifactId ?? "");
    assertEqual(
      digest(banked ?? ""),
      digest(walked.content),
      "the banked artifact and the log file must be the same bytes",
    );
    assertIncludes(walked.content.slice(-40), "DEEP-MARKER");
    assertEqual(
      status.tailPreview.length <= 2100,
      true,
      "the tail preview stays bounded however big the output is",
    );
  });

  await test("the byte cap kills the command and keeps every byte up to it", async () => {
    const { host, root } = hostWithPolicy();
    const handle = await startNode(
      host,
      root,
      "const chunk = 'y'.repeat(65536); " +
        "const pump = () => { for (let i = 0; i < 16; i++) { process.stdout.write(chunk); } " +
        "setTimeout(pump, 5); }; pump();",
      // Deliberately NOT a multiple of the 64 KB write size, so the cap falls
      // inside a chunk: a cap that only ever lands on a chunk boundary would
      // pass whether or not the partial write is bounded at all.
      { maxOutputBytes: CAP_BYTES },
    );
    const status = await host.awaitBackgroundCommand(handle.taskId);

    assertEqual(status.state, "output-limit");
    assertEqual(
      status.stdoutBytes,
      CAP_BYTES,
      "the cap is exact — not approximate, and not exceeded",
    );
    assertEqual(status.stdout?.sizeBytes, CAP_BYTES);
    assertIncludes(status.error ?? "", "banked in full");

    const walked = await pageStream(host, handle.taskId, "stdout", 200_000);
    assertEqual(walked.totalSize, CAP_BYTES);
    assertEqual(
      digest(walked.content),
      digest("y".repeat(CAP_BYTES)),
      "everything written up to the cap survives, byte for byte",
    );
  });

  await test("paging through the command_output tool matches the host path", async () => {
    const { host, root } = hostWithPolicy();
    const handle = await startNode(
      host,
      root,
      "for (let i = 0; i < 400; i++) { process.stdout.write('line-' + i + '\\n'); }",
    );
    await host.awaitBackgroundCommand(handle.taskId);
    const viaHost = await pageStream(host, handle.taskId, "stdout", 137);
    const viaTool = await pageStreamThroughTool(host, handle.taskId, 137);
    assertEqual(digest(viaTool), digest(viaHost.content));
    assertIncludes(viaTool, "line-399");
  });

  section("Killing and timing out");

  await test("a killed command stops, and everything it printed is still banked", async () => {
    const { host, root } = hostWithPolicy();
    const handle = await startNode(
      host,
      root,
      "process.stdout.write('BEFORE-KILL\\n'); setInterval(() => {}, 1000);",
    );
    for (let wait = 0; wait < 100; wait += 1) {
      const page = await host.readBackgroundCommandOutput(handle.taskId, {
        stream: "stdout",
      });
      if (page.content.includes("BEFORE-KILL")) {
        break;
      }
      await new Promise((r) => setTimeout(r, 25));
    }

    const status = await host.killBackgroundCommand(handle.taskId);
    assertEqual(status.state, "killed");
    assertIncludes(status.error ?? "", "killed");
    assertEqual(
      await host.readArtifact(status.stdout?.artifactId ?? ""),
      "BEFORE-KILL\n",
      "killing a command discards the process, never its output",
    );
  });

  await test("killing an already-settled command returns its outcome unharmed", async () => {
    const { host, root } = hostWithPolicy();
    const handle = await startNode(host, root, "console.log('done')");
    const first = await host.awaitBackgroundCommand(handle.taskId);
    const second = await host.killBackgroundCommand(handle.taskId);
    assertEqual(second.state, first.state);
    assertEqual(second.exitCode, 0);
    assertEqual(second.stdout?.artifactId, first.stdout?.artifactId);
  });

  await test("a command that outlives its budget is killed and says so", async () => {
    const { host, root } = hostWithPolicy();
    const handle = await startNode(
      host,
      root,
      "process.stdout.write('STARTED\\n'); setInterval(() => {}, 1000);",
      { timeoutMs: 400 },
    );
    const status = await host.awaitBackgroundCommand(handle.taskId);
    assertEqual(status.state, "timeout");
    assertIncludes(status.error ?? "", "400ms budget");
    assertEqual(
      await host.readArtifact(status.stdout?.artifactId ?? ""),
      "STARTED\n",
    );
  });

  await test("a process that ignores SIGTERM is still killed", async () => {
    const { host, root } = hostWithPolicy();
    const startedAt = Date.now();
    const handle = await startNode(
      host,
      root,
      "process.on('SIGTERM', () => {}); process.stdout.write('STUBBORN\\n'); " +
        "setInterval(() => {}, 1000);",
      { timeoutMs: 300 },
    );
    // The WAIT is bounded on purpose. An unbounded await would hang here if
    // the escalation were missing, and the harness scores a hang as a SKIP —
    // so the one defect this case exists to catch would be silently tolerated.
    const status = await host.awaitBackgroundCommand(handle.taskId, {
      timeoutMs: 20_000,
    });
    const elapsed = Date.now() - startedAt;
    assertEqual(
      status.state,
      "timeout",
      "a process that ignores SIGTERM must still be terminated — SIGKILL is not optional",
    );
    assertEqual(
      status.signal,
      "SIGKILL",
      "SIGTERM was ignored, so SIGKILL had to land",
    );
    assert(
      elapsed < 20_000,
      "the escalation must be bounded, not left to the process's goodwill",
    );
  });

  section("Execution is a contract, not advice");

  await test("no policy means nothing runs, and the message names the fix", async () => {
    const host = new NeuroLink();
    const root = tempDir("neurolink-bgcmd-nopolicy-");
    let refused = "";
    try {
      await host.startBackgroundCommand([NODE, "-e", "1"], { cwd: root });
    } catch (error) {
      refused = error instanceof Error ? error.message : String(error);
    }
    assertIncludes(refused, "setBackgroundCommandPolicy");
  });

  await test("a shell command string is refused, and the reason says why", async () => {
    const { host, root } = hostWithPolicy();
    let refused = "";
    try {
      await host.startBackgroundCommand([`${NODE} -e 1 && rm -rf /`], {
        cwd: root,
      });
    } catch (error) {
      refused = error instanceof Error ? error.message : String(error);
    }
    assertIncludes(refused, "NO shell");
  });

  await test("an executable outside the allowlist is refused by name", async () => {
    const { host, root } = hostWithPolicy();
    let refused = "";
    try {
      await host.startBackgroundCommand(["rm", "-rf", root], { cwd: root });
    } catch (error) {
      refused = error instanceof Error ? error.message : String(error);
    }
    assertIncludes(refused, 'Executable "rm" is not allowed');
  });

  await test("a basename does not stand in for an allowlisted absolute path", async () => {
    const { host, root } = hostWithPolicy();
    let refused = "";
    try {
      await host.startBackgroundCommand(["node", "-e", "1"], { cwd: root });
    } catch (error) {
      refused = error instanceof Error ? error.message : String(error);
    }
    assertIncludes(
      refused,
      "not allowed",
      "the allowlist is matched exactly, or allowlisting `git` would permit /tmp/evil/git",
    );
  });

  await test("a cwd outside the root is refused", async () => {
    const { host, root } = hostWithPolicy();
    let refused = "";
    try {
      await host.startBackgroundCommand([NODE, "-e", "1"], { cwd: "/etc" });
    } catch (error) {
      refused = error instanceof Error ? error.message : String(error);
    }
    assertIncludes(refused, "outside the permitted root");
    assertIncludes(refused, root);
  });

  await test("a symlink out of the root is refused — the check is realpath, not string", async () => {
    const { host, root } = hostWithPolicy();
    const escape = join(root, "escape");
    symlinkSync(resolve("/etc"), escape, "dir");
    let refused = "";
    try {
      await host.startBackgroundCommand([NODE, "-e", "1"], { cwd: escape });
    } catch (error) {
      refused = error instanceof Error ? error.message : String(error);
    }
    assertIncludes(refused, "outside the permitted root");
    assertIncludes(refused, "/etc");
  });

  await test("a sibling directory sharing the root's prefix is refused", async () => {
    const { host, root } = hostWithPolicy();
    const sibling = `${root}-evil`;
    mkdirSync(sibling, { recursive: true });
    let refused = "";
    try {
      await host.startBackgroundCommand([NODE, "-e", "1"], { cwd: sibling });
    } catch (error) {
      refused = error instanceof Error ? error.message : String(error);
    }
    assertIncludes(refused, "outside the permitted root");
  });

  await test("the policy hook has the final say, in its own words", async () => {
    const root = tempDir("neurolink-bgcmd-veto-");
    const host = new NeuroLink();
    host.registerBackgroundCommandTools({
      allowedExecutables: [NODE],
      cwdRoot: root,
      allowlist: (argv) =>
        argv.includes("--forbidden") ? "This flag is not reviewed here." : true,
    });
    let refused = "";
    try {
      await host.startBackgroundCommand([NODE, "-e", "1", "--forbidden"], {
        cwd: root,
      });
    } catch (error) {
      refused = error instanceof Error ? error.message : String(error);
    }
    assertEqual(refused, "This flag is not reviewed here.");
    const allowed = await host.startBackgroundCommand([NODE, "-e", "1"], {
      cwd: root,
    });
    assertEqual(
      (await host.awaitBackgroundCommand(allowed.taskId)).exitCode,
      0,
      "the veto must apply to the command it named, not to everything",
    );
  });

  await test("an allowlisted executable that does not exist settles rather than hanging", async () => {
    const root = tempDir("neurolink-bgcmd-enoent-");
    const host = new NeuroLink();
    const missing = join(root, "definitely-not-here");
    host.registerBackgroundCommandTools({
      allowedExecutables: [missing],
      cwdRoot: root,
    });
    const handle = await host.startBackgroundCommand([missing], { cwd: root });
    const status = await host.awaitBackgroundCommand(handle.taskId);
    assertIncludes(status.error ?? "", "could not be started");
    assert(
      !!status.stdout,
      "a command that never ran still banks its (empty) streams",
    );
  });

  await test("an explicit env replaces the parent environment entirely", async () => {
    const { host, root } = hostWithPolicy();
    process.env.NEUROLINK_BGCMD_SECRET = "leaked-value";
    try {
      const inherited = await startNode(
        host,
        root,
        "process.stdout.write(String(process.env.NEUROLINK_BGCMD_SECRET))",
      );
      const inheritedStatus = await host.awaitBackgroundCommand(
        inherited.taskId,
      );
      assertEqual(
        await host.readArtifact(inheritedStatus.stdout?.artifactId ?? ""),
        "leaked-value",
        "omitting env inherits the parent environment",
      );

      const replaced = await host.startBackgroundCommand(
        [
          NODE,
          "-e",
          "process.stdout.write(String(process.env.NEUROLINK_BGCMD_SECRET))",
        ],
        { cwd: root, env: { PATH: process.env.PATH ?? "" } },
      );
      const replacedStatus = await host.awaitBackgroundCommand(replaced.taskId);
      assertEqual(
        await host.readArtifact(replacedStatus.stdout?.artifactId ?? ""),
        "undefined",
        "an explicit env must not leak the host's secrets into the child",
      );
    } finally {
      delete process.env.NEUROLINK_BGCMD_SECRET;
    }
  });

  section("The model-facing tools and the completion channel");

  await test("registration is opt-in and idempotent", async () => {
    const bare = new NeuroLink();
    const names = await toolNames(bare);
    for (const tool of [
      "run_command_bg",
      "command_status",
      "command_output",
      "command_kill",
    ]) {
      assertEqual(
        names.includes(tool),
        false,
        `${tool} must not exist until a host asks for it`,
      );
    }
    const root = tempDir("neurolink-bgcmd-idem-");
    bare.registerBackgroundCommandTools({
      allowedExecutables: [NODE],
      cwdRoot: root,
    });
    bare.registerBackgroundCommandTools({
      allowedExecutables: [NODE],
      cwdRoot: root,
    });
    const after = await toolNames(bare);
    assertEqual(
      after.filter((name) => name === "run_command_bg").length,
      1,
      "a second registration must not duplicate the toolset",
    );
  });

  await test("the tools refuse in-band and start in-band", async () => {
    const { host, root } = hostWithPolicy();
    host.setToolContext({ sessionId: "cmd-tools" });

    assertIncludes(
      refusalOf(
        await host.executeTool("run_command_bg", { argv: ["rm", "-rf", "/"] }),
      ),
      "not allowed",
    );
    assertIncludes(
      refusalOf(await host.executeTool("command_status", { taskId: "nope" })),
      'No background command "nope"',
    );

    const started = asRecord(
      await host.executeTool("run_command_bg", {
        argv: [NODE, "-e", "console.log('TOOL-PATH')"],
      }),
    );
    assert(typeof started.taskId === "string", "the tool returns a taskId");
    assertEqual(started.running, 1, "the caller is told what is outstanding");

    const status = asRecord(
      await host.executeTool("command_status", {
        taskId: started.taskId,
        waitMs: 30_000,
      }),
    );
    assertEqual(status.state, "exited");
    assertEqual(status.exitCode, 0);
    assertIncludes(String(status.tailPreview), "TOOL-PATH");
    assertEqual(
      status.finished,
      0,
      "reading a settled command clears it from the unread count",
    );
  });

  await test("command_status is not served from the tool-result cache", async () => {
    const { host, root } = hostWithPolicy();
    const handle = await startNode(
      host,
      root,
      "setTimeout(() => process.stdout.write('EVENTUALLY'), 300)",
    );
    const first = asRecord(
      await host.executeTool("command_status", { taskId: handle.taskId }),
    );
    assert(
      first.state === "queued" || first.state === "running",
      "the first read sees a command that has not finished",
    );
    await host.awaitBackgroundCommand(handle.taskId);
    const second = asRecord(
      await host.executeTool("command_status", { taskId: handle.taskId }),
    );
    assertEqual(
      second.state,
      "exited",
      "identical arguments must not replay a status the command has moved past",
    );
  });

  await test("the checklist carries the command counters — the completion channel", async () => {
    const { host, root } = hostWithPolicy();
    host.registerTaskTools();
    host.setToolContext({ sessionId: "cmd-notify" });

    const created = asRecord(
      await host.executeTool("tasks_create", { titles: ["run the checks"] }),
    );
    assertEqual(created.commandsRunning, 0);
    assertEqual(created.commandsFinished, 0);

    const handle = await host.startBackgroundCommand(
      [NODE, "-e", "setTimeout(() => console.log('checks done'), 400)"],
      { cwd: root, sessionId: "cmd-notify" },
    );
    const during = asRecord(await host.executeTool("tasks_list", {}));
    assertEqual(
      during.commandsRunning,
      1,
      "a tasks_list must show the agent that a command is still running",
    );
    assertEqual(during.commandsFinished, 0);

    await new Promise((r) => setTimeout(r, 900));
    const after = asRecord(await host.executeTool("tasks_list", {}));
    assertEqual(
      after.commandsFinished,
      1,
      "the agent learns a command finished from tasks_list — no polling required",
    );
    assertEqual(after.commandsRunning, 0);

    host.getBackgroundCommandStatus(handle.taskId);
    const read = asRecord(await host.executeTool("tasks_list", {}));
    assertEqual(
      read.commandsFinished,
      0,
      "once the agent has looked, the counter stops nagging",
    );
  });

  await test("a worker's session does not see another session's commands", async () => {
    const { host, root } = hostWithPolicy();
    await host.startBackgroundCommand(
      [NODE, "-e", "setTimeout(() => {}, 500)"],
      { cwd: root, sessionId: "session-a" },
    );
    host.registerTaskTools();
    host.setToolContext({ sessionId: "session-b" });
    const listed = asRecord(await host.executeTool("tasks_list", {}));
    assertEqual(
      listed.commandsRunning,
      0,
      "counters are session-scoped, or a worker would report its supervisor's work",
    );
  });

  section("Read-only git toolset");

  await test("the six git tools register, opt-in, and answer real questions", async () => {
    const fixture = await makeGitFixture();
    const host = new NeuroLink();
    const before = await toolNames(host);
    assertEqual(before.includes("git_log"), false, "git tools are opt-in");

    host.registerGitTools({ repoRoot: fixture.root });
    const after = await toolNames(host);
    for (const tool of [
      "git_log",
      "git_show",
      "git_diff",
      "git_blame",
      "git_merge_base",
      "git_ls_files",
    ]) {
      assertEqual(after.includes(tool), true, `${tool} must be registered`);
    }

    const files = unwrap(
      await host.executeTool("git_ls_files", {}),
    ) as GitToolResult;
    assertEqual(files.ok, true);
    assertIncludes(files.preview, "src/auth.ts");
    assertIncludes(files.preview, "README.md");

    const log = unwrap(
      await host.executeTool("git_log", { maxCount: 5 }),
    ) as GitToolResult;
    assertEqual(log.ok, true);
    assertIncludes(log.preview, "second commit");
    assertIncludes(log.preview, "first commit");

    const show = unwrap(
      await host.executeTool("git_show", { ref: fixture.firstSha }),
    ) as GitToolResult;
    assertEqual(show.ok, true);
    assertIncludes(show.preview, "first commit");

    const diff = unwrap(
      await host.executeTool("git_diff", {
        base: fixture.firstSha,
        head: fixture.mainSha,
        nameOnly: true,
      }),
    ) as GitToolResult;
    assertEqual(diff.ok, true);
    assertEqual(diff.preview.trim(), "src/auth.ts");

    const base = unwrap(
      await host.executeTool("git_merge_base", {
        base: "main",
        head: "feature",
      }),
    ) as GitToolResult;
    assertEqual(base.ok, true);
    assertEqual(base.preview.trim(), fixture.firstSha);

    const blame = unwrap(
      await host.executeTool("git_blame", {
        path: "src/auth.ts",
        lineStart: 1,
        lineEnd: 2,
      }),
    ) as GitToolResult;
    assertEqual(blame.ok, true);
    assertIncludes(blame.preview, "Fixture Author");
  });

  await test("git output is banked in full and readable with retrieve_context", async () => {
    const fixture = await makeGitFixture();
    const host = new NeuroLink();
    host.registerGitTools({ repoRoot: fixture.root, previewChars: 20 });
    const result = unwrap(
      await host.executeTool("git_log", { maxCount: 5, format: "full" }),
    ) as GitToolResult;

    assertEqual(
      result.preview.length,
      21,
      "20 characters plus the elision mark",
    );
    assert(
      result.output.sizeBytes > result.preview.length,
      "the banked output must be larger than the preview, or the case proves nothing",
    );
    assertIncludes(result.readBackHint, "retrieve_context");

    const page = asRecord(
      await host.executeTool("retrieve_context", {
        artifactId: result.output.artifactId,
        offset: 0,
        limit: 100_000,
      }),
    );
    assertIncludes(String(page.content), "second commit");
    assertIncludes(String(page.content), "first commit");
  });

  await test("git tools take values, never flags", async () => {
    const fixture = await makeGitFixture();
    const host = new NeuroLink();
    host.registerGitTools({ repoRoot: fixture.root });

    assertIncludes(
      refusalOf(
        await host.executeTool("git_log", { ref: "--output=/tmp/pwned" }),
      ),
      'must not start with "-"',
    );
    assertIncludes(
      refusalOf(
        await host.executeTool("git_diff", { base: "--output=/tmp/pwned" }),
      ),
      'must not start with "-"',
    );
    assertIncludes(
      refusalOf(
        await host.executeTool("git_show", { ref: "main", path: "-x" }),
      ),
      'must not start with "-"',
    );
    assertIncludes(
      refusalOf(await host.executeTool("git_log", { ref: "main; rm -rf /" })),
      "not a valid git revision",
    );
    assertIncludes(
      refusalOf(await host.executeTool("git_diff", { head: "main" })),
      "needs a base",
    );
  });

  await test("a flag split across two value fields cannot make git write a file", async () => {
    const fixture = await makeGitFixture();
    const host = new NeuroLink();
    host.registerGitTools({ repoRoot: fixture.root });

    // The exploit shape the leading-dash guard actually closes, and the one a
    // character-class check does NOT: `--output=<path>` is refused by the ref
    // pattern anyway (`=` is not a ref character), but `--output` and its path
    // are two SEPARATE argv entries, and each one on its own is a valid-looking
    // value. Split across base and head they reassemble into a real write.
    const target = join(tempDir("neurolink-gitwrite-"), "written-by-git");
    const outcome = await host.executeTool("git_diff", {
      base: "--output",
      head: target,
    });

    // The file check comes FIRST and is unconditional: whether git was asked
    // politely is secondary to whether a read-only tool created a file.
    assertEqual(
      existsSync(target),
      false,
      "a read-only tool must not be able to create a file outside the repository",
    );
    assertIncludes(refusalOf(outcome), 'must not start with "-"');
  });

  await test("a git path outside the repository is refused", async () => {
    const fixture = await makeGitFixture();
    const host = new NeuroLink();
    host.registerGitTools({ repoRoot: fixture.root });
    for (const path of ["../../etc/passwd", "/etc/passwd"]) {
      assertIncludes(
        refusalOf(await host.executeTool("git_blame", { path })),
        "outside the permitted root",
      );
    }
  });

  await test("git tools ask about a deleted path without pretending it exists", async () => {
    const fixture = await makeGitFixture();
    const host = new NeuroLink();
    host.registerGitTools({ repoRoot: fixture.root });
    const result = unwrap(
      await host.executeTool("git_log", { path: "src/gone.ts", maxCount: 5 }),
    ) as GitToolResult;
    assertEqual(
      result.ok,
      true,
      "a path that is not on disk is a legitimate question for git history",
    );
    assertEqual(result.preview.trim(), "");
  });

  await test("registering git tools does not widen what run_command_bg may execute", async () => {
    const fixture = await makeGitFixture();
    const { host, root } = hostWithPolicy();
    host.registerGitTools({ repoRoot: fixture.root });

    const viaGitTool = unwrap(
      await host.executeTool("git_log", { maxCount: 1 }),
    ) as GitToolResult;
    assertEqual(viaGitTool.ok, true, "the git tool itself still works");

    assertIncludes(
      refusalOf(
        await host.executeTool("run_command_bg", { argv: ["git", "log"] }),
      ),
      "not allowed",
    );
    let refused = "";
    try {
      await host.startBackgroundCommand(["git", "status"], { cwd: root });
    } catch (error) {
      refused = error instanceof Error ? error.message : String(error);
    }
    assertIncludes(refused, 'Executable "git" is not allowed');
  });

  await test("a git tool without registerGitTools names the fix", async () => {
    const host = new NeuroLink();
    host.registerGitTools({ repoRoot: tempDir("neurolink-git-empty-") });
    // Registration happened, so the tools exist; drop the settings by taking a
    // fresh instance and driving the host API directly.
    const bare = new NeuroLink();
    let refused = "";
    try {
      await bare.runGitCommand(["log"]);
    } catch (error) {
      refused = error instanceof Error ? error.message : String(error);
    }
    assertIncludes(refused, "registerGitTools");
  });
});
