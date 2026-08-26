/**
 * Background commands (N4) — run a command detached, bank every byte it
 * writes, monitor it while it runs.
 *
 * A reviewing agent has to run real commands — a build, a test suite, a linter
 * whose output IS the evidence for a finding — and the naive shapes both fail.
 * `bashTool` blocks the loop, hands the model a shell, and truncates its own
 * output at 100 KB. A `child_process` call with a string command is a shell
 * injection with extra steps.
 *
 * This module keeps three promises instead:
 *
 *  - **Detached.** `startBackgroundCommand` returns a `taskId` immediately; the
 *    agent keeps working and asks about the command when it wants to.
 *  - **Nothing discarded.** Both streams are written straight to files as they
 *    arrive and the COMPLETE files are banked as artifacts (N3) when the
 *    command settles. The conversation gets a bounded tail plus a read-back
 *    call. The single bound is `maxOutputBytes`, and reaching it is a state
 *    (`output-limit`) the caller can see, not a silent cut.
 *  - **Hardened by contract.** argv arrays with `shell: false`, an exact-match
 *    executable allowlist, a cwd that must resolve through symlinks inside a
 *    declared root, and a timeout that escalates SIGTERM → SIGKILL.
 *
 * Completion reaches the model the same way a delegate's does (N2.3): the
 * `running` / `finished` counters ride on every command tool result and — via
 * the checklist — on every `tasks_list`. The core generate loop is untouched.
 *
 * @module agent/backgroundCommands
 */

