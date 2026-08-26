/**
 * Path containment guard for the sandboxed execution paths.
 *
 * `bashTool` does this check inline; `directTools.resolveWithinCwd` does a
 * weaker, non-symlink-aware version against `process.cwd()`. Neither is
 * reusable, and the background-command runner needs the strong form against a
 * caller-declared root, so it lives here once.
 *
 * The load-bearing detail is **realpath**. A string comparison on resolved
 * paths is defeated by a symlink: `<root>/escape → /etc` resolves lexically to
 * `<root>/escape`, which passes, and then the command runs in `/etc`. Both
 * sides are therefore resolved through the filesystem before they are
 * compared, and a target that cannot be resolved is refused rather than
 * assumed innocent.
 *
 * The `+ sep` suffix on the prefix test is the other one: without it
 * `/home/app-evil` passes a containment check against `/home/app`.
 *
 * @module utils/pathSandbox
 */

import { realpathSync, statSync } from "node:fs";
import { basename, isAbsolute, join, resolve, sep } from "node:path";
import type { PathSandboxResult } from "../types/index.js";

/** Real path of an existing directory, or undefined. */
function realDirectory(candidate: string): string | undefined {
  try {
    const real = realpathSync(candidate);
    return statSync(real).isDirectory() ? real : undefined;
  } catch {
    return undefined;
  }
}

/** Real path of anything that exists — file, directory or otherwise. */
function realEntry(candidate: string): string | undefined {
  try {
    return realpathSync(candidate);
  } catch {
    return undefined;
  }
}

function isInside(candidate: string, root: string): boolean {
  return candidate === root || candidate.startsWith(root + sep);
}

/**
 * Resolve `target` and confirm it is `root` or lies inside it, with symlinks
 * followed on both sides.
 *
 * Both must exist and be directories — a containment check on a path that is
 * not there yet cannot be honest, because whatever appears later may be a
 * symlink out.
 *
 * @param target Directory to check. Relative paths resolve against `root`.
 * @param root   Sandbox root the target must not escape.
 * @returns The resolved REAL path, or the reason it was refused.
 */
export function resolveWithinRoot(
  target: string,
  root: string,
): PathSandboxResult {
  const realRoot = realDirectory(resolve(root));
  if (!realRoot) {
    return {
      error:
        `Sandbox root "${root}" is not an existing directory. Point the policy's ` +
        "cwdRoot at a directory that exists before starting commands.",
    };
  }
  const requested = isAbsolute(target) ? target : resolve(realRoot, target);
  const realTarget = realDirectory(requested);
  if (!realTarget) {
    return {
      error:
        `Working directory "${target}" is not an existing directory. Name a directory ` +
        `that exists inside ${realRoot}.`,
    };
  }
  if (!isInside(realTarget, realRoot)) {
    return {
      error:
        `Access denied: "${target}" resolves to ${realTarget}, which is outside the ` +
        `permitted root ${realRoot}. Run the command inside that root instead.`,
    };
  }
  return { path: realTarget };
}

/**
 * The file twin of {@link resolveWithinRoot}: contain a path that may name a
 * file, or may not exist at all (a path argument to `git log`, say).
 *
 * A path that exists is resolved through its symlinks and checked directly. A
 * path that does not exist is checked on its nearest EXISTING ancestor, which
 * is the deepest point a symlink could redirect — everything below that is a
 * name, not a link. Deleted files therefore stay askable about, and
 * `../../etc/passwd` still does not.
 *
 * @param target Path to check. Relative paths resolve against `root`.
 * @param root   Sandbox root the target must not escape.
 * @returns The resolved absolute path, or the reason it was refused.
 */
export function resolvePathWithinRoot(
  target: string,
  root: string,
): PathSandboxResult {
  const realRoot = realDirectory(resolve(root));
  if (!realRoot) {
    return { error: `Sandbox root "${root}" is not an existing directory.` };
  }
  const denied = {
    error:
      `Access denied: "${target}" resolves outside the permitted root ${realRoot}. ` +
      "Name a path inside it, relative to the root.",
  };
  const requested = isAbsolute(target)
    ? resolve(target)
    : resolve(realRoot, target);

  const direct = realEntry(requested);
  if (direct) {
    return isInside(direct, realRoot) ? { path: direct } : denied;
  }

  let existing = resolve(requested, "..");
  let suffix = basename(requested);
  for (;;) {
    const real = realDirectory(existing);
    if (real) {
      return isInside(real, realRoot)
        ? { path: resolve(real, suffix) }
        : denied;
    }
    const parent = resolve(existing, "..");
    if (parent === existing) {
      return denied;
    }
    suffix = join(basename(existing), suffix);
    existing = parent;
  }
}
