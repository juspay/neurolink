/**
 * Read-only git toolset (N4.4) — six bounded tools on the hardened runner.
 *
 * A reviewing agent asks git the same handful of questions over and over: what
 * changed, against what base, who wrote this line, what files does the tree
 * hold. The tempting shape — "let it run `git ...` through the shell" — is
 * wrong twice. It hands the model a shell, and it hands git a free-form
 * argument string, which is not read-only at all: `--output=<file>` writes,
 * and `diff.external` runs an arbitrary program.
 *
 * So the model supplies VALUES, never flags. Each tool validates a ref, a
 * path, a line range or a count, assembles a fixed argv from them, and runs it
 * through {@link startCommandWithPolicy} with a policy of its own — a
 * one-executable allowlist rooted at the repository. Registering these tools
 * therefore widens nothing: it does not let `run_command_bg` execute git, and
 * it does not require a general command policy to exist.
 *
 * Output follows the same rule as every other big payload here: the COMPLETE
 * stdout is banked (N3) and the tool returns a bounded preview plus the
 * read-back call. A 40 MB diff costs a few hundred tokens and loses nothing.
 *
 * @module agent/gitTools
 */

import { relative } from "node:path";
import { z } from "zod";
import type { NeuroLink } from "../neurolink.js";
import type {
  BankedArtifactRef,
  BackgroundCommandPolicy,
  GitToolLogFormat,
  GitToolRefusal,
  GitToolResult,
  GitToolRuntimeSettings,
  GitToolsetOptions,
  MCPExecutableTool,
  PathSandboxResult,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { resolvePathWithinRoot } from "../utils/pathSandbox.js";
import {
  awaitBackgroundCommand,
  readBackgroundCommandOutput,
  startCommandWithPolicy,
} from "./backgroundCommands.js";
import { resolveChecklistSessionId } from "./taskChecklist.js";

const hostSettings = new WeakMap<object, GitToolRuntimeSettings>();

/** Wall-clock budget per git invocation. */
const DEFAULT_GIT_TIMEOUT_MS = 60_000;

/** Byte cap per stream — a repository-sized diff is still a legitimate answer. */
const DEFAULT_GIT_MAX_OUTPUT_BYTES = 33_554_432;

/** Characters of stdout returned inline. */
const DEFAULT_GIT_PREVIEW_CHARS = 2_000;

/** Ceiling on the inline preview, whatever the caller configures. */
const MAX_GIT_PREVIEW_CHARS = 4_000;

/** Characters of stderr returned inline when git wrote any. */
const GIT_STDERR_PREVIEW_CHARS = 600;

/** Commits returned by `git_log` when the caller names no bound. */
const DEFAULT_LOG_MAX_COUNT = 20;

/** Hard bound on commits per `git_log` call. */
const MAX_LOG_MAX_COUNT = 500;

/** Lines returned by `git_blame` when only a start line is given. */
const DEFAULT_BLAME_SPAN = 100;

/**
 * Global arguments prepended to every invocation.
 *
 * `--no-pager` and the empty `diff.external` are the two that matter: a user
 * gitconfig can point either at a program, and a "read-only" tool that runs
 * whatever `diff.external` names is not read-only. Per-driver programs
 * (`diff.<driver>.command`, `diff.<driver>.textconv`) have unbounded names, so
 * they cannot be neutralised here — every diff-producing subcommand passes
 * `--no-ext-diff --no-textconv` instead.
 */
const GIT_GLOBAL_ARGS = [
  "--no-pager",
  "-c",
  "color.ui=false",
  "-c",
  "diff.external=",
  "-c",
  "core.fsmonitor=false",
] as const;

/**
 * Ref characters git actually uses — including `..`/`...` ranges, `^`/`~`
 * ancestry, `@{upstream}` and `rev:path`. A leading `-` is refused separately,
 * so a value can never be read as a flag.
 */
const GIT_REF_PATTERN = /^[A-Za-z0-9._/^~@{}:+-]{1,200}$/;

/** Date expressions for `--since`, e.g. "2 weeks ago" or "2026-01-31". */
const GIT_DATE_PATTERN = /^[A-Za-z0-9 :,.+-]{1,64}$/;

// ── Settings ───────────────────────────────────────────────────────────────

/** Resolve and remember one host's git-toolset settings. */
export function configureGitTools(
  host: NeuroLink,
  options: GitToolsetOptions,
): GitToolRuntimeSettings {
  const settings: GitToolRuntimeSettings = {
    repoRoot: options.repoRoot,
    timeoutMs: options.timeoutMs ?? DEFAULT_GIT_TIMEOUT_MS,
    maxOutputBytes: options.maxOutputBytes ?? DEFAULT_GIT_MAX_OUTPUT_BYTES,
    previewChars: Math.min(
      Math.max(1, options.previewChars ?? DEFAULT_GIT_PREVIEW_CHARS),
      MAX_GIT_PREVIEW_CHARS,
    ),
    gitExecutable: options.gitExecutable?.trim() || "git",
  };
  hostSettings.set(host, settings);
  return settings;
}

function settingsFor(host: NeuroLink): GitToolRuntimeSettings | undefined {
  return hostSettings.get(host);
}

const NOT_CONFIGURED =
  "The git toolset is not configured on this instance. The host must call " +
  "registerGitTools({ repoRoot }) before any git tool can run.";

// ── Small helpers ──────────────────────────────────────────────────────────

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Matches `agentToolRegistrar`'s convention: the recovery step is IN the text. */
function refusal(message: string): GitToolRefusal {
  return { isError: true, error: message };
}

/**
 * A ref the model supplied, or the reason it was refused.
 *
 * The leading-dash check is the load-bearing one: without it `--output=x` in a
 * `ref` field becomes a flag git honours, and the tool stops being read-only.
 */
function checkRef(value: string, field: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return `${field} must not be empty. Name a branch, tag or commit.`;
  }
  if (trimmed.startsWith("-")) {
    return (
      `${field} must not start with "-": these tools take VALUES, not flags, and a ` +
      "value that looks like a flag is refused. Pass a branch, tag or commit."
    );
  }
  if (!GIT_REF_PATTERN.test(trimmed)) {
    return (
      `${field} "${trimmed.slice(0, 60)}" is not a valid git revision. Use a branch, ` +
      "tag, commit sha, or a range like main..HEAD."
    );
  }
  return undefined;
}