import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createWriteStream, type WriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Readable } from "node:stream";
import { z } from "zod";
import type { NeuroLink } from "../neurolink.js";
import type {
  BankedArtifactRef,
  BackgroundCommandCounts,
  BackgroundCommandHandle,
  BackgroundCommandJobState,
  BackgroundCommandOptions,
  BackgroundCommandOutputPage,
  BackgroundCommandPageRequest,
  BackgroundCommandPolicy,
  BackgroundCommandRefusal,
  BackgroundCommandStartToolResult,
  BackgroundCommandState,
  BackgroundCommandStatus,
  BackgroundCommandStatusToolResult,
  BackgroundCommandStreamName,
  BackgroundCommandStreamState,
  MCPExecutableTool,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { resolveWithinRoot } from "../utils/pathSandbox.js";
import {
  resolveChecklistSessionId,
  setChecklistCommandCountsSource,
} from "./taskChecklist.js";

/**
 * Every command this process started, keyed by taskId.
 *
 * Module-level for the same reason the checklist and the delegation registry
 * are: a command outlives the tool call that started it, and compaction — which
 * only rewrites messages — cannot touch a module map. Settled jobs are NOT
 * evicted: their log files and banked artifacts are the run's evidence, and a
 * status call that answers "unknown taskId" for a command that ran is exactly
 * the information loss this primitive exists to prevent.
 */
const commands = new Map<string, BackgroundCommandJobState<NeuroLink>>();

const hostPolicies = new WeakMap<object, BackgroundCommandPolicy>();

/** Wall-clock budget when neither the caller nor the policy names one. */
const DEFAULT_COMMAND_TIMEOUT_MS = 120_000;

/** Per-stream byte cap when neither the caller nor the policy names one. */
const DEFAULT_MAX_OUTPUT_BYTES = 10_485_760;

/** How long a SIGTERMed process has to unwind before SIGKILL. */
const SIGKILL_GRACE_MS = 5_000;

/** Hard bound on `tailPreview`, whatever the streams hold. */
const TAIL_PREVIEW_CHARS = 2_000;

/**
 * Raw bytes kept per stream for the tail. Four bytes per character is the
 * UTF-8 worst case, so this can always produce a full-length preview.
 */
const TAIL_BUFFER_BYTES = TAIL_PREVIEW_CHARS * 4;

/** Preview cut into the conversation from each banked stream. */
const OUTPUT_BANK_PREVIEW_CHARS = 600;

/** Characters returned by one `command_output` page when none is asked for. */
const DEFAULT_OUTPUT_PAGE_CHARS = 50_000;

/** Ceiling on one page, however much the caller asks for. */
const MAX_OUTPUT_PAGE_CHARS = 200_000;

/** Longest label derived from an argv. */
const LABEL_MAX_CHARS = 60;

/** Directory under the OS temp dir that holds every command's logs. */
const COMMAND_LOG_DIR = "neurolink-commands";

/**
 * Characters that only mean something to a shell.
 *
 * argv[0] is executed directly — there is no shell to interpret them — so
 * their presence means the caller believed it was writing a shell command
 * line. Refusing loudly is far kinder than spawning an executable literally
 * named `sh -c rm -rf /`, which is what would otherwise happen.
 */
const SHELL_METACHARACTERS = /[;&|<>$`\n\r]/;

const STREAM_NAMES: readonly BackgroundCommandStreamName[] = [
  "stdout",
  "stderr",
];

let commandCounter = 0;
let checklistCountsInstalled = false;

// ── Small helpers ──────────────────────────────────────────────────────────

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Matches `agentToolRegistrar`'s convention: the recovery step is IN the text. */
function refusal(message: string): BackgroundCommandRefusal {
  return { isError: true, error: message };
}

function bounded(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}

function labelFor(argv: string[], explicit?: string): string {
  const chosen =
    explicit?.trim() || argv.slice(0, 2).join(" ") || argv[0] || "command";
  return bounded(chosen, LABEL_MAX_CHARS);
}

function emptyStream(path: string): BackgroundCommandStreamState {
  return {
    path,
    bytes: 0,
    tailBytes: Buffer.alloc(0),
    limitReached: false,
  };
}

/**
 * Decode a byte tail. The window starts wherever the stream happened to be,
 * so it may open mid-character; the replacement character that produces is
 * dropped rather than shown.
 */
function decodeTail(bytes: Buffer): string {
  const text = bytes.toString("utf-8");
  const trimmed = text.startsWith("\uFFFD") ? text.slice(1) : text;
  return trimmed.slice(-TAIL_PREVIEW_CHARS);
}

// ── Policy ─────────────────────────────────────────────────────────────────

/**
 * Declare what this host may execute. There is no default: until this is
 * called, every start is refused, because "run whatever the model asks" is not
 * a defensible default for a primitive that spawns processes.
 */
export function setBackgroundCommandPolicy(
  host: NeuroLink,
  policy: BackgroundCommandPolicy,
): void {
  hostPolicies.set(host, policy);
  installChecklistCounts();
  logger.debug("[BackgroundCommands] Policy set", {
    allowedExecutables: policy.allowedExecutables.length,
    cwdRoot: policy.cwdRoot,
  });
}

/** The policy in force for a host, or undefined when none was declared. */
export function getBackgroundCommandPolicy(
  host: NeuroLink,
): BackgroundCommandPolicy | undefined {
  return hostPolicies.get(host);
}

const NO_POLICY_REFUSAL =
  "No background-command policy is set on this instance, so nothing may be executed. " +
  "The host must call setBackgroundCommandPolicy({ allowedExecutables, cwdRoot }) — " +
  "or registerBackgroundCommandTools(policy) — before any command can start. Do the " +
  "work with your other tools instead.";

// ── Counting ───────────────────────────────────────────────────────────────

function isSettled(job: BackgroundCommandJobState<NeuroLink>): boolean {
  return job.settledAt !== undefined;
}

function tally(
  candidates: BackgroundCommandJobState<NeuroLink>[],
): BackgroundCommandCounts {
  let running = 0;
  let finished = 0;
  for (const job of candidates) {
    if (!isSettled(job)) {
      running += 1;
    } else if (!job.acknowledged) {
      finished += 1;
    }
  }
  return { running, finished };
}

/**
 * Hand out a job's status and record that someone has now seen it.
 *
 * A settled command stays in the registry forever — its logs and artifacts are
 * the run's evidence — so "finished" has to mean "finished and unread" or the
 * counter only ever climbs and stops meaning anything. Nothing is dropped when
 * it clears; only the flag moves.
 */
function acknowledge(
  job: BackgroundCommandJobState<NeuroLink>,
): BackgroundCommandStatus {
  if (isSettled(job)) {
    job.acknowledged = true;
  }
  return statusOf(job);
}

/** Counts across every host for one session — what the checklist reads. */
function countsForSession(sessionId: string): BackgroundCommandCounts {
  return tally(
    [...commands.values()].filter((job) => job.sessionId === sessionId),
  );
}

/**
 * Commands for a host's session: `running` have not settled, `finished` have.
 * Carried on every command tool result and on every `ChecklistToolResult`, so
 * the model learns a build finished without polling for it.
 */
export function backgroundCommandCounts(
  host: NeuroLink,
  sessionId?: string,
): BackgroundCommandCounts {
  const session = sessionId ?? resolveChecklistSessionId(host);
  return tally(
    [...commands.values()].filter(
      (job) => job.host === host && job.sessionId === session,
    ),
  );
}

/**
 * Feed the task checklist's command counters, once per process — the N2.3
 * notification channel, reused rather than rebuilt.
 */
function installChecklistCounts(): void {
  if (checklistCountsInstalled) {
    return;
  }
  setChecklistCommandCountsSource(countsForSession);
  checklistCountsInstalled = true;
}

// ── Validation ─────────────────────────────────────────────────────────────

/**
 * Everything that must hold before a process is created. Returns the refusal
 * reason, or undefined when the start may proceed.
 *
 * Each check names its own recovery step: a refusal the model cannot act on
 * just becomes a retry of the same call.
 */
function validateArgv(
  argv: string[],
  policy: BackgroundCommandPolicy,
): string | undefined {
  if (!Array.isArray(argv) || argv.length === 0) {
    return (
      "A command needs a non-empty argv array: the executable first, then one array " +
      'entry per argument — ["pnpm", "run", "lint"], never a single command string.'
    );
  }
  if (argv.some((part) => typeof part !== "string")) {
    return "Every argv entry must be a string. Pass each argument as its own entry.";
  }
  if (argv.some((part) => part.includes("\0"))) {
    return "argv entries must not contain NUL bytes. Remove it and retry.";
  }
  const executable = argv[0];
  if (SHELL_METACHARACTERS.test(executable) || /\s/.test(executable)) {
    return (
      `"${bounded(executable, 80)}" is not an executable name. Commands run with NO shell, ` +
      "so pipes, redirects, semicolons and quoting do nothing — put the executable in " +
      "argv[0] and every argument in its own entry. If you need a pipeline, run the " +
      "steps as separate commands."
    );
  }
  if (!policy.allowedExecutables.includes(executable)) {
    const allowed = policy.allowedExecutables.join(", ") || "(none)";
    return (
      `Executable "${executable}" is not allowed here. Permitted executables are: ${allowed}. ` +
      "Use one of those, or do the work with your other tools."
    );
  }
  return undefined;
}

// ── Job bookkeeping ────────────────────────────────────────────────────────

function jobFor(
  host: NeuroLink,
  taskId: string,
): BackgroundCommandJobState<NeuroLink> {
  const job = commands.get(taskId);
  if (!job || job.host !== host) {
    const known = [...commands.values()]
      .filter((candidate) => candidate.host === host)
      .map((candidate) => candidate.taskId);
    throw new Error(
      known.length > 0
        ? `No background command "${taskId}". Known task ids are ${known.join(", ")} — ` +
            "use one of those."
        : `No background command "${taskId}": this instance has not started any. ` +
            "Start one with run_command_bg first.",
    );
  }
  return job;
}

function renderTail(job: BackgroundCommandJobState<NeuroLink>): string {
  const out = decodeTail(job.streams.stdout.tailBytes);
  const err = decodeTail(job.streams.stderr.tailBytes);
  if (!out && !err) {
    return isSettled(job) ? "(the command wrote no output)" : "(no output yet)";
  }
  const budget =
    out && err ? Math.floor(TAIL_PREVIEW_CHARS / 2) : TAIL_PREVIEW_CHARS;
  const parts: string[] = [];
  if (out) {
    parts.push(`[stdout tail]\n${out.slice(-budget)}`);
  }
  if (err) {
    parts.push(`[stderr tail]\n${err.slice(-budget)}`);
  }
  return parts.join("\n");
}

/** The public view of a job, built fresh on every read so it is never stale. */
function statusOf(
  job: BackgroundCommandJobState<NeuroLink>,
): BackgroundCommandStatus {
  return {
    taskId: job.taskId,
    label: job.label,
    state: job.state,
    ...(job.exitCode !== undefined && { exitCode: job.exitCode }),
    ...(job.signal && { signal: job.signal }),
    durationMs: (job.settledAt ?? Date.now()) - job.startedAt,
    stdoutBytes: job.streams.stdout.bytes,
    stderrBytes: job.streams.stderr.bytes,
    ...(job.streams.stdout.banked && { stdout: job.streams.stdout.banked }),
    ...(job.streams.stderr.banked && { stderr: job.streams.stderr.banked }),
    tailPreview: renderTail(job),
    ...(job.error && { error: job.error }),
  };
}

/**
 * Bank one stream's log file and hand back the pointer.
 *
 * A banking failure is reported in the reference rather than thrown: losing
 * the artifact must not also lose the command's outcome, and the caller is
 * told in so many words that the read-back is unavailable and why — the log
 * file itself is still on disk at the path named in the hint.
 */
async function bankStream(
  job: BackgroundCommandJobState<NeuroLink>,
  name: BackgroundCommandStreamName,
): Promise<BankedArtifactRef> {
  const stream = job.streams[name];
  const label = `${job.label} [${name}]`;
  let content = "";
  try {
    content = await readFile(stream.path, "utf-8");
  } catch (error) {
    logger.warn("[BackgroundCommands] Reading the stream log failed", {
      taskId: job.taskId,
      stream: name,
      error: errorMessage(error),
    });
  }
  try {
    return await job.host.bankArtifact(content, {
      kind: "command-output",
      label,
      sessionId: job.sessionId,
      previewChars: OUTPUT_BANK_PREVIEW_CHARS,
    });
  } catch (error) {
    const message = errorMessage(error);
    logger.warn("[BackgroundCommands] Banking the command output failed", {
      taskId: job.taskId,
      stream: name,
      error: message,
    });
    return {
      artifactId: "",
      label,
      kind: "command-output",
      sizeBytes: stream.bytes,
      preview: bounded(content, OUTPUT_BANK_PREVIEW_CHARS),
      readBackHint:
        `The ${name} artifact could NOT be created (${message}), so retrieve_context has ` +
        `nothing to read. The complete log is still on disk at ${stream.path}.`,
    };
  }
}

// ── Starting a command ─────────────────────────────────────────────────────

function resolveState(
  job: BackgroundCommandJobState<NeuroLink>,
  reason: string | undefined,
): BackgroundCommandState {
  if (reason === "timeout") {
    return "timeout";
  }
  if (reason === "output-limit") {
    return "output-limit";
  }
  // sink-error included: if the child exits on its own before the SIGTERM
  // lands, `job.signal` stays unset and the job would settle as a clean
  // `exited` — with a banked log the failed sink silently truncated.
  if (reason === "killed" || reason === "aborted" || reason === "sink-error") {
    return "killed";
  }
  // Nobody here asked for it: an external signal still ended the process.
  return job.signal ? "killed" : "exited";
}

function endWriteStream(stream: WriteStream): Promise<void> {
  return new Promise<void>((resolve) => {
    // An errored sink auto-destroys, and end() on a destroyed stream never
    // calls back — finish() must not hang on it.
    if (stream.destroyed) {
      resolve();
      return;
    }
    stream.end(() => resolve());
  });
}

/**
 * Pipe one stream to its log file while counting bytes, keeping a UTF-8-safe
 * rolling tail, and enforcing the byte cap.
 *
 * At the cap, everything up to it stays on disk in full and the command is
 * killed with state `output-limit` — a loud stop, never a silent truncation
 * that leaves the caller believing it read the whole thing.
 */
function attachStream(
  source: Readable,
  state: BackgroundCommandStreamState,
  sink: WriteStream,
  maxOutputBytes: number,
  onLimit: () => void,
): void {
  source.on("data", (chunk: Buffer) => {
    if (state.limitReached) {
      return;
    }
    const room = maxOutputBytes - state.bytes;
    const slice = chunk.length <= room ? chunk : chunk.subarray(0, room);
    if (slice.length > 0) {
      state.bytes += slice.length;
      state.tailBytes = Buffer.concat([state.tailBytes, slice]).subarray(
        -TAIL_BUFFER_BYTES,
      );
      if (!sink.write(slice)) {
        source.pause();
        sink.once("drain", () => source.resume());
      }
    }
    // Strict: a chunk that exactly fills the remaining room is complete
    // output, not overflow. When room hits 0, any later non-empty chunk is
    // still `> room`, so real overflow is never missed.
    if (chunk.length > room) {
      state.limitReached = true;
      onLimit();
    }
  });
  source.on("error", (error: unknown) => {
    logger.warn("[BackgroundCommands] Output stream error", {
      error: errorMessage(error),
    });
  });
}

/**
 * Start a command with an explicit policy, bypassing the host's own.
 *
 * The git toolset uses this so registering read-only git tools never widens
 * what `run_command_bg` may execute, and never requires the host to declare a
 * general command policy at all.
 *
 * @internal
 */
export async function startCommandWithPolicy(
  host: NeuroLink,
  argv: string[],
  options: BackgroundCommandOptions,
  policy: BackgroundCommandPolicy,
): Promise<BackgroundCommandHandle> {
  const invalid = validateArgv(argv, policy);
  if (invalid) {
    throw new Error(invalid);
  }
  const sandboxed = resolveWithinRoot(options.cwd, policy.cwdRoot);
  if (sandboxed.error !== undefined) {
    throw new Error(sandboxed.error);
  }
  const cwd = sandboxed.path;
  const vetoed = policy.allowlist?.(argv, cwd);
  if (typeof vetoed === "string") {
    throw new Error(vetoed);
  }

  installChecklistCounts();

  commandCounter += 1;
  const taskId = `c${commandCounter}${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const dir = join(tmpdir(), COMMAND_LOG_DIR, taskId);
  await mkdir(dir, { recursive: true, mode: 0o700 });

  const startedAt = Date.now();
  const timeoutMs =
    options.timeoutMs ?? policy.defaultTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
  const maxOutputBytes =
    options.maxOutputBytes ?? policy.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;

  let settleJob: (status: BackgroundCommandStatus) => void = () => undefined;
  const settled = new Promise<BackgroundCommandStatus>((resolvePromise) => {
    settleJob = resolvePromise;
  });

  const job: BackgroundCommandJobState<NeuroLink> = {
    taskId,
    host,
    sessionId: options.sessionId ?? resolveChecklistSessionId(host),
    label: labelFor(argv, options.label),
    argv: [...argv],
    cwd,
    state: "queued",
    startedAt,
    acknowledged: false,
    streams: {
      stdout: emptyStream(join(dir, "stdout.log")),
      stderr: emptyStream(join(dir, "stderr.log")),
    },
    maxOutputBytes,
    timeoutMs,
    settled,
  };
  commands.set(taskId, job);

  runCommand(job, options, settleJob);

  logger.debug("[BackgroundCommands] Command started", {
    taskId,
    label: job.label,
    cwd,
    timeoutMs,
  });
  return { taskId, argv: [...argv], startedAt };
}

/**
 * Spawn the child and wire up everything that can end it. Never throws: a
 * failure to spawn settles the job with the reason, because a command that
 * vanishes is a command the agent waits on forever.
 */
function runCommand(
  job: BackgroundCommandJobState<NeuroLink>,
  options: BackgroundCommandOptions,
  settleJob: (status: BackgroundCommandStatus) => void,
): void {
  const outSink = createWriteStream(job.streams.stdout.path, { mode: 0o600 });
  const errSink = createWriteStream(job.streams.stderr.path, { mode: 0o600 });
  // A sink failure (ENOSPC, EACCES, a vanished parent directory) is emitted as
  // an asynchronous 'error' event; with no listener that is an uncaught
  // exception and a process crash. It settles the job instead: the command is
  // killed and the failure is named on `job.error`.
  const onSinkError =
    (name: "stdout" | "stderr") =>
    (error: Error): void => {
      job.error ??= `The ${name} sink failed: ${errorMessage(error)}`;
      terminate("sink-error");
    };
  outSink.on("error", onSinkError("stdout"));
  errSink.on("error", onSinkError("stderr"));

  // Declared before the spawn attempt: a spawn that throws settles the job
  // through the same path as one that runs, and that path reads these.
  let finished = false;
  let terminationReason: string | undefined;
  // Grouped so both are reachable from the settle path no matter which of the
  // three ways of ending a command got there first.
  const timers: { timeout?: NodeJS.Timeout; kill?: NodeJS.Timeout } = {};

  let child: ChildProcess;
  try {
    child = spawn(job.argv[0], job.argv.slice(1), {
      cwd: job.cwd,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      ...(options.env && { env: options.env }),
    });
  } catch (error) {
    job.error = `The command could not be started: ${errorMessage(error)}`;
    void finish(undefined);
    return;
  }

  function terminate(reason: string, signal: NodeJS.Signals = "SIGTERM"): void {
    if (terminationReason || finished) {
      return;
    }
    terminationReason = reason;
    try {
      child.kill(signal);
    } catch (error) {
      logger.warn("[BackgroundCommands] Signalling the command failed", {
        taskId: job.taskId,
        error: errorMessage(error),
      });
    }
    // A process that ignores SIGTERM must not be able to outlive its budget.
    timers.kill = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* already gone */
      }
    }, SIGKILL_GRACE_MS);
    timers.kill.unref?.();
  }

  job.terminate = terminate;

  async function finish(reason: string | undefined): Promise<void> {
    if (finished) {
      return;
    }
    finished = true;
    clearTimeout(timers.timeout);
    clearTimeout(timers.kill);
    job.detachParent?.();
    await Promise.all([endWriteStream(outSink), endWriteStream(errSink)]);
    job.settledAt = Date.now();
    job.state = resolveState(job, reason);
    for (const name of STREAM_NAMES) {
      job.streams[name].banked = await bankStream(job, name);
    }
    if (!job.error && job.streams.stdout.limitReached) {
      job.error =
        `stdout reached the ${job.maxOutputBytes}-byte cap and the command was killed. ` +
        "Everything written up to the cap is banked in full.";
    } else if (!job.error && job.streams.stderr.limitReached) {
      job.error =
        `stderr reached the ${job.maxOutputBytes}-byte cap and the command was killed. ` +
        "Everything written up to the cap is banked in full.";
    }
    const status = statusOf(job);
    logger.debug("[BackgroundCommands] Command settled", {
      taskId: job.taskId,
      state: status.state,
      exitCode: status.exitCode,
      durationMs: status.durationMs,
    });
    settleJob(status);
  }

  if (child.stdout) {
    attachStream(
      child.stdout,
      job.streams.stdout,
      outSink,
      job.maxOutputBytes,
      () => terminate("output-limit"),
    );
  }
  if (child.stderr) {
    attachStream(
      child.stderr,
      job.streams.stderr,
      errSink,
      job.maxOutputBytes,
      () => terminate("output-limit"),
    );
  }

  child.on("spawn", () => {
    if (job.state === "queued") {
      job.state = "running";
    }
  });

  child.on("error", (error: Error) => {
    job.error = `The command could not be started: ${error.message}`;
    void finish(terminationReason);
  });

  child.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
    if (code !== null) {
      job.exitCode = code;
    }
    if (signal) {
      job.signal = signal;
    }
    void finish(terminationReason);
  });

  timers.timeout = setTimeout(() => {
    job.error =
      `The command exceeded its ${job.timeoutMs}ms budget and was killed. Output up to ` +
      "that point is banked in full.";
    terminate("timeout");
  }, job.timeoutMs);
  timers.timeout.unref?.();

  const parentSignal = options.abortSignal;
  if (parentSignal) {
    if (parentSignal.aborted) {
      terminate("aborted");
    } else {
      const onAbort = (): void => terminate("aborted");
      parentSignal.addEventListener("abort", onAbort, { once: true });
      job.detachParent = () =>
        parentSignal.removeEventListener("abort", onAbort);
    }
  }
}

