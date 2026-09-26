/**
 * Resolve which directories the built-in file tools may touch for a request.
 *
 * Precedence follows the credential pattern: per-call beats instance, and
 * instance beats the `NEUROLINK_TOOL_ROOTS` environment variable. The
 * instance list (or the environment, or the working directory) is a
 * ceiling — per-call roots may only narrow it, so a server that forwards
 * caller options cannot be talked into widening file access.
 *
 * Every root is resolved through realpath once, here, so a root reached
 * through a symlink (`/home/user` → `/home/agent`) admits its own files, and
 * a later `chdir` cannot move the boundary mid-request.
 *
 * @module utils/fileToolRoots
 */

import { realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";
import type { FileToolRootPolicy } from "../types/index.js";
import { isPathInsideRoot } from "./pathSandbox.js";

const TOOL_ROOTS_ENV = "NEUROLINK_TOOL_ROOTS";
// `node:path` delimiter, spelled out: the browser bundle stubs node:path without it.
const PATH_LIST_DELIMITER = process.platform === "win32" ? ";" : ":";

function realDirectoryOrThrow(root: string): string {
  let real: string;
  try {
    real = realpathSync(resolve(root));
  } catch {
    throw new Error(
      `Tool root "${root}" does not exist. Configure file tool roots with existing directories.`,
    );
  }
  if (!statSync(real).isDirectory()) {
    throw new Error(
      `Tool root "${root}" is not a directory. Configure file tool roots with directories.`,
    );
  }
  return real;
}

function resolveRoots(roots: readonly string[]): string[] {
  return [...new Set(roots.map(realDirectoryOrThrow))];
}

function envRoots(): string[] | undefined {
  const entries = (process.env[TOOL_ROOTS_ENV] ?? "")
    .split(PATH_LIST_DELIMITER)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  // An empty variable is treated as unset; denying all file access takes an
  // explicit `fileRoots: []`.
  return entries.length > 0 ? entries : undefined;
}

/**
 * The file-tool root policy for one request.
 *
 * Returns `{ roots: null }` when nothing is configured anywhere, which keeps
 * the historical behaviour: the working directory, read at call time.
 *
 * @throws when a root does not exist, is not a directory, or a per-call root
 *   lies outside the instance ceiling. Callers invoke this before any model
 *   request so a misconfiguration fails fast.
 */
export function resolveFileToolRootPolicy(input: {
  perCall?: readonly string[];
  instance?: readonly string[];
}): FileToolRootPolicy {
  const configured = input.instance ?? envRoots();
  if (configured === undefined && input.perCall === undefined) {
    return { roots: null };
  }

  const ceiling = resolveRoots(configured ?? [process.cwd()]);
  if (input.perCall === undefined) {
    return Object.freeze({ roots: Object.freeze(ceiling) });
  }

  const narrowed = resolveRoots(input.perCall);
  for (const root of narrowed) {
    if (!ceiling.some((allowed) => isPathInsideRoot(root, allowed))) {
      throw new Error(
        `Tool root "${root}" is outside the permitted roots (${ceiling.join(", ")}). ` +
          "Per-call toolRoots can only narrow the instance's tools.fileRoots.",
      );
    }
  }
  return Object.freeze({ roots: Object.freeze(narrowed) });
}

/**
 * The resolved policy travels on an options or execution-context object under
 * this module-private symbol, never a public field. Callers can only name
 * `toolRoots`, which is resolved and checked against the ceiling; untrusted
 * JSON cannot carry a symbol, and entry points overwrite whatever is there.
 * The property is enumerable so it survives the object spreads between the
 * entry point and the provider.
 */
const BOUND_FILE_TOOL_ROOTS = Symbol("neurolink.fileToolRoots");

/** Attach a resolved policy to `target` (an options bag or execution context). */
export function bindFileToolRoots<T extends object>(
  target: T,
  policy: FileToolRootPolicy,
): T {
  Object.defineProperty(target, BOUND_FILE_TOOL_ROOTS, {
    value: policy,
    enumerable: true,
    configurable: true,
    writable: true,
  });
  return target;
}

/** The policy bound by {@link bindFileToolRoots}, if any. */
export function boundFileToolRoots(
  source: unknown,
): FileToolRootPolicy | undefined {
  if (!source || typeof source !== "object") {
    return undefined;
  }
  const value: unknown = Reflect.get(source, BOUND_FILE_TOOL_ROOTS);
  if (!value || typeof value !== "object" || !("roots" in value)) {
    return undefined;
  }
  const roots: unknown = value.roots;
  if (roots === null) {
    return { roots: null };
  }
  return Array.isArray(roots) &&
    roots.every((root): root is string => typeof root === "string")
    ? { roots }
    : undefined;
}