/**
 * Turn a model-supplied path into one git can be given: repository-relative,
 * proven to resolve inside the repository root.
 */
function checkPath(
  value: string,
  settings: GitToolRuntimeSettings,
): PathSandboxResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { error: "path must not be empty." };
  }
  if (trimmed.startsWith("-")) {
    return {
      error:
        'path must not start with "-": these tools take VALUES, not flags. Pass a ' +
        "path relative to the repository root.",
    };
  }
  if (trimmed.includes("\0")) {
    return { error: "path must not contain NUL bytes." };
  }
  const resolved = resolvePathWithinRoot(trimmed, settings.repoRoot);
  if (resolved.error !== undefined) {
    return resolved;
  }
  // Canonicalise the root the same way the target was canonicalised: with a
  // symlinked root component (macOS tmpdir's /var -> /private/var is the
  // everyday case) the raw root and the resolved target never share a prefix,
  // and every in-repo path would be refused as outside the repository.
  const root = resolvePathWithinRoot(".", settings.repoRoot);
  if (root.error !== undefined) {
    return root;
  }
  const rel = relative(root.path, resolved.path);
  if (rel.startsWith("..")) {
    return {
      error: `Access denied: "${trimmed}" is outside the repository ${settings.repoRoot}.`,
    };
  }
  return { path: rel || "." };
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(Math.trunc(value), low), high);
}

function logFormatArgs(format: GitToolLogFormat): string[] {
  switch (format) {
    case "full":
      return ["--pretty=fuller"];
    case "stat":
      return ["--stat"];
    case "name-only":
      return ["--name-only"];
    default:
      return ["--oneline"];
  }
}

/**
 * Environment for git. It REPLACES the parent environment, so a repository's
 * commands never see the host's credentials, and the three variables that stop
 * git from blocking on a human (`GIT_TERMINAL_PROMPT`) or paging (`GIT_PAGER`)
 * are set explicitly.
 */
