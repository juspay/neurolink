/**
 * Background commands (N4) — run a command detached, bank its output, monitor
 * it — types.
 *
 * A long-running agent has to run real commands: a build, a test suite, a
 * linter whose output is the evidence for a review finding. Two things make
 * that safe and useful, and both are in these types.
 *
 * 1. **Nothing is discarded.** Both streams go straight to files and the FULL
 *    files are banked as artifacts when the command settles. What reaches the
 *    conversation is a bounded `tailPreview` plus a {@link BankedArtifactRef}
 *    per stream — a pointer, never a replacement. `maxOutputBytes` is the one
 *    bound, and hitting it is a loud state (`output-limit`), not a silent cut.
 * 2. **Execution is a contract, not advice.** `argv` arrays only, no shell
 *    ever; an executable allowlist; a cwd that must resolve, through symlinks,
 *    inside a declared root; a timeout that actually kills.
 *
 * Naming: `cli.ts` already owns `CommandResult` / `CommandDefinition` and
 * `action.ts` owns `ActionCommand`, so everything here carries the
 * `BackgroundCommand` prefix (Critical Rule 9).
 */

import type { BankedArtifactRef } from "./artifact.js";

/** Which of a command's two output streams a page or artifact refers to. */
export type BackgroundCommandStreamName = "stdout" | "stderr";

/**
 * Lifecycle of one background command.
 *
 * `queued` is the window between the handle being returned and the OS
 * confirming the child started. The four settled states are deliberately
 * distinct: "the command failed" and "we killed it because it printed 4 GB"
 * are different facts about a run, and collapsing them loses the one a
 * reviewer needs.
 */
export type BackgroundCommandState =
  | "queued"
  | "running"
  | "exited"
  | "killed"
  | "timeout"
  | "output-limit";

/** `true` to allow, or a string giving the reason the command was refused. */
export type BackgroundCommandAllowDecision = true | string;

/**
 * What a host permits. There is no default policy: without one every start is
 * refused, because "run whatever the model asks" is not a defensible default
 * for a primitive that executes processes.
 */
export type BackgroundCommandPolicy = {
  /**
   * Executables that may be started, matched EXACTLY against `argv[0]` — no
   * basename fallback, so allowlisting `git` never permits `/tmp/evil/git`.
   * Required, and an empty list refuses everything.
   */
  allowedExecutables: string[];
  /**
   * Final say after the allowlist and the sandbox have passed. Return `true`
   * to allow, or a string that is handed to the caller as the refusal reason
   * (so put the recovery step in it).
   */
  allowlist?: (argv: string[], cwd: string) => BackgroundCommandAllowDecision;
  /**
   * Sandbox root. The resolved REAL cwd (symlinks followed) must be this
   * directory or inside it.
   */
  cwdRoot: string;
  /** Wall-clock budget when the caller names none. Default 120_000. */
  defaultTimeoutMs?: number;
  /** Per-stream byte cap when the caller names none. Default 10_485_760. */
  maxOutputBytes?: number;
};

/**
 * Per-start options. Only `timeoutMs` and `maxOutputBytes` fall back to the
 * policy's defaults. The rest have their own omission behaviour: `env`
 * inherits the parent environment, `label` defaults to `argv[0]`, `sessionId`
 * resolves from the host's tool context, and `abortSignal` simply has no
 * fallback.
 */
export type BackgroundCommandOptions = {
  /** Working directory. Must resolve inside `BackgroundCommandPolicy.cwdRoot`. */
  cwd: string;
  /** Wall-clock budget in ms; SIGTERM then SIGKILL. */
  timeoutMs?: number;
  /** Per-stream byte cap; hitting it kills the command with `output-limit`. */
  maxOutputBytes?: number;
  /**
   * Environment for the child. When given it REPLACES the parent environment
   * rather than extending it — the command gets exactly these variables and
   * nothing else. Omit it to inherit the parent environment, which is what a
   * repository's own checks normally need.
   */
  env?: Record<string, string>;
  /** Short human label for logs and the banked artifacts. Defaults to argv[0]. */
  label?: string;
  /** Session the command belongs to; scopes the outstanding counters. */
  sessionId?: string;
  /** Parent cancellation — an aborted parent kills the command. */
  abortSignal?: AbortSignal;
};

/** Returned the moment a command is accepted — before it has produced output. */
export type BackgroundCommandHandle = {
  taskId: string;
  argv: string[];
  startedAt: number;
};

/**
 * Everything known about one command right now.
 *
 * `stdout` / `stderr` appear once the command has settled and its streams have
 * been banked; `tailPreview` is available throughout and is always bounded.
 * The preview is for orientation — the banked artifacts are the evidence.
 */
