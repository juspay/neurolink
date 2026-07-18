import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

/** Open a restrictive worker log without making proxy startup depend on it. */
export function openProxyWorkerLog(
  filename: string,
  logDir: string = join(homedir(), ".neurolink", "logs"),
): { stdio: number | "ignore"; close: () => void; error?: string } {
  let fd: number | undefined;
  try {
    if (basename(filename) !== filename) {
      throw new Error("worker log filename must not contain a path");
    }
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true, mode: 0o700 });
    } else if (!statSync(logDir).isDirectory()) {
      throw new Error("worker log path exists but is not a directory");
    }
    chmodSync(logDir, 0o700);
    const path = join(logDir, filename);
    fd = openSync(path, "a", 0o600);
    chmodSync(path, 0o600);
    return {
      stdio: fd,
      close: () => closeSync(fd as number),
    };
  } catch (error) {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        // The log is optional and startup must remain fail-open.
      }
    }
    return {
      stdio: "ignore",
      close: () => undefined,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
