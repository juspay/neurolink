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

/**
 * The state files, named once.
 *
 * Each name used to appear three times — dev branch, home branch, and the
 * resolver's fallback — which is three places to keep in step and two chances
 * to write a dev proxy's state into the global directory.
 */
const FILE_NAMES = {
  quota: "account-quotas.json",
  cooldown: "account-cooldowns.json",
  stats: "proxy-usage-stats.json",
  grants: "proxy-grants.json",
  ledger: "proxy-share-ledger.json",
  peers: "proxy-peers.json",
  residentGrants: "proxy-resident-grants.json",
  shareAudit: "proxy-share-audit.json",
  provisioning: "proxy-share-provisioning.json",
  receipts: "proxy-share-receipts.json",
  notes: "proxy-share-notes.json",
} as const;

export function resolveProxyPaths(dev: boolean): ProxyPaths {
  const base = dev
    ? join(process.cwd(), ".neurolink-dev")
    : join(homedir(), ".neurolink");
  return {
    stateDir: base,
    logsDir: join(base, "logs"),
    quotaFile: join(base, FILE_NAMES.quota),
    cooldownFile: join(base, FILE_NAMES.cooldown),
    statsFile: join(base, FILE_NAMES.stats),
    grantsFile: join(base, FILE_NAMES.grants),
    ledgerFile: join(base, FILE_NAMES.ledger),
    peersFile: join(base, FILE_NAMES.peers),
    isDev: dev,
  };
}

export function resolveProxyUsageStatsPath(paths: ProxyPaths): string {
  return paths.statsFile ?? join(paths.stateDir, FILE_NAMES.stats);
}

export function resolveProxyGrantsPath(paths: ProxyPaths): string {
  return paths.grantsFile ?? join(paths.stateDir, FILE_NAMES.grants);
}

export function resolveProxyLedgerPath(paths: ProxyPaths): string {
  return paths.ledgerFile ?? join(paths.stateDir, FILE_NAMES.ledger);
}

export function resolveProxyPeersPath(paths: ProxyPaths): string {
  return paths.peersFile ?? join(paths.stateDir, FILE_NAMES.peers);
}

export function resolveProxyResidentGrantsPath(paths: ProxyPaths): string {
  return join(paths.stateDir, FILE_NAMES.residentGrants);
}

export function resolveProxyShareAuditPath(paths: ProxyPaths): string {
  return join(paths.stateDir, FILE_NAMES.shareAudit);
}

export function resolveProxyProvisioningPath(paths: ProxyPaths): string {
  return join(paths.stateDir, FILE_NAMES.provisioning);
}

export function resolveProxyReceiptsPath(paths: ProxyPaths): string {
  return join(paths.stateDir, FILE_NAMES.receipts);
}

export function resolveProxyNotesPath(paths: ProxyPaths): string {
  return join(paths.stateDir, FILE_NAMES.notes);
}
