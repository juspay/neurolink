import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
  renameSync,
  mkdirSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { applyPatch, structuredPatch } from "diff";
import type {
  ProxyPackageBaseline,
  ProxyPackagePolyfillReport,
  ProxyPackageSelection,
} from "../types/index.js";

const BASELINE_NAME = ".neurolink-proxy-baseline.json";
const MAX_FILES = 4096;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 64 * 1024 * 1024;
const MAX_CHANGED_FILES = 64;

/** Locate the package without importing its executable or provider graph. */
export function proxyPackageRoot(entryScript: string): string {
  let directory = dirname(realpathSync(entryScript));
  for (;;) {
    const manifest = join(directory, "package.json");
    if (existsSync(manifest)) {
      let value: unknown;
      try {
        value = JSON.parse(readFileSync(manifest, "utf8"));
      } catch {
        throw new Error("Proxy package manifest is unreadable or invalid");
      }
      if (
        value &&
        typeof value === "object" &&
        "name" in value &&
        value.name === "@juspay/neurolink"
      ) {
        return directory;
      }
    }
    const parent = dirname(directory);
    if (parent === directory) {
      throw new Error("Proxy package manifest not found");
    }
    directory = parent;
  }
}

function sorted(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sorted);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sorted(item)]),
    );
  }
  return value;
}

function safePath(path: string): boolean {
  return (
    !isAbsolute(path) &&
    !path.includes("\\") &&
    path
      .split("/")
      .every((part) => part !== "" && part !== "." && part !== "..")
  );
}

function runtimePath(path: string, entryRelative: string): boolean {
  return (
    safePath(path) &&
    /\.(?:[cm]?js|json)$/.test(path) &&
    (path === entryRelative ||
      (path.startsWith("dist/") && !path.startsWith("dist/browser/")) ||
      path.startsWith("scripts/observability/"))
  );
}

/** Bounded baseline of shipped proxy code; operator config and dependencies are excluded. */
export function snapshotProxyPackage(
  selection: ProxyPackageSelection,
): ProxyPackageBaseline {
  const root = proxyPackageRoot(selection.entryScript);
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  // Release numbers and npm bookkeeping are not runtime compatibility edits.
  const comparable = Object.fromEntries(
    Object.entries(manifest).filter(
      ([key]) => key !== "version" && key !== "gitHead" && !key.startsWith("_"),
    ),
  );
  const entryRelative = relative(root, realpathSync(selection.entryScript))
    .split("\\")
    .join("/");
  if (!safePath(entryRelative)) {
    throw new Error("Proxy executable escapes package");
  }
  const files: Record<string, string> = {};
  let bytes = 0;
  const read = (path: string) => {
    if (!runtimePath(path, entryRelative) || Object.hasOwn(files, path)) {
      return;
    }
    const file = join(root, path);
    const stat = lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(`Proxy runtime file is not a regular file: ${path}`);
    }
    if (
      stat.size > MAX_FILE_BYTES ||
      bytes + stat.size > MAX_TOTAL_BYTES ||
      Object.keys(files).length >= MAX_FILES
    ) {
      throw new Error("Proxy runtime baseline exceeds its size limit");
    }
    const data = readFileSync(file);
    files[path] = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    }).decode(data);
    bytes += data.length;
  };
  const walk = (path: string) => {
    if (!existsSync(join(root, path))) {
      return;
    }
    if (lstatSync(join(root, path)).isSymbolicLink()) {
      throw new Error(`Proxy runtime directory is a symbolic link: ${path}`);
    }
    for (const item of readdirSync(join(root, path), {
      withFileTypes: true,
    }).sort((a, b) => a.name.localeCompare(b.name))) {
      const next = `${path}/${item.name}`;
      if (next === "dist/browser" || item.name === "node_modules") {
        continue;
      }
      if (item.isSymbolicLink()) {
        throw new Error(`Proxy runtime path is a symbolic link: ${next}`);
      }
      if (item.isDirectory()) {
        walk(next);
      } else {
        read(next);
      }
    }
  };
  walk("dist");
  walk("scripts/observability");
  read(entryRelative);
  return {
    schemaVersion: 1,
    version: selection.version,
    manifest: JSON.stringify(sorted(comparable)),
    entryRelative,
    files,
  };
}