function gitEnvironment(): Record<string, string> {
  const env: Record<string, string> = {
    LANG: "C",
    LC_ALL: "C",
    GIT_TERMINAL_PROMPT: "0",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_PAGER: "cat",
  };
  if (process.env.PATH) {
    env.PATH = process.env.PATH;
  }
  // HOME is kept so a repository covered by `safe.directory` still answers.
  if (process.env.HOME) {
    env.HOME = process.env.HOME;
  }
  // Windows: git may not start without SystemRoot, and temporary-file
  // operations need TEMP/TMP. Forwarded only when present, so POSIX
  // environments are byte-identical to before.
  for (const name of ["SystemRoot", "TEMP", "TMP"] as const) {
    const value = process.env[name];
    if (value) {
      env[name] = value;
    }
  }
  return env;
}

function fallbackRef(label: string, reason: string): BankedArtifactRef {
  return {
    artifactId: "",
    label,
    kind: "command-output",
    sizeBytes: 0,
    preview: "",
    readBackHint: `No artifact was created for this output: ${reason}`,
  };
}

// ── Running one git command ────────────────────────────────────────────────

/**
 * Run one fixed argv against the repository and return a bounded result whose
 * full output is banked.
 *
 * Exported so host code can drive the same six questions without a model in
 * the loop; `args` is the git argument list (`["log", "--oneline"]`), assembled
 * by a caller that validated every value in it.
 */
export async function runGitCommand(
  host: NeuroLink,
  args: string[],
  sessionId?: string,
): Promise<GitToolResult> {
  const settings = settingsFor(host);
  if (!settings) {
    throw new Error(NOT_CONFIGURED);
  }
  const argv = [settings.gitExecutable, ...GIT_GLOBAL_ARGS, ...args];
  const policy: BackgroundCommandPolicy = {
    allowedExecutables: [settings.gitExecutable],
    cwdRoot: settings.repoRoot,
    defaultTimeoutMs: settings.timeoutMs,
    maxOutputBytes: settings.maxOutputBytes,
  };
  const label = `git ${args[0] ?? ""}`.trim();

  const handle = await startCommandWithPolicy(
    host,
    argv,
    {
      cwd: settings.repoRoot,
      label,
      env: gitEnvironment(),
      ...(sessionId && { sessionId }),
    },
    policy,
  );
  const status = await awaitBackgroundCommand(host, handle.taskId);

  const head = await readBackgroundCommandOutput(host, handle.taskId, {
    stream: "stdout",
    offset: 0,
    limit: settings.previewChars,
  });
  const errors = await readBackgroundCommandOutput(host, handle.taskId, {
    stream: "stderr",
    offset: 0,
    limit: GIT_STDERR_PREVIEW_CHARS,
  });

  const output =
    status.stdout ??
    fallbackRef(
      `${label} [stdout]`,
      status.error ?? "the command did not settle normally",
    );
  return {
    command: argv,
    ok: status.exitCode === 0,
    ...(status.exitCode !== undefined && { exitCode: status.exitCode }),
    state: status.state,
    preview: head.hasMore ? `${head.content}…` : head.content,
    output,
    readBackHint: output.readBackHint,
    ...(errors.content && {
      stderrPreview: errors.hasMore ? `${errors.content}…` : errors.content,
    }),
  };
}

// ── Model-facing tools ─────────────────────────────────────────────────────

const LOG_SCHEMA = z.object({
  ref: z
    .string()
    .optional()
    .describe(
      'Branch, tag, commit or range, e.g. "main..HEAD". Default: HEAD.',
    ),
  path: z
    .string()
    .optional()
    .describe(
      "Limit the history to this path, relative to the repository root.",
    ),
  maxCount: z
    .number()
    .optional()
    .describe("How many commits to return. Default 20, maximum 500."),
  since: z
    .string()
    .optional()
    .describe(
      'Only commits after this date, e.g. "2 weeks ago" or "2026-01-31".',
    ),
  format: z
    .enum(["oneline", "full", "stat", "name-only"])
    .optional()
    .describe(
      'How much to show per commit: "oneline" (default), "full", "stat" (change ' +
        'counts per file), or "name-only" (file names).',
    ),
});

