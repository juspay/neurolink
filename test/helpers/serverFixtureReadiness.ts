import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { Server } from "node:net";
import { join } from "node:path";

type JournalRow = {
  kind?: string;
  pid?: number;
  port?: number;
  nonce?: string;
  serverId?: string;
};

export type ListenerBoundary = {
  guardJournalPath?: string;
  guardJournalStart: number;
};

export type ServeReadiness = ListenerBoundary & {
  journalPath: string;
  nonce: string;
};

function journalRows(file: string | undefined): JournalRow[] {
  if (!file || !existsSync(file)) {
    return [];
  }
  const rows: JournalRow[] = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line) {
      continue;
    }
    try {
      const row: unknown = JSON.parse(line);
      if (typeof row === "object" && row !== null) {
        rows.push(row as JournalRow);
      }
    } catch {
      // A still-being-appended line cannot establish readiness.
    }
  }
  return rows;
}

/** Snapshot a read-only journal boundary before the actual server starts. */
export function listenerBoundary(): ListenerBoundary {
  const guardJournalPath = process.env.RECOVERY_PROOF_NETWORK_LOG;
  return {
    guardJournalPath,
    guardJournalStart: journalRows(guardJournalPath).length,
  };
}

function hasActualGuardListener(
  boundary: ListenerBoundary,
  pid: number,
  port: number,
): boolean {
  if (!boundary.guardJournalPath) {
    return true;
  }
  return journalRows(boundary.guardJournalPath)
    .slice(boundary.guardJournalStart)
    .some(
      (row) =>
        row.kind === "owned-listener" && row.pid === pid && row.port === port,
    );
}

/** Await the SDK's actual Node listener and return its OS-selected TCP port. */
export async function nativeListenerPort(
  adapter: { getNativeServer(): unknown },
  boundary: ListenerBoundary,
  timeoutMs: number,
): Promise<number> {
  const server = adapter.getNativeServer();
  if (!(server instanceof Server)) {
    throw new Error("SDK fixture did not expose its actual native Node server");
  }
  const readyWithOwnership = () => {
    const address = server.address();
    return Boolean(
      server.listening &&
      address &&
      typeof address !== "string" &&
      Number.isInteger(address.port) &&
      address.port > 0 &&
      hasActualGuardListener(boundary, process.pid, address.port),
    );
  };
  // A socket may already be bound while its asynchronous listening event is
  // still queued. Under the guard, the event's fresh ownership row is required.
  if (!readyWithOwnership()) {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        server.off("listening", ready);
        server.off("error", failed);
        server.off("close", closed);
      };
      const ready = () => {
        cleanup();
        resolve();
      };
      const failed = (error: Error) => {
        cleanup();
        reject(error);
      };
      const closed = () =>
        failed(new Error("SDK fixture closed before readiness"));
      const timer = setTimeout(
        () => failed(new Error("SDK fixture listener readiness timed out")),
        timeoutMs,
      );
      server.once("listening", ready);
      server.once("error", failed);
      server.once("close", closed);
      if (readyWithOwnership()) {
        ready();
      }
    });
  }
  const address = server.address();
  if (
    !server.listening ||
    !address ||
    typeof address === "string" ||
    !Number.isInteger(address.port) ||
    address.port <= 0 ||
    address.address !== "127.0.0.1"
  ) {
    throw new Error(
      "SDK fixture must have an actual ready loopback TCP listener",
    );
  }
  if (!hasActualGuardListener(boundary, process.pid, address.port)) {
    throw new Error("SDK fixture listener ownership has not been journaled");
  }
  return address.port;
}

/** Unique record-only child readiness channel; never grants network permission. */
export function serveReadiness(directory: string): ServeReadiness {
  const nonce = randomUUID();
  return {
    ...listenerBoundary(),
    journalPath: join(directory, `server-listener-${nonce}.jsonl`),
    nonce,
  };
}

/** Both actual child readiness and any active guard must agree before dialing. */
export function childListenerReady(
  readiness: ServeReadiness,
  pid: number | undefined,
  port: number,
): boolean {
  if (!pid || !Number.isInteger(port) || port <= 0) {
    return false;
  }
  const rows = journalRows(readiness.journalPath).filter(
    (row) =>
      row.pid === pid && row.nonce === readiness.nonce && row.port === port,
  );
  const last = rows.at(-1);
  return Boolean(
    last?.kind === "server-test-listening" &&
    typeof last.serverId === "string" &&
    hasActualGuardListener(readiness, pid, port),
  );
}