export type BackgroundCommandStatus = {
  taskId: string;
  /** Short human label, e.g. "git log" — which command this is. */
  label: string;
  state: BackgroundCommandState;
  /** Process exit code, once it exited on its own. */
  exitCode?: number;
  /** Signal that ended the process, when one did. */
  signal?: string;
  durationMs: number;
  /** Bytes written to each stream's log file so far. */
  stdoutBytes: number;
  stderrBytes: number;
  /** The FULL stdout, banked (N3). Present once settled. */
  stdout?: BankedArtifactRef;
  /** The FULL stderr, banked (N3). Present once settled. */
  stderr?: BankedArtifactRef;
  /** Tail of the output so far, ≤ 2000 chars. Never a substitute for the files. */
  tailPreview: string;
  /** Why the command could not run, or how it was cut short. */
  error?: string;
};

/** One character window of a command's output, read straight from the log file. */
export type BackgroundCommandOutputPage = {
  taskId: string;
  stream: BackgroundCommandStreamName;
  content: string;
  offset: number;
  limit: number;
  /** Characters in the whole stream, including what this page did not return. */
  totalSize: number;
  hasMore: boolean;
};

/** Character window for a paginated output read. */
export type BackgroundCommandPageRequest = {
  stream: BackgroundCommandStreamName;
  /** Character offset to start at. Default 0. */
  offset?: number;
  /** Maximum characters to return. Default 50_000, hard cap 200_000. */
  limit?: number;
};

/**
 * Outstanding commands for a session: `running` have not settled yet, and
 * `finished` have settled without anyone having looked at them since.
 *
 * "Not looked at" rather than "ever finished" is what makes the number
 * actionable — reading a settled command's status or output clears it, so a
 * non-zero `finished` always means there is something new to read. Nothing is
 * discarded when it clears: the job, its logs and its artifacts stay exactly
 * where they were.
 *
 * Carried on every command tool result and — via the checklist — on every
 * `tasks_list`, so the model learns a build finished without polling.
 */
export type BackgroundCommandCounts = { running: number; finished: number };

/** Supplies {@link BackgroundCommandCounts} to the task checklist. */
export type BackgroundCommandCountsSource = (
  sessionId: string,
) => BackgroundCommandCounts;

/** What `run_command_bg` returns: the handle plus the outstanding counters. */
export type BackgroundCommandStartToolResult = BackgroundCommandHandle &
  BackgroundCommandCounts;

/** What the monitor tools return: a status plus the outstanding counters. */
export type BackgroundCommandStatusToolResult = BackgroundCommandStatus &
  BackgroundCommandCounts;

/** Refusal shape shared with the agent tool registrar: recovery text included. */
export type BackgroundCommandRefusal = { isError: true; error: string };

/**
 * One background command in the module-level registry.
 *
 * Generic over the host instance for the same reason {@link DelegateJobState}
 * is: the types folder must not import the `NeuroLink` class.
 *
 * @internal
 */
export type BackgroundCommandJobState<TInstance> = {
  taskId: string;
  host: TInstance;
  sessionId: string;
  label: string;
  argv: string[];
  cwd: string;
  state: BackgroundCommandState;
  startedAt: number;
  settledAt?: number;
  /** True once a settled status or output page has been handed to a caller. */
  acknowledged: boolean;
  exitCode?: number;
  signal?: string;
  error?: string;
  /** Per-stream log file paths, byte counts and rolling tails. */
  streams: Record<BackgroundCommandStreamName, BackgroundCommandStreamState>;
  maxOutputBytes: number;
  timeoutMs: number;
  /** Resolves when the command settles and its streams are banked. Never rejects. */
  settled: Promise<BackgroundCommandStatus>;
  /**
   * Signals the child and schedules the SIGKILL escalation. Set once the
   * process exists; absent means there is nothing left to signal.
   */
  terminate?: (reason: string, signal?: NodeJS.Signals) => void;
  /** Detaches the parent-abort listener once the command settles. */
  detachParent?: () => void;
};

/**
 * Live state of one output stream.
 *
 * @internal
 */
export type BackgroundCommandStreamState = {
  /** Absolute path of the log file the stream is written to, in full. */
  path: string;
  bytes: number;
  /**
   * Rolling tail of the RAW bytes, decoded only when a preview is asked for.
   * Bytes rather than a string because a chunk boundary can fall inside a
   * multi-byte character, and a decoder kept across chunks is one more piece
   * of state to get wrong.
   */
  tailBytes: Buffer;
  /** True once `bytes` reached the cap and the command was killed for it. */
  limitReached: boolean;
  /** The banked artifact, set when the command settles. */
  banked?: BankedArtifactRef;
};