const SHOW_SCHEMA = z.object({
  ref: z
    .string()
    .describe(
      'What to show: a commit, tag, or "<commit>:<path>" for a file at a revision.',
    ),
  path: z.string().optional().describe("Restrict the shown diff to this path."),
  nameOnly: z
    .boolean()
    .optional()
    .describe("Return only the names of the changed files."),
});

const DIFF_SCHEMA = z.object({
  base: z
    .string()
    .optional()
    .describe(
      "Left side of the comparison. Omit both sides to diff the working tree.",
    ),
  head: z
    .string()
    .optional()
    .describe("Right side of the comparison. Requires base."),
  path: z.string().optional().describe("Restrict the diff to this path."),
  nameOnly: z
    .boolean()
    .optional()
    .describe(
      "Return only the names of the changed files — cheap, and often enough.",
    ),
  stat: z
    .boolean()
    .optional()
    .describe("Return per-file change counts instead of a patch."),
  unified: z
    .number()
    .optional()
    .describe("Lines of context around each hunk. Default 3, maximum 50."),
});

const BLAME_SCHEMA = z.object({
  path: z.string().describe("File to blame, relative to the repository root."),
  ref: z
    .string()
    .optional()
    .describe("Revision to blame at. Default: the working tree."),
  lineStart: z
    .number()
    .optional()
    .describe("First line to blame. Blame the whole file when omitted."),
  lineEnd: z
    .number()
    .optional()
    .describe("Last line to blame. Defaults to 100 lines after lineStart."),
});

const MERGE_BASE_SCHEMA = z.object({
  base: z.string().describe("First revision, e.g. the target branch."),
  head: z.string().describe("Second revision, e.g. the pull request head."),
});

const LS_FILES_SCHEMA = z.object({
  path: z
    .string()
    .optional()
    .describe(
      "Restrict the listing to this directory or path, relative to the root.",
    ),
});

function buildLogArgs(
  input: z.infer<typeof LOG_SCHEMA>,
  settings: GitToolRuntimeSettings,
): string[] | GitToolRefusal {
  const args = ["log", "--no-color", "--no-ext-diff", "--no-textconv"];
  args.push(
    `--max-count=${clamp(input.maxCount ?? DEFAULT_LOG_MAX_COUNT, 1, MAX_LOG_MAX_COUNT)}`,
  );
  args.push(...logFormatArgs(input.format ?? "oneline"));
  if (input.since !== undefined) {
    const since = input.since.trim();
    if (!GIT_DATE_PATTERN.test(since)) {
      return refusal(
        `since "${since.slice(0, 60)}" is not a date expression. Use something like ` +
          '"2 weeks ago" or "2026-01-31".',
      );
    }
    args.push(`--since=${since}`);
  }
  if (input.ref !== undefined) {
    const bad = checkRef(input.ref, "ref");
    if (bad) {
      return refusal(bad);
    }
    args.push(input.ref.trim());
  }
  if (input.path !== undefined) {
    const resolved = checkPath(input.path, settings);
    if (resolved.error !== undefined) {
      return refusal(resolved.error);
    }
    args.push("--", resolved.path);
  }
  return args;
}

function buildDiffArgs(
  input: z.infer<typeof DIFF_SCHEMA>,
  settings: GitToolRuntimeSettings,
): string[] | GitToolRefusal {
  if (input.head !== undefined && input.base === undefined) {
    return refusal(
      "diff needs a base when you name a head. Pass both sides, e.g. " +
        '{ base: "main", head: "HEAD" }.',
    );
  }
  const args = ["diff", "--no-color", "--no-ext-diff", "--no-textconv"];
  if (input.nameOnly) {
    args.push("--name-only");
  }
  if (input.stat) {
    args.push("--stat");
  }
  if (input.unified !== undefined) {
    args.push(`-U${clamp(input.unified, 0, 50)}`);
  }
  for (const [field, value] of [
    ["base", input.base],
    ["head", input.head],
  ] as const) {
    if (value !== undefined) {
      const bad = checkRef(value, field);
      if (bad) {
        return refusal(bad);
      }
      args.push(value.trim());
    }
  }
  if (input.path !== undefined) {
    const resolved = checkPath(input.path, settings);
    if (resolved.error !== undefined) {
      return refusal(resolved.error);
    }
    args.push("--", resolved.path);
  }
  return args;
}

