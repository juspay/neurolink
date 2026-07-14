/**
 * Proxy file path resolver.
 *
 * In normal mode, all paths resolve under ~/.neurolink/.
 * In dev mode (--dev), writable paths resolve under <cwd>/.neurolink-dev/
 * so a local dev proxy never touches the global proxy's state.
 *
 * Read-only paths (like .env) always point to the global location
 * since credentials must be shared.
 *
 * NOTE: Claude Code header snapshots (~/.neurolink/header-snapshots/) are
 * not redirected in dev mode. They are only written when a real Claude Code
 * client connects, which typically does not happen during dev testing.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import type { ProxyPaths } from "../types/index.js";

export function resolveProxyPaths(dev: boolean): ProxyPaths {
  if (dev) {
    const base = join(process.cwd(), ".neurolink-dev");
    return {
      stateDir: base,
      logsDir: join(base, "logs"),
      quotaFile: join(base, "account-quotas.json"),
      cooldownFile: join(base, "account-cooldowns.json"),
      isDev: true,
    };
  }
  const base = join(homedir(), ".neurolink");
  return {
    stateDir: base,
    logsDir: join(base, "logs"),
    quotaFile: join(base, "account-quotas.json"),
    cooldownFile: join(base, "account-cooldowns.json"),
    isDev: false,
  };
}