/**
 * Start a command in the background and get its task id immediately.
 *
 * @throws when no policy is set, argv is malformed, the executable is not
 *         allowlisted, the policy vetoes the command, or the cwd escapes the
 *         sandbox root. Every message names its own recovery step.
 */
export async function startBackgroundCommand(
  host: NeuroLink,
  argv: string[],
  options: BackgroundCommandOptions,
): Promise<BackgroundCommandHandle> {
  const policy = hostPolicies.get(host);
  if (!policy) {
    throw new Error(NO_POLICY_REFUSAL);
  }
  return startCommandWithPolicy(host, argv, options, policy);
}

// ── Monitoring ─────────────────────────────────────────────────────────────

/**
 * Everything known about one command right now — synchronous, because the
 * job state is live and a monitor that has to be awaited is a monitor nobody
 * calls mid-loop.
 *
 * @throws when the task id is unknown to this host
 */
export function getBackgroundCommandStatus(
  host: NeuroLink,
  taskId: string,
): BackgroundCommandStatus {
  return acknowledge(jobFor(host, taskId));
}

function afterMs(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, Math.max(0, ms));
    timer.unref?.();
  });
}

/**
 * Wait for a command to settle.
 *
 * `timeoutMs` bounds the WAIT, not the command: when it elapses the current
 * (still running) status is returned rather than throwing, so a caller can
 * poll in bounded steps without ever losing the job.
 *
 * @throws when the task id is unknown to this host
 */