function buildBlameArgs(
  input: z.infer<typeof BLAME_SCHEMA>,
  settings: GitToolRuntimeSettings,
): string[] | GitToolRefusal {
  const resolved = checkPath(input.path, settings);
  if (resolved.error !== undefined) {
    return refusal(resolved.error);
  }
  // No `--no-color` here: `git blame` has no such option (it offers
  // --color-lines / --color-by-age), and passing it is a usage error. The
  // global `color.ui=false` covers this subcommand instead.
  const args = ["blame"];
  if (input.lineStart !== undefined || input.lineEnd !== undefined) {
    // A lone lineEnd still bounds the blame: derive the start a span back
    // rather than silently blaming the whole file.
    const requestedEnd =
      input.lineEnd !== undefined
        ? clamp(input.lineEnd, 1, Number.MAX_SAFE_INTEGER)
        : undefined;
    const start =
      input.lineStart !== undefined
        ? clamp(input.lineStart, 1, Number.MAX_SAFE_INTEGER)
        : Math.max(1, (requestedEnd ?? 1) - DEFAULT_BLAME_SPAN + 1);
    const end = clamp(
      requestedEnd ?? start + DEFAULT_BLAME_SPAN - 1,
      start,
      Number.MAX_SAFE_INTEGER,
    );
    args.push("-L", `${start},${end}`);
  }
  if (input.ref !== undefined) {
    const bad = checkRef(input.ref, "ref");
    if (bad) {
      return refusal(bad);
    }
    args.push(input.ref.trim());
  }
  args.push("--", resolved.path);
  return args;
}

/**
 * The six read-only git tools, bound to `host`. Register them with
 * `host.registerTool()` (see `NeuroLink.registerGitTools()`), never on the
 * tool registry directly: only the "user-defined" category reaches the LLM's
 * tool schema.
 */
