/**
 * Trust for a project's `.mcp-config.json`.
 *
 * A directory is not a trust boundary. Every tool-enabled `generate()` and
 * `stream()` used to load `<cwd>/.mcp-config.json` and start what it named,
 * so cloning a repository and running anything built on this SDK inside it
 * ran that repository's commands with the user's credentials. This module
 * is the one place that decides whether a project config may be loaded:
 *
 * - **SDK**: never implicitly. `new NeuroLink({ mcp: { configPath } })` names
 *   a file; `mcp: { trustProjectConfig: true }` opts into the working
 *   directory. `ProviderRegistry.setOptions({ enableManualMCP: true })` is the
 *   legacy opt-in and is honoured for the first time.
 * - **CLI**: the entry point hashes the file, compares it with the accepted
 *   hashes in `~/.neurolink/trusted-mcp-configs.json`, and registers a hook
 *   here. The hook runs only when a `NeuroLink` instance is about to load
 *   the file, so `neurolink --version` in a hostile directory costs nothing
 *   and `neurolink generate` there is refused.
 */

import { createHash, randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";
import type {
  ProjectMcpConfigPathResolution,
  ProjectMcpConfigServerSummary,
  ProjectMcpConfigSummary,
  ProjectMcpConfigTrustHook,
  ProjectMcpConfigTrustStatus,
  ProjectMcpConfigTrustStore,
} from "../types/index.js";
import { isNonNullObject } from "../utils/typeUtils.js";

export const PROJECT_MCP_CONFIG_FILENAME = ".mcp-config.json";
export const TRUSTED_MCP_CONFIGS_FILENAME = "trusted-mcp-configs.json";
/** `1` trusts the working directory's config for this run; `0` ignores it. */
export const TRUST_MCP_CONFIG_ENV = "NEUROLINK_TRUST_MCP_CONFIG";
/** CLI flag with the same meaning as `NEUROLINK_TRUST_MCP_CONFIG=1`. */
export const TRUST_MCP_CONFIG_FLAG = "--trust-mcp-config";

const MAX_SUMMARY_ARGS_LENGTH = 160;

export function getTrustedMcpConfigStorePath(): string {
  return path.join(homedir(), ".neurolink", TRUSTED_MCP_CONFIGS_FILENAME);
}

export function hashProjectMcpConfig(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

function emptyStore(): ProjectMcpConfigTrustStore {
  return { version: 1, entries: {} };
}

function isTrustStore(value: unknown): value is ProjectMcpConfigTrustStore {
  if (!isNonNullObject(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || !isNonNullObject(record.entries)) {
    return false;
  }
  return Object.values(record.entries as Record<string, unknown>).every(
    (entry) =>
      isNonNullObject(entry) &&
      typeof (entry as Record<string, unknown>).sha256 === "string" &&
      typeof (entry as Record<string, unknown>).trustedAt === "string",
  );
}

/**
 * Read the store. A missing, unreadable or malformed file reads as empty:
 * the only consequence is that every config has to be accepted again, which
 * is the safe direction.
 */
export function readProjectMcpConfigTrustStore(
  storePath: string = getTrustedMcpConfigStorePath(),
): ProjectMcpConfigTrustStore {
  try {
    const parsed: unknown = JSON.parse(readFileSync(storePath, "utf8"));
    return isTrustStore(parsed) ? parsed : emptyStore();
  } catch {
    return emptyStore();
  }
}

export function getProjectMcpConfigTrustStatus(
  configPath: string,
  sha256: string,
  storePath: string = getTrustedMcpConfigStorePath(),
): ProjectMcpConfigTrustStatus {
  const entry =
    readProjectMcpConfigTrustStore(storePath).entries[path.resolve(configPath)];
  if (!entry) {
    return "untrusted";
  }
  return entry.sha256 === sha256 ? "trusted" : "changed";
}

/**
 * Record an acceptance. The store directory is created `0700`, the file is
 * written `0600` through a uniquely named temporary file opened with `wx`
 * and renamed into place, so a concurrent writer or a pre-planted symlink
 * cannot redirect the write or leave a torn file.
 */
export function recordTrustedProjectMcpConfig(
  configPath: string,
  sha256: string,
  storePath: string = getTrustedMcpConfigStorePath(),
): void {
  const store = readProjectMcpConfigTrustStore(storePath);
  store.entries[path.resolve(configPath)] = {
    sha256,
    trustedAt: new Date().toISOString(),
  };
  const dir = path.dirname(storePath);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const tmp = `${storePath}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(store, null, 2) + "\n", {
      mode: 0o600,
      flag: "wx",
    });
    renameSync(tmp, storePath);
    chmodSync(storePath, 0o600);
  } catch (error) {
    rmSync(tmp, { force: true });
    throw error;
  }
}

function summarizeServer(
  id: string,
  value: unknown,
): ProjectMcpConfigServerSummary {
  if (!isNonNullObject(value)) {
    return { id, transport: "invalid" };
  }
  const record = value as Record<string, unknown>;
  const transport =
    typeof record.transport === "string"
      ? record.transport
      : typeof record.url === "string"
        ? "http"
        : "stdio";
  const summary: ProjectMcpConfigServerSummary = { id, transport };
  if (typeof record.command === "string") {
    summary.command = record.command;
  }
  if (Array.isArray(record.args)) {
    summary.args = record.args.map((arg) => String(arg));
  }
  if (typeof record.url === "string") {
    summary.url = record.url;
  }
  if (isNonNullObject(record.env)) {
    summary.envKeys = Object.keys(record.env as Record<string, unknown>);
  }
  return summary;
}

/**
 * Read and describe a project config without evaluating any of it. Values
 * under `env` and `headers` are never included — a summary is printed to a
 * terminal and must not echo a secret the file happens to inline.
 */
export function summarizeProjectMcpConfig(
  configPath: string,
): ProjectMcpConfigSummary {
  const absolute = path.resolve(configPath);
  const bytes = readFileSync(absolute);
  const summary: ProjectMcpConfigSummary = {
    path: absolute,
    sha256: hashProjectMcpConfig(bytes),
    servers: [],
  };
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    summary.parseError = `not valid JSON (${error instanceof Error ? error.message : String(error)})`;
    return summary;
  }
  if (
    !isNonNullObject(parsed) ||
    !isNonNullObject((parsed as Record<string, unknown>).mcpServers)
  ) {
    summary.parseError = 'no "mcpServers" object';
    return summary;
  }
  const servers = (parsed as Record<string, unknown>).mcpServers as Record<
    string,
    unknown
  >;
  for (const [id, value] of Object.entries(servers)) {
    summary.servers.push(summarizeServer(id, value));
  }
  return summary;
}

/** Render a summary as the lines the CLI prints before asking for trust. */
export function formatProjectMcpConfigSummary(
  summary: ProjectMcpConfigSummary,
): string[] {
  const lines = [`${summary.path}  (sha256 ${summary.sha256.slice(0, 16)}…)`];
  if (summary.parseError) {
    lines.push(`  ${summary.parseError}`);
    return lines;
  }
  if (summary.servers.length === 0) {
    lines.push("  declares no servers");
    return lines;
  }
  lines.push(`  declares ${summary.servers.length} server(s):`);
  for (const server of summary.servers) {
    let what: string;
    if (server.command !== undefined) {
      const argv = [server.command, ...(server.args ?? [])].join(" ");
      what =
        argv.length > MAX_SUMMARY_ARGS_LENGTH
          ? `${argv.slice(0, MAX_SUMMARY_ARGS_LENGTH)}…`
          : argv;
    } else if (server.url !== undefined) {
      what = server.url;
    } else {
      what = "(neither command nor url)";
    }
    const env =
      server.envKeys && server.envKeys.length > 0
        ? `  env: ${server.envKeys.join(", ")}`
        : "";
    lines.push(`  - ${server.id}  [${server.transport}]  ${what}${env}`);
  }
  return lines;
}

let trustHook: ProjectMcpConfigTrustHook | null = null;

/**
 * Register (or clear, with `null`) the process-wide hook the CLI uses to hand
 * its trust decision to every `NeuroLink` instance built afterwards. SDK
 * hosts do not need this: they pass `mcp.configPath` or
 * `mcp.trustProjectConfig` to the constructor instead.
 */
export function setProjectMcpConfigTrustHook(
  hook: ProjectMcpConfigTrustHook | null,
): void {
  trustHook = hook;
}

export function getProjectMcpConfigTrustHook(): ProjectMcpConfigTrustHook | null {
  return trustHook;
}

/**
 * Decide which project config, if any, a `NeuroLink` instance loads.
 *
 * Precedence: an explicit `configPath`; `trustProjectConfig` for
 * `<cwd>/.mcp-config.json`; the CLI's registered hook; the legacy
 * `enableManualMCP` registry option. With none of them the answer is `null`
 * and nothing is read from the working directory — the SDK default.
 */
export async function resolveProjectMcpConfigPath(options: {
  cwd?: string;
  configPath?: string;
  trustProjectConfig?: boolean;
  enableManualMCP?: boolean;
}): Promise<ProjectMcpConfigPathResolution | null> {
  const cwd = options.cwd ?? process.cwd();
  if (options.configPath !== undefined && options.configPath.length > 0) {
    return {
      path: path.resolve(cwd, options.configPath),
      source: "configPath",
    };
  }
  const candidate = path.join(cwd, PROJECT_MCP_CONFIG_FILENAME);
  if (options.trustProjectConfig === true) {
    return { path: candidate, source: "trustProjectConfig" };
  }
  if (trustHook) {
    if (!existsSync(candidate)) {
      return null;
    }
    const accepted = await trustHook(candidate);
    return accepted ? { path: accepted, source: "cliTrust" } : null;
  }
  if (options.enableManualMCP === true) {
    return { path: candidate, source: "enableManualMCP" };
  }
  return null;
}