export async function awaitBackgroundCommand(
  host: NeuroLink,
  taskId: string,
  opts?: { timeoutMs?: number },
): Promise<BackgroundCommandStatus> {
  const job = jobFor(host, taskId);
  if (!isSettled(job)) {
    if (opts?.timeoutMs === undefined) {
      await job.settled;
    } else {
      await Promise.race([job.settled, afterMs(opts.timeoutMs)]);
    }
  }
  return acknowledge(job);
}

/**
 * Kill a running command: SIGTERM (or the signal you name), SIGKILL five
 * seconds later if it is still there. Resolves with the settled status, so a
 * caller never has to guess whether the output was banked yet.
 *
 * Killing an already-settled command is a no-op that returns its status —
 * the outcome is not discarded.
 *
 * @throws when the task id is unknown to this host
 */
export async function killBackgroundCommand(
  host: NeuroLink,
  taskId: string,
  signal: NodeJS.Signals = "SIGTERM",
): Promise<BackgroundCommandStatus> {
  const job = jobFor(host, taskId);
  if (isSettled(job)) {
    return acknowledge(job);
  }
  if (!job.error) {
    job.error = `The command was killed with ${signal} by the caller.`;
  }
  job.terminate?.("killed", signal);
  await Promise.race([job.settled, afterMs(SIGKILL_GRACE_MS * 2)]);
  return acknowledge(job);
}