export function createGitTools(
  host: NeuroLink,
): Record<string, MCPExecutableTool> {
  const run = async (
    args: string[],
    sessionId: string,
  ): Promise<GitToolResult | GitToolRefusal> => {
    try {
      return await runGitCommand(host, args, sessionId);
    } catch (error) {
      logger.debug("[GitTools] Command refused or failed", {
        subcommand: args[0],
        error: errorMessage(error),
      });
      return refusal(errorMessage(error));
    }
  };

  return {
    git_log: {
      name: "git_log",
      description:
        "Commit history, optionally for one path or one range. Read-only. Returns a " +
        "bounded preview; the complete output is banked and readable with retrieve_context.",
      inputSchema: LOG_SCHEMA,
      execute: async (params: unknown, context?: unknown) => {
        const parsed = LOG_SCHEMA.safeParse(params ?? {});
        if (!parsed.success) {
          return refusal(
            "git_log expects { ref?, path?, maxCount?, since?, format? }. Call it again " +
              "with those fields, or with no arguments for the last 20 commits.",
          );
        }
        const settings = settingsFor(host);
        if (!settings) {
          return refusal(NOT_CONFIGURED);
        }
        const args = buildLogArgs(parsed.data, settings);
        return Array.isArray(args)
          ? run(args, resolveChecklistSessionId(host, context))
          : args;
      },
    },

    git_show: {
      name: "git_show",
      description:
        "Show one commit (message plus patch), or a file at a revision with " +
        '"<commit>:<path>". Read-only, output banked in full.',
      inputSchema: SHOW_SCHEMA,
      execute: async (params: unknown, context?: unknown) => {
        const parsed = SHOW_SCHEMA.safeParse(params ?? {});
        if (!parsed.success) {
          return refusal(
            "git_show expects { ref, path?, nameOnly? } with ref naming a commit, tag " +
              'or "<commit>:<path>". Call it again with a ref.',
          );
        }
        const settings = settingsFor(host);
        if (!settings) {
          return refusal(NOT_CONFIGURED);
        }
        const bad = checkRef(parsed.data.ref, "ref");
        if (bad) {
          return refusal(bad);
        }
        const args = ["show", "--no-color", "--no-ext-diff", "--no-textconv"];
        if (parsed.data.nameOnly) {
          args.push("--name-only");
        }
        args.push(parsed.data.ref.trim());
        if (parsed.data.path !== undefined) {
          const resolved = checkPath(parsed.data.path, settings);
          if (resolved.error !== undefined) {
            return refusal(resolved.error);
          }
          args.push("--", resolved.path);
        }
        return run(args, resolveChecklistSessionId(host, context));
      },
    },

    git_diff: {
      name: "git_diff",
      description:
        "Diff the working tree, or two revisions. Prefer nameOnly or stat first — a " +
        "full patch of a large change is enormous, and it is banked either way.",
      inputSchema: DIFF_SCHEMA,
      execute: async (params: unknown, context?: unknown) => {
        const parsed = DIFF_SCHEMA.safeParse(params ?? {});
        if (!parsed.success) {
          return refusal(
            "git_diff expects { base?, head?, path?, nameOnly?, stat?, unified? }. Call " +
              "it again with no arguments to diff the working tree.",
          );
        }
        const settings = settingsFor(host);
        if (!settings) {
          return refusal(NOT_CONFIGURED);
        }
        const args = buildDiffArgs(parsed.data, settings);
        return Array.isArray(args)
          ? run(args, resolveChecklistSessionId(host, context))
          : args;
      },
    },

    git_blame: {
      name: "git_blame",
      description:
        "Who last changed each line of a file, optionally for one line range. " +
        "Read-only, output banked in full.",
      inputSchema: BLAME_SCHEMA,
      execute: async (params: unknown, context?: unknown) => {
        const parsed = BLAME_SCHEMA.safeParse(params ?? {});
        if (!parsed.success) {
          return refusal(
            "git_blame expects { path, ref?, lineStart?, lineEnd? } with path naming a " +
              "file in the repository. Call it again with a path.",
          );
        }
        const settings = settingsFor(host);
        if (!settings) {
          return refusal(NOT_CONFIGURED);
        }
        const args = buildBlameArgs(parsed.data, settings);
        return Array.isArray(args)
          ? run(args, resolveChecklistSessionId(host, context))
          : args;
      },
    },

    git_merge_base: {
      name: "git_merge_base",
      description:
        "The commit two revisions diverged from — the honest base for reviewing a " +
        "branch, rather than diffing against a moving target.",
      inputSchema: MERGE_BASE_SCHEMA,
      execute: async (params: unknown, context?: unknown) => {
        const parsed = MERGE_BASE_SCHEMA.safeParse(params ?? {});
        if (!parsed.success) {
          return refusal(
            "git_merge_base expects { base, head }, both naming a revision. Call it " +
              "again with both.",
          );
        }
        const settings = settingsFor(host);
        if (!settings) {
          return refusal(NOT_CONFIGURED);
        }
        for (const [field, value] of [
          ["base", parsed.data.base],
          ["head", parsed.data.head],
        ] as const) {
          const bad = checkRef(value, field);
          if (bad) {
            return refusal(bad);
          }
        }
        return run(
          ["merge-base", parsed.data.base.trim(), parsed.data.head.trim()],
          resolveChecklistSessionId(host, context),
        );
      },
    },

    git_ls_files: {
      name: "git_ls_files",
      description:
        "List the files git tracks, optionally under one path. Read-only, output " +
        "banked in full.",
      inputSchema: LS_FILES_SCHEMA,
      execute: async (params: unknown, context?: unknown) => {
        const parsed = LS_FILES_SCHEMA.safeParse(params ?? {});
        if (!parsed.success) {
          return refusal(
            "git_ls_files expects { path? }. Call it again with no arguments to list " +
              "everything git tracks.",
          );
        }
        const settings = settingsFor(host);
        if (!settings) {
          return refusal(NOT_CONFIGURED);
        }
        const args = ["ls-files"];
        if (parsed.data.path !== undefined) {
          const resolved = checkPath(parsed.data.path, settings);
          if (resolved.error !== undefined) {
            return refusal(resolved.error);
          }
          args.push("--", resolved.path);
        }
        return run(args, resolveChecklistSessionId(host, context));
      },
    },
  };
}