/** Invalid or missing baseline must never be silently replaced with edited files. */
export function readProxyPackageBaseline(
  selection: ProxyPackageSelection,
): ProxyPackageBaseline | null {
  const path = join(proxyPackageRoot(selection.entryScript), BASELINE_NAME);
  if (!existsSync(path)) {
    return null;
  }
  const stat = lstatSync(path);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size > MAX_TOTAL_BYTES * 2
  ) {
    throw new Error("Proxy package baseline is invalid");
  }
  let value: ProxyPackageBaseline;
  try {
    value = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error("Proxy package baseline is unreadable or invalid");
  }
  if (
    value.schemaVersion !== 1 ||
    typeof value.version !== "string" ||
    typeof value.manifest !== "string" ||
    typeof value.entryRelative !== "string" ||
    !safePath(value.entryRelative) ||
    !value.files ||
    typeof value.files !== "object" ||
    Array.isArray(value.files)
  ) {
    throw new Error("Proxy package baseline is invalid");
  }
  let bytes = 0;
  const entries = Object.entries(value.files);
  if (entries.length > MAX_FILES) {
    throw new Error("Proxy package baseline exceeds its size limit");
  }
  for (const [name, content] of entries) {
    if (
      !runtimePath(name, value.entryRelative) ||
      typeof content !== "string" ||
      Buffer.byteLength(content) > MAX_FILE_BYTES
    ) {
      throw new Error("Proxy package baseline contains an invalid file");
    }
    bytes += Buffer.byteLength(content);
  }
  if (bytes > MAX_TOTAL_BYTES) {
    throw new Error("Proxy package baseline exceeds its size limit");
  }
  return value;
}

export function writeProxyPackageBaseline(
  selection: ProxyPackageSelection,
  baseline: ProxyPackageBaseline,
): void {
  const path = join(proxyPackageRoot(selection.entryScript), BASELINE_NAME);
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(baseline), {
    mode: 0o600,
    flag: "wx",
  });
  renameSync(temporary, path);
}

/** Operator supplies the pristine base for a legacy local build; this does not activate it. */
export function captureProxyPackageBaseline(
  base: ProxyPackageSelection,
  patched: ProxyPackageSelection,
): string[] {
  const original = snapshotProxyPackage(base);
  const current = snapshotProxyPackage(patched);
  if (
    original.manifest !== current.manifest ||
    original.entryRelative !== current.entryRelative
  ) {
    throw new Error(
      "Local package metadata differs from its base; runtime polyfills cannot change dependencies or the executable",
    );
  }
  const existing = readProxyPackageBaseline(patched);
  if (
    existing &&
    (existing.manifest !== original.manifest ||
      JSON.stringify(sorted(existing.files)) !==
        JSON.stringify(sorted(original.files)))
  ) {
    throw new Error("A different proxy package baseline is already recorded");
  }
  const changed = changedProxyRuntimeFiles(original, current);
  writeProxyPackageBaseline(patched, original);
  return changed;
}

export function changedProxyRuntimeFiles(
  base: ProxyPackageBaseline,
  current: ProxyPackageBaseline,
): string[] {
  if (
    base.manifest !== current.manifest ||
    base.entryRelative !== current.entryRelative
  ) {
    throw new Error(
      "Local package metadata changed; refusing upgrade rather than discarding it",
    );
  }
  return [
    ...new Set([...Object.keys(base.files), ...Object.keys(current.files)]),
  ]
    .sort()
    .filter((path) => base.files[path] !== current.files[path]);
}