/**
 * Kill every unsettled command this host started. Host lifecycle only
 * (`shutdown()`/`dispose()`): a disposed instance must not leave child
 * processes running with nobody left to collect them.
 *
 * @returns how many commands were signalled
 */
export async function killAllBackgroundCommands(
  host: NeuroLink,
): Promise<number> {
  const targets = [...commands.values()].filter(
    (job) => job.host === host && !isSettled(job),
  );
  for (const job of targets) {
    if (!job.error) {
      job.error = "The command was killed: its host instance was disposed.";
    }
    job.terminate?.("killed", "SIGTERM");
  }
  if (targets.length > 0) {
    // Bounded: a child that ignores SIGTERM gets the SIGKILL follow-up from
    // terminate(); nothing here waits past that grace.
    await Promise.race([
      Promise.all(targets.map((job) => job.settled)),
      afterMs(SIGKILL_GRACE_MS * 2),
    ]);
    logger.debug("[BackgroundCommands] Host disposal killed commands", {
      killed: targets.length,
    });
  }
  return targets.length;
}

/**
 * Read one character window of a command's output, straight from its log file.
 *
 * Works while the command is still running — that is the monitor case — and
 * after it settled. Character offsets, `totalSize` and `hasMore` match
 * `retrieve_context` exactly, so paging code written for one works on the
 * other.
 *
 * @throws when the task id is unknown to this host
 */
