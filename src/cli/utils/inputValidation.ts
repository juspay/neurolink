/**
 * CLI Input Validation Utilities
 *
 * Validates multimodal file flags (--image/--csv/--pdf/--video/--file), the
 * batch `<promptsFile>` positional, and --csv-max-rows before a
 * generate/stream/batch run starts, so bad input fails fast with a clear
 * message instead of surfacing deep inside provider calls. Exported as
 * standalone functions (rather than private statics on CLICommandFactory)
 * so callers — including tests — can import and invoke them directly,
 * without reaching into the class via an `unknown` cast.
 */

import fs from "node:fs";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import { logger } from "../../lib/utils/logger.js";
import { redactUrlForError } from "../../lib/utils/logSanitize.js";
import type { CliValidatedFileOption } from "../../lib/types/index.js";
import { resolveFilePath } from "./pathResolver.js";

/**
 * Soft (warn-only) size thresholds for CLI multimodal flags. Intentionally
 * defined here rather than reusing `lib/processors/config/sizeLimits.ts`'s
 * hard processor caps (e.g. PDF's 100MB hard limit): reusing those names/
 * values would couple the CLI layer to processor internals across the
 * CLI/SDK boundary, and would blur the line between a soft "this may be
 * slow" warning and the actual hard cap the processor enforces.
 */
export const CLI_SOFT_LIMITS_MB = {
  IMAGE_MAX_MB: 10,
  CSV_MAX_MB: 50,
  PDF_MAX_MB: 100,
  VIDEO_MAX_MB: 500,
} as const;

// `file://` is intentionally excluded here: it addresses a local path, so it
// must still go through directory/missing-path validation below (via
// tryResolveFileUrl in validateSingleLocalPath). Only genuine remote/inline
// references (http(s), data URIs) skip validation entirely (#319).
function isNonLocalFileReference(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("data:")
  );
}

// #291: a `file://` URL still points at something on disk, so validation
// needs the real filesystem path. Returns undefined (instead of throwing)
// for a malformed URL so the caller can report a friendly error.
function tryResolveFileUrl(filePath: string): string | undefined {
  if (!filePath.toLowerCase().startsWith("file://")) {
    return filePath;
  }
  try {
    return fileURLToPath(filePath);
  } catch {
    return undefined;
  }
}

/**
 * Shared aggregated-error format for any invalid local file path (missing,
 * unreadable, a directory, or a malformed `file://` URL). Used by both the
 * flag-based loop in `validateCliInputFiles` and the batch `<promptsFile>`
 * positional check in `validatePromptsFilePath`, so every caller gets the
 * same clear error + troubleshooting hints instead of a raw exception.
 */
function buildInvalidFileError(errors: string[]): Error {
  return new Error(
    "❌ One or more input files are invalid:\n" +
      `${errors.join("\n")}\n` +
      "💡 Troubleshooting:\n" +
      "  • Check the path is correct and relative to your current directory, or pass an absolute path / URL.\n" +
      `  • Check your working directory (${process.cwd()}).\n` +
      "  • For remote resources, prefix the value with http:// or https://.\n" +
      "  • If you pointed at a folder, point at the file inside it instead.",
  );
}

/**
 * Validate a single raw path/URL value for `option`, pushing a friendly
 * message onto `errors` instead of letting fs calls throw a raw exception
 * (ENOENT, EACCES/EPERM TOCTOU, a directory, or a malformed `file://` URL).
 * Returns the resolved local filesystem path on success (or the original
 * value unchanged for a skipped http(s)/data: reference), and `undefined`
 * when an error was pushed.
 *
 * `rawPath` is redacted via `redactUrlForError` before ever being
 * interpolated into a message — a `file://` value can carry a sensitive
 * query string, fragment, or embedded `user:pass@` credentials that must
 * never be echoed back verbatim. This is a no-op for ordinary filesystem
 * paths (they aren't parseable as a URL, so the redaction fallback simply
 * returns them unchanged).
 */
