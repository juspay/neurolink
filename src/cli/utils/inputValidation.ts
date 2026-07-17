/**
 * CLI Input Validation Utilities
 *
 * Validates multimodal file flags (--image/--csv/--pdf/--video/--file) and
 * --csv-max-rows before a generate/stream/batch run starts, so bad input
 * fails fast with a clear message instead of surfacing deep inside provider
 * calls. Exported as standalone functions (rather than private statics on
 * CLICommandFactory) so callers — including tests — can import and invoke
 * them directly, without reaching into the class via an `unknown` cast.
 */

import fs from "node:fs";
import chalk from "chalk";
import { logger } from "../../lib/utils/logger.js";
import { resolveFilePaths } from "./pathResolver.js";

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

function isNonLocalFileReference(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("file://") ||
    lower.startsWith("data:")
  );
}

/**
 * Validate --image/--csv/--pdf/--video/--file inputs before a CLI run
 * starts: every local path must exist, must not be a directory, and — for
 * the flags with a soft limit — triggers a size warning above the
 * threshold. URLs/data URIs skip both existence and size checks (#319).
 */
export function validateCliInputFiles(argv: Record<string, unknown>): void {
  const fileArgs: Array<{
    option: "--image" | "--csv" | "--pdf" | "--video" | "--file";
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

  const missingPaths: string[] = [];

  for (const { option, value, warnAtMB } of fileArgs) {
    if (!value) {
      continue;
    }

    const rawPaths = Array.isArray(value) ? value : [value];
    const resolvedPaths = resolveFilePaths(rawPaths);

    for (let i = 0; i < resolvedPaths.length; i++) {
      const resolvedPath = resolvedPaths[i];
      // URLs / data: refs skip both existence and size checks (#319).
      if (isNonLocalFileReference(resolvedPath)) {
        continue;
      }

      // Single statSync covers existence, directory rejection, and the
      // size warning below — avoids a second syscall and closes the
      // TOCTOU gap a separate existsSync()+statSync() pair would leave.
      let stat: fs.Stats;
      try {
        stat = fs.statSync(resolvedPath);
      } catch (err) {
        // Only ENOENT actually means "not found" — EACCES (permission
        // denied), ELOOP (symlink loop), ENOTDIR, etc. are real failures
        // that get masked (and made undebuggable) if we blanket-label
        // every statSync error the same way.
        const code = (err as NodeJS.ErrnoException)?.code;
        if (code === "ENOENT") {
          missingPaths.push(
            `${option} path not found: ${rawPaths[i]} (resolved to ${resolvedPath})`,
          );
        } else {
          const reason = err instanceof Error ? err.message : String(err);
          missingPaths.push(
            `${option} path could not be accessed: ${rawPaths[i]} (resolved to ${resolvedPath}) — ` +
              `${code ? `${code}: ` : ""}${reason}`,
          );
        }
        continue;
      }

      if (stat.isDirectory()) {
        missingPaths.push(
          `${option} path is a directory, not a file: ${rawPaths[i]} (resolved to ${resolvedPath})`,
        );
        continue;
      }

      // #319: warn (not error) when a local multimodal file is unusually
      // large so the user isn't surprised by slow processing / token blowups.
      if (warnAtMB !== undefined) {
        const sizeMB = stat.size / (1024 * 1024);
        if (sizeMB > warnAtMB) {
          logger.always(
            chalk.yellow(
              `⚠️  ${option} file ${rawPaths[i]} is ${sizeMB.toFixed(1)}MB ` +
                `(above the ${warnAtMB}MB soft limit) — processing may be slow ` +
                `or exceed provider token/size limits.`,
            ),
          );
        }
      }
    }
  }

  if (missingPaths.length > 0) {
    throw new Error(
      "❌ One or more input files are invalid:\n" +
        `${missingPaths.join("\n")}\n` +
        "💡 Check the path is correct and relative to your current directory, " +
        "or pass an absolute path / URL.",
    );
  }
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
