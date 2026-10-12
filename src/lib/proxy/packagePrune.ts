import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { lstat, readdir, rename, rm } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import type {
  ProxyPackagePruneOptions,
  ProxyPackagePruneResult,
  ProxyPackagePruneRetention,
} from "../types/index.js";
import { readProxyPackageSelection } from "./globalInstaller.js";

const execFileAsync = promisify(execFile);

// Only the names globalInstaller.ts generates: `<version>`,
// `<version>-release-<uuid>` and `<version>-polyfills-<digest>-<uuid>`. Anything
// else in the store (a hand-made `-official` copy, an in-flight `.install-*`
// staging tree) is not ours to delete.
const GENERATED_BUILD_NAME =
  /^\d+\.\d+\.\d+(?:-release-[0-9a-f-]{36}|-polyfills-[0-9a-f]{16}-[0-9a-f-]{36})?$/;
const TOMBSTONE_PREFIX = ".prune-";
const DEFAULT_MIN_AGE_MS = 60 * 60_000;

function entryScriptOf(value: unknown): string | undefined {
  return typeof value === "object" &&
    value !== null &&
    "entryScript" in value &&
    typeof value.entryScript === "string"
    ? value.entryScript
    : undefined;
}

function canonical(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

/** First path segment below the store, i.e. the build directory a file lives in. */
function buildDirectoryOf(storeRoot: string, path: string): string | null {
  const rel = relative(storeRoot, canonical(path));
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) {
    return null;
  }
  return rel.split(sep)[0] ?? null;
}

/**
 * Read selections.json without validating the builds it names: a build that
 * failed validation once must still count as referenced, not as garbage.
 */
function rawSelectedEntryScripts(packagesDir: string): string[] {
  try {
    const state: unknown = JSON.parse(
      readFileSync(join(packagesDir, "selections.json"), "utf8"),
    );
    if (typeof state !== "object" || state === null) {
      return [];
    }
    return [
      "active" in state ? entryScriptOf(state.active) : undefined,
      "previous" in state ? entryScriptOf(state.previous) : undefined,
    ].filter((entry): entry is string => entry !== undefined);
  } catch {
    return [];
  }
}

async function listProcessCommandLines(): Promise<string[] | null> {
  if (process.platform === "win32") {
    return null;
  }
  try {
    const { stdout } = await execFileAsync("ps", ["-axo", "command="], {
      maxBuffer: 64 * 1024 * 1024,
      timeout: 10_000,
    });
    return stdout.split("\n");
  } catch {
    return null;
  }
}

function mentionsDirectory(line: string, directory: string): boolean {
  return (
    line.includes(`${directory}${sep}`) ||
    line.includes(`${directory} `) ||
    line.endsWith(directory)
  );
}

/**
 * Keep the selected pair (active and rollback) and remove every other build the
 * installer generated. Nothing is removed unless the active selection is valid,
 * the live process list could be read, and the build is neither referenced by a
 * running process nor recently written.
 */
export async function pruneProxyPackages(
  options: ProxyPackagePruneOptions,
): Promise<ProxyPackagePruneResult> {
  const skip = (reason: string): ProxyPackagePruneResult => ({
    skipped: reason,
    removed: [],
    retained: [],
    failed: [],
  });

  let storeRoot: string;
  try {
    storeRoot = realpathSync(options.packagesDir);
  } catch {
    return skip("package store does not exist");
  }

  const buildDirectories = (entryScripts: (string | undefined)[]) =>
    new Set(
      entryScripts
        .filter((entry): entry is string => entry !== undefined)
        .map((entry) => buildDirectoryOf(storeRoot, entry))
        .filter((name): name is string => name !== null),
    );
  // Read again before every removal, not once: a pass can outlive the selection
  // it started from. Null means the active selection no longer validates.
  const readSelected = (): Set<string> | null => {
    const active = readProxyPackageSelection(options.packagesDir);
    if (!active) {
      return null;
    }
    return buildDirectories([
      active.entryScript,
      readProxyPackageSelection(options.packagesDir, true)?.entryScript,
      ...rawSelectedEntryScripts(options.packagesDir),
    ]);
  };
  const selected = readSelected();
  if (!selected) {
    return skip("no validated active package selection");
  }
  const running = buildDirectories([options.currentEntryScript]);

  const entries = await readdir(storeRoot, { withFileTypes: true });
  const failed: ProxyPackagePruneResult["failed"] = [];

  // A pass killed between rename and rm leaves a tombstone; nothing else reads it.
  for (const entry of entries) {
    if (
      !options.dryRun &&
      entry.isDirectory() &&
      entry.name.startsWith(TOMBSTONE_PREFIX)
    ) {
      await rm(join(storeRoot, entry.name), {
        recursive: true,
        force: true,
      }).catch((error: unknown) => {
        failed.push({ name: entry.name, message: String(error) });
      });
    }
  }

  const candidates = entries
    .filter(
      (entry) => entry.isDirectory() && GENERATED_BUILD_NAME.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort();
  const unselected = candidates.filter((name) => !selected.has(name));

  const processLines = unselected.length
    ? await (options.listProcessCommandLines ?? listProcessCommandLines)()
    : [];
  if (processLines === null) {
    return skip("running processes could not be enumerated");
  }

  const retained: ProxyPackagePruneResult["retained"] = candidates
    .filter((name) => selected.has(name))
    .map((name) => ({ name, reason: "selected" }));
  const removed: string[] = [];
  const now = options.now ?? Date.now();
  const minAgeMs = options.minAgeMs ?? DEFAULT_MIN_AGE_MS;

  // A process may name the store through a symlinked spelling (/var vs
  // /private/var), so match the path as configured as well as the real one.
  const storeSpellings = [
    ...new Set([storeRoot, resolve(options.packagesDir)]),
  ];

  for (const name of unselected) {
    const directory = join(storeRoot, name);
    const retain = (reason: ProxyPackagePruneRetention): void => {
      retained.push({ name, reason });
    };
    if (
      running.has(name) ||
      processLines.some((line) =>
        storeSpellings.some((store) =>
          mentionsDirectory(line, join(store, name)),
        ),
      )
    ) {
      retain("in-use");
      continue;
    }
    try {
      const stats = await lstat(directory);
      if (now - Math.max(stats.mtimeMs, stats.ctimeMs) < minAgeMs) {
        retain("recent");
        continue;
      }
      if (options.dryRun) {
        removed.push(name);
        continue;
      }
      // The only thing left between this check and the rename is the rename. A
      // replacement updater may have selected this build, or taken over, since
      // the pass began.
      const latest = readSelected();
      if (!latest) {
        return {
          skipped: "package selection became invalid during the pass",
          removed,
          retained,
          failed,
        };
      }
      if (latest.has(name)) {
        retain("selected");
        continue;
      }
      if (options.isCurrentOwner && !options.isCurrentOwner()) {
        return {
          skipped: "update ownership changed during the pass",
          removed,
          retained,
          failed,
        };
      }
      // Rename first: a half-deleted directory under its real name would pass
      // installStagedProxyPackage's existsSync() shortcut and then fail validation.
      const tombstone = join(
        storeRoot,
        `${TOMBSTONE_PREFIX}${name}-${randomUUID()}`,
      );
      await rename(directory, tombstone);
      removed.push(name);
      await rm(tombstone, { recursive: true, force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        failed.push({
          name,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return { removed, retained, failed };
}