export async function readBackgroundCommandOutput(
  host: NeuroLink,
  taskId: string,
  page: BackgroundCommandPageRequest,
): Promise<BackgroundCommandOutputPage> {
  const job = jobFor(host, taskId);
  const stream = page.stream === "stderr" ? "stderr" : "stdout";
  const limit = Math.min(
    Math.max(1, page.limit ?? DEFAULT_OUTPUT_PAGE_CHARS),
    MAX_OUTPUT_PAGE_CHARS,
  );
  const offset = Math.max(0, page.offset ?? 0);
  if (isSettled(job)) {
    job.acknowledged = true;
  }
  let content = "";
  try {
    content = await readFile(job.streams[stream].path, "utf-8");
  } catch (error) {
    logger.debug("[BackgroundCommands] Output log not readable yet", {
      taskId,
      stream,
      error: errorMessage(error),
    });
  }
  return {
    taskId,
    stream,
    content: content.slice(offset, offset + limit),
    offset,
    limit,
    totalSize: content.length,
    hasMore: offset + limit < content.length,
  };
}

// ── Model-facing tools ─────────────────────────────────────────────────────

const START_SCHEMA = z.object({
  argv: z
    .array(z.string())
    .describe(
      'The executable followed by one entry per argument: ["pnpm", "run", "lint"]. ' +
        "There is NO shell — pipes, redirects and quoting do nothing here.",
    ),
  cwd: z
    .string()
    .optional()
    .describe(
      "Directory to run in. Must be inside the permitted root; defaults to it.",
    ),
  timeoutMs: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Wall-clock budget in milliseconds before the command is killed. " +
        "Capped at the host policy's budget.",
    ),
});

