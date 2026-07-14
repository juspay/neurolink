import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const writeLocks = new Map<string, Promise<void>>();

async function writeSnapshotFile(
  targetPath: string,
  payload: string,
  mode: number,
): Promise<void> {
  const dir = dirname(targetPath);
  const baseName = basename(targetPath);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const tempPath = join(dir, `.${baseName}.${process.pid}.${randomUUID()}.tmp`);

  try {
    await writeFile(tempPath, payload, { mode });
    await rename(tempPath, targetPath);
  } finally {
    await rm(tempPath, { force: true }).catch(() => {
      // Best-effort cleanup only.
    });
  }
}

export async function writeJsonSnapshotAtomically(
  targetPath: string,
  data: unknown,
  mode: number = 0o600,
): Promise<void> {
  const payload = JSON.stringify(data, null, 2);
  const previous = writeLocks.get(targetPath) ?? Promise.resolve();
  const next = previous
    .catch(() => {
      // Preserve the queue even if a previous write failed.
    })
    .then(() => writeSnapshotFile(targetPath, payload, mode));

  writeLocks.set(targetPath, next);

  try {
    await next;
  } finally {
    if (writeLocks.get(targetPath) === next) {
      writeLocks.delete(targetPath);
    }
  }
}

export function clearSnapshotWriteLocksForTests(): void {
  writeLocks.clear();
}
