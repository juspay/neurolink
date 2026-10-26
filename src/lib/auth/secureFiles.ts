/**
 * Private file and directory creation for credential material.
 *
 * Every credential file under `~/.neurolink` used to be created through a
 * different path with a different idea of permissions: a temp file at umask
 * mode then chmod'd, a directory whose mode was asserted only on first
 * creation, a truncate-in-place write that followed symlinks. These helpers
 * are the one place that gets it right, and the token store, the CLI
 * credentials file and the update-state file all go through them.
 *
 * @module auth/secureFiles
 */

import { randomUUID } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { chmod, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const PRIVATE_FILE_MODE = 0o600;
export const PRIVATE_DIR_MODE = 0o700;
/** Everything a CLI entry point creates is owner-only unless it says otherwise. */
export const PRIVATE_UMASK = 0o077;

/**
 * Tighten the process umask so no file this process creates is group- or
 * world-readable, whatever the shell's default was. Idempotent; returns the
 * mask that was in force.
 */
export function tightenProcessUmask(): number {
  if (process.platform === "win32") {
    return 0;
  }
  return process.umask(PRIVATE_UMASK);
}

/** Create `dir` owner-only, and re-assert the mode when it already existed. */
export async function ensurePrivateDirectory(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true, mode: PRIVATE_DIR_MODE });
  await chmod(dir, PRIVATE_DIR_MODE).catch(() => undefined);
}

/** Synchronous twin of {@link ensurePrivateDirectory}, for CLI start-up paths. */
export function ensurePrivateDirectorySync(dir: string): void {
  mkdirSync(dir, { recursive: true, mode: PRIVATE_DIR_MODE });
  try {
    chmodSync(dir, PRIVATE_DIR_MODE);
  } catch {
    // Not owned by us; the mkdir above is the best we can do.
  }
}

function tempPathFor(targetPath: string): string {
  return `${targetPath}.tmp.${process.pid}.${randomUUID()}`;
}

/**
 * Write `content` to `targetPath` atomically and owner-only.
 *
 * The temp file is created with `wx` at 0600 — never at umask mode and then
 * chmod'd, which left a window in which another uid could open it — under an
 * unpredictable name, and renamed into place. A rename replaces a symlink at
 * the target rather than following it.
 */
export async function writePrivateFileAtomically(
  targetPath: string,
  content: string,
): Promise<void> {
  await ensurePrivateDirectory(dirname(targetPath));
  const tempPath = tempPathFor(targetPath);
  try {
    await writeFile(tempPath, content, {
      encoding: "utf8",
      mode: PRIVATE_FILE_MODE,
      flag: "wx",
    });
    await chmod(tempPath, PRIVATE_FILE_MODE).catch(() => undefined);
    await rename(tempPath, targetPath);
  } finally {
    await rm(tempPath, { force: true }).catch(() => undefined);
  }
}

/** Synchronous twin of {@link writePrivateFileAtomically}. */
export function writePrivateFileAtomicallySync(
  targetPath: string,
  content: string,
): void {
  ensurePrivateDirectorySync(dirname(targetPath));
  const tempPath = tempPathFor(targetPath);
  try {
    writeFileSync(tempPath, content, {
      encoding: "utf8",
      mode: PRIVATE_FILE_MODE,
      flag: "wx",
    });
    try {
      chmodSync(tempPath, PRIVATE_FILE_MODE);
    } catch {
      // The create mode already bounded it.
    }
    renameSync(tempPath, targetPath);
  } finally {
    rmSync(tempPath, { force: true });
  }
}