const STATUS_SCHEMA = z.object({
  taskId: z.string().describe("Task id returned by run_command_bg."),
  waitMs: z
    .number()
    .optional()
    .describe(
      "Wait up to this many milliseconds for the command to finish. Omit to " +
        "read the status as it stands right now.",
    ),
});

const OUTPUT_SCHEMA = z.object({
  taskId: z.string().describe("Task id returned by run_command_bg."),
  stream: z
    .enum(["stdout", "stderr"])
    .optional()
    .describe('Which stream to read. Default "stdout".'),
  offset: z
    .number()
    .optional()
    .describe("Character offset to start at. Default 0."),
  limit: z
    .number()
    .optional()
    .describe("Maximum characters to return. Default 50000, cap 200000."),
});

const KILL_SCHEMA = z.object({
  taskId: z.string().describe("Task id returned by run_command_bg."),
});

function withCounts(
  host: NeuroLink,
  status: BackgroundCommandStatus,
  sessionId: string,
): BackgroundCommandStatusToolResult {
  return { ...status, ...backgroundCommandCounts(host, sessionId) };
}

/**
 * The four model-facing command tools, bound to `host`. Register them with
 * `host.registerTool()` (see `NeuroLink.registerBackgroundCommandTools()`),
 * never on the tool registry directly: only the "user-defined" category
 * reaches the LLM's tool schema.
 */
