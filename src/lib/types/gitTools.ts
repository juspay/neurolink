/**
 * Read-only git toolset (N4.4) — types.
 *
 * A reviewing agent needs git constantly: what changed, who wrote it, what the
 * merge base was. Handing it a shell to run `git` in is the wrong shape twice
 * over — it can then run anything, and git itself has write-capable options
 * (`--output=<file>`, `diff.external`) that a free-form argument string would
 * carry straight through.
 *
 * So these tools are BOUNDED: the model supplies validated values (a ref, a
 * path, a line range), never flags, and each tool assembles a fixed argv from
 * them. The whole surface is six read-only subcommands. Execution goes through
 * the same hardened runner as {@link BackgroundCommandPolicy} — argv arrays,
 * no shell, a cwd sandboxed to the repository, a timeout, a byte cap — and the
 * full output is banked, so a 40 MB diff costs a bounded preview plus a
 * pointer.
 *
 * Naming: nothing else in the types folder claims `Git`, and `tools.ts` owns
 * the unprefixed `Tool*` names, so these carry the `GitTool` prefix
 * (Critical Rule 9).
 */

import type { BankedArtifactRef } from "./artifact.js";
import type { BackgroundCommandState } from "./backgroundCommand.js";

/** How `git log` should render each commit. Presets only — never a raw format. */
export type GitToolLogFormat = "oneline" | "full" | "stat" | "name-only";

/** Options for `NeuroLink.registerGitTools()`. */
export type GitToolsetOptions = {
  /**
   * Repository root. Every git tool runs here, and every path argument must
   * resolve inside it.
   */
  repoRoot: string;
  /** Wall-clock budget per git invocation (ms). Default 60_000. */
  timeoutMs?: number;
  /** Byte cap per stream. Default 33_554_432 (a big diff is still a diff). */
  maxOutputBytes?: number;
  /** Characters of output returned inline. Default 2000, hard cap 4000. */
  previewChars?: number;
  /** Executable to run. Default "git"; name an absolute path to pin it. */
  gitExecutable?: string;
};

/**
 * What every git tool returns.
 *
 * `preview` is a bounded head slice for the conversation; `output` points at
 * the COMPLETE stdout on disk. They are not alternatives — a `git diff` whose
 * preview looks empty may still have banked megabytes.
 */
export type GitToolResult = {
  /** The exact argv that ran, so the result is reproducible by hand. */
  command: string[];
  /** True when git exited 0. */
  ok: boolean;
  exitCode?: number;
  state: BackgroundCommandState;
  /** Bounded head slice of stdout. */
  preview: string;
  /** The FULL stdout, banked (N3). */
  output: BankedArtifactRef;
  /** Literal `retrieve_context` call that reads the rest of stdout. */
  readBackHint: string;
  /** Bounded head slice of stderr, present only when git wrote something there. */
  stderrPreview?: string;
};

/** Refusal shape shared with the agent tool registrar: recovery text included. */
export type GitToolRefusal = { isError: true; error: string };

/**
 * Resolved git toolset settings for one host.
 *
 * Deliberately not marked internal: it is the return type of
 * `configureGitTools`, so it is named by an emitted declaration. Marking it
 * would make `stripInternal` delete the type without touching the import that
 * references it, leaving a .d.ts that fails to compile for any consumer using
 * `skipLibCheck: false`. (Note that the tag is matched as plain text anywhere
 * in the doc comment, so it cannot even be named here to explain itself.)
 */
export type GitToolRuntimeSettings = {
  repoRoot: string;
  timeoutMs: number;
  maxOutputBytes: number;
  previewChars: number;
  gitExecutable: string;
};