function occurrences(content: string, lines: string[]): number {
  if (!lines.length) {
    return 0;
  }
  const haystack = content.split("\n");
  let count = 0;
  for (let start = 0; start + lines.length <= haystack.length; start++) {
    if (lines.every((line, offset) => line === haystack[start + offset])) {
      count++;
    }
    if (count > 1) {
      break;
    }
  }
  return count;
}

/** Apply exact local hunks, leaving independent upstream changes intact. */
export function reconcileProxyPackagePolyfills(
  base: ProxyPackageBaseline,
  local: ProxyPackageBaseline,
  candidate: ProxyPackageBaseline,
): {
  files: Record<string, string | null>;
  report: ProxyPackagePolyfillReport;
} {
  const changed = changedProxyRuntimeFiles(base, local);
  if (changed.length > MAX_CHANGED_FILES) {
    throw new Error(
      "Proxy polyfill exceeds the 64-file compatibility diff limit",
    );
  }
  const files: Record<string, string | null> = {};
  const report: ProxyPackagePolyfillReport = {
    applied: [],
    alreadyIncluded: [],
  };
  for (const path of changed) {
    if (!runtimePath(path, candidate.entryRelative)) {
      throw new Error(
        `Proxy polyfill path is outside the candidate runtime: ${path}`,
      );
    }
    const before = base.files[path];
    const after = local.files[path];
    const upstream = candidate.files[path];
    if (upstream === after) {
      report.alreadyIncluded.push(path);
      continue;
    }
    if (upstream === before) {
      files[path] = after ?? null;
      report.applied.push(path);
      continue;
    }
    if (
      before === undefined ||
      after === undefined ||
      upstream === undefined ||
      before === "" ||
      after === ""
    ) {
      throw new Error(`Proxy polyfill conflicts with the release: ${path}`);
    }
    const patch = structuredPatch(path, path, before, after, "", "", {
      context: 3,
      timeout: 1000,
      maxEditLength: 20_000,
    });
    if (!patch || patch.hunks.length > 128) {
      throw new Error(`Proxy polyfill exceeds its diff budget: ${path}`);
    }
    let content = upstream;
    let applied = false;
    for (const hunk of patch.hunks) {
      const oldLines = hunk.lines
        .filter((line) => line[0] === " " || line[0] === "-")
        .map((line) => line.slice(1));
      const newLines = hunk.lines
        .filter((line) => line[0] === " " || line[0] === "+")
        .map((line) => line.slice(1));
      const oldMatches = occurrences(content, oldLines);
      const newMatches = occurrences(content, newLines);
      if (newMatches === 1 && oldMatches === 0) {
        continue;
      }
      if (oldMatches !== 1 || newMatches !== 0) {
        throw new Error(`Proxy polyfill conflicts with the release: ${path}`);
      }
      const result = applyPatch(
        content,
        { ...patch, hunks: [hunk] },
        { fuzzFactor: 0 },
      );
      if (result === false) {
        throw new Error(`Proxy polyfill conflicts with the release: ${path}`);
      }
      content = result;
      applied = true;
    }
    if (applied) {
      files[path] = content;
      report.applied.push(path);
    } else {
      report.alreadyIncluded.push(path);
    }
  }
  return { files, report };
}

/** Writes are confined to a new staged copy, never the serving package. */
export function writeProxyPolyfilledFile(
  root: string,
  path: string,
  content: string,
): void {
  root = realpathSync(root);
  if (!safePath(path)) {
    throw new Error("Invalid proxy polyfill path");
  }
  const target = resolve(root, path);
  if (!target.startsWith(`${realpathSync(root)}/`)) {
    throw new Error("Proxy polyfill escapes its package");
  }
  // A candidate cannot redirect a patch through a symlinked parent.
  let parent = dirname(target);
  while (parent !== root) {
    if (existsSync(parent) && lstatSync(parent).isSymbolicLink()) {
      throw new Error("Proxy polyfill parent is a symbolic link");
    }
    parent = dirname(parent);
  }
  if (existsSync(target) && lstatSync(target).isSymbolicLink()) {
    throw new Error("Proxy polyfill target is a symbolic link");
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}