export function createBackgroundCommandTools(
  host: NeuroLink,
): Record<string, MCPExecutableTool> {
  return {
    run_command_bg: {
      name: "run_command_bg",
      description:
        "Start a command in the BACKGROUND and get a taskId back immediately — the " +
        "command keeps running while you do other work. Use it for checks whose output " +
        "is evidence: builds, test suites, linters. The complete stdout and stderr are " +
        "written to files and banked, so nothing is ever truncated away; read them with " +
        "command_output. Only allowlisted executables may be run, and there is no shell.",
      inputSchema: START_SCHEMA,
      execute: async (params: unknown, executionContext?: unknown) => {
        const parsed = START_SCHEMA.safeParse(params ?? {});
        if (!parsed.success) {
          return refusal(
            "run_command_bg expects { argv: string[], cwd?, timeoutMs? } with argv " +
              'non-empty — e.g. { argv: ["pnpm", "run", "lint"] }. Call it again in that shape.',
          );
        }
        const policy = hostPolicies.get(host);
        if (!policy) {
          return refusal(NO_POLICY_REFUSAL);
        }
        const sessionId = resolveChecklistSessionId(host, executionContext);
        try {
          // The model may narrow the budget, never widen it: the policy's
          // default is the host's declared ceiling for model-started commands.
          const budget = policy.defaultTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
          const handle = await startBackgroundCommand(host, parsed.data.argv, {
            cwd: parsed.data.cwd ?? policy.cwdRoot,
            sessionId,
            ...(parsed.data.timeoutMs !== undefined && {
              timeoutMs: Math.min(Math.max(1, parsed.data.timeoutMs), budget),
            }),
          });
          const result: BackgroundCommandStartToolResult = {
            ...handle,
            ...backgroundCommandCounts(host, sessionId),
          };
          return result;
        } catch (error) {
          return refusal(errorMessage(error));
        }
      },
    },

    command_status: {
      name: "command_status",
      description:
        "Check a background command: its state, exit code, how many bytes each stream " +
        "produced, and a bounded tail of the output. Pass waitMs to wait for it to " +
        "finish instead of polling. Once it has finished, stdout and stderr carry " +
        "artifact ids for the COMPLETE output — the tail is orientation, not evidence.",
      inputSchema: STATUS_SCHEMA,
      execute: async (params: unknown, executionContext?: unknown) => {
        const parsed = STATUS_SCHEMA.safeParse(params ?? {});
        if (!parsed.success) {
          return refusal(
            "command_status expects { taskId, waitMs? }. Call it again with the taskId " +
              "run_command_bg returned.",
          );
        }
        const sessionId = resolveChecklistSessionId(host, executionContext);
        try {
          const status =
            parsed.data.waitMs === undefined
              ? getBackgroundCommandStatus(host, parsed.data.taskId)
              : await awaitBackgroundCommand(host, parsed.data.taskId, {
                  timeoutMs: parsed.data.waitMs,
                });
          return withCounts(host, status, sessionId);
        } catch (error) {
          return refusal(errorMessage(error));
        }
      },
    },

    command_output: {
      name: "command_output",
      description:
        "Read a window of a background command's output, by character offset. Works " +
        "while the command is still running and after it finished. totalSize and " +
        "hasMore tell you how much is left; page forward by advancing offset.",
      inputSchema: OUTPUT_SCHEMA,
      execute: async (params: unknown) => {
        const parsed = OUTPUT_SCHEMA.safeParse(params ?? {});
        if (!parsed.success) {
          return refusal(
            'command_output expects { taskId, stream?: "stdout" | "stderr", offset?, limit? }. ' +
              "Call it again with the taskId run_command_bg returned.",
          );
        }
        try {
          return await readBackgroundCommandOutput(host, parsed.data.taskId, {
            stream: parsed.data.stream ?? "stdout",
            ...(parsed.data.offset !== undefined && {
              offset: parsed.data.offset,
            }),
            ...(parsed.data.limit !== undefined && {
              limit: parsed.data.limit,
            }),
          });
        } catch (error) {
          return refusal(errorMessage(error));
        }
      },
    },

    command_kill: {
      name: "command_kill",
      description:
        "Stop a background command you no longer need. Whatever it printed before it " +
        "stopped is still banked and still readable — killing a command discards the " +
        "process, never its output.",
      inputSchema: KILL_SCHEMA,
      execute: async (params: unknown, executionContext?: unknown) => {
        const parsed = KILL_SCHEMA.safeParse(params ?? {});
        if (!parsed.success) {
          return refusal(
            "command_kill expects { taskId }. Call it again with the taskId " +
              "run_command_bg returned.",
          );
        }
        const sessionId = resolveChecklistSessionId(host, executionContext);
        try {
          const status = await killBackgroundCommand(host, parsed.data.taskId);
          return withCounts(host, status, sessionId);
        } catch (error) {
          return refusal(errorMessage(error));
        }
      },
    },
  };
}
