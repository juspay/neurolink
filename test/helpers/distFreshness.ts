/**
 * Guard against running a suite against a stale `dist/`.
 *
 * 34 of the continuous suites import from `../dist/index.js` rather than from
 * `src/`, and none of the `test:*` scripts build first. So a `dist/` left over
 * from an earlier checkout silently exercises old code: the suite runs, reports
 * failures with ordinary-looking assertion messages, and gives no hint that the
 * artifact under test is not the source in the working tree.
 *
 * That is worse than a hard failure, because the output is indistinguishable
 * from a genuine regression. It cost a real debugging detour: the skills suite
 * reported 7 failures against a `dist/` three weeks older than HEAD, including
 * failures for fixes that had just landed.
 *
 * This throws with an actionable message instead. It compares modification
 * times only — it cannot prove the build matches the source, but "dist is older
 * than a source file" is the case that actually bites, and it has no false
 * positives after a real build.
 */

import { readdirSync, statSync } from "node:fs";
import { existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Newest mtime under `dir`, or 0 when it does not exist. */
function newestMtimeMs(dir: string, skip: ReadonlySet<string>): number {
  if (!existsSync(dir)) {
    return 0;
  }
  let newest = 0;
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (skip.has(entry.name)) {
        continue;
      }
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        const { mtimeMs } = statSync(full);
        if (mtimeMs > newest) {
          newest = mtimeMs;
        }
      }
    }
  };
  walk(dir);
  return newest;
}

/**
 * Render an mtime as an age relative to now. Both sides of the comparison are
 * shown in the error so a reader can see whether dist is minutes or weeks
 * behind — "3 weeks" reads very differently from "20 seconds".
 */
function describeAge(mtimeMs: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - mtimeMs) / 1000));
  if (seconds < 90) {
    return `${seconds}s ago`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

/** Memoised directory walk; the mtimes cannot change usefully mid-run. */
let cachedWalk: { newestSrc: number; newestDist: number } | null = null;

export type DistFreshnessOptions = {
  /**
   * Repo-relative bundles that must individually be newer than `src/`.
   *
   * The directory-wide comparison below takes the newest mtime found ANYWHERE
   * under `dist/`, so one freshly written file satisfies it for the whole
   * tree. That is the right default — it catches the case that actually bites,
   * a `dist/` left over from another checkout — but it cannot see a PARTIAL
   * build, where one bundle is rewritten and another is not. A suite that
   * spawns `dist/cli/index.js` can therefore be handed a stale CLI while a
   * fresh `dist/index.js` keeps the guard quiet.
   *
   * Naming an entrypoint here checks that file's own mtime as well.
   */
  entrypoints?: readonly string[];
};

/**
 * Throw when `dist/` is missing or older than the newest file in `src/`.
 *
 * The expensive directory walk runs once per process and is reused; the
 * per-entrypoint checks are a `stat` each and run on every call, so a suite
 * naming a bundle is never silently skipped because another suite called this
 * first.
 *
 * Set `NEUROLINK_SKIP_DIST_FRESHNESS_CHECK=1` to bypass — intended for CI jobs
 * that build in a separate step where mtimes may not survive artifact
 * restoration, not for local use.
 */
export function assertDistFresh(options: DistFreshnessOptions = {}): void {
  if (process.env.NEUROLINK_SKIP_DIST_FRESHNESS_CHECK === "1") {
    return;
  }

  const distDir = join(REPO_ROOT, "dist");
  if (!existsSync(join(distDir, "index.js"))) {
    throw new Error(
      "This suite imports from dist/, but dist/index.js does not exist.\n" +
        "Run `pnpm run build` first.",
    );
  }

  if (!cachedWalk) {
    // node_modules is not under src/, but skip defensively in case of nesting.
    const skip = new Set(["node_modules", ".DS_Store"]);
    cachedWalk = {
      newestSrc: newestMtimeMs(join(REPO_ROOT, "src"), skip),
      newestDist: newestMtimeMs(distDir, skip),
    };
  }
  const { newestSrc, newestDist } = cachedWalk;

  if (newestSrc > newestDist) {
    throw new Error(
      `dist/ is stale — src/ has changed since the last build ` +
        `(newest src ${describeAge(newestSrc)}, newest dist ${describeAge(newestDist)}).\n` +
        `This suite imports from dist/, so it would test the OLD code and report ` +
        `failures that look exactly like real regressions.\n` +
        `Run \`pnpm run build\` first.`,
    );
  }

  for (const relative of options.entrypoints ?? []) {
    const full = join(REPO_ROOT, relative);
    if (!existsSync(full)) {
      throw new Error(
        `This suite drives ${relative}, but that file does not exist.\n` +
          "Run `pnpm run build` first.",
      );
    }
    const { mtimeMs } = statSync(full);
    if (newestSrc > mtimeMs) {
      throw new Error(
        `${relative} is stale — src/ has changed since that bundle was built ` +
          `(newest src ${describeAge(newestSrc)}, ${relative} ${describeAge(mtimeMs)}).\n` +
          `The directory-wide check passed because some other file under dist/ is ` +
          `newer, which is exactly how a partial build hides.\n` +
          `Run \`pnpm run build\` first.`,
      );
    }
  }
}