function validateSingleLocalPath(
  option: string,
  rawPath: string,
  errors: string[],
  warnAtMB?: number,
): string | undefined {
  const resolvedPath = resolveFilePath(rawPath);
  if (isNonLocalFileReference(resolvedPath)) {
    // URLs / data: refs skip both existence and size checks (#319).
    return resolvedPath;
  }

  const safeRawPath = redactUrlForError(rawPath);

  // #291: `file://` URLs are local paths in disguise — validate the decoded
  // filesystem path so a directory or missing path is still caught here
  // instead of failing cryptically deep in processing.
  const pathToValidate = tryResolveFileUrl(resolvedPath);
  if (pathToValidate === undefined) {
    errors.push(`${option} is not a valid file:// URL: ${safeRawPath}`);
    return undefined;
  }

  const safeResolvedPath = redactUrlForError(pathToValidate);

  // Single statSync covers existence, directory rejection, and the size
  // warning below — avoids a second syscall and closes the TOCTOU gap a
  // separate existsSync()+statSync() pair would leave.
  let stat: fs.Stats;
  try {
    stat = fs.statSync(pathToValidate);
  } catch (err) {
    // Only ENOENT actually means "not found" — EACCES (permission denied),
    // ELOOP (symlink loop), ENOTDIR, etc. are real failures that get masked
    // (and made undebuggable) if we blanket-label every statSync error the
    // same way.
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      errors.push(
        `${option} path not found: ${safeRawPath} (resolved to ${safeResolvedPath})`,
      );
    } else {
      const reason = err instanceof Error ? err.message : String(err);
      errors.push(
        `${option} path could not be accessed: ${safeRawPath} (resolved to ${safeResolvedPath}) — ` +
          `${code ? `${code}: ` : ""}${reason}`,
      );
    }
    return undefined;
  }

  // #288: reject a directory before it fails cryptically deep in processing
  // (readFileSync on a dir throws a raw EISDIR).
  if (stat.isDirectory()) {
    errors.push(
      `${option} path is a directory, not a file: ${safeRawPath} (resolved to ${safeResolvedPath})`,
    );
    return undefined;
  }

  // #319: warn (not error) when a local multimodal file is unusually large
  // so the user isn't surprised by slow processing / token blowups. Safety-
  // relevant, so always visible (not gated behind --quiet) and written to
  // stderr — never stdout — so `--format json` output stays parseable.
  if (warnAtMB !== undefined) {
    const sizeMB = stat.size / (1024 * 1024);
    if (sizeMB > warnAtMB) {
      logger.alwaysStderr(
        chalk.yellow(
          `⚠️  ${option} file ${safeRawPath} is ${sizeMB.toFixed(1)}MB ` +
            `(above the ${warnAtMB}MB soft limit) — processing may be slow ` +
            `or exceed provider token/size limits.`,
        ),
      );
    }
  }

  return pathToValidate;
}

/**
 * Validate --image/--csv/--pdf/--video/--file inputs before a CLI run
 * starts: every local path (including `file://` URLs) must exist, must not
 * be a directory, and — for the flags with a soft limit — triggers a size
 * warning above the threshold. Genuine http(s)/data: URLs skip both
 * existence and size checks (#319).
 */
export function validateCliInputFiles(argv: Record<string, unknown>): void {
  const fileArgs: Array<{
    option: CliValidatedFileOption;
    value?: string | string[];
    warnAtMB?: number;
  }> = [
    {
      option: "--image",
      value: argv.image as string | string[] | undefined,
      warnAtMB: CLI_SOFT_LIMITS_MB.IMAGE_MAX_MB,
    },
    {
      option: "--csv",
      value: argv.csv as string | string[] | undefined,
      warnAtMB: CLI_SOFT_LIMITS_MB.CSV_MAX_MB,
    },
    {
      option: "--pdf",
      value: argv.pdf as string | string[] | undefined,
      warnAtMB: CLI_SOFT_LIMITS_MB.PDF_MAX_MB,
    },
    {
      option: "--video",
      value: argv.video as string | string[] | undefined,
      warnAtMB: CLI_SOFT_LIMITS_MB.VIDEO_MAX_MB,
    },
    { option: "--file", value: argv.file as string | string[] | undefined },
  ];

  const errors: string[] = [];

  for (const { option, value, warnAtMB } of fileArgs) {
    if (!value) {
      continue;
    }

    const rawPaths = Array.isArray(value) ? value : [value];
    for (const rawPath of rawPaths) {
      validateSingleLocalPath(option, rawPath, errors, warnAtMB);
    }
  }

  if (errors.length > 0) {
    throw buildInvalidFileError(errors);
  }
}

/**
 * #291: validate the batch `<promptsFile>` positional through the same
 * aggregated-error-friendly path as the multimodal flags above (not found /
 * unreadable / directory / malformed `file://` URL), instead of a raw
 * existsSync+readFileSync that throws an unfriendly EISDIR when pointed at
 * a directory. The `<file>` label (rather than `--file`) keeps the message
 * from being confused with the `--file` flag, which batch doesn't register
 * at all (see `createBatchCommand`). Returns the resolved local path for
 * the caller to read.
 */
export function validatePromptsFilePath(rawPath: string): string {
  const errors: string[] = [];
  const resolved = validateSingleLocalPath("<file>", rawPath, errors);
  if (errors.length > 0) {
    throw buildInvalidFileError(errors);
  }
  // `errors` is empty here, so `validateSingleLocalPath` did not return
  // undefined.
  return resolved as string;
}

/**
 * #310: validate --csv-max-rows is a positive integer in the range
 * 1-100000, matching the documented option range (the value previously
 * flowed through silently, or — above 100000 — only warned instead of
 * being rejected, contradicting the documented hard range).
 */
export function validateCsvMaxRows(argv: Record<string, unknown>): void {
  const raw = argv.csvMaxRows;
  if (raw === undefined) {
    return;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 100000) {
    throw new Error(
      `Invalid --csv-max-rows (--csvMaxRows) value: ${String(raw)}. ` +
        `Must be a positive integer in the range 1-100000. ` +
        `Example: --csv-max-rows 500`,
    );
  }
}
