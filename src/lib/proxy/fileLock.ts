/**
 * Cross-process advisory file lock for the proxy's shared JSON snapshots.
 *
 * Rolling workers (an old one draining while its replacement serves) write the
 * same files under ~/.neurolink. Each write is already an atomic temp+rename
 * that folds onto the file as it is now, but without a lock two workers can
 * read the same version and the second rename drops the first one's change.
 *
 * The lock is `<file>.lock`, created with O_EXCL and holding its owner's pid
 * and a token. A lock whose owner has exited, or that is older than the stale
 * window, is removed and retaken, so a crashed worker cannot wedge the others.
 */

import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rm, stat } from "node:fs/promises";
import { dirname } from "node:path";
import type { ProxyStatsLockOwner } from "../types/index.js";
import { logger } from "../utils/logger.js";

const LOCK_RETRY_MS = 25;

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function processIsRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readLockOwner(
  lockPath: string,
): Promise<ProxyStatsLockOwner | null> {
  try {
    const parsed = JSON.parse(await readFile(lockPath, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const candidate = parsed as Partial<ProxyStatsLockOwner>;
    if (
      typeof candidate.token !== "string" ||
      !isNonNegativeSafeInteger(candidate.pid) ||
      candidate.pid === 0 ||
      !isNonNegativeSafeInteger(candidate.acquiredAt)
    ) {
      return null;
    }
    return candidate as ProxyStatsLockOwner;
  } catch {
    return null;
  }
}

async function removeAbandonedLock(
  lockPath: string,
  staleLockMs: number,
  now: number,
): Promise<boolean> {
  const owner = await readLockOwner(lockPath);
  try {
    const lockStat = await stat(lockPath);
    const oldEnough = now - lockStat.mtimeMs >= staleLockMs;
    const ownerIsRunning = owner ? processIsRunning(owner.pid) : false;
    if (owner && ownerIsRunning && !oldEnough) {
      return false;
    }
    if ((owner && !ownerIsRunning) || oldEnough) {
      await rm(lockPath, { force: true });
      return true;
    }
  } catch (error) {
    return (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
  }
  return false;
}

export async function acquireFileLock(
  lockPath: string,
  timeoutMs: number,
  staleLockMs: number,
  now: () => number,
): Promise<() => Promise<void>> {
  await mkdir(dirname(lockPath), { recursive: true, mode: 0o700 });
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const owner: ProxyStatsLockOwner = {
      token: randomUUID(),
      pid: process.pid,
      acquiredAt: now(),
    };
    let handle: Awaited<ReturnType<typeof open>> | undefined;
    try {
      handle = await open(lockPath, "wx", 0o600);
      await handle.writeFile(JSON.stringify(owner));
      const acquiredHandle = handle;
      return async () => {
        await acquiredHandle.close().catch(() => undefined);
        const current = await readLockOwner(lockPath);
        if (current?.token === owner.token) {
          await rm(lockPath, { force: true }).catch(() => undefined);
        }
      };
    } catch (error) {
      if (handle) {
        await handle.close().catch(() => undefined);
        await rm(lockPath, { force: true }).catch(() => undefined);
      }
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }

    if (await removeAbandonedLock(lockPath, staleLockMs, now())) {
      continue;
    }
    if (Date.now() >= deadline) {
      throw new Error(`Timed out acquiring file lock ${lockPath}`);
    }
    await sleep(LOCK_RETRY_MS);
  }
}

/**
 * Run `fn` holding `<filePath>.lock`. Waits up to `timeoutMs` for the lock; if
 * it still cannot be taken (a live holder past the wait, an unwritable
 * directory), `fn` runs anyway after a warning, because callers merge onto the
 * file as it is now and losing a whole update is worse than the narrow race
 * the lock closes.
 */
export async function withBestEffortFileLock<T>(
  filePath: string,
  fn: () => Promise<T>,
  options: { timeoutMs?: number; staleLockMs?: number } = {},
): Promise<T> {
  let release: (() => Promise<void>) | undefined;
  try {
    release = await acquireFileLock(
      `${filePath}.lock`,
      options.timeoutMs ?? 2_000,
      options.staleLockMs ?? 30_000,
      Date.now,
    );
  } catch (error) {
    logger.warn(
      `[proxy] could not lock ${filePath} (${error instanceof Error ? error.message : String(error)}); writing without the lock`,
    );
  }
  try {
    return await fn();
  } finally {
    await release?.();
  }
}
