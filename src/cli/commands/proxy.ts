/**
 * Proxy CLI Commands for NeuroLink
 *
 * Implements commands for managing the Claude multi-account proxy:
 * - neurolink proxy start  — Start the proxy server
 * - neurolink proxy status — Show proxy status (accounts, sessions, routing)
 *
 * The proxy creates a NeuroLink instance and builds a Hono app that registers
 * Claude-compatible proxy routes. All requests flow through ctx.neurolink
 * (generate/stream), with an optional ModelRouter for model remapping.
 */

import type { CommandModule, Argv } from "yargs";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";
import chalk from "chalk";
import ora from "ora";
import type { Hono } from "hono";
import {
  buildProxyHealthResponse,
  createProxyReadinessState,
  markProxyDrainingForUpdate,
  markProxyReady,
  resumeProxyConnections,
  waitForProxyReadiness,
} from "../../lib/proxy/proxyHealth.js";
import { logger } from "../../lib/utils/logger.js";
import {
  redactUrlsInText,
  sanitizeForLog,
} from "../../lib/utils/logSanitize.js";
import { withTimeout } from "../../lib/utils/async/withTimeout.js";
import {
  formatUptime,
  isProcessRunning,
  StateFileManager,
} from "../utils/serverUtils.js";
import type {
  AccountAllowlist,
  FallbackInfo,
  LoadedProxyConfig,
  ModelRouterInterface,
  PersistedAccountCooldown,
  ProxyGuardArgs,
  ProxyNeurolinkRuntime,
  ProxySpinner,
  ProxyStartApp,
  ProxyStartArgs,
  ProxyStartStrategy,
  ProxyState,
  ProxySupervisorState,
  ProxyStatusArgs,
  ProxyStatusPrimaryAccount,
  ProxyTelemetryAction,
  ProxyTelemetryArgs,
  ProxyRuntimeActivity,
  ProxyRuntimeConfigSnapshot,
  ProxyReadinessState,
  RuntimeRequestMetadata,
  StatusStats,
} from "../../lib/types/index.js";
import type { NeuroLink } from "../../lib/neurolink.js";
import { configureProxyKeepAliveDispatcher } from "../../lib/proxy/proxyDispatcher.js";
import { ProxyRuntimeConfigStore } from "../../lib/proxy/runtimeConfig.js";
import {
  anthropicAccountKeysEqual,
  createAccountAllowlist,
  ENV_ANTHROPIC_ACCOUNT_KEY,
  isAccountAllowed,
  LEGACY_ANTHROPIC_ACCOUNT_KEY,
  normalizeAnthropicAccountKey,
  shouldLoadFallbackCredential,
} from "../../lib/proxy/accountSelection.js";
import {
  beginProxyRequest,
  getProxyActivitySnapshot,
  trackProxyResponse,
} from "../../lib/proxy/proxyActivity.js";
import {
  flushProxyLifecycleEvents,
  getProxyLifecycleLoggerSnapshot,
  hashProxyLifecycleSessionId,
  logProxyLifecycleEvent,
} from "../../lib/proxy/proxyLifecycle.js";
import {
  describeInstallFailure,
  getGlobalInstallArgs,
  isTransientInstallFailure,
  resolveGlobalInstaller,
  validateInstalledVersion,
} from "../../lib/proxy/globalInstaller.js";
import { startUpdaterWorkerSupervisor } from "../../lib/proxy/updaterSupervisor.js";
import { openProxyWorkerLog } from "../../lib/proxy/workerLog.js";
import { startRollingProxyServer } from "../../lib/proxy/rollingProxyServer.js";
import { spawnProxySocketWorker } from "../../lib/proxy/rollingWorkerProcess.js";
import {
  PROXY_ROLLING_SUPERVISOR_ENV,
  PROXY_SOCKET_WORKER_ENV,
} from "../../lib/proxy/rollingWorkerProtocol.js";
import { attachSocketWorkerProcess } from "../../lib/proxy/socketWorkerRuntime.js";
import { waitForProxyUpdateWindow } from "../../lib/proxy/updateCoordinator.js";
import {
  abandonPendingUpdate,
  clearUpdateDeferral,
  isVersionSuppressed,
  loadUpdateState,
  recordCheck,
  recordSuccessfulUpdate,
  recordUpdateDeferred,
  recordUpdateFailure,
  recordUpdateInstalled,
  suppressVersion,
} from "../../lib/proxy/updateState.js";
import {
  loadProxyEnvFile,
  resolveProxyEnvFile,
} from "../../lib/proxy/proxyEnv.js";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import packageJson from "../../../package.json" with { type: "json" };

const _require = createRequire(import.meta.url);
const PROXY_VERSION = packageJson.version;
const PROXY_INTERNAL_ACCOUNT_LABEL = "proxy/internal";

const PROXY_TELEMETRY_SCRIPT_PATH = fileURLToPath(
  new URL(
    "../../../scripts/observability/manage-local-openobserve.sh",
    import.meta.url,
  ),
);
const PROXY_LIFECYCLE_SHUTDOWN_TIMEOUT_MS = 5_000;
const LEGACY_STATUS_ACCOUNT_CACHE_TTL_MS = 5_000;
const PROXY_STATUS_TOKEN_READ_TIMEOUT_MS = 2_000;
const PROXY_STATUS_RECONCILE_TIMEOUT_MS = 750;
const PROXY_STATUS_ACCOUNT_INVENTORY_TIMEOUT_MS = 750;
let legacyStatusAccountCache:
  | { credentialsPath: string; expiresAt: number; label: string | null }
  | undefined;
// Allowed drift between a pid's OS-reported start time and the persisted
// ProxySupervisorState.startTime before processLooksLikeProxySupervisor
// treats it as a confident mismatch (recycled pid). Generous on purpose:
// `supervisorStartedAt` is captured inside runLaunchdProxySupervisor, which
// runs after Node has already booted and done setup, so it always lags the
// OS-level fork/exec by a little — a tight tolerance would produce false
// mismatches on a slow/cold-started machine.
const PROXY_SUPERVISOR_START_TIME_TOLERANCE_MS = 10_000;
const PROXY_UPDATE_CONTROL_TOKEN =
  process.env.NEUROLINK_PROXY_UPDATE_CONTROL_TOKEN?.trim() ||
  crypto.randomUUID();

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

let proxyStateManager = new StateFileManager<ProxyState>("proxy-state.json");
let proxySupervisorStateManager = new StateFileManager<ProxySupervisorState>(
  "proxy-supervisor-state.json",
);

/**
 * Reinitialise the state manager with a custom base directory.
 * Called when --dev redirects writable paths to .neurolink-dev/.
 */
function setProxyStateDir(baseDir: string): void {
  proxyStateManager = new StateFileManager<ProxyState>(
    "proxy-state.json",
    baseDir,
  );
  proxySupervisorStateManager = new StateFileManager<ProxySupervisorState>(
    "proxy-supervisor-state.json",
    baseDir,
  );
}

function saveProxyState(state: ProxyState): void {
  proxyStateManager.save(state);
}

function loadProxyState(): ProxyState | null {
  return proxyStateManager.load();
}

function clearProxyState(): void {
  proxyStateManager.clear();
}

function saveProxySupervisorState(state: ProxySupervisorState): void {
  proxySupervisorStateManager.save(state);
}

/**
 * Drop a supervisor `version` that is not a string.
 *
 * `StateFileManager.load()` is a bare `JSON.parse(content) as T` — it validates
 * nothing. A state file written by a different build, or half-written during a
 * crash, can carry any JSON type here, and every status renderer interpolates
 * the field straight into `v${...}`. Coercing at the single load boundary keeps
 * a non-string from reaching the output as "v[object Object]".
 */
export function normalizeSupervisorState(
  state: ProxySupervisorState | null,
): ProxySupervisorState | null {
  if (!state) {
    return null;
  }
  return typeof state.version === "string" || state.version === undefined
    ? state
    : { ...state, version: undefined };
}

/**
 * Whether a rolling handoff can actually occur.
 *
 * A live supervisor PID alone is not enough: a supervisor from a build
 * predating rolling state leaves `rolling` absent, and calling that a handoff
 * makes both `/status` clients and the CLI wait for an activation that will
 * never come. Gate on the capability, not on the process.
 */
export function isRollingHandoffCapable(
  state: ProxySupervisorState | null,
  isRunning: (pid: number) => boolean = isProcessRunning,
): boolean {
  if (!state) {
    return false;
  }
  // Structural, not just non-null: the same unvalidated `as T` load that lets
  // `version` be an object lets `rolling` be a string.
  const hasRollingState =
    typeof state.rolling === "object" && state.rolling !== null;
  return isRunning(state.pid) && hasRollingState;
}

function loadProxySupervisorState(): ProxySupervisorState | null {
  return normalizeSupervisorState(proxySupervisorStateManager.load());
}

function clearProxySupervisorState(): void {
  proxySupervisorStateManager.clear();
}

const CLAUDE_SETTINGS_PATH = join(homedir(), ".claude", "settings.json");

const PLIST_LABEL = "com.neurolink.proxy";
const PLIST_DIR = join(homedir(), "Library", "LaunchAgents");
const PLIST_PATH = join(PLIST_DIR, `${PLIST_LABEL}.plist`);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getProcessStatus(pid: number): "running" | "not_running" | "unknown" {
  try {
    process.kill(pid, 0);
    return "running";
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ESRCH") {
      return "not_running";
    }
    if (code === "EPERM") {
      return "unknown";
    }
    return "not_running";
  }
}

/**
 * Read a single `ps -o <field>=` field for `pid`, off the event loop (async
 * `execFile`, not `execFileSync`) and bounded by a short timeout, so a
 * hung/zombie `ps` invocation can never block the event loop or hang the
 * (often uninstall-path) async caller. Shared by {@link getProcessStartTime}
 * and {@link processLooksLikeProxySupervisor}, which both read a single
 * `ps -o <field>=` column for the same pid.
 *
 * Returns null — never throws — on any error, timeout, or empty output, so
 * callers uniformly treat "couldn't read" as "can't confirm either way"
 * rather than distinguishing the failure mode.
 */
async function readPsField(pid: number, field: string): Promise<string | null> {
  try {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    const { stdout } = await withTimeout(
      execFileAsync("ps", ["-p", String(pid), "-o", `${field}=`], {
        encoding: "utf-8" as const,
      }),
      2000,
      `ps -o ${field}= timed out for pid ${pid}`,
    );
    const trimmed = stdout.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

/**
 * Best-effort, macOS-only (uninstall is macOS-only) read of `pid`'s
 * OS-reported start time via `ps -o lstart=`, which prints a fixed-width
 * `Www Mmm dd hh:mm:ss yyyy` timestamp — the same shape `Date`'s parser
 * already understands (it's the format `Date#toString()` itself produces
 * modulo the trailing timezone). Returns null (never throws) when `ps`
 * fails or its output doesn't parse, so callers can tell "confirmed
 * mismatch" apart from "couldn't confirm either way".
 */
async function getProcessStartTime(pid: number): Promise<Date | null> {
  const out = await readPsField(pid, "lstart");
  if (!out) {
    return null;
  }
  // `ps -o lstart=` prints the OS start time in the machine's LOCAL timezone
  // with no offset, e.g. "Sun Jul 19 20:12:41 2026". Parse the components and
  // build the Date via the local-time constructor rather than relying on the
  // engine's implementation-defined parsing of non-ISO date strings. The
  // result is the same absolute instant the supervisor persisted as an
  // ISO-UTC string, so the drift comparison against it is timezone-safe.
  const m = out.match(
    /^\w{3}\s+(\w{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+(\d{4})$/,
  );
  if (!m) {
    return null;
  }
  const monthIndex = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ].indexOf(m[1]);
  if (monthIndex < 0) {
    return null;
  }
  const parsed = new Date(
    Number(m[6]),
    monthIndex,
    Number(m[2]),
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Best-effort check that a pid actually belongs to a neurolink proxy process,
 * so a stale/recycled supervisor pid is never mistaken for a live supervisor
 * and signalled. Returns false when the process cannot be confirmed as ours.
 *
 * @param expectedStartTimeIso - The `ProxySupervisorState.startTime` (ISO
 *   string) recorded when the supervisor we expect at `pid` was launched.
 *   When provided, this is cross-checked against `pid`'s actual OS-reported
 *   start time (see {@link getProcessStartTime}) — the args match alone
 *   (the `neurolink proxy start` command is present) is not airtight, since an
 *   unrelated process (e.g. a shell running this very test suite, or a
 *   coincidentally-named script) could match it too. A pid recycled by such
 *   a process would have a start time far from the recorded supervisor
 *   startTime, which this catches.
 *
 *   Deliberately fail-open on anything unparseable: `ps -o lstart=` output
 *   parsing is inherently a little fragile (locale/format quirks), and the
 *   cost of a false "can't confirm" is silently regressing to pre-hardening
 *   behavior, while the cost of a false "confirmed mismatch" is leaving a
 *   real supervisor running and orphaning its socket during uninstall — the
 *   former is the safer failure mode. So this only ever returns false for
 *   the startTime check when BOTH timestamps parsed successfully AND their
 *   drift exceeds the tolerance; any parse failure is treated as "can't
 *   confirm a mismatch" and falls through to the args-only result.
 */
export async function processLooksLikeProxySupervisor(
  pid: number,
  expectedStartTimeIso?: string,
): Promise<boolean> {
  const args = await readPsField(pid, "args");
  if (args === null) {
    // `ps` unavailable, timed out, or the pid vanished — do not signal an
    // unverified pid.
    return false;
  }
  // `/neurolink/i` alone is too broad: any process whose args merely
  // *mention* "neurolink" (e.g. a shell running in a directory named
  // "neurolink", an editor with a neurolink file open) would match, and a
  // stale/recycled pid running such a process could then be SIGTERM'd/
  // SIGKILL'd by `ensureSupervisorStoppedBeforeClear` during uninstall.
  // Require the actual proxy-supervisor invocation. Commands such as
  // `neurolink proxy status` must never be mistaken for the listener owner.
  if (!/\bneurolink(?:-proxy)?\b.*\bproxy\s+start\b/i.test(args)) {
    return false;
  }
  if (!expectedStartTimeIso) {
    return true;
  }
  const expected = new Date(expectedStartTimeIso);
  if (Number.isNaN(expected.getTime())) {
    return true; // recorded startTime itself is unparseable — can't confirm a mismatch
  }
  const actual = await getProcessStartTime(pid);
  if (!actual) {
    return true; // ps -o lstart= unavailable/unparseable — can't confirm a mismatch
  }
  const driftMs = Math.abs(actual.getTime() - expected.getTime());
  return driftMs <= PROXY_SUPERVISOR_START_TIME_TOLERANCE_MS;
}

/**
 * Ensure any supervisor recorded in state is actually stopped before its state
 * record is cleared. A running supervisor still owns the listening socket;
 * deleting its record would orphan it with no way to find it again. Returns
 * false when a running supervisor could not be stopped, so callers can abort
 * the uninstall instead of silently discarding the record.
 */
async function ensureSupervisorStoppedBeforeClear(): Promise<boolean> {
  const supervisorState = loadProxySupervisorState();
  const pid = supervisorState?.pid;
  if (!pid || getProcessStatus(pid) === "not_running") {
    return true;
  }
  // Guard against a stale/recycled pid: only signal a process that still looks
  // like a neurolink proxy supervisor, so uninstall never terminates an
  // unrelated, same-user process that inherited the recorded pid. Also cross-
  // checks the pid's actual OS start time against the recorded
  // supervisorState.startTime (see processLooksLikeProxySupervisor).
  if (
    !(await processLooksLikeProxySupervisor(pid, supervisorState?.startTime))
  ) {
    return true;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") {
      return true;
    }
    return false;
  }
  for (let attempt = 0; attempt < 25; attempt += 1) {
    if (getProcessStatus(pid) === "not_running") {
      return true;
    }
    await sleep(200);
  }
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    /* already gone or not permitted */
  }
  await sleep(200);
  return getProcessStatus(pid) === "not_running";
}

/** Resolve the primary-account info shown in /status. Reads the operator's
 *  configured email from proxy config and cross-checks it against the token
 *  store; falls back to the first enabled anthropic account when not set or
 *  when the configured account isn't currently usable. */
async function resolveStatusPrimaryAccount(
  proxyConfig: LoadedProxyConfig | null,
): Promise<ProxyStatusPrimaryAccount> {
  const configured = proxyConfig?.routing?.primaryAccount?.trim() || null;
  const accountAllowlist = createAccountAllowlist(
    proxyConfig?.routing?.accountAllowlist,
  );
  let enabledAnthropicKeys: string[] = [];
  try {
    const { tokenStore } = await import("../../lib/auth/tokenStore.js");
    const all = await tokenStore.listByPrefix("anthropic:");
    const filtered: string[] = [];
    for (const key of all) {
      const disabled = await tokenStore.isDisabled(key);
      if (!disabled && isAccountAllowed(key, accountAllowlist)) {
        filtered.push(key);
      }
    }
    enabledAnthropicKeys = filtered;
  } catch (err) {
    logger.debug(
      `[proxy] /status: failed to enumerate anthropic accounts: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  if (configured) {
    const configuredKey = normalizeAnthropicAccountKey(configured);
    const matchedKey = enabledAnthropicKeys.find((key) =>
      anthropicAccountKeysEqual(key, configuredKey),
    );
    if (matchedKey) {
      return {
        configured,
        key: matchedKey,
        label: configured,
        source: "configured",
      };
    }
  }

  const fallbackKey = enabledAnthropicKeys[0] ?? null;
  const fallbackLabel = fallbackKey
    ? (fallbackKey.split(":")[1] ?? null)
    : null;
  return {
    configured,
    key: fallbackKey,
    label: fallbackLabel,
    source: "fallback",
  };
}

async function resolveLegacyStatusAccountLabel(
  storedAnthropicAccountCount: number,
): Promise<string | null> {
  if (storedAnthropicAccountCount !== 0) {
    return null;
  }
  const credentialsPath = join(
    homedir(),
    ".neurolink",
    "anthropic-credentials.json",
  );
  const now = Date.now();
  if (
    legacyStatusAccountCache?.credentialsPath === credentialsPath &&
    legacyStatusAccountCache.expiresAt > now
  ) {
    return legacyStatusAccountCache.label;
  }
  let label: string | null = null;
  try {
    const { readFile } = await import("node:fs/promises");
    const parsed = JSON.parse(await readFile(credentialsPath, "utf8")) as {
      email?: string;
      oauth?: { accessToken?: string };
    };
    if (parsed.oauth?.accessToken) {
      label = parsed.email?.trim() || "legacy-default";
    }
  } catch {
    label = null;
  }
  legacyStatusAccountCache = {
    credentialsPath,
    expiresAt: now + LEGACY_STATUS_ACCOUNT_CACHE_TTL_MS,
    label,
  };
  return label;
}

function deriveAccountAllowance(
  accountKey: string,
  now: number,
  allowlist: AccountAllowlist | undefined,
  expirations: ReadonlyMap<string, number>,
  cooldowns: Readonly<Record<string, PersistedAccountCooldown>>,
): { allowed: boolean; expired: boolean; cooling: boolean } {
  const allowed = isAccountAllowed(accountKey, allowlist);
  const expiresAt = expirations.get(accountKey);
  return {
    allowed,
    expired: expiresAt !== undefined && expiresAt <= now,
    cooling: (cooldowns[accountKey]?.coolingUntil ?? 0) > now,
  };
}

/**
 * Check if the launchd service is loaded and actively managing the proxy.
 * Returns true if launchctl reports the service as running.
 */
async function isLaunchdManaging(): Promise<boolean> {
  if (process.platform !== "darwin") {
    return false;
  }
  try {
    const { execFileSync } = await import("node:child_process");
    const uid = process.getuid?.() ?? 501;
    const output = execFileSync(
      "launchctl",
      ["print", `gui/${uid}/${PLIST_LABEL}`],
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    );
    return /state\s*=\s*running/.test(output);
  } catch {
    return false;
  }
}

function isLaunchdManagedProcess(): boolean {
  return process.platform === "darwin" && process.ppid === 1;
}

function isProxySocketWorkerProcess(): boolean {
  return process.env[PROXY_SOCKET_WORKER_ENV] === "1";
}

function getProxyWorkerGeneration(): number {
  const generation = Number(process.env.NEUROLINK_PROXY_WORKER_GENERATION);
  if (!Number.isSafeInteger(generation) || generation <= 0) {
    throw new Error("proxy socket worker generation is missing or invalid");
  }
  return generation;
}

function isProxyAutoUpdateEnabled(
  value = process.env.NEUROLINK_PROXY_AUTO_UPDATE,
): boolean {
  return !["0", "off", "false"].includes((value ?? "").trim().toLowerCase());
}

/** Keys we manage in Claude Code's settings.env */
const PROXY_MANAGED_KEYS = ["ANTHROPIC_BASE_URL", "ENABLE_TOOL_SEARCH"];

async function setClaudeProxySettings(baseUrl: string): Promise<void> {
  const fs = await import("fs");
  let settings: Record<string, unknown> = {};
  try {
    settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, "utf8"));
  } catch {
    // file missing/invalid — create fresh settings object
  }

  const env = (settings.env ?? {}) as Record<string, string>;

  // Preserve original values so clearClaudeProxySettings can restore them.
  // Only snapshot once — subsequent calls should not overwrite the snapshot.
  const originals = ((settings as Record<string, unknown>)
    .__proxy_original_env ?? {}) as Record<string, string | null>;
  for (const key of PROXY_MANAGED_KEYS) {
    if (!(key in originals)) {
      originals[key] = key in env ? env[key] : null;
    }
  }
  (settings as Record<string, unknown>).__proxy_original_env = originals;

  env.ANTHROPIC_BASE_URL = baseUrl;
  env.ENABLE_TOOL_SEARCH = "true";
  settings.env = env;

  fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

async function clearClaudeProxySettings(
  expectedBaseUrl?: string,
): Promise<boolean> {
  const fs = await import("fs");
  let settings: Record<string, unknown>;
  try {
    settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, "utf8"));
  } catch {
    return false;
  }

  const env = settings.env as Record<string, string> | undefined;
  if (!env) {
    return false;
  }

  if (
    expectedBaseUrl &&
    typeof env.ANTHROPIC_BASE_URL === "string" &&
    env.ANTHROPIC_BASE_URL !== expectedBaseUrl
  ) {
    // User switched to a different proxy URL; do not clobber.
    return false;
  }

  const hadBaseUrl = typeof env.ANTHROPIC_BASE_URL === "string";
  const hadToolSearch = env.ENABLE_TOOL_SEARCH === "true";

  // Restore original values if they were saved, otherwise delete the keys
  const originals = ((settings as Record<string, unknown>)
    .__proxy_original_env ?? {}) as Record<string, string | null>;
  for (const key of PROXY_MANAGED_KEYS) {
    const original = originals[key];
    if (original !== undefined && original !== null) {
      // Restore the value that existed before the proxy was started
      env[key] = original;
    } else {
      // Key did not exist before — remove it
      delete env[key];
    }
  }
  delete (settings as Record<string, unknown>).__proxy_original_env;

  if (Object.keys(env).length === 0) {
    delete settings.env;
  } else {
    settings.env = env;
  }

  fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2));
  return hadBaseUrl || hadToolSearch;
}

// =============================================================================
// OPENCODE AUTO-CONFIGURATION
// =============================================================================

function getOpenCodeConfigDir(): string {
  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "opencode");
  }
  // Linux/other: XDG_CONFIG_HOME or ~/.config
  return join(
    process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
    "opencode",
  );
}

const OPENCODE_CONFIG_PATH = join(getOpenCodeConfigDir(), "opencode.json");

/**
 * Key under which we persist the snapshot of the user's pre-existing
 * `provider.neurolink` config inside `opencode.json` itself. Persisting (rather
 * than relying on in-process state) means restoration still works even if the
 * proxy crashes or shutdown handlers run in a different process.
 *
 * Mirrors the Claude pattern (`__proxy_original_env` inside Claude's settings).
 */
const OPENCODE_ORIGINAL_KEY = "__proxy_original_neurolink";

async function setOpenCodeProxySettings(
  baseUrl: string,
  proxyKey?: string,
): Promise<void> {
  const fs = await import("fs");

  const configDir = getOpenCodeConfigDir();
  try {
    fs.accessSync(configDir);
  } catch {
    // OpenCode not installed — config directory does not exist, skip silently
    return;
  }

  let config: Record<string, unknown>;
  try {
    config = JSON.parse(fs.readFileSync(OPENCODE_CONFIG_PATH, "utf8"));
  } catch {
    // file missing/invalid — create fresh config object
    config = { provider: {} };
  }

  const provider = (config.provider ?? {}) as Record<string, unknown>;

  // Persist a snapshot of the user's pre-existing provider.neurolink — but
  // only the first time we touch the file. Subsequent set() calls must NOT
  // overwrite the snapshot (otherwise after the proxy writes its own block,
  // the next set() would store the proxy's block as the "original" and
  // permanently lose the user's real config on the next clear()).
  if (!(OPENCODE_ORIGINAL_KEY in config)) {
    (config as Record<string, unknown>)[OPENCODE_ORIGINAL_KEY] =
      "neurolink" in provider
        ? JSON.parse(JSON.stringify(provider.neurolink))
        : null;
  }

  provider.neurolink = {
    id: "neurolink",
    name: "NeuroLink Proxy",
    npm: "@ai-sdk/openai-compatible",
    env: [],
    models: {},
    options: {
      baseURL: baseUrl,
      apiKey: proxyKey || "neurolink-proxy",
    },
  };

  config.provider = provider;
  fs.writeFileSync(OPENCODE_CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function clearOpenCodeProxySettings(
  expectedBaseUrl?: string,
): Promise<boolean> {
  const fs = await import("fs");
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(fs.readFileSync(OPENCODE_CONFIG_PATH, "utf8"));
  } catch {
    return false;
  }

  const provider = config.provider as Record<string, unknown> | undefined;
  if (!provider || !("neurolink" in provider)) {
    return false;
  }

  // Check if our proxy URL matches before removing
  const existing = provider.neurolink as Record<string, unknown> | undefined;
  if (expectedBaseUrl && existing) {
    const options = existing.options as Record<string, unknown> | undefined;
    if (options && typeof options.baseURL === "string") {
      if (options.baseURL !== expectedBaseUrl) {
        // User configured a different URL; do not clobber
        return false;
      }
    }
  }

  const hadNeurolink = "neurolink" in provider;

  // Restore from the snapshot persisted at first set(), regardless of process
  // identity. Only delete provider.neurolink when the snapshot says the user
  // explicitly had no entry before — never on an "undefined" snapshot, since
  // that would mean the snapshot was lost and we cannot prove the entry is ours.
  if (OPENCODE_ORIGINAL_KEY in config) {
    const snapshot = (config as Record<string, unknown>)[OPENCODE_ORIGINAL_KEY];
    if (snapshot === null) {
      // User had no provider.neurolink before the proxy started — safe to remove.
      delete provider.neurolink;
    } else {
      provider.neurolink = snapshot;
    }
    delete (config as Record<string, unknown>)[OPENCODE_ORIGINAL_KEY];
  } else {
    // No snapshot present — refuse to delete to avoid destroying a config
    // the proxy may not own (e.g. a user wrote their own `neurolink` block
    // before the snapshot key was introduced, or this is being cleared from
    // a process that never ran set()).
    logger.debug(
      "[proxy] OpenCode clear: no original-provider snapshot found, leaving provider.neurolink intact",
    );
    return false;
  }

  config.provider = provider;
  fs.writeFileSync(OPENCODE_CONFIG_PATH, JSON.stringify(config, null, 2));
  return hadNeurolink;
}

async function isProxyHealthy(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<boolean> {
  try {
    const response = await fetch(`http://${host}:${port}/health`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function getProxyRuntimeActivity(
  host: string,
  port: number,
  timeoutMs: number = 3_000,
): Promise<ProxyRuntimeActivity | null> {
  try {
    const response = await fetch(`http://${host}:${port}/status`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as {
      activity?: Partial<ProxyRuntimeActivity>;
    };
    const activeRequests = Number(payload.activity?.activeRequests);
    if (!Number.isFinite(activeRequests) || activeRequests < 0) {
      return null;
    }
    return {
      activeRequests,
      lastActivityAt:
        typeof payload.activity?.lastActivityAt === "string"
          ? payload.activity.lastActivityAt
          : null,
    };
  } catch {
    return null;
  }
}

async function getRollingActivationFailure(
  host: string,
  port: number,
  expectedVersion: string,
): Promise<string | null> {
  try {
    const response = await fetch(`http://${host}:${port}/status`, {
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as {
      autoUpdate?: {
        rolling?: {
          lastFailure?: {
            version?: string;
            phase?: string;
            message?: string;
            workerPid?: number;
            workerExitCode?: number | null;
            workerExitSignal?: string | null;
            supervisorAction?: string;
          } | null;
        } | null;
      };
    };
    const failure = payload.autoUpdate?.rolling?.lastFailure;
    if (
      failure?.version !== expectedVersion ||
      typeof failure.phase !== "string" ||
      typeof failure.message !== "string"
    ) {
      return null;
    }
    const workerDetail = [
      typeof failure.workerPid === "number" ? `pid=${failure.workerPid}` : null,
      typeof failure.workerExitCode === "number" ||
      failure.workerExitCode === null
        ? `exitCode=${failure.workerExitCode ?? "none"}`
        : null,
      typeof failure.workerExitSignal === "string" ||
      failure.workerExitSignal === null
        ? `exitSignal=${failure.workerExitSignal ?? "none"}`
        : null,
      typeof failure.supervisorAction === "string"
        ? `supervisorAction=${failure.supervisorAction}`
        : null,
    ]
      .filter(Boolean)
      .join(" ");
    return `${failure.phase}: ${failure.message}${workerDetail ? ` (${workerDetail})` : ""}`;
  } catch {
    return null;
  }
}

/** Read the version the proxy currently reports healthy, or undefined. */
async function fetchProxyHealthVersion(
  host: string,
  port: number,
): Promise<string | undefined> {
  try {
    const response = await fetch(`http://${host}:${port}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      return undefined;
    }
    const data = (await response.json()) as { version?: string };
    return data.version;
  } catch {
    return undefined;
  }
}

/**
 * After a failed rolling update, re-point the live supervisor at the reinstalled
 * running version (mirroring the forward path: record the pending target, then
 * signal SIGUSR2) and wait until the supervisor actually serves that version
 * again. Returns false if it never reports the running version healthy in time.
 */
async function activateRollbackVersion(
  host: string,
  port: number,
  parentPid: number,
  runningVersion: string,
  timeoutMs: number,
): Promise<boolean> {
  recordUpdateInstalled(runningVersion);
  try {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        process.kill(parentPid, "SIGUSR2");
      } catch {
        // Supervisor may be mid-restart; its recovery loop also re-targets
        // runningVersion once no worker is active.
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if ((await fetchProxyHealthVersion(host, port)) === runningVersion) {
        return true;
      }
      if (getProcessStatus(parentPid) === "not_running") {
        return false;
      }
    }
    return false;
  } finally {
    abandonPendingUpdate(runningVersion);
  }
}

async function setProxyUpdateDrain(
  host: string,
  port: number,
  draining: boolean,
): Promise<boolean> {
  const confirmState = async (): Promise<boolean> => {
    try {
      const response = await fetch(`http://${host}:${port}/status`, {
        signal: AbortSignal.timeout(3_000),
      });
      if (!response.ok) {
        return false;
      }
      const payload = (await response.json()) as {
        health?: { drainingForUpdate?: boolean };
      };
      return payload.health?.drainingForUpdate === draining;
    } catch {
      return false;
    }
  };
  try {
    const response = await fetch(
      `http://${host}:${port}/internal/update-control`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-neurolink-update-token": PROXY_UPDATE_CONTROL_TOKEN,
        },
        body: JSON.stringify({ action: draining ? "drain" : "resume" }),
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!response.ok) {
      return confirmState();
    }
    const payload = (await response.json()) as { draining?: boolean };
    return payload.draining === draining;
  } catch {
    return confirmState();
  }
}

async function resumeProxyUpdateDrain(
  host: string,
  port: number,
  attempts: number = 3,
): Promise<boolean> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (await setProxyUpdateDrain(host, port, false)) {
      return true;
    }
    if (attempt < attempts) {
      await sleep(1_000);
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Stable entrypoint for launchd
// ---------------------------------------------------------------------------

/**
 * Path to a small trampoline script that the plist invokes.
 * The trampoline re-resolves `neurolink` via PATH on every launch,
 * so launchd never gets pinned to a version-specific store path.
 */
const TRAMPOLINE_DIR = join(homedir(), ".neurolink", "bin");
const TRAMPOLINE_PATH = join(TRAMPOLINE_DIR, "neurolink-proxy");

/**
 * Verify a candidate bin path actually runs by invoking `--version` on it.
 * Returns the version string on success, or undefined on any failure.
 */
function probeBinVersion(binPath: string): string | undefined {
  try {
    const { execFileSync } = _require(
      "node:child_process",
    ) as typeof import("node:child_process");
    const out = execFileSync(binPath, ["--version"], {
      encoding: "utf8",
      timeout: 5_000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Write (or overwrite) the trampoline shell script.
 *
 * Defensive design: the trampoline tries multiple candidates in order and
 * only `exec`s one whose `--version` check succeeds. If every PATH-based
 * candidate is broken (stale shims, missing packages), it falls back to the
 * baked-in `node + script` path that was verified to work at install time.
 */
function writeTrampoline(): void {
  const { writeFileSync, mkdirSync, existsSync, chmodSync } = _require(
    "fs",
  ) as typeof import("fs");
  if (!existsSync(TRAMPOLINE_DIR)) {
    mkdirSync(TRAMPOLINE_DIR, { recursive: true });
  }

  // Baked-in fallback: the specific node + JS script currently running
  // (guaranteed to work, since we ARE running). Used only if all PATH-based
  // candidates fail their --version probe.
  const bakedNode = process.execPath;
  const bakedScript = process.argv[1] ?? join(__dirname, "..", "index.js");

  // Shell-escape the baked paths (they shouldn't contain quotes in practice,
  // but be safe for paths with spaces).
  const shEscape = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;

  const script = `#!/bin/sh
# Auto-generated by \`neurolink proxy install\` — do not edit.
# Resolves a working neurolink binary on every launchd invocation so the
# plist never gets pinned to a broken/stale shim.

BAKED_NODE=${shEscape(bakedNode)}
BAKED_SCRIPT=${shEscape(bakedScript)}

# IPC workers must preserve the inherited Node channel until the final exec.
# Do not launch a --version probe subprocess on that descriptor; the parent
# validates the worker's exact package version before activation instead.
if [ "\${NEUROLINK_PROXY_TRAMPOLINE_EXEC_ONLY:-0}" = "1" ]; then
  if [ -n "\${NEUROLINK_BIN:-}" ] && [ -x "$NEUROLINK_BIN" ]; then
    exec "$NEUROLINK_BIN" "$@"
  fi
  for cand in \
      "$(command -v neurolink 2>/dev/null || true)" \
      "\${PNPM_HOME:-}/neurolink" \
      "$HOME/.local/share/pnpm/neurolink" \
      "$HOME/Library/pnpm/neurolink" \
      "/usr/local/bin/neurolink" \
      "/opt/homebrew/bin/neurolink"; do
    [ -n "$cand" ] && [ -x "$cand" ] && exec "$cand" "$@"
  done
  if [ -x "$BAKED_NODE" ] && [ -f "$BAKED_SCRIPT" ]; then
    exec "$BAKED_NODE" "$BAKED_SCRIPT" "$@"
  fi
  exit 127
fi

# Probe a candidate: must be executable and respond to --version cleanly.
_try() {
  [ -n "$1" ] && [ -x "$1" ] || return 1
  "$1" --version >/dev/null 2>&1 || return 1
  return 0
}

# 1. Explicit user override (escape hatch for broken environments).
if [ -n "\${NEUROLINK_BIN:-}" ]; then
  if _try "$NEUROLINK_BIN"; then
    exec "$NEUROLINK_BIN" "$@"
  fi
  echo "[neurolink-proxy] WARN: NEUROLINK_BIN=$NEUROLINK_BIN is not runnable, trying defaults" >&2
fi

# 2. PATH-based and common install locations. First working one wins.
for cand in \\
    "$(command -v neurolink 2>/dev/null || true)" \\
    "\${PNPM_HOME:-}/neurolink" \\
    "$HOME/.local/share/pnpm/neurolink" \\
    "$HOME/Library/pnpm/neurolink" \\
    "/usr/local/bin/neurolink" \\
    "/opt/homebrew/bin/neurolink"; do
  if _try "$cand"; then
    exec "$cand" "$@"
  fi
done

# 3. Baked-in fallback: the exact node + script that worked at install time.
#    Always valid at install time; may become stale after package updates
#    (but at that point the PATH candidates above should work).
if [ -x "$BAKED_NODE" ] && [ -f "$BAKED_SCRIPT" ]; then
  exec "$BAKED_NODE" "$BAKED_SCRIPT" "$@"
fi

echo "[neurolink-proxy] FATAL: no working neurolink binary found." >&2
echo "[neurolink-proxy] Tried: PATH, \\$PNPM_HOME, \\$HOME/.local/share/pnpm, \\$HOME/Library/pnpm, /usr/local/bin, /opt/homebrew/bin, baked-in install path." >&2
echo "[neurolink-proxy] Fix: reinstall with 'pnpm add -g @juspay/neurolink' or set NEUROLINK_BIN=/path/to/working/neurolink." >&2
exit 127
`;
  writeFileSync(TRAMPOLINE_PATH, script, { mode: 0o755 });
  chmodSync(TRAMPOLINE_PATH, 0o755);
}

function spawnFailOpenGuard(
  host: string,
  port: number,
  parentPid: number,
): number | undefined {
  // The guard runs the same version as this process, so process.argv[1]
  // (the currently-running script) is correct here — no stale-path risk.
  const entryScript = process.argv[1];
  if (!entryScript) {
    return undefined;
  }

  const args = [
    entryScript,
    "proxy",
    "guard",
    "--host",
    host,
    "--port",
    String(port),
    "--parent-pid",
    String(parentPid),
    "--quiet",
  ];

  const workerLog = openProxyWorkerLog("proxy-guard.log");
  if (workerLog.error) {
    logger.debug(`[proxy] guard logging disabled: ${workerLog.error}`);
  }

  try {
    const child = spawn(process.execPath, args, {
      detached: true,
      stdio: ["ignore", workerLog.stdio, workerLog.stdio],
    });
    child.unref();
    return child.pid;
  } catch (error) {
    logger.debug(
      `[proxy] failed to start fail-open guard: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return undefined;
  } finally {
    workerLog.close();
  }
}

function spawnProxyUpdater(
  host: string,
  port: number,
  parentPid: number,
  rollingSupervisor: boolean = false,
): number | undefined {
  if (!isProxyAutoUpdateEnabled()) {
    logger.always("[proxy] automatic updates disabled by environment");
    return undefined;
  }

  const entryScript = process.argv[1];
  if (!entryScript) {
    logger.always("[proxy] updater disabled: CLI entry script is unavailable");
    return undefined;
  }

  const command = rollingSupervisor ? TRAMPOLINE_PATH : process.execPath;
  const args = [
    ...(rollingSupervisor ? [] : [entryScript]),
    "proxy",
    "guard",
    "--host",
    host,
    "--port",
    String(port),
    "--parent-pid",
    String(parentPid),
    "--updater-only",
    "--quiet",
  ];
  const workerLog = openProxyWorkerLog("proxy-updater.log");
  if (workerLog.error) {
    logger.always(`[proxy] updater logging disabled: ${workerLog.error}`);
  }

  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: ["ignore", workerLog.stdio, workerLog.stdio],
      env: {
        ...process.env,
        NEUROLINK_PROXY_UPDATE_CONTROL_TOKEN: PROXY_UPDATE_CONTROL_TOKEN,
        [PROXY_ROLLING_SUPERVISOR_ENV]: rollingSupervisor ? "1" : "0",
      },
    });
    child.once("error", (error) => {
      logger.always(
        `[proxy] updater worker error pid=${child.pid ?? "unknown"}: ${error.message}`,
      );
    });
    child.once("exit", (code, signal) => {
      logger.always(
        `[proxy] updater worker exited pid=${child.pid ?? "unknown"} code=${code ?? "none"} signal=${signal ?? "none"}`,
      );
    });
    child.unref();
    return child.pid;
  } catch (error) {
    logger.always(
      `[proxy] updater failed to start: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  } finally {
    workerLog.close();
  }
}

async function runProxyTelemetryManager(command: string): Promise<void> {
  const { existsSync } = await import("fs");
  if (!existsSync(PROXY_TELEMETRY_SCRIPT_PATH)) {
    throw new Error(
      "Proxy telemetry helper files were not found in this installation. Reinstall NeuroLink with observability assets included.",
    );
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn("bash", [PROXY_TELEMETRY_SCRIPT_PATH, command], {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        reject(
          new Error(
            `proxy telemetry ${command} terminated by signal ${signal}`,
          ),
        );
        return;
      }
      if (code !== 0) {
        reject(
          new Error(`proxy telemetry ${command} exited with code ${code ?? 1}`),
        );
        return;
      }
      resolve();
    });
  });
}

// =============================================================================
// STARTUP BANNER
// =============================================================================

function printProxyBanner(url: string, strategy: string): void {
  logger.always("");
  logger.always(chalk.bold.cyan("NeuroLink Claude Proxy"));
  logger.always(chalk.gray("=".repeat(50)));
  logger.always("");
  logger.always(`  ${chalk.bold("URL:")}        ${chalk.cyan(url)}`);
  logger.always(`  ${chalk.bold("Strategy:")}   ${chalk.cyan(strategy)}`);
  logger.always(`  ${chalk.bold("PID:")}        ${chalk.cyan(process.pid)}`);
  logger.always("");
  logger.always(chalk.bold("Endpoints:"));
  logger.always(
    `  ${chalk.blue("POST")} /v1/messages         — Claude proxy (Anthropic format)`,
  );
  logger.always(
    `  ${chalk.blue("POST")} /v1/chat/completions — OpenAI-compatible proxy`,
  );
  logger.always(`  ${chalk.green("GET")}  /health              — Health check`);
  logger.always(
    `  ${chalk.green("GET")}  /status              — Detailed status`,
  );
  logger.always("");
  logger.always(chalk.bold("Set in Claude Code:"));
  logger.always(`  ${chalk.cyan(`ANTHROPIC_BASE_URL=${url}`)}`);
  logger.always("");
  logger.always(chalk.gray("Press Ctrl+C to stop the proxy"));
  logger.always("");
}

export function mapClaudeErrorTypeToStatus(errorType?: string): number {
  switch (errorType) {
    case "invalid_request_error":
      return 400;
    case "authentication_error":
      return 401;
    case "permission_error":
      return 403;
    case "not_found_error":
      return 404;
    case "request_too_large":
      return 413;
    case "rate_limit_error":
      return 429;
    case "overloaded_error":
      return 529;
    case "api_error":
    default:
      return 502;
  }
}

function getProxyRuntimeErrorCode(error: unknown): string | undefined {
  let current = error;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") {
      return code;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

async function ensureProxyStartAllowed(spinner: ProxySpinner): Promise<void> {
  const ignoreLaunchd =
    process.env.NEUROLINK_PROXY_IGNORE_LAUNCHD === "1" ||
    process.env.NEUROLINK_PROXY_IGNORE_LAUNCHD === "true";
  const existingSupervisor = loadProxySupervisorState();
  if (existingSupervisor) {
    if (
      existingSupervisor.pid !== process.pid &&
      isProcessRunning(existingSupervisor.pid) &&
      !ignoreLaunchd
    ) {
      if (spinner) {
        spinner.fail(
          chalk.red(
            `Proxy supervisor already running on port ${existingSupervisor.port} (PID: ${existingSupervisor.pid})`,
          ),
        );
      }
      process.exit(process.ppid === 1 ? 0 : 1);
    }
    if (!isProcessRunning(existingSupervisor.pid)) {
      clearProxySupervisorState();
    }
  }
  const existingState = loadProxyState();
  if (existingState) {
    if (isProcessRunning(existingState.pid)) {
      // A newly relaunched stable supervisor may inherit state from an orphaned
      // worker that is draining old connections but no longer owns a listener.
      // launchd must be allowed to restore listener ownership in that case.
      if (process.ppid === 1) {
        return;
      }
      // Test / dev escape hatch: when NEUROLINK_PROXY_IGNORE_LAUNCHD is set,
      // allow starting a second proxy on the test's requested port even if
      // a launchd-managed instance is using a different port (its state
      // file is what we hit here). The shared port-conflict surface remains
      // — node will fail to bind if the requested port is actually busy.
      if (!ignoreLaunchd) {
        if (spinner) {
          spinner.fail(
            chalk.red(
              `Proxy already running on port ${existingState.port} (PID: ${existingState.pid})`,
            ),
          );
        }
        logger.always(
          chalk.yellow(
            "Stop it first or use 'neurolink proxy status' to inspect",
          ),
        );
        process.exit(process.ppid === 1 ? 0 : 1);
      }
    } else {
      clearProxyState();
    }
  }

  if (process.ppid === 1 || !(await isLaunchdManaging())) {
    return;
  }

  // Test / dev escape hatch: when starting on an explicit non-default port,
  // the launchd-managed proxy (typically on its own port) cannot conflict.
  // Setting `NEUROLINK_PROXY_IGNORE_LAUNCHD=1` lets the test suite start a
  // standalone proxy alongside the launchd one without removing the daemon.
  if (
    process.env.NEUROLINK_PROXY_IGNORE_LAUNCHD === "1" ||
    process.env.NEUROLINK_PROXY_IGNORE_LAUNCHD === "true"
  ) {
    return;
  }

  if (spinner) {
    spinner.fail(
      chalk.red(
        "Proxy is managed by launchd. Manual start would cause port conflicts.",
      ),
    );
  }
  logger.always(
    chalk.yellow(
      "Use 'neurolink proxy uninstall' to remove the service first, " +
        "or 'launchctl kickstart gui/$(id -u)/com.neurolink.proxy' to restart.",
    ),
  );
  process.exit(1);
}

async function loadProxyStartEnv(
  argv: ProxyStartArgs,
  spinner: ProxySpinner,
): Promise<string | undefined> {
  try {
    const envResult = await loadProxyEnvFile({
      explicitEnvFile: argv.envFile,
    });
    if (spinner && envResult.path) {
      spinner.text = `Loaded proxy env from ${envResult.path}`;
    }
    return envResult.path;
  } catch (error) {
    if (spinner) {
      spinner.fail(
        chalk.red(error instanceof Error ? error.message : String(error)),
      );
    }
    process.exit(1);
  }
}

async function createProxyNeurolinkRuntime(logsDir?: string) {
  process.env.NEUROLINK_SKIP_MCP = "true";

  const { NeuroLink } = await import("../../lib/neurolink.js");
  const neurolink = new NeuroLink();
  const { initRequestLogger, cleanupLogs } =
    await import("../../lib/proxy/requestLogger.js");

  initRequestLogger(true, logsDir);
  cleanupLogs(7, 500);

  return { neurolink, cleanupLogs };
}

function registerProxyRequestTracking(
  app: Hono,
  requestMetadata: WeakMap<Request, RuntimeRequestMetadata>,
  readiness: ProxyReadinessState,
): void {
  app.use("/v1/*", async (c, next) => {
    const startedMonotonicMs = performance.now();
    const contentLengthHeader = c.req.raw.headers.get("content-length");
    const rawContentLength =
      contentLengthHeader === null ? Number.NaN : Number(contentLengthHeader);
    const requestBytes =
      Number.isFinite(rawContentLength) && rawContentLength >= 0
        ? rawContentLength
        : undefined;
    const sessionId =
      c.req.raw.headers.get("x-neurolink-session-id") ??
      c.req.raw.headers.get("x-claude-code-session-id") ??
      undefined;
    const sessionHash = hashProxyLifecycleSessionId(sessionId);
    const metadata: RuntimeRequestMetadata = {
      requestId: crypto.randomUUID(),
      method: c.req.method,
      path: c.req.path,
      startedAt: Date.now(),
      model: "-",
      stream: false,
      toolCount: 0,
      rejectForUpdate: readiness.drainingForUpdate,
    };
    requestMetadata.set(c.req.raw, metadata);
    const finishActivity = metadata.rejectForUpdate
      ? () => undefined
      : beginProxyRequest();
    const finish = () => {
      finishActivity();
      requestMetadata.delete(c.req.raw);
    };
    // The route adapter populates model/stream/toolCount after parsing. Omit
    // them at acceptance instead of publishing misleading placeholder values;
    // subsequent events carry the parsed metadata under the same request ID.
    logProxyLifecycleEvent({
      event: "request_accepted",
      requestId: metadata.requestId,
      method: metadata.method,
      path: metadata.path,
      sessionHash,
      requestBytes,
      elapsedMs: 0,
      monotonicMs: startedMonotonicMs,
    });
    try {
      await next();
      const responseStatus = c.res.status;
      logProxyLifecycleEvent({
        event: "response_headers",
        requestId: metadata.requestId,
        method: metadata.method,
        path: metadata.path,
        model: metadata.model,
        stream: metadata.stream,
        toolCount: metadata.toolCount,
        sessionHash,
        requestBytes,
        responseStatus,
        elapsedMs: performance.now() - startedMonotonicMs,
      });
      c.res = trackProxyResponse(c.res, finish, {
        onFirstChunk: ({ observedBodyBytes, responseChunks }) => {
          logProxyLifecycleEvent({
            event: "response_first_chunk",
            requestId: metadata.requestId,
            method: metadata.method,
            path: metadata.path,
            model: metadata.model,
            stream: metadata.stream,
            toolCount: metadata.toolCount,
            sessionHash,
            requestBytes,
            responseStatus,
            observedBodyBytes,
            responseChunks,
            elapsedMs: performance.now() - startedMonotonicMs,
          });
        },
        onTerminal: ({ outcome, observedBodyBytes, responseChunks }) => {
          logProxyLifecycleEvent({
            event: "request_terminal",
            requestId: metadata.requestId,
            method: metadata.method,
            path: metadata.path,
            model: metadata.model,
            stream: metadata.stream,
            toolCount: metadata.toolCount,
            sessionHash,
            requestBytes,
            responseStatus,
            observedBodyBytes,
            responseChunks,
            elapsedMs: performance.now() - startedMonotonicMs,
            terminalOutcome: outcome,
            errorType: metadata.terminalErrorType,
            errorCode: metadata.terminalErrorCode,
          });
        },
      });
    } catch (error) {
      // Keep metadata available to app.onError, which records the client-facing
      // failure with the same request ID before deleting the WeakMap entry.
      finishActivity();
      logProxyLifecycleEvent({
        event: "request_terminal",
        requestId: metadata.requestId,
        method: metadata.method,
        path: metadata.path,
        model: metadata.model,
        stream: metadata.stream,
        toolCount: metadata.toolCount,
        sessionHash,
        requestBytes,
        elapsedMs: performance.now() - startedMonotonicMs,
        terminalOutcome: "handler_error",
        errorType: error instanceof Error ? error.name : "unknown_error",
        errorCode: getProxyRuntimeErrorCode(error),
      });
      throw error;
    }
  });
}

export async function createProxyStartApp(params: {
  neurolink: ProxyNeurolinkRuntime["neurolink"];
  modelRouter: ModelRouterInterface | undefined;
  strategy: ProxyStartStrategy;
  passthrough: boolean;
  port: number;
  host: string;
  proxyConfig: LoadedProxyConfig | null;
  primaryAccountKey: string | undefined;
  accountAllowlist: AccountAllowlist | undefined;
  runtimeConfigStore?: ProxyRuntimeConfigStore;
  updateControlToken?: string;
}) {
  const { createClaudeProxyRoutes } =
    await import("../../lib/server/routes/claudeProxyRoutes.js");
  const { createOpenAIProxyRoutes } =
    await import("../../lib/server/routes/openaiProxyRoutes.js");
  const { logBodyCapture, logRequest } =
    await import("../../lib/proxy/requestLogger.js");
  const { recordFinalError } = await import("../../lib/proxy/usageStats.js");
  const { Hono } = await import("hono");

  const app = new Hono();
  const readiness = createProxyReadinessState();
  const requestMetadata = new WeakMap<Request, RuntimeRequestMetadata>();

  const recordRuntimeError = async (
    metadata: RuntimeRequestMetadata,
    status: number,
    errorType: string,
    errorMessage: string,
    options?: {
      clientMessage?: string;
      clientErrorType?: string;
      errorCode?: string;
    },
  ): Promise<void> => {
    const clientMessage = options?.clientMessage ?? errorMessage;
    const clientErrorType = options?.clientErrorType ?? errorType;
    recordFinalError(status, undefined, undefined, {
      requestId: metadata.requestId,
      errorType,
      errorCode: options?.errorCode,
      terminalOutcome: "handler_error",
      message: errorMessage,
    });
    await Promise.all([
      logRequest({
        timestamp: new Date().toISOString(),
        requestId: metadata.requestId,
        method: metadata.method,
        path: metadata.path,
        model: metadata.model,
        stream: metadata.stream,
        toolCount: metadata.toolCount,
        account: "",
        accountType: "proxy-runtime",
        responseStatus: status,
        responseTimeMs: Date.now() - metadata.startedAt,
        errorType,
        errorMessage,
        ...(options?.errorCode ? { errorCode: options.errorCode } : {}),
      }),
      logBodyCapture({
        timestamp: new Date().toISOString(),
        requestId: metadata.requestId,
        model: metadata.model,
        stream: metadata.stream,
        phase: "client_response",
        headers: { "content-type": "application/json" },
        body: {
          type: "error",
          error: { type: clientErrorType, message: clientMessage },
        },
        contentType: "application/json",
        responseStatus: status,
        durationMs: Date.now() - metadata.startedAt,
      }),
    ]);
  };

  app.onError(async (err, c) => {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.always(`[proxy] unhandled error: ${errMsg}`);
    if (err instanceof Error && err.stack) {
      logger.always(`[proxy] unhandled stack: ${err.stack}`);
    }
    const metadata = requestMetadata.get(c.req.raw) ?? {
      requestId: crypto.randomUUID(),
      method: c.req.method,
      path: c.req.path,
      startedAt: Date.now(),
      model: "-",
      stream: false,
      toolCount: 0,
    };
    metadata.terminalErrorType = "unhandled_proxy_error";
    metadata.terminalErrorCode = getProxyRuntimeErrorCode(err);
    await recordRuntimeError(metadata, 502, "unhandled_proxy_error", errMsg, {
      clientMessage: "Proxy internal error",
      clientErrorType: "api_error",
      errorCode: metadata.terminalErrorCode,
    });
    requestMetadata.delete(c.req.raw);
    return c.json(
      {
        type: "error",
        error: {
          type: "api_error",
          message: "Proxy internal error",
        },
      },
      502,
    );
  });

  app.post("/internal/update-control", async (c) => {
    const suppliedToken = c.req.header("x-neurolink-update-token");
    const expectedToken =
      params.updateControlToken ?? PROXY_UPDATE_CONTROL_TOKEN;
    if (!suppliedToken || suppliedToken !== expectedToken) {
      return c.json({ error: "not_found" }, 404);
    }
    const payload = await c.req
      .json<{ action?: string }>()
      .catch(() => ({ action: undefined }));
    if (payload.action === "drain") {
      if (!markProxyDrainingForUpdate(readiness)) {
        return c.json({ error: "proxy_not_ready" }, 409);
      }
    } else if (payload.action === "resume") {
      if (!resumeProxyConnections(readiness)) {
        return c.json({ error: "proxy_not_ready" }, 409);
      }
    } else {
      return c.json({ error: "invalid_action" }, 400);
    }
    return c.json({
      draining: readiness.drainingForUpdate,
      acceptingConnections: readiness.acceptingConnections,
    });
  });

  registerProxyRequestTracking(app, requestMetadata, readiness);

  const runtimeConfigStore = params.runtimeConfigStore;
  const runtimeConfigProvider = runtimeConfigStore
    ? () => runtimeConfigStore.getSnapshot()
    : undefined;
  const routeGroup = createClaudeProxyRoutes(
    params.modelRouter,
    "",
    params.strategy,
    params.passthrough,
    params.primaryAccountKey,
    runtimeConfigProvider
      ? {
          accountAllowlist: params.accountAllowlist,
          runtimeConfigProvider,
        }
      : params.accountAllowlist,
  );

  const openaiRouteGroup = createOpenAIProxyRoutes(
    params.modelRouter,
    "",
    params.port,
    runtimeConfigProvider,
  );
  const allProxyRoutes = [...routeGroup.routes, ...openaiRouteGroup.routes];

  for (const route of allProxyRoutes) {
    const method = route.method.toLowerCase() as "get" | "post";
    app[method](route.path, async (c) => {
      const metadata = requestMetadata.get(c.req.raw);
      if (metadata?.rejectForUpdate) {
        if (metadata) {
          metadata.terminalErrorType = "proxy_draining";
          await recordRuntimeError(
            metadata,
            503,
            "proxy_draining",
            "Proxy is draining for an automatic update",
            {
              clientMessage: "Proxy is restarting; retry shortly",
              clientErrorType: "overloaded_error",
            },
          );
        }
        c.header("Retry-After", "2");
        return c.json(
          {
            type: "error",
            error: {
              type: "overloaded_error",
              message: "Proxy is restarting; retry shortly",
            },
          },
          503,
        );
      }
      const emptyBody = {};
      let body: unknown;
      let rawBody: string | undefined;
      if (method === "post") {
        rawBody = await c.req.text().catch(() => undefined);
        try {
          body = rawBody ? JSON.parse(rawBody) : emptyBody;
        } catch {
          const metadata = requestMetadata.get(c.req.raw);
          if (metadata) {
            await recordRuntimeError(
              metadata,
              400,
              "invalid_request_error",
              "Request body must be valid JSON",
            );
          }
          return c.json(
            {
              type: "error",
              error: {
                type: "invalid_request_error",
                message: "Request body must be valid JSON",
              },
            },
            400,
          );
        }
      }

      const model = (body as Record<string, unknown>)?.model ?? "-";
      const stream = (body as Record<string, unknown>)?.stream
        ? "stream"
        : "non-stream";
      const bodyRec = body as Record<string, unknown> | undefined;
      const toolCount = Array.isArray(bodyRec?.tools)
        ? (bodyRec.tools as unknown[]).length
        : 0;
      if (metadata) {
        metadata.model = String(model);
        metadata.stream = stream === "stream";
        metadata.toolCount = toolCount;
      }
      const logModel = sanitizeForLog(String(model));
      logger.always(
        `[proxy] ${c.req.method} ${c.req.path} → model=${logModel} ${stream} tools=${toolCount}`,
      );

      const ctx = {
        requestId: metadata?.requestId ?? crypto.randomUUID(),
        method: c.req.method,
        path: c.req.path,
        headers: Object.fromEntries(c.req.raw.headers.entries()),
        query: Object.fromEntries(new URL(c.req.url).searchParams.entries()),
        params: c.req.param() as Record<string, string>,
        body,
        rawBody,
        // The proxy runtime exposes only the structural slice of NeuroLink the
        // routes use; narrow (overlap-checked) to the full class for ServerContext.
        neurolink: params.neurolink as NeuroLink,
        toolRegistry: params.neurolink.getToolRegistry(),
        timestamp: Date.now(),
        metadata: {},
        // Route handlers publish limit/quota headers here. Only the streaming
        // paths build their own Response (and set headers directly); every
        // JSON and error path returns a plain object, so without this the
        // headers had nowhere to go. Applied to each c.json() return below.
        responseHeaders: {} as Record<string, string>,
      };

      /** Copy handler-published headers onto the outgoing response. */
      const applyResponseHeaders = (): void => {
        for (const [key, value] of Object.entries(ctx.responseHeaders)) {
          c.header(key, value);
        }
      };

      const result = await route.handler(ctx);
      if (result instanceof Response) {
        // Streaming responses own their headers; merge in anything the
        // handler published on the context that the Response lacks. A Response
        // obtained from fetch() carries immutable headers, so this is
        // best-effort — the body must still reach the client either way.
        try {
          for (const [key, value] of Object.entries(ctx.responseHeaders)) {
            if (!result.headers.has(key)) {
              result.headers.set(key, value);
            }
          }
        } catch {
          // Immutable header guard — skip enrichment, keep the response.
        }
        return result;
      }

      if (
        result &&
        typeof result === "object" &&
        Symbol.asyncIterator in Object(result)
      ) {
        const iterator = (result as AsyncIterable<string>)[
          Symbol.asyncIterator
        ]();
        let cancelled = false;
        const responseStream = new ReadableStream({
          async start(controller) {
            try {
              while (!cancelled) {
                const { value, done } = await iterator.next();
                if (done) {
                  break;
                }
                controller.enqueue(new TextEncoder().encode(value));
              }
              controller.close();
            } catch (streamErr) {
              if (cancelled) {
                controller.close();
                return;
              }
              const errMsg =
                streamErr instanceof Error
                  ? streamErr.message
                  : String(streamErr);
              const errorEvent = `event: error\ndata: ${JSON.stringify({ type: "error", error: { type: "api_error", message: `Stream interrupted: ${errMsg}` } })}\n\n`;
              try {
                controller.enqueue(new TextEncoder().encode(errorEvent));
              } catch {
                // Controller already errored — ignore
              }
              controller.close();
            }
          },
          async cancel() {
            cancelled = true;
            await iterator.return?.();
          },
        });
        return new Response(responseStream, {
          headers: {
            ...ctx.responseHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      if (
        result &&
        typeof result === "object" &&
        "httpStatus" in (result as Record<string, unknown>)
      ) {
        const httpResult = result as Record<string, unknown>;
        const status = (httpResult.httpStatus as number) ?? 200;
        delete httpResult.httpStatus;
        applyResponseHeaders();
        return c.json(result, status as 400);
      }

      if (
        result &&
        typeof result === "object" &&
        "type" in result &&
        (result as Record<string, unknown>).type === "error"
      ) {
        const errorResult = result as {
          type: string;
          error?: { type?: string };
        };
        const status = mapClaudeErrorTypeToStatus(errorResult.error?.type);
        applyResponseHeaders();
        return c.json(result, status as 400);
      }

      applyResponseHeaders();
      return c.json(result ?? {});
    });
  }

  app.get("/health", (c) => {
    const runtimeConfig = params.runtimeConfigStore?.getSnapshot();
    return c.json(
      buildProxyHealthResponse(readiness, {
        strategy: runtimeConfig ? runtimeConfig.strategy : params.strategy,
        passthrough: runtimeConfig
          ? runtimeConfig.passthrough
          : params.passthrough,
        version: PROXY_VERSION,
      }),
    );
  });

  app.get("/status", async (c) => {
    const runtimeConfig = params.runtimeConfigStore?.getSnapshot();
    const runtimeConfigStatus = params.runtimeConfigStore?.getStatus();
    const activeStrategy = runtimeConfig
      ? runtimeConfig.strategy
      : params.strategy;
    const activePassthrough = runtimeConfig
      ? runtimeConfig.passthrough
      : params.passthrough;
    const activeProxyConfig = runtimeConfig
      ? runtimeConfig.proxyConfig
      : params.proxyConfig;
    const activeAccountAllowlist = runtimeConfig
      ? runtimeConfig.accountAllowlist
      : params.accountAllowlist;
    const {
      getReconciledUsageSnapshot,
      getUsageSnapshot,
      getUsageStatsPersistenceStatus,
    } = await import("../../lib/proxy/usageStats.js");
    const { loadAccountCooldowns } =
      await import("../../lib/proxy/accountCooldown.js");
    let usageSnapshot = getUsageSnapshot();
    let snapshotSource: "reconciled" | "memory" = "memory";
    try {
      usageSnapshot = await withTimeout(
        getReconciledUsageSnapshot(),
        PROXY_STATUS_RECONCILE_TIMEOUT_MS,
        "[proxy] /status usage reconciliation timed out",
      );
      snapshotSource = "reconciled";
    } catch (error) {
      // Status must not become an outage amplifier when a cross-process lock or
      // a slow filesystem stalls reconciliation. The process-local snapshot is
      // coherent and its source is explicit to callers.
      logger.debug(
        `[proxy] /status using memory stats snapshot: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    const { stats, terminalErrors } = usageSnapshot;
    const terminalErrorDetailsComparable =
      usageSnapshot.statsVersion === usageSnapshot.terminalErrorsVersion;
    const lastTerminalError = terminalErrors.recent.at(-1) ?? null;
    const terminalErrorDetailsMissing = terminalErrorDetailsComparable
      ? Math.max(0, stats.totalErrors - terminalErrors.totalErrors)
      : undefined;
    const terminalErrorDetailsExcess = terminalErrorDetailsComparable
      ? Math.max(0, terminalErrors.totalErrors - stats.totalErrors)
      : undefined;
    const runtimeState = loadProxyState();
    const supervisorState = loadProxySupervisorState();
    const rollingSupervisorRunning = isRollingHandoffCapable(supervisorState);
    const updateState = loadUpdateState();
    const cooldowns = await withTimeout(
      loadAccountCooldowns(),
      PROXY_STATUS_ACCOUNT_INVENTORY_TIMEOUT_MS,
      "[proxy] /status cooldown inspection timed out",
    ).catch((error) => {
      logger.debug(
        `[proxy] /status using empty cooldown snapshot: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {};
    });
    const storedAccountKeys = new Set<string>();
    const storedAccountExpirations = new Map<string, number>();
    const disabledAccountKeys = new Set<string>();
    let accountInventoryLoaded = false;
    try {
      const { tokenStore } = await import("../../lib/auth/tokenStore.js");
      const storedKeys = await withTimeout(
        tokenStore.listByPrefix("anthropic:"),
        PROXY_STATUS_ACCOUNT_INVENTORY_TIMEOUT_MS,
        "[proxy] /status account enumeration timed out",
      );
      for (const key of storedKeys) {
        storedAccountKeys.add(normalizeAnthropicAccountKey(key));
      }
      // Once account names are known, preserve them even when optional token
      // metadata is slow. That keeps the status table useful and avoids
      // incorrectly presenting known accounts as removed.
      accountInventoryLoaded = true;
      const inventory = await withTimeout(
        (async () => {
          const tokenExpirations = await Promise.all(
            storedKeys.map(async (key) => {
              try {
                const tokens = await withTimeout(
                  tokenStore.peekTokens(key),
                  PROXY_STATUS_TOKEN_READ_TIMEOUT_MS,
                  "[proxy] /status token inspection timed out",
                );
                return tokens ? ([key, tokens.expiresAt] as const) : undefined;
              } catch (error) {
                logger.debug(
                  `[proxy] /status: failed to inspect token metadata for ${normalizeAnthropicAccountKey(key)}: ${
                    error instanceof Error ? error.message : String(error)
                  }`,
                );
                return undefined;
              }
            }),
          );
          const disabledKeys = await tokenStore.listDisabled();
          return { tokenExpirations, disabledKeys };
        })(),
        PROXY_STATUS_ACCOUNT_INVENTORY_TIMEOUT_MS,
        "[proxy] /status account metadata timed out",
      );
      for (const expiration of inventory.tokenExpirations) {
        if (expiration) {
          storedAccountExpirations.set(
            normalizeAnthropicAccountKey(expiration[0]),
            expiration[1],
          );
        }
      }
      for (const key of inventory.disabledKeys) {
        disabledAccountKeys.add(normalizeAnthropicAccountKey(key));
      }
    } catch (err) {
      logger.debug(
        `[proxy] /status: failed to resolve account cooldown labels: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    const legacyAccountLabel = accountInventoryLoaded
      ? await withTimeout(
          resolveLegacyStatusAccountLabel(storedAccountKeys.size),
          PROXY_STATUS_ACCOUNT_INVENTORY_TIMEOUT_MS,
          "[proxy] /status legacy account inspection timed out",
        ).catch(() => null)
      : null;
    const now = Date.now();
    const health = buildProxyHealthResponse(readiness, {
      strategy: activeStrategy,
      passthrough: activePassthrough,
      version: PROXY_VERSION,
    });
    const primaryAccount = await withTimeout(
      resolveStatusPrimaryAccount(activeProxyConfig),
      PROXY_STATUS_ACCOUNT_INVENTORY_TIMEOUT_MS,
      "[proxy] /status primary account inspection timed out",
    ).catch(() => ({
      configured: activeProxyConfig?.routing?.primaryAccount?.trim() || null,
      key: null,
      label: null,
      source: "fallback" as const,
    }));
    const activeUpdaterPid =
      supervisorState?.updaterPid ?? runtimeState?.updaterPid;
    const accountRows: NonNullable<StatusStats["accounts"]> = Object.values(
      stats.accounts,
    ).map((account) => {
      const normalizedKey = normalizeAnthropicAccountKey(account.label);
      const isLegacyAccount =
        account.type === "oauth" && account.label === legacyAccountLabel;
      const accountKey = storedAccountKeys.has(normalizedKey)
        ? normalizedKey
        : isLegacyAccount
          ? LEGACY_ANTHROPIC_ACCOUNT_KEY
          : account.label === "env"
            ? ENV_ANTHROPIC_ACCOUNT_KEY
            : normalizedKey;
      const isStored = storedAccountKeys.has(accountKey) || isLegacyAccount;
      const { allowed, expired, cooling } = deriveAccountAllowance(
        accountKey,
        now,
        activeAccountAllowlist,
        storedAccountExpirations,
        cooldowns,
      );
      const accountStatus =
        account.type === "internal"
          ? "internal"
          : disabledAccountKeys.has(accountKey)
            ? "disabled"
            : expired
              ? "expired"
              : !allowed
                ? "excluded"
                : accountInventoryLoaded &&
                    account.type === "oauth" &&
                    !isStored
                  ? "removed"
                  : cooling
                    ? "cooling"
                    : "active";
      return {
        label: account.label,
        type: account.type,
        attempts: account.attemptCount,
        requests: account.successCount + account.errorCount,
        success: account.successCount,
        errors: account.errorCount,
        attemptErrors: account.attemptErrorCount,
        rateLimits: account.rateLimitCount,
        transientRateLimits: account.transientRateLimitCount,
        quotaRateLimits: account.quotaRateLimitCount,
        cooling,
        status: accountStatus,
        allowed: account.type === "internal" ? undefined : allowed,
        expired: account.type === "oauth" ? expired : undefined,
      };
    });
    const representedAccountKeys = new Set(
      accountRows
        .filter((account) => account.type === "oauth")
        .map((account) => normalizeAnthropicAccountKey(account.label)),
    );
    for (const accountKey of storedAccountKeys) {
      if (representedAccountKeys.has(accountKey)) {
        continue;
      }
      const { allowed, expired, cooling } = deriveAccountAllowance(
        accountKey,
        now,
        activeAccountAllowlist,
        storedAccountExpirations,
        cooldowns,
      );
      accountRows.push({
        label: accountKey.slice("anthropic:".length),
        type: "oauth",
        attempts: 0,
        requests: 0,
        success: 0,
        errors: 0,
        attemptErrors: 0,
        rateLimits: 0,
        transientRateLimits: 0,
        quotaRateLimits: 0,
        cooling,
        status: disabledAccountKeys.has(accountKey)
          ? "disabled"
          : expired
            ? "expired"
            : !allowed
              ? "excluded"
              : cooling
                ? "cooling"
                : "active",
        allowed,
        expired,
      });
    }
    const attributed = accountRows.reduce(
      (total, account) => ({
        attempts: total.attempts + (account.attempts ?? 0),
        requests: total.requests + (account.requests ?? 0),
        success: total.success + (account.success ?? 0),
        errors: total.errors + (account.errors ?? 0),
        attemptErrors: total.attemptErrors + (account.attemptErrors ?? 0),
        rateLimits: total.rateLimits + (account.rateLimits ?? 0),
        transientRateLimits:
          total.transientRateLimits + (account.transientRateLimits ?? 0),
        quotaRateLimits: total.quotaRateLimits + (account.quotaRateLimits ?? 0),
      }),
      {
        attempts: 0,
        requests: 0,
        success: 0,
        errors: 0,
        attemptErrors: 0,
        rateLimits: 0,
        transientRateLimits: 0,
        quotaRateLimits: 0,
      },
    );
    const unattributed = {
      attempts: Math.max(0, stats.totalAttempts - attributed.attempts),
      requests: Math.max(0, stats.totalRequests - attributed.requests),
      success: Math.max(0, stats.totalSuccess - attributed.success),
      errors: Math.max(0, stats.totalErrors - attributed.errors),
      attemptErrors: Math.max(
        0,
        stats.totalAttemptErrors - attributed.attemptErrors,
      ),
      rateLimits: Math.max(0, stats.totalRateLimits - attributed.rateLimits),
      transientRateLimits: Math.max(
        0,
        stats.totalTransientRateLimits - attributed.transientRateLimits,
      ),
      quotaRateLimits: Math.max(
        0,
        stats.totalQuotaRateLimits - attributed.quotaRateLimits,
      ),
    };
    if (Object.values(unattributed).some((count) => count > 0)) {
      const internalRow = accountRows.find(
        (account) => account.label === PROXY_INTERNAL_ACCOUNT_LABEL,
      );
      if (internalRow) {
        internalRow.attempts =
          (internalRow.attempts ?? 0) + unattributed.attempts;
        internalRow.requests =
          (internalRow.requests ?? 0) + unattributed.requests;
        internalRow.success = (internalRow.success ?? 0) + unattributed.success;
        internalRow.errors = (internalRow.errors ?? 0) + unattributed.errors;
        internalRow.attemptErrors =
          (internalRow.attemptErrors ?? 0) + unattributed.attemptErrors;
        internalRow.rateLimits =
          (internalRow.rateLimits ?? 0) + unattributed.rateLimits;
        internalRow.transientRateLimits =
          (internalRow.transientRateLimits ?? 0) +
          unattributed.transientRateLimits;
        internalRow.quotaRateLimits =
          (internalRow.quotaRateLimits ?? 0) + unattributed.quotaRateLimits;
      } else {
        accountRows.push({
          label: PROXY_INTERNAL_ACCOUNT_LABEL,
          type: "internal",
          ...unattributed,
          cooling: false,
          status: "internal",
        });
      }
    }
    return c.json({
      status: "running",
      ready: health.ready,
      acceptingConnections: health.acceptingConnections,
      readyAt: health.readyAt,
      pid: process.pid,
      port: params.port,
      host: params.host,
      strategy: activeStrategy,
      uptime: process.uptime(),
      version: PROXY_VERSION,
      health,
      stats: {
        startedAt: stats.startedAt,
        totalAttempts: stats.totalAttempts,
        totalAttemptErrors: stats.totalAttemptErrors,
        totalRequests: stats.totalRequests,
        totalSuccess: stats.totalSuccess,
        totalErrors: stats.totalErrors,
        totalRateLimits: stats.totalRateLimits,
        totalTransientRateLimits: stats.totalTransientRateLimits,
        totalQuotaRateLimits: stats.totalQuotaRateLimits,
        terminalErrors,
        lastTerminalError,
        terminalErrorDetailsComparable,
        terminalErrorDetailsMissing,
        terminalErrorDetailsExcess,
        snapshotSource,
        accounts: accountRows,
        primaryAccount,
        persistence: getUsageStatsPersistenceStatus(),
      },
      activity: (() => {
        const activity = getProxyActivitySnapshot();
        return {
          activeRequests: activity.activeRequests,
          lastActivityAt: activity.lastActivityAt?.toISOString() ?? null,
        };
      })(),
      observability: {
        lifecycle: getProxyLifecycleLoggerSnapshot(),
      },
      autoUpdate: {
        enabled: isProxyAutoUpdateEnabled(),
        supervisorPid: supervisorState?.pid ?? null,
        supervisorVersion: supervisorState?.version ?? null,
        rolling: supervisorState?.rolling ?? null,
        updaterPid: activeUpdaterPid ?? null,
        updaterRunning: activeUpdaterPid
          ? isProcessRunning(activeUpdaterPid)
          : false,
        liveVersion: PROXY_VERSION,
        latestVersion: updateState?.lastCheckVersion || null,
        lastDetectedVersion: updateState?.lastCheckVersion || null,
        installedVersion:
          updateState?.installedVersion ??
          updateState?.lastUpdateVersion ??
          null,
        activatedVersion: PROXY_VERSION,
        pendingActivationVersion: updateState?.pendingRestartVersion ?? null,
        pendingRestartVersion: updateState?.pendingRestartVersion ?? null,
        activationMode: rollingSupervisorRunning
          ? "rolling-handoff"
          : "restart",
        deferredUpdate: updateState?.deferredUpdate ?? null,
        lastCheckAt: updateState?.lastCheckAt ?? null,
        lastUpdateAt: updateState?.lastUpdateAt ?? null,
        lastUpdateVersion: updateState?.lastUpdateVersion ?? null,
        lastFailure: updateState?.lastFailure
          ? {
              at: updateState.lastFailure.at,
              version: updateState.lastFailure.version,
              stage: updateState.lastFailure.stage,
            }
          : null,
      },
      config: params.runtimeConfigStore
        ? {
            hasRouting: !!activeProxyConfig?.routing,
            accountAllowlist: activeAccountAllowlist
              ? [...activeAccountAllowlist]
              : null,
            generation: runtimeConfig?.generation ?? null,
            loadedAt: runtimeConfig?.loadedAt ?? null,
            hash: runtimeConfig?.configHash ?? null,
            watching: runtimeConfigStatus?.watching ?? false,
            lastReloadAttemptAt:
              runtimeConfigStatus?.lastReloadAttemptAt ?? null,
            lastReloadAt: runtimeConfigStatus?.lastReloadAt ?? null,
            lastReloadSource: runtimeConfigStatus?.lastReloadSource ?? null,
            lastReloadError: runtimeConfigStatus?.lastReloadError ?? null,
            consecutiveFailures: runtimeConfigStatus?.consecutiveFailures ?? 0,
          }
        : params.proxyConfig
          ? {
              hasRouting: !!params.proxyConfig.routing,
              accountAllowlist: params.accountAllowlist
                ? [...params.accountAllowlist]
                : null,
            }
          : null,
    });
  });

  return { app, readiness };
}

async function initializeProxyOpenTelemetry(): Promise<void> {
  try {
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    if (!process.env.OTEL_SERVICE_NAME) {
      process.env.OTEL_SERVICE_NAME = "neurolink-proxy";
    }

    process.env.OTEL_RESOURCE_ATTRIBUTES = [
      "service.name=neurolink-proxy",
      `service.version=${PROXY_VERSION}`,
      "deployment.environment=local",
      process.env.OTEL_RESOURCE_ATTRIBUTES,
    ]
      .filter(Boolean)
      .join(",");

    const { initializeOpenTelemetry, isOpenTelemetryInitialized } =
      await import("../../lib/services/server/ai/observability/instrumentation.js");
    const { buildObservabilityConfigFromEnv } =
      await import("../../lib/utils/observabilityHelpers.js");

    if (isOpenTelemetryInitialized()) {
      return;
    }

    const observabilityConfig = buildObservabilityConfigFromEnv();
    const langfuseConfig = observabilityConfig?.langfuse;
    const langfuseEnabled = langfuseConfig?.enabled === true;
    await initializeOpenTelemetry({
      enabled: langfuseEnabled,
      publicKey: langfuseConfig?.publicKey || "",
      secretKey: langfuseConfig?.secretKey || "",
      baseUrl: langfuseConfig?.baseUrl,
      environment: "proxy",
      release: PROXY_VERSION,
      userId: "neurolink-proxy",
      autoDetectOperationName: true,
    });

    if (langfuseEnabled) {
      logger.always(
        `[proxy] Langfuse enabled — exporting to ${langfuseConfig.baseUrl || "https://cloud.langfuse.com"} (environment=proxy)`,
      );
    }
    if (otlpEndpoint) {
      logger.always(
        `[proxy] OTLP exporter enabled — exporting to ${otlpEndpoint} (service.name=neurolink-proxy)`,
      );
    }
    if (!langfuseEnabled && !otlpEndpoint) {
      logger.always(
        "[proxy] OpenTelemetry exporters disabled — set OTEL_EXPORTER_OTLP_ENDPOINT or Langfuse credentials to enable proxy observability",
      );
    }
  } catch (error) {
    logger.debug(
      `[proxy] OpenTelemetry init failed (non-fatal): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const BACKGROUND_REFRESH_BASE_COOLDOWN_MS = 30_000;
const BACKGROUND_REFRESH_MAX_COOLDOWN_MS = 5 * 60 * 1000;
const backgroundRefreshFailures = new Map<
  string,
  { consecutiveFailures: number; coolingUntil: number }
>();
const backgroundRejectedRefreshTokens = new Map<string, string>();
let backgroundRefreshInProgress = false;

function canAttemptBackgroundRefresh(
  key: string,
  refreshToken?: string,
): boolean {
  const rejectedToken = backgroundRejectedRefreshTokens.get(key);
  if (rejectedToken !== undefined) {
    if (rejectedToken === refreshToken) {
      return false;
    }
    backgroundRejectedRefreshTokens.delete(key);
  }
  const state = backgroundRefreshFailures.get(key);
  return !state || Date.now() >= state.coolingUntil;
}

function recordBackgroundRefreshFailure(key: string): void {
  const consecutiveFailures =
    (backgroundRefreshFailures.get(key)?.consecutiveFailures ?? 0) + 1;
  const delayMs = Math.min(
    BACKGROUND_REFRESH_MAX_COOLDOWN_MS,
    BACKGROUND_REFRESH_BASE_COOLDOWN_MS *
      2 ** Math.min(consecutiveFailures - 1, 4),
  );
  backgroundRefreshFailures.set(key, {
    consecutiveFailures,
    coolingUntil: Date.now() + delayMs,
  });
}

async function refreshProxyTokensInBackground(
  accountAllowlist?: AccountAllowlist,
): Promise<void> {
  const {
    needsRefresh,
    refreshToken,
    persistTokens,
    isPermanentRefreshFailure,
  } = await import("../../lib/proxy/tokenRefresh.js");
  const { tokenStore } = await import("../../lib/auth/tokenStore.js");

  let storedAnthropicAccountCount: number | undefined;
  try {
    const allKeys = await tokenStore.listProviders();
    const anthropicKeys = allKeys.filter((key) => key.startsWith("anthropic:"));
    storedAnthropicAccountCount = anthropicKeys.length;
    for (const key of anthropicKeys) {
      try {
        if (
          !isAccountAllowed(key, accountAllowlist) ||
          (await tokenStore.isDisabled(key))
        ) {
          continue;
        }
        const tokens = await tokenStore.loadTokens(key);
        if (!tokens) {
          continue;
        }
        const account = {
          label: key,
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
        };
        if (!needsRefresh(account)) {
          backgroundRefreshFailures.delete(key);
          continue;
        }
        if (!canAttemptBackgroundRefresh(key, tokens.refreshToken)) {
          continue;
        }
        const result = await refreshToken(account);
        if (result.success) {
          await persistTokens({ providerKey: key }, account);
          backgroundRefreshFailures.delete(key);
          logger.debug(`[proxy] background token refresh succeeded for ${key}`);
        } else if (isPermanentRefreshFailure(result)) {
          await tokenStore.markDisabled(key, "refresh_invalid");
          backgroundRefreshFailures.delete(key);
          logger.warn(
            `[proxy] background refresh credential rejected for ${key}; disabled until explicit login`,
          );
        } else {
          recordBackgroundRefreshFailure(key);
          logger.debug(`[proxy] background token refresh deferred for ${key}`, {
            status: result.status,
          });
        }
      } catch {
        // non-fatal per-account
      }
    }
  } catch {
    // non-fatal
  }

  try {
    if (
      storedAnthropicAccountCount === undefined ||
      !shouldLoadFallbackCredential(
        storedAnthropicAccountCount,
        LEGACY_ANTHROPIC_ACCOUNT_KEY,
        accountAllowlist,
      )
    ) {
      return;
    }
    const credPath = join(
      homedir(),
      ".neurolink",
      "anthropic-credentials.json",
    );
    const { readFileSync } = await import("fs");
    const creds = JSON.parse(readFileSync(credPath, "utf8"));
    if (!creds.oauth) {
      return;
    }
    const account = {
      label: "background",
      token: creds.oauth.accessToken,
      refreshToken: creds.oauth.refreshToken,
      expiresAt: creds.oauth.expiresAt,
    };
    const legacyKey = LEGACY_ANTHROPIC_ACCOUNT_KEY;
    if (!needsRefresh(account)) {
      backgroundRefreshFailures.delete(legacyKey);
      return;
    }
    if (canAttemptBackgroundRefresh(legacyKey, account.refreshToken)) {
      const result = await refreshToken(account);
      if (result.success) {
        await persistTokens(credPath, account);
        backgroundRefreshFailures.delete(legacyKey);
        backgroundRejectedRefreshTokens.delete(legacyKey);
        logger.debug("[proxy] background token refresh succeeded");
      } else if (isPermanentRefreshFailure(result)) {
        backgroundRefreshFailures.delete(legacyKey);
        backgroundRejectedRefreshTokens.set(
          legacyKey,
          account.refreshToken ?? "",
        );
        logger.warn(
          "[proxy] background legacy refresh credential rejected; waiting for explicit login",
        );
      } else {
        recordBackgroundRefreshFailure(legacyKey);
        logger.debug("[proxy] background legacy token refresh deferred", {
          status: result.status,
        });
      }
    }
  } catch {
    // non-fatal
  }
}

function startProxyBackgroundMaintenance(
  cleanupLogs: (days: number, maxMb: number) => void,
  getAccountAllowlist: () => AccountAllowlist | undefined,
): {
  refreshInterval: NodeJS.Timeout;
  logCleanupInterval: NodeJS.Timeout;
} {
  const refreshInterval = setInterval(() => {
    if (backgroundRefreshInProgress) {
      return;
    }
    backgroundRefreshInProgress = true;
    void refreshProxyTokensInBackground(getAccountAllowlist())
      .catch((error) => {
        logger.debug(
          `[proxy] background token refresh cycle failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      })
      .finally(() => {
        backgroundRefreshInProgress = false;
      });
  }, 30_000);
  const logCleanupInterval = setInterval(
    () => {
      try {
        cleanupLogs(7, 500);
      } catch (error) {
        logger.debug(
          `[proxy] background log cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
    60 * 60 * 1000,
  );
  return { refreshInterval, logCleanupInterval };
}

function registerProxyShutdownHandlers(params: {
  server: { close?: (callback?: (error?: Error) => void) => void };
  host: string;
  port: number;
  isDev?: boolean;
  refreshInterval: NodeJS.Timeout;
  logCleanupInterval: NodeJS.Timeout;
  updaterSupervisor?: { stop: () => void };
  stopRuntimeConfig?: () => void;
  registerSignals?: boolean;
}): (signal: string, options?: { skipServerClose?: boolean }) => Promise<void> {
  let shutdownStarted = false;

  const closeServer = async (): Promise<void> => {
    const close = params.server.close?.bind(params.server);
    if (!close) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };
      const timeout = setTimeout(
        () => finish(new Error("Timed out draining the proxy server")),
        30_000,
      );
      timeout.unref?.();
      try {
        close((error) => finish(error));
      } catch (error) {
        finish(error instanceof Error ? error : new Error(String(error)));
      }
    });
  };

  const shutdown = async (
    signal: string,
    options?: { skipServerClose?: boolean },
  ) => {
    if (shutdownStarted) {
      return;
    }
    shutdownStarted = true;
    clearInterval(params.refreshInterval);
    clearInterval(params.logCleanupInterval);
    params.updaterSupervisor?.stop();
    params.stopRuntimeConfig?.();
    logger.always(`\nShutting down proxy (${signal})...`);
    let exitCode = signal === "SIGINT" || signal === "ROLLING_DRAIN" ? 0 : 1;

    if (!options?.skipServerClose) {
      try {
        await closeServer();
      } catch (error) {
        exitCode = 1;
        logger.error(
          `[proxy] failed to drain server during shutdown: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const usageStatsFlush = import("../../lib/proxy/usageStats.js").then(
      ({ flushUsageStats }) => flushUsageStats(),
    );
    const requestLogsFlush = import("../../lib/proxy/requestLogger.js").then(
      ({ flushRequestLogs }) => flushRequestLogs(),
    );
    const [
      usageStatsFlushResult,
      lifecycleFlushResult,
      requestLogsFlushResult,
    ] = await Promise.allSettled([
      withTimeout(
        usageStatsFlush,
        PROXY_LIFECYCLE_SHUTDOWN_TIMEOUT_MS,
        "Timed out flushing proxy usage statistics during shutdown",
      ),
      withTimeout(
        flushProxyLifecycleEvents(),
        PROXY_LIFECYCLE_SHUTDOWN_TIMEOUT_MS,
        "Timed out flushing proxy lifecycle metadata during shutdown",
      ),
      withTimeout(
        requestLogsFlush,
        PROXY_LIFECYCLE_SHUTDOWN_TIMEOUT_MS,
        "Timed out flushing proxy request logs during shutdown",
      ),
    ]);
    if (usageStatsFlushResult.status === "rejected") {
      const error = usageStatsFlushResult.reason;
      logger.warn(
        `[proxy] usage statistics flush failed during shutdown: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (lifecycleFlushResult.status === "rejected") {
      const error = lifecycleFlushResult.reason;
      logger.debug(
        `[proxy] lifecycle metadata flush failed during shutdown: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (requestLogsFlushResult.status === "rejected") {
      const error = requestLogsFlushResult.reason;
      logger.warn(
        `[proxy] request log flush failed during shutdown: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    try {
      const { flushOpenTelemetry, shutdownOpenTelemetry } =
        await import("../../lib/services/server/ai/observability/instrumentation.js");
      await flushOpenTelemetry();
      await shutdownOpenTelemetry();
    } catch {
      // non-fatal — proxy shutdown must not block on OTel
    }

    if (signal === "SIGINT" && !params.isDev) {
      try {
        const shutdownHost =
          params.host === "0.0.0.0" ? "localhost" : params.host;
        await clearClaudeProxySettings(`http://${shutdownHost}:${params.port}`);
      } catch {
        // non-fatal
      }
      try {
        const shutdownHost =
          params.host === "0.0.0.0" ? "localhost" : params.host;
        await clearOpenCodeProxySettings(
          `http://${shutdownHost}:${params.port}/v1`,
        );
      } catch {
        // non-fatal
      }
    }

    try {
      const state = loadProxyState();
      if (state?.pid === process.pid) {
        clearProxyState();
      }
    } catch (error) {
      exitCode = 1;
      logger.error(
        `[proxy] failed to clear runtime state during shutdown: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    process.exit(exitCode);
  };

  const forceExitAfterShutdownFailure = (error: unknown): never => {
    logger.error(
      `[proxy] unexpected shutdown failure: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  };

  if (params.registerSignals ?? true) {
    process.on("SIGTERM", () => {
      void shutdown("SIGTERM").catch(forceExitAfterShutdownFailure);
    });
    process.on("SIGINT", () => {
      void shutdown("SIGINT").catch(forceExitAfterShutdownFailure);
    });
  }
  return shutdown;
}

async function startProxyRuntime(params: {
  argv: ProxyStartArgs;
  spinner: ProxySpinner;
  app: ProxyStartApp["app"];
  readiness: ProxyStartApp["readiness"];
  host: string;
  port: number;
  strategy: ProxyStartStrategy;
  proxyConfig: LoadedProxyConfig | null;
  accountAllowlist: AccountAllowlist | undefined;
  loadedEnvFile: string | undefined;
  passthrough: boolean;
  cleanupLogs: ProxyNeurolinkRuntime["cleanupLogs"];
  runtimeConfigStore?: ProxyRuntimeConfigStore;
}): Promise<void> {
  const socketWorker = isProxySocketWorkerProcess();
  const { createAdaptorServer, serve } = await import("@hono/node-server");
  const server = socketWorker
    ? createAdaptorServer({
        fetch: params.app.fetch,
        hostname: params.host,
      })
    : serve({
        fetch: params.app.fetch,
        port: params.port,
        hostname: params.host,
      });
  const managedByLaunchd = isLaunchdManagedProcess() || socketWorker;
  // launchd already owns restart supervision. A second detached supervisor can
  // outlive its parent and terminate a healthy replacement, so the guard is
  // reserved for foreground mode where it only cleans stale client settings.
  const guardPid =
    params.argv.dev || managedByLaunchd
      ? undefined
      : spawnFailOpenGuard(params.host, params.port, process.pid);
  const readinessHost = params.host === "0.0.0.0" ? "127.0.0.1" : params.host;
  if (!socketWorker) {
    await waitForProxyReadiness({
      host: readinessHost,
      port: params.port,
    });
  }
  markProxyReady(params.readiness);
  let updateReconciled = false;
  const reconcileActivatedUpdate = async (): Promise<void> => {
    if (updateReconciled) {
      return;
    }
    updateReconciled = true;
    try {
      const { reconcileRunningUpdate } =
        await import("../../lib/proxy/updateState.js");
      if (reconcileRunningUpdate(PROXY_VERSION)) {
        logger.always(
          `[proxy] confirmed pending update is now running at v${PROXY_VERSION}`,
        );
      }
    } catch (error) {
      logger.always(
        `[proxy] WARNING: failed to reconcile update state: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };
  if (!socketWorker) {
    await reconcileActivatedUpdate();
  }
  /** Mirror the supervised worker PID into the proxy state used by status. */
  const updatePersistedUpdaterPid = (updaterPid: number | undefined): void => {
    const state = loadProxyState();
    if (!state || state.pid !== process.pid) {
      return;
    }
    saveProxyState({ ...state, updaterPid });
  };
  const updaterSupervisor =
    managedByLaunchd && !params.argv.dev && !socketWorker
      ? startUpdaterWorkerSupervisor({
          spawnWorker: () =>
            spawnProxyUpdater(readinessHost, params.port, process.pid),
          isProcessRunning,
          stopWorker: (pid) => process.kill(pid, "SIGTERM"),
          onPidChange: updatePersistedUpdaterPid,
          log: (message) => logger.always(message),
        })
      : undefined;
  const updaterPid = updaterSupervisor?.currentPid();
  const initialRuntimeConfig = params.runtimeConfigStore?.getSnapshot();
  const activeStrategy = initialRuntimeConfig
    ? initialRuntimeConfig.strategy
    : params.strategy;
  const activeProxyConfig = initialRuntimeConfig
    ? initialRuntimeConfig.proxyConfig
    : params.proxyConfig;
  const activeAccountAllowlist = initialRuntimeConfig
    ? initialRuntimeConfig.accountAllowlist
    : params.accountAllowlist;
  const activePassthrough = initialRuntimeConfig
    ? initialRuntimeConfig.passthrough
    : params.passthrough;
  const fallbackChain: FallbackInfo[] | undefined =
    activeProxyConfig?.routing?.fallbackChain?.map((entry) => ({
      provider: entry.provider as string,
      model: entry.model as string,
    }));
  const initialConfigStatus = params.runtimeConfigStore?.getStatus();
  const persistInitialProxyState = (): void => {
    const supervisorState = socketWorker ? loadProxySupervisorState() : null;
    saveProxyState({
      pid: process.pid,
      port: params.port,
      host: params.host,
      strategy: activeStrategy,
      startTime: new Date().toISOString(),
      ready: true,
      readyAt: params.readiness.readyAtMs
        ? new Date(params.readiness.readyAtMs).toISOString()
        : undefined,
      healthPath: "/health",
      statusPath: "/status",
      envFile: params.loadedEnvFile,
      fallbackChain,
      accountAllowlist: activeAccountAllowlist
        ? [...activeAccountAllowlist]
        : undefined,
      guardPid,
      updaterPid: socketWorker ? supervisorState?.updaterPid : updaterPid,
      supervisorPid: socketWorker
        ? (supervisorState?.pid ?? process.ppid)
        : undefined,
      managedBy: managedByLaunchd ? "launchd" : "manual",
      passthrough: activePassthrough,
      configGeneration: initialRuntimeConfig?.generation,
      configLoadedAt: initialRuntimeConfig?.loadedAt,
      lastConfigReloadError: initialConfigStatus?.lastReloadError,
      configFile: initialConfigStatus?.configPath,
    });
  };
  if (!socketWorker) {
    persistInitialProxyState();
  }

  const persistRuntimeConfig = (snapshot: ProxyRuntimeConfigSnapshot): void => {
    const state = loadProxyState();
    if (!state || state.pid !== process.pid) {
      return;
    }
    const status = params.runtimeConfigStore?.getStatus();
    const currentFallbackChain =
      snapshot.proxyConfig?.routing?.fallbackChain?.map((entry) => ({
        provider: entry.provider as string,
        model: entry.model as string,
      }));
    saveProxyState({
      ...state,
      strategy: snapshot.strategy,
      fallbackChain: currentFallbackChain,
      accountAllowlist: snapshot.accountAllowlist
        ? [...snapshot.accountAllowlist]
        : undefined,
      passthrough: snapshot.passthrough,
      configGeneration: snapshot.generation,
      configLoadedAt: snapshot.loadedAt,
      lastConfigReloadError: status?.lastReloadError,
    });
  };
  let stopRuntimeConfig: (() => void) | undefined;
  if (params.runtimeConfigStore) {
    const runtimeConfigStore = params.runtimeConfigStore;
    const unsubscribeReload = runtimeConfigStore.subscribeReload((result) => {
      const snapshot = runtimeConfigStore.getSnapshot();
      persistRuntimeConfig(snapshot);
      if (
        socketWorker &&
        result.applied &&
        result.changed &&
        result.environmentChanged &&
        process.connected &&
        process.send
      ) {
        try {
          process.send({
            type: "proxy-worker:replacement-requested",
            generation: getProxyWorkerGeneration(),
            pid: process.pid,
            reason: "environment",
          });
        } catch (error) {
          logger.warn(
            `[proxy] failed to request environment replacement: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    });
    const reloadOnSighup = (): void => {
      void runtimeConfigStore.reload("sighup");
    };
    runtimeConfigStore.startWatching();
    process.on("SIGHUP", reloadOnSighup);
    stopRuntimeConfig = () => {
      process.off("SIGHUP", reloadOnSighup);
      unsubscribeReload();
      runtimeConfigStore.stopWatching();
    };
    logger.always(
      `[proxy] watching configuration generation ${initialRuntimeConfig?.generation ?? 1}; send SIGHUP to reload immediately`,
    );
  }

  if (params.spinner) {
    params.spinner.succeed(chalk.green("Claude proxy started successfully"));
  }

  const isDev = params.argv.dev ?? false;
  const normalizedHost = params.host === "0.0.0.0" ? "localhost" : params.host;
  const url = `http://${normalizedHost}:${params.port}`;
  printProxyBanner(url, activeStrategy);

  if (isDev) {
    logger.always(
      `  ${chalk.bold("Mode:")}       ${chalk.magenta("dev (isolated — state in .neurolink-dev/)")}`,
    );
  } else {
    logger.always(
      `  ${chalk.bold("Mode:")}       ${chalk.cyan(activePassthrough ? "passthrough" : "full")}`,
    );
  }
  if (activePassthrough) {
    logger.always(
      chalk.yellow(
        "  ! Passthrough mode forwards client auth directly to Anthropic",
      ),
    );
    logger.always(
      chalk.dim(
        "    Stored proxy OAuth/API credentials are ignored; clients need their own valid Anthropic auth.",
      ),
    );
  }
  if (params.loadedEnvFile) {
    logger.always(
      `  ${chalk.bold("Env File:")}   ${chalk.cyan(params.loadedEnvFile)}`,
    );
  }

  if (!isDev) {
    try {
      await setClaudeProxySettings(url);
      logger.always(chalk.green("  ✓ Auto-configured Claude Code settings"));
      logger.always(
        chalk.dim("    Restart Claude Code to connect through proxy"),
      );
    } catch (error) {
      logger.debug(
        "[proxy] Failed to auto-configure Claude Code: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }

    try {
      await setOpenCodeProxySettings(`${url}/v1`);
      logger.always(chalk.green("  ✓ Auto-configured OpenCode settings"));
      logger.always(chalk.dim("    Restart OpenCode to connect through proxy"));
    } catch (error) {
      logger.debug(
        "[proxy] Failed to auto-configure OpenCode: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  } else {
    logger.always(
      chalk.dim("  ⊘ Dev mode: skipping client auto-configuration"),
    );
  }

  const maintenance = startProxyBackgroundMaintenance(params.cleanupLogs, () =>
    params.runtimeConfigStore
      ? params.runtimeConfigStore.getSnapshot().accountAllowlist
      : params.accountAllowlist,
  );
  const shutdown = registerProxyShutdownHandlers({
    server,
    host: params.host,
    port: params.port,
    isDev,
    updaterSupervisor,
    stopRuntimeConfig,
    registerSignals: !socketWorker,
    ...maintenance,
  });
  if (socketWorker) {
    attachSocketWorkerProcess(server as import("node:http").Server, {
      generation: getProxyWorkerGeneration(),
      version: PROXY_VERSION,
      onActivated: () => {
        persistInitialProxyState();
        void reconcileActivatedUpdate();
      },
      onDrained: () => {
        void shutdown("ROLLING_DRAIN", { skipServerClose: true });
      },
    });
  }
}

async function runLaunchdProxySupervisor(
  argv: ProxyStartArgs,
  spinner: ProxySpinner,
): Promise<void> {
  await ensureProxyStartAllowed(spinner);
  const entryScript = process.argv[1];
  if (!entryScript) {
    throw new Error("proxy supervisor cannot resolve the CLI entry script");
  }
  const host = argv.host ?? "127.0.0.1";
  const port = argv.port ?? 55669;
  const workerArgs = process.argv.slice(2);
  const supervisorStartedAt = new Date().toISOString();
  let currentUpdaterPid: number | undefined;
  const rollingServer = await startRollingProxyServer({
    host,
    port,
    initialVersion: PROXY_VERSION,
    spawnWorker: (generation, expectedVersion) =>
      spawnProxySocketWorker({
        generation,
        expectedVersion,
        command: TRAMPOLINE_PATH,
        args: workerArgs,
        env: {
          NEUROLINK_PROXY_UPDATE_CONTROL_TOKEN: PROXY_UPDATE_CONTROL_TOKEN,
          NEUROLINK_PROXY_TRAMPOLINE_EXEC_ONLY: "1",
        },
      }),
    onStateChange: (snapshot) => {
      saveProxySupervisorState({
        pid: process.pid,
        host,
        port,
        startTime: supervisorStartedAt,
        version: PROXY_VERSION,
        updaterPid: currentUpdaterPid,
        rolling: snapshot,
      });
    },
    log: (message) => logger.always(message),
  });

  let rollingReplacement: Promise<void> | null = null;
  const activatePendingUpdate = (): void => {
    if (rollingReplacement) {
      return;
    }
    let pendingVersion: string | undefined;
    try {
      pendingVersion = loadUpdateState()?.pendingRestartVersion ?? undefined;
    } catch (error) {
      logger.always(
        `[proxy-supervisor] failed to read pending update state: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }
    if (!pendingVersion || !/^\d+\.\d+\.\d+$/.test(pendingVersion)) {
      logger.always(
        "[proxy-supervisor] ignored update activation without a valid pending version",
      );
      return;
    }
    logger.always(
      `[proxy-supervisor] preparing rolling activation for v${pendingVersion}`,
    );
    rollingReplacement = rollingServer
      .replace(pendingVersion)
      .then(() => {
        logger.always(
          `[proxy-supervisor] rolling activation complete version=${pendingVersion}`,
        );
      })
      .catch((error) => {
        logger.always(
          `[proxy-supervisor] rolling activation failed version=${pendingVersion}: ${error instanceof Error ? error.message : String(error)}`,
        );
      })
      .finally(() => {
        rollingReplacement = null;
      });
  };
  process.on("SIGUSR2", activatePendingUpdate);

  const readinessHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  const updatePersistedUpdaterPid = (updaterPid: number | undefined): void => {
    currentUpdaterPid = updaterPid;
    const state = loadProxySupervisorState();
    if (!state || state.pid !== process.pid) {
      return;
    }
    saveProxySupervisorState({ ...state, updaterPid });
  };
  const updaterSupervisor = startUpdaterWorkerSupervisor({
    spawnWorker: () =>
      spawnProxyUpdater(
        readinessHost,
        rollingServer.address.port,
        process.pid,
        true,
      ),
    isProcessRunning,
    stopWorker: (pid) => process.kill(pid, "SIGTERM"),
    onPidChange: updatePersistedUpdaterPid,
    log: (message) => logger.always(message),
  });
  updatePersistedUpdaterPid(updaterSupervisor.currentPid());

  if (spinner) {
    spinner.succeed(
      chalk.green("Claude proxy supervisor started successfully"),
    );
  }
  logger.always(
    `[proxy-supervisor] listening on ${host}:${rollingServer.address.port} workerPid=${rollingServer.snapshot().active?.pid ?? "unknown"} version=${PROXY_VERSION}`,
  );

  let stopping = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (stopping) {
      return;
    }
    stopping = true;
    logger.always(`[proxy-supervisor] shutting down (${signal})`);
    process.off("SIGUSR2", activatePendingUpdate);
    updaterSupervisor.stop();
    await rollingServer.close();
    const supervisorState = loadProxySupervisorState();
    if (supervisorState?.pid === process.pid) {
      clearProxySupervisorState();
    }
    process.exit(0);
  };
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  await new Promise<void>(() => undefined);
}

async function startProxyCommandHandler(argv: ProxyStartArgs): Promise<void> {
  const spinner = argv.quiet ? null : ora("Starting Claude proxy...").start();
  const isDev = argv.dev ?? false;
  const socketWorker = isProxySocketWorkerProcess();

  try {
    if (!isDev && isLaunchdManagedProcess() && !socketWorker) {
      await runLaunchdProxySupervisor(argv, spinner);
      return;
    }
    // In dev mode: redirect writable state to .neurolink-dev/ and skip singleton check
    let devPaths: import("../../lib/types/index.js").ProxyPaths | undefined;
    const { resolveProxyPaths, resolveProxyUsageStatsPath } =
      await import("../../lib/proxy/proxyPaths.js");
    const proxyPaths = resolveProxyPaths(isDev);
    if (isDev) {
      devPaths = proxyPaths;
      setProxyStateDir(devPaths.stateDir);

      const { initAccountQuota } =
        await import("../../lib/proxy/accountQuota.js");
      initAccountQuota(devPaths.quotaFile);
      const { initAccountCooldown } =
        await import("../../lib/proxy/accountCooldown.js");
      initAccountCooldown(devPaths.cooldownFile);

      // Ensure the dev state directory exists
      const { mkdirSync, existsSync } = await import("fs");
      if (!existsSync(devPaths.stateDir)) {
        mkdirSync(devPaths.stateDir, { recursive: true, mode: 0o700 });
      }
    }

    if (!isDev && !socketWorker) {
      await ensureProxyStartAllowed(spinner);
    }

    const { initUsageStats, getUsageStatsPersistenceStatus } =
      await import("../../lib/proxy/usageStats.js");
    await initUsageStats(resolveProxyUsageStatsPath(proxyPaths));
    const usageStatsPersistence = getUsageStatsPersistenceStatus();
    if (usageStatsPersistence.lastError) {
      logger.warn(
        `[proxy] usage statistics persistence unavailable: ${usageStatsPersistence.lastError}`,
      );
    } else if (usageStatsPersistence.lastRecoveryAt) {
      logger.warn(
        `[proxy] recovered corrupt usage statistics state at ${new Date(usageStatsPersistence.lastRecoveryAt).toISOString()}`,
      );
    }
    if (usageStatsPersistence.terminalErrorsLastError) {
      logger.warn(
        `[proxy] terminal-error persistence unavailable: ${usageStatsPersistence.terminalErrorsLastError}`,
      );
    } else if (usageStatsPersistence.terminalErrorsLastRecoveryAt) {
      logger.warn(
        `[proxy] recovered corrupt terminal-error state at ${new Date(usageStatsPersistence.terminalErrorsLastRecoveryAt).toISOString()}`,
      );
    }

    const baseEnv = { ...process.env };
    const envResolution = resolveProxyEnvFile({
      explicitEnvFile: argv.envFile,
      env: baseEnv,
    });
    const loadedEnvFile = await loadProxyStartEnv(argv, spinner);

    // Reuse upstream TCP connections (longer keep-alive + bounded pool) instead
    // of opening a new flow per request — cuts outbound flow churn through host
    // content-filters. Runs once, after env load so it can be tuned via env.
    configureProxyKeepAliveDispatcher();

    const { neurolink, cleanupLogs } = await createProxyNeurolinkRuntime(
      devPaths?.logsDir,
    );
    const configPath = argv.config
      ? resolve(argv.config)
      : join(homedir(), ".neurolink", "proxy-config.yaml");
    const runtimeConfigStore = await ProxyRuntimeConfigStore.create({
      configPath,
      configRequired: Boolean(argv.config),
      envFilePath: envResolution.path ?? join(homedir(), ".neurolink", ".env"),
      envFileRequired: envResolution.required,
      baseEnv,
      strategyOverride: argv.strategy as ProxyStartStrategy | undefined,
      passthrough: argv.passthrough ?? false,
    });
    const initialConfig = runtimeConfigStore.getSnapshot();
    const {
      proxyConfig,
      strategy,
      modelRouter,
      passthrough,
      primaryAccountKey,
      accountAllowlist,
    } = initialConfig;
    if (spinner && proxyConfig) {
      spinner.text = `Loaded proxy config from ${configPath}`;
    }

    if (spinner) {
      spinner.text = "Configuring server...";
    }

    const port = argv.port ?? 55669;
    const host = argv.host ?? "127.0.0.1";
    const { app, readiness } = await createProxyStartApp({
      neurolink,
      modelRouter,
      strategy,
      passthrough,
      port,
      host,
      proxyConfig,
      primaryAccountKey,
      accountAllowlist,
      runtimeConfigStore,
    });

    await initializeProxyOpenTelemetry();

    if (spinner) {
      spinner.text = `Starting proxy on ${host}:${port}...`;
    }

    await startProxyRuntime({
      argv,
      spinner,
      app,
      readiness,
      host,
      port,
      strategy,
      proxyConfig,
      accountAllowlist,
      loadedEnvFile,
      passthrough,
      cleanupLogs,
      runtimeConfigStore,
    });
  } catch (error) {
    if (spinner) {
      spinner.fail(chalk.red("Failed to start proxy"));
    }
    logger.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    if (argv.debug && error instanceof Error && error.stack) {
      logger.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

// =============================================================================
// PROXY START COMMAND
// =============================================================================

export const proxyStartCommand: CommandModule<object, ProxyStartArgs> = {
  command: "start",
  describe: "Start the Claude multi-account proxy server",
  builder: (yargs: Argv) => {
    return yargs
      .option("port", {
        type: "number",
        alias: "p",
        default: 55669,
        description: "Port to listen on",
      })
      .option("host", {
        type: "string",
        alias: "H",
        default: "127.0.0.1",
        description: "Host to bind to",
      })
      .option("strategy", {
        type: "string",
        alias: "s",
        choices: ["fill-first", "round-robin"],
        description:
          "Account selection strategy for routing requests (default: fill-first)",
      })
      .option("health-interval", {
        type: "number",
        alias: "healthInterval",
        default: 30,
        description: "Health check interval in seconds",
      })
      .option("quiet", {
        type: "boolean",
        alias: "q",
        default: false,
        description: "Suppress non-essential output",
      })
      .option("debug", {
        type: "boolean",
        alias: "d",
        default: false,
        description: "Enable debug output",
      })
      .option("config", {
        type: "string",
        alias: "c",
        description: "Path to proxy config file (YAML/JSON)",
        defaultDescription: "~/.neurolink/proxy-config.yaml",
      })
      .option("env-file", {
        type: "string",
        alias: "envFile",
        description:
          "Path to proxy provider env file (overrides cwd .env for the proxy process)",
      })
      .option("passthrough", {
        type: "boolean",
        default: false,
        description:
          "Run in transparent passthrough mode (no retry, no rotation, no polyfill)",
      })
      .option("dev", {
        type: "boolean",
        default: false,
        description:
          "Run in isolated dev mode — state files scoped to .neurolink-dev/ in cwd, no client auto-configuration, no singleton check",
      })
      .example(
        "neurolink proxy start",
        "Start proxy on default port 55669 with fill-first strategy",
      )
      .example(
        "neurolink proxy start -p 8080 -s fill-first",
        "Start proxy on port 8080 with fill-first",
      )
      .example(
        "neurolink proxy start --health-interval 60",
        "Start proxy with 60-second health checks",
      ) as Argv<ProxyStartArgs>;
  },
  handler: async (argv) => {
    await startProxyCommandHandler(argv);
  },
};

// =============================================================================
// STATUS DISPLAY HELPERS
// =============================================================================

export function sanitizeProxyStatusTerminalErrorMessage(
  message: string,
): string {
  return stripVTControlCharacters(
    sanitizeForLog(redactUrlsInText(message), 700),
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

function printStatusStats(stats: StatusStats): void {
  console.info(`\n  Stats:`);
  if (stats.startedAt !== undefined) {
    console.info(`    Since:       ${new Date(stats.startedAt).toISOString()}`);
  }
  if (stats.totalAttempts !== undefined) {
    console.info(`    Attempts:    ${stats.totalAttempts}`);
  }
  console.info(
    `    Completed:   ${stats.totalRequests} total, ${stats.totalSuccess} success, ${stats.totalErrors} errors`,
  );
  if (stats.totalAttemptErrors !== undefined) {
    console.info(`    Failed attempts: ${stats.totalAttemptErrors}`);
  }
  console.info(
    `    Rate-limited attempts: ${stats.totalRateLimits}` +
      (stats.totalTransientRateLimits !== undefined &&
      stats.totalQuotaRateLimits !== undefined
        ? ` (${stats.totalTransientRateLimits} transient, ${stats.totalQuotaRateLimits} quota)`
        : ""),
  );
  if (stats.terminalErrors) {
    const causes = Object.entries(stats.terminalErrors.counts)
      .filter(([, count]) => count > 0)
      .map(([category, count]) => `${category}=${count}`)
      .join(", ");
    console.info(
      `    Error details: ${stats.terminalErrors.totalErrors}/${stats.totalErrors}` +
        (causes ? ` (${causes})` : ""),
    );
    console.info(
      `    Detail since: ${new Date(stats.terminalErrors.startedAt).toISOString()}`,
    );
    if (
      (stats.terminalErrorDetailsMissing ?? 0) > 0 ||
      (stats.terminalErrorDetailsExcess ?? 0) > 0
    ) {
      console.info(
        `    Detail gap:  ${stats.terminalErrorDetailsMissing ?? 0} missing, ${stats.terminalErrorDetailsExcess ?? 0} awaiting counter reconciliation`,
      );
    } else if (stats.terminalErrorDetailsComparable === false) {
      console.info(
        "    Detail gap:  unavailable during snapshot reconciliation",
      );
    }
    const lastError =
      stats.lastTerminalError ?? stats.terminalErrors.recent.at(-1);
    if (lastError) {
      const cause = lastError.errorType ?? lastError.category;
      const code = lastError.errorCode ? `/${lastError.errorCode}` : "";
      const account = lastError.account ? ` account=${lastError.account}` : "";
      console.info(
        `    Last error:  ${new Date(lastError.at).toISOString()} ${cause}${code} status=${lastError.status}${account}`,
      );
      if (lastError.message) {
        console.info(
          `    Last cause:  ${sanitizeProxyStatusTerminalErrorMessage(lastError.message)}`,
        );
      }
    }
  }
  if (stats.accounts?.length) {
    console.info(`\n  Accounts:`);
    const headers = [
      "ACCOUNT",
      "AUTH",
      "ATTEMPTS",
      "SUCCESS",
      "ERRORS",
      "RL",
      "STATUS",
    ];
    const rows = stats.accounts.map((account) => [
      account.label,
      account.type,
      String(account.attempts ?? account.requests ?? 0),
      String(account.success ?? 0),
      String(account.errors ?? 0),
      String(account.rateLimits ?? 0),
      (() => {
        const status =
          account.status ?? (account.cooling ? "cooling" : "active");
        const states = [status];
        if (account.expired && status !== "expired") {
          states.push("expired");
        }
        if (account.allowed === false && status !== "excluded") {
          states.push("excluded");
        }
        return states.join(", ");
      })(),
    ]);
    const widths = headers.map((header, index) =>
      Math.max(header.length, ...rows.map((row) => row[index].length)),
    );
    const numericColumns = new Set([2, 3, 4, 5]);
    /** Align text columns left and numeric account counters right. */
    const formatRow = (cells: string[]): string =>
      cells
        .map((cell, index) =>
          numericColumns.has(index)
            ? cell.padStart(widths[index])
            : cell.padEnd(widths[index]),
        )
        .join("  ");

    console.info(`    ${chalk.gray(formatRow(headers))}`);
    console.info(
      `    ${chalk.gray(widths.map((width) => "-".repeat(width)).join("  "))}`,
    );
    for (const row of rows) {
      const status = row[6];
      const formatted = formatRow(row);
      const statusStart = formatted.length - widths[6];
      const prefix = formatted.slice(0, statusStart);
      const paddedStatus = formatted.slice(statusStart);
      console.info(
        `    ${chalk.cyan(prefix.slice(0, widths[0]))}${prefix.slice(widths[0])}${status === "active" ? chalk.green(paddedStatus) : status === "cooling" ? chalk.red(paddedStatus) : chalk.yellow(paddedStatus)}`,
      );
    }
  }
}

// =============================================================================
// PROXY STATUS COMMAND
// =============================================================================

export const proxyStatusCommand: CommandModule<object, ProxyStatusArgs> = {
  command: "status",
  describe: "Show Claude proxy status",
  builder: (yargs: Argv) => {
    return yargs
      .option("format", {
        type: "string",
        choices: ["text", "json"] as const,
        default: "text" as const,
        description: "Output format",
      })
      .option("quiet", {
        type: "boolean",
        alias: "q",
        default: false,
        description: "Suppress non-essential output",
      })
      .example("neurolink proxy status", "Show proxy status")
      .example(
        "neurolink proxy status --format json",
        "Show proxy status as JSON",
      ) as Argv<ProxyStatusArgs>;
  },
  handler: async (argv) => {
    try {
      const state = loadProxyState();
      const supervisorState = loadProxySupervisorState();
      const updateState = loadUpdateState();

      const status = {
        running: false,
        pid: null as number | null,
        port: null as number | null,
        host: null as string | null,
        mode: null as "full" | "passthrough" | null,
        strategy: null as string | null,
        uptime: null as number | null,
        startTime: null as string | null,
        url: null as string | null,
        envFile: null as string | null,
        fallbackChain: null as FallbackInfo[] | null,
        accountAllowlist: null as string[] | null,
        configGeneration: null as number | null,
        configLoadedAt: null as string | null,
        lastConfigReloadError: null as string | null,
        autoUpdateEnabled: isProxyAutoUpdateEnabled(),
        workerVersion: null as string | null,
        supervisorPid: null as number | null,
        supervisorVersion: supervisorState?.version ?? null,
        supervisorRunning: false,
        rolling: null as ProxySupervisorState["rolling"] | null,
        updaterPid: null as number | null,
        updaterRunning: false,
        latestVersion: updateState?.lastCheckVersion || null,
        lastDetectedVersion: updateState?.lastCheckVersion || null,
        installedVersion:
          updateState?.installedVersion ??
          updateState?.lastUpdateVersion ??
          null,
        activatedVersion: supervisorState?.rolling.active?.version ?? null,
        pendingActivationVersion: updateState?.pendingRestartVersion ?? null,
        pendingRestartVersion: updateState?.pendingRestartVersion ?? null,
        deferredUpdate: updateState?.deferredUpdate ?? null,
        lastUpdateFailure: updateState?.lastFailure ?? null,
      };

      const workerRunning = state ? isProcessRunning(state.pid) : false;
      const supervisorPid = supervisorState?.pid ?? state?.supervisorPid;
      const supervisorRunning = supervisorPid
        ? isProcessRunning(supervisorPid)
        : false;
      const servingWorker =
        workerRunning &&
        (supervisorPid
          ? supervisorRunning &&
            (!supervisorState ||
              supervisorState.rolling.active?.pid === state?.pid)
          : true);
      if ((state || supervisorState) && (servingWorker || supervisorRunning)) {
        const servingState = servingWorker ? state : null;
        const activeHost = servingState?.host ?? supervisorState?.host ?? null;
        const activePort = servingState?.port ?? supervisorState?.port ?? null;
        status.running = true;
        status.pid = servingWorker && state ? state.pid : null;
        status.port = activePort;
        status.host = activeHost;
        status.mode = servingState
          ? servingState.passthrough
            ? "passthrough"
            : "full"
          : null;
        status.strategy = servingState?.strategy ?? null;
        status.startTime =
          (supervisorRunning ? supervisorState?.startTime : null) ??
          servingState?.startTime ??
          null;
        status.uptime = status.startTime
          ? Date.now() - new Date(status.startTime).getTime()
          : null;
        status.url =
          activeHost && activePort
            ? `http://${activeHost === "0.0.0.0" ? "localhost" : activeHost}:${activePort}`
            : null;
        status.envFile = servingState?.envFile ?? null;
        status.fallbackChain = servingState?.fallbackChain ?? null;
        status.accountAllowlist = servingState?.accountAllowlist ?? null;
        status.configGeneration = servingState?.configGeneration ?? null;
        status.configLoadedAt = servingState?.configLoadedAt ?? null;
        status.lastConfigReloadError =
          servingState?.lastConfigReloadError ?? null;
        status.supervisorPid = supervisorPid ?? null;
        status.supervisorRunning = supervisorRunning;
        status.supervisorVersion = supervisorState?.version ?? null;
        status.rolling = supervisorState?.rolling ?? null;
        status.updaterPid =
          supervisorState?.updaterPid ?? servingState?.updaterPid ?? null;
        status.updaterRunning = status.updaterPid
          ? isProcessRunning(status.updaterPid)
          : false;
      }

      // Fetch live stats before rendering (JSON or text)
      let liveStats: Record<string, unknown> | null = null;
      let liveConfig: Record<string, unknown> | null = null;
      if (status.running && status.url) {
        try {
          const statusResp = await fetch(`${status.url}/status`, {
            signal: AbortSignal.timeout(2_000),
          });
          if (statusResp.ok) {
            const statusData = (await statusResp.json()) as Record<
              string,
              unknown
            >;
            liveStats = statusData.stats as Record<string, unknown> | null;
            liveConfig = statusData.config as Record<string, unknown> | null;
            status.workerVersion =
              typeof statusData.version === "string"
                ? statusData.version
                : null;
            status.activatedVersion = status.workerVersion;
            if (typeof liveConfig?.generation === "number") {
              status.configGeneration = liveConfig.generation;
            }
            if (typeof liveConfig?.loadedAt === "string") {
              status.configLoadedAt = liveConfig.loadedAt;
            }
            status.lastConfigReloadError =
              typeof liveConfig?.lastReloadError === "string"
                ? liveConfig.lastReloadError
                : null;
          }
        } catch {
          // Non-fatal — live stats unavailable
        }
      }

      if (argv.format === "json") {
        logger.always(
          JSON.stringify(
            { ...status, stats: liveStats, config: liveConfig },
            null,
            2,
          ),
        );
        return;
      }

      // Text format
      logger.always("");
      logger.always(chalk.bold.cyan("NeuroLink Claude Proxy Status"));
      logger.always(chalk.gray("=".repeat(50)));
      logger.always("");

      if (status.running) {
        const serving = status.pid !== null;
        logger.always(
          `  ${chalk.bold("Status:")}     ${serving ? chalk.green("RUNNING") : chalk.yellow("RECOVERING")}`,
        );
        logger.always(
          `  ${chalk.bold("Worker PID:")} ${serving ? chalk.cyan(status.pid) : chalk.yellow("unavailable")}`,
        );
        if (status.supervisorPid) {
          logger.always(
            `  ${chalk.bold("Supervisor:")} ${status.supervisorRunning ? chalk.cyan(status.supervisorPid) : chalk.red(`${status.supervisorPid} (not running)`)}`,
          );
        }
        if (status.supervisorVersion) {
          logger.always(
            `  ${chalk.bold("Supervisor version:")} ${chalk.cyan(`v${status.supervisorVersion}`)}`,
          );
        }
        if (status.workerVersion) {
          logger.always(
            `  ${chalk.bold("Version:")}    ${chalk.cyan(`v${status.workerVersion}`)}`,
          );
        }
        logger.always(
          `  ${chalk.bold("URL:")}        ${chalk.cyan(status.url)}`,
        );
        logger.always(
          `  ${chalk.bold("Strategy:")}   ${chalk.cyan(status.strategy)}`,
        );
        logger.always(
          `  ${chalk.bold("Mode:")}       ${chalk.cyan(status.mode ?? "full")}`,
        );
        if (status.configGeneration !== null) {
          logger.always(
            `  ${chalk.bold("Config:")}     ${chalk.cyan(`generation ${status.configGeneration}`)}` +
              (status.configLoadedAt
                ? chalk.gray(` (${status.configLoadedAt})`)
                : ""),
          );
        }
        if (status.lastConfigReloadError) {
          logger.always(
            `  ${chalk.bold("Config error:")} ${chalk.red(status.lastConfigReloadError)}`,
          );
        }
        logger.always(
          `  ${chalk.bold("Started:")}    ${chalk.cyan(status.startTime)}`,
        );
        logger.always(
          `  ${chalk.bold("Uptime:")}     ${chalk.cyan(formatUptime(status.uptime ?? 0))}`,
        );
        logger.always(
          `  ${chalk.bold("Auto-update:")} ${status.autoUpdateEnabled ? chalk.green(status.updaterRunning ? `enabled (PID ${status.updaterPid})` : "enabled (worker unavailable)") : chalk.yellow("disabled")}`,
        );
        if (status.pendingActivationVersion) {
          // A live supervisor PID alone does NOT mean rolling handoff is
          // available: a supervisor from a build predating rolling state leaves
          // `rolling` absent, and calling that a handoff tells the operator to
          // wait for an activation that will never come. Gate on the capability,
          // not on the process.
          const rollingCapable =
            status.supervisorRunning && status.rolling !== null;
          logger.always(
            `  ${chalk.bold(rollingCapable ? "Pending handoff:" : "Pending restart:")} ${chalk.yellow(`v${status.pendingActivationVersion} installed; ${rollingCapable ? "rolling activation pending" : "restart pending"}`)}`,
          );
        }
        if (status.rolling?.candidate) {
          logger.always(
            `  ${chalk.bold("Handoff:")}    ${chalk.yellow(`preparing v${status.rolling.candidate.expectedVersion} (PID ${status.rolling.candidate.pid})`)}`,
          );
        } else if (status.rolling?.draining.length) {
          logger.always(
            `  ${chalk.bold("Handoff:")}    ${chalk.cyan(`${status.rolling.draining.length} previous worker(s) draining`)}`,
          );
        }
        if (status.deferredUpdate) {
          const active =
            status.deferredUpdate.activeRequests === null
              ? "unknown activity"
              : `${status.deferredUpdate.activeRequests} active request(s)`;
          logger.always(
            `  ${chalk.bold("Deferred:")}   ${chalk.yellow(`v${status.deferredUpdate.version} ${status.deferredUpdate.reason} (${active})`)}`,
          );
        }
        if (status.latestVersion) {
          logger.always(
            `  ${chalk.bold("Latest:")}     ${chalk.cyan(`v${status.latestVersion}`)}`,
          );
        }
        if (status.installedVersion) {
          logger.always(
            `  ${chalk.bold("Installed:")}  ${chalk.cyan(`v${status.installedVersion}`)}`,
          );
        }
        if (status.activatedVersion) {
          logger.always(
            `  ${chalk.bold("Activated:")}  ${chalk.cyan(`v${status.activatedVersion}`)}`,
          );
        }
        if (status.lastUpdateFailure) {
          logger.always(
            `  ${chalk.bold("Update error:")} ${chalk.red(`${status.lastUpdateFailure.stage}: ${status.lastUpdateFailure.message}`)}`,
          );
        }
        if (status.envFile) {
          logger.always(
            `  ${chalk.bold("Env File:")}   ${chalk.cyan(status.envFile)}`,
          );
        }
        if (status.accountAllowlist) {
          const scope =
            status.accountAllowlist.length > 0
              ? status.accountAllowlist.join(", ")
              : "none (deny all)";
          logger.always(`  ${chalk.bold("Accounts:")}   ${chalk.cyan(scope)}`);
        }

        // Display fallback chain if configured
        if (status.fallbackChain && status.fallbackChain.length > 0) {
          logger.always("");
          logger.always(chalk.bold("  Fallback Chain:"));
          for (let i = 0; i < status.fallbackChain.length; i++) {
            const entry = status.fallbackChain[i];
            const prefix = i === status.fallbackChain.length - 1 ? "└─" : "├─";
            logger.always(
              `    ${chalk.gray(prefix)} ${chalk.cyan(entry.provider)}/${chalk.cyan(entry.model)}`,
            );
          }
        }

        // Try to fetch live status from the running proxy
        try {
          const response = await fetch(`${status.url}/health`, {
            signal: AbortSignal.timeout(2_000),
          });
          if (response.ok) {
            const liveStatus = (await response.json()) as {
              status: string;
              strategy: string;
              uptime: number;
            };
            logger.always("");
            logger.always(
              `  ${chalk.bold("Live:")}       ${chalk.green(liveStatus.status)}`,
            );
          }
        } catch {
          // Live status fetch failed — show only persisted state
          logger.always("");
          logger.always(
            chalk.gray("  (Could not reach proxy for live status)"),
          );
        }

        // Try to get detailed stats
        try {
          const liveUrl = status.url;
          const statusResp = await fetch(`${liveUrl}/status`, {
            signal: AbortSignal.timeout(2_000),
          });
          if (statusResp.ok) {
            const statusData = (await statusResp.json()) as {
              stats?: StatusStats;
            };
            if (statusData.stats) {
              printStatusStats(statusData.stats);
            }
          }
        } catch {
          /* non-fatal */
        }
      } else {
        logger.always(
          `  ${chalk.bold("Status:")}     ${chalk.yellow("NOT RUNNING")}`,
        );
        logger.always("");
        logger.always(
          chalk.gray("  Start the proxy with: neurolink proxy start"),
        );
      }

      logger.always("");
    } catch (error) {
      logger.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exit(1);
    }
  },
};

// =============================================================================
// PROXY TELEMETRY COMMAND
// =============================================================================

const PROXY_TELEMETRY_ACTIONS = [
  "setup",
  "start",
  "stop",
  "status",
  "logs",
  "import-dashboard",
] as const;

export const proxyTelemetryCommand: CommandModule<object, ProxyTelemetryArgs> =
  {
    command: "telemetry <action>",
    describe:
      "Manage the local OpenObserve stack and dashboard for proxy observability",
    builder: (yargs: Argv) =>
      yargs
        .positional("action", {
          type: "string",
          choices: [...PROXY_TELEMETRY_ACTIONS],
          describe:
            "Telemetry action: setup, start, stop, status, logs, or import-dashboard",
        })
        .option("quiet", {
          type: "boolean",
          alias: "q",
          default: false,
          description: "Suppress the local CLI spinner and delegate directly",
        })
        .example(
          "neurolink proxy telemetry setup",
          "Start OpenObserve, start the OTEL collector, and import the dashboard",
        )
        .example(
          "neurolink proxy telemetry start",
          "Start the local proxy telemetry stack without re-importing the dashboard",
        )
        .example(
          "neurolink proxy telemetry stop",
          "Stop the local OpenObserve and OTEL collector containers",
        ) as Argv<ProxyTelemetryArgs>,
    handler: async (argv) => {
      const action = argv.action as ProxyTelemetryAction;
      const spinner = argv.quiet
        ? null
        : ora(`Running proxy telemetry ${action}...`).start();

      try {
        if (spinner) {
          spinner.stop();
        }
        await runProxyTelemetryManager(action);
        if (spinner) {
          spinner.succeed(`proxy telemetry ${action} completed`);
        }
      } catch (error) {
        if (spinner) {
          spinner.fail(`proxy telemetry ${action} failed`);
        }
        logger.error(
          chalk.red(
            `Error: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
        process.exit(1);
      }
    },
  };

// =============================================================================
// PROXY FAIL-OPEN GUARD COMMAND (HIDDEN)
// =============================================================================

export const proxyGuardCommand: CommandModule<object, ProxyGuardArgs> = {
  command: "guard",
  describe: false,
  builder: (yargs: Argv) => {
    return yargs
      .option("host", {
        type: "string",
        default: "127.0.0.1",
      })
      .option("port", {
        type: "number",
        default: 55669,
      })
      .option("parent-pid", {
        type: "number",
        alias: "parentPid",
      })
      .option("max-wait-ms", {
        type: "number",
        alias: "maxWaitMs",
        default: 0,
      })
      .option("failure-threshold", {
        type: "number",
        alias: "failureThreshold",
        default: 5,
      })
      .option("poll-interval-ms", {
        type: "number",
        alias: "pollIntervalMs",
        default: 1_000,
      })
      .option("updater-only", {
        type: "boolean",
        alias: "updaterOnly",
        default: false,
      })
      .option("quiet", {
        type: "boolean",
        default: true,
      }) as Argv<ProxyGuardArgs>;
  },
  handler: async (argv) => {
    const host = argv.host ?? "127.0.0.1";
    const port = argv.port ?? 55669;
    const parentPid = Number(argv.parentPid);
    const maxWaitMsArg = Number(argv.maxWaitMs ?? 0);
    const maxWaitMs =
      Number.isFinite(maxWaitMsArg) && maxWaitMsArg > 0
        ? Math.max(1_000, maxWaitMsArg)
        : 0;
    const failureThreshold = Math.max(1, Number(argv.failureThreshold ?? 5));
    const pollIntervalMs = Math.max(250, Number(argv.pollIntervalMs ?? 1_000));
    const updaterOnly = argv.updaterOnly === true;
    const rollingSupervisor = process.env[PROXY_ROLLING_SUPERVISOR_ENV] === "1";

    if (!Number.isFinite(parentPid) || parentPid <= 0) {
      return;
    }

    // Package mutation belongs to the dedicated launchd updater worker. The
    // foreground fail-open guard remains cleanup-only.
    const UPDATE_CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours
    const QUIET_THRESHOLD_MS = 120 * 1000; // 2 minutes of silence
    const NATURAL_WINDOW_WAIT_MS = 10 * 60 * 1000; // prefer no admission pause
    const UPDATE_DRAIN_TIMEOUT_MS = 30 * 60 * 1000; // preserve long streams
    const UPDATE_RETRY_DELAY_MS = 5 * 60 * 1000;
    const UPDATE_RETRY_MAX_DELAY_MS = 30 * 60 * 1000;
    const UPDATE_RETRY_MAX_ATTEMPTS = 4;
    const UPDATE_ACTIVITY_POLL_MS = 10 * 1000;
    const UPDATE_TIMEOUT_MS = 30 * 1000; // 30 seconds to come healthy

    // Get running version from /health endpoint (with timeout to avoid hanging)
    let runningVersion = PROXY_VERSION; // fallback
    try {
      const healthResp = await fetch(`http://${host}:${port}/health`, {
        signal: AbortSignal.timeout(5_000),
      });
      const healthData = (await healthResp.json()) as { version?: string };
      runningVersion = healthData.version ?? PROXY_VERSION;
    } catch {
      /* use fallback */
    }

    // Auto-update only works on macOS with launchd. On other platforms,
    // there's no restart mechanism, so skip the update loop entirely.
    const canAutoUpdate =
      updaterOnly &&
      isProxyAutoUpdateEnabled() &&
      process.platform === "darwin" &&
      (await isLaunchdManaging());

    let guardStopping = false;
    let updateCheckTimeout: NodeJS.Timeout | undefined;
    let updateCheckInterval: NodeJS.Timeout | undefined;
    let updateRetryTimeout: NodeJS.Timeout | undefined;
    let updateRetryAttempts = 0;
    let updateRetryVersion: string | null = null;
    const stopUpdateChecks = (): void => {
      guardStopping = true;
      if (updateCheckTimeout) {
        clearTimeout(updateCheckTimeout);
        updateCheckTimeout = undefined;
      }
      if (updateCheckInterval) {
        clearInterval(updateCheckInterval);
        updateCheckInterval = undefined;
      }
      if (updateRetryTimeout) {
        clearTimeout(updateRetryTimeout);
        updateRetryTimeout = undefined;
      }
    };
    /** Keep state-write failures observable without terminating the updater. */
    const persistUpdaterState = (
      operation: string,
      action: () => void,
    ): void => {
      try {
        action();
      } catch (error) {
        logger.always(
          `[updater] WARNING: failed to ${operation}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };
    let updateInProgress = false;
    let updateRestartInProgress = false;
    const runUpdateCheck = async () => {
      if (guardStopping || updateInProgress) {
        return;
      }
      updateInProgress = true;
      let updateVersion = runningVersion;
      let drainActive = false;
      try {
        // Lazy-load update modules so they're only imported at check time
        const { checkForUpdate } =
          await import("../../lib/proxy/updateChecker.js");

        // 1. Check for update
        let result = await checkForUpdate(runningVersion);
        updateVersion = result.latestVersion;
        persistUpdaterState("record update check", () =>
          recordCheck(result.latestVersion),
        );

        if (!result.updateAvailable) {
          updateRetryAttempts = 0;
          updateRetryVersion = null;
          persistUpdaterState("clear update deferral", () =>
            clearUpdateDeferral(),
          );
          return;
        }
        const initiallyPendingRestart =
          loadUpdateState()?.pendingRestartVersion === result.latestVersion;
        if (
          isVersionSuppressed(result.latestVersion) &&
          !initiallyPendingRestart
        ) {
          logger.debug(
            `[guard] version ${result.latestVersion} is suppressed, skipping`,
          );
          return;
        }

        logger.always(
          `[updater] update available: ${runningVersion} → ${result.latestVersion}`,
        );

        if (!rollingSupervisor) {
          // Legacy launchd services must become idle before their listener is
          // restarted. Rolling services keep the current worker serving while
          // the candidate package is installed and validated.
          let lastDeferralSignature = "";
          const waitForWindow = async (quietWaitMs: number) => {
            const window = await waitForProxyUpdateWindow({
              quietThresholdMs: QUIET_THRESHOLD_MS,
              quietWaitMs,
              drainWaitMs: UPDATE_DRAIN_TIMEOUT_MS,
              pollIntervalMs: UPDATE_ACTIVITY_POLL_MS,
              getActivity: () => getProxyRuntimeActivity(host, port),
              setDraining: async (draining) => {
                const changed = await setProxyUpdateDrain(host, port, draining);
                if (changed) {
                  logger.always(
                    `[updater] ${draining ? "draining new inference requests" : "inference admission resumed"}`,
                  );
                }
                return changed;
              },
              isStopping: () => guardStopping,
              isParentAlive: () =>
                getProcessStatus(parentPid) !== "not_running",
              onPhase: (phase, activity) => {
                const reason =
                  phase === "waiting_for_quiet" && !activity
                    ? "activity_unavailable"
                    : phase;
                const signature = `${reason}:${activity?.activeRequests ?? "unknown"}`;
                if (signature !== lastDeferralSignature) {
                  lastDeferralSignature = signature;
                  persistUpdaterState("record update deferral", () =>
                    recordUpdateDeferred(
                      result.latestVersion,
                      reason,
                      activity?.activeRequests ?? null,
                    ),
                  );
                }
                logger.debug(
                  `[updater] ${reason} (${activity?.activeRequests ?? "unknown"} active requests)`,
                );
              },
            });
            drainActive = drainActive || window.draining;
            return window;
          };

          let updateWindow = await waitForWindow(NATURAL_WINDOW_WAIT_MS);
          if (!updateWindow.ready) {
            if (updateWindow.reason === "drain_failed") {
              persistUpdaterState("record unavailable update drain", () =>
                recordUpdateDeferred(
                  result.latestVersion,
                  "drain_unavailable",
                  null,
                ),
              );
            }
            scheduleUpdateRetry(
              "update window unavailable",
              result.latestVersion,
            );
            return;
          }

          // Hold admission closed through install and restart after a quiet
          // observation, closing the race with a newly admitted request.
          if (!drainActive) {
            updateWindow = await waitForWindow(0);
            if (!updateWindow.ready) {
              scheduleUpdateRetry(
                "update drain unavailable",
                result.latestVersion,
              );
              return;
            }
          }
        } else {
          logger.always(
            `[updater] rolling supervisor will keep v${runningVersion} serving during installation`,
          );
        }

        // Refresh after waiting so a long deferral can never install a stale
        // target while a newer release is already available.
        const refreshedResult = await checkForUpdate(runningVersion);
        result = refreshedResult;
        updateVersion = result.latestVersion;
        persistUpdaterState("record refreshed update check", () =>
          recordCheck(result.latestVersion),
        );
        if (!result.updateAvailable) {
          persistUpdaterState("clear update deferral", () =>
            clearUpdateDeferral(),
          );
          return;
        }
        const pendingRestart =
          loadUpdateState()?.pendingRestartVersion === result.latestVersion;
        if (isVersionSuppressed(result.latestVersion) && !pendingRestart) {
          logger.debug(
            `[guard] refreshed version ${result.latestVersion} is suppressed, skipping`,
          );
          return;
        }
        persistUpdaterState("clear update deferral", () =>
          clearUpdateDeferral(),
        );
        logger.always(
          `[updater] ${rollingSupervisor ? "rolling activation prepared" : "safe update window acquired"} for v${result.latestVersion}`,
        );

        // 3. Install update (validate version string before passing to shell)
        if (!/^\d+\.\d+\.\d+$/.test(result.latestVersion)) {
          const message = `invalid version format: ${result.latestVersion}`;
          logger.always(
            `[guard] WARNING: invalid version format "${result.latestVersion}", skipping`,
          );
          persistUpdaterState("record update failure", () =>
            recordUpdateFailure(result.latestVersion, "check", message),
          );
          return;
        }

        const { execFileSync } = await import("node:child_process");
        if (!pendingRestart) {
          const installerResolution = resolveGlobalInstaller({
            entryScript: process.argv[1],
          });
          logger.always(
            `[updater] package-manager candidates: ${installerResolution.tried
              .map(
                (candidate) =>
                  `${candidate.kind}:${candidate.bin}(${candidate.installable ? `v${candidate.version}` : (candidate.reason ?? "unusable")})`,
              )
              .join(", ")}`,
          );
          const installer = installerResolution.installer;
          if (!installer) {
            const message =
              "no package manager has a writable global root and executable directory";
            logger.always(`[updater] WARNING: ${message}; skipping this cycle`);
            persistUpdaterState("record update failure", () =>
              recordUpdateFailure(result.latestVersion, "install", message),
            );
            return;
          }
          logger.always(
            `[updater] installing @juspay/neurolink@${result.latestVersion} via ${installer.kind} ${installer.bin} (v${installer.version})`,
          );
          if (guardStopping || getProcessStatus(parentPid) === "not_running") {
            return;
          }
          try {
            execFileSync(
              installer.bin,
              getGlobalInstallArgs(
                installer.kind,
                `@juspay/neurolink@${result.latestVersion}`,
              ),
              {
                timeout: 120_000,
                stdio: "pipe",
              },
            );
          } catch (installErr) {
            const detail = describeInstallFailure(installErr);
            logger.always(
              `[updater] WARNING: global install failed:\n${detail}`,
            );
            persistUpdaterState("record update failure", () =>
              recordUpdateFailure(result.latestVersion, "install", detail),
            );
            if (isTransientInstallFailure(installErr)) {
              scheduleUpdateRetry(
                "transient install failure",
                result.latestVersion,
              );
            }
            return;
          }
        } else {
          logger.always(
            `[updater] resuming pending restart for already-installed v${result.latestVersion}`,
          );
        }

        // 4. Refresh and validate the stable trampoline. The plist already
        // points at this path, so it must not be unloaded or rewritten here.
        try {
          writeTrampoline();

          const validation = await validateInstalledVersion({
            binPath: TRAMPOLINE_PATH,
            expectedVersion: result.latestVersion,
          });
          if (validation.version !== result.latestVersion) {
            const message = `trampoline validation failed after ${validation.attempts} attempts: ${validation.failure ?? "unknown failure"}`;
            logger.always(`[updater] WARNING: ${message}; restart deferred`);
            persistUpdaterState("record update failure", () =>
              recordUpdateFailure(result.latestVersion, "validation", message),
            );
            persistUpdaterState("abandon invalid pending update", () =>
              abandonPendingUpdate(result.latestVersion),
            );
            return;
          }

          persistUpdaterState("record installed update", () =>
            recordUpdateInstalled(result.latestVersion),
          );
          updateRetryAttempts = 0;
          updateRetryVersion = null;
          logger.always(
            `[updater] trampoline validated at v${validation.version} after ${validation.attempts} attempt(s)`,
          );
        } catch (trampolineError) {
          const message =
            trampolineError instanceof Error
              ? trampolineError.message
              : String(trampolineError);
          logger.always(
            `[updater] WARNING: failed to refresh trampoline; refusing restart: ${message}`,
          );
          persistUpdaterState("record update failure", () =>
            recordUpdateFailure(result.latestVersion, "validation", message),
          );
          persistUpdaterState("abandon invalid pending update", () =>
            abandonPendingUpdate(result.latestVersion),
          );
          return;
        }

        if (guardStopping || getProcessStatus(parentPid) === "not_running") {
          return;
        }

        updateRestartInProgress = true;
        if (rollingSupervisor) {
          logger.always(
            `[updater] requesting rolling activation of v${result.latestVersion}`,
          );
          try {
            process.kill(parentPid, "SIGUSR2");
          } catch (activationError) {
            updateRestartInProgress = false;
            const message =
              activationError instanceof Error
                ? activationError.message
                : String(activationError);
            logger.always(
              `[updater] WARNING: rolling activation request failed: ${message}`,
            );
            persistUpdaterState("record update failure", () =>
              recordUpdateFailure(result.latestVersion, "restart", message),
            );
            return;
          }
        } else {
          // Compatibility fallback for services installed before rolling
          // supervision was enabled.
          logger.always(`[updater] restarting proxy via launchctl kickstart`);
          const uid = process.getuid?.() ?? 501;
          try {
            execFileSync(
              "launchctl",
              ["kickstart", "-k", `gui/${uid}/${PLIST_LABEL}`],
              {
                timeout: 10_000,
                stdio: "pipe",
              },
            );
          } catch (restartErr) {
            updateRestartInProgress = false;
            const message =
              restartErr instanceof Error
                ? restartErr.message
                : String(restartErr);
            logger.always(
              `[updater] WARNING: launchctl kickstart failed: ${message}`,
            );
            persistUpdaterState("record update failure", () =>
              recordUpdateFailure(result.latestVersion, "restart", message),
            );
            return;
          }
        }
        drainActive = false;

        // 5. Wait for healthy restart
        let healthy = false;
        let rollingFailure: string | null = null;
        const restartStart = Date.now();
        while (Date.now() - restartStart < UPDATE_TIMEOUT_MS) {
          await new Promise((r) => setTimeout(r, 2000));
          try {
            const resp = await fetch(`http://${host}:${port}/health`, {
              signal: AbortSignal.timeout(3000),
            });
            if (resp.ok) {
              const data = (await resp.json()) as { version?: string };
              if (data.version === result.latestVersion) {
                healthy = true;
                break;
              }
            }
          } catch {
            /* retry */
          }
          if (rollingSupervisor) {
            rollingFailure = await getRollingActivationFailure(
              host,
              port,
              result.latestVersion,
            );
            if (rollingFailure) {
              break;
            }
          }
        }

        if (healthy) {
          logger.always(
            `[updater] update successful: now running ${result.latestVersion}`,
          );
          persistUpdaterState("record successful update", () =>
            recordSuccessfulUpdate(result.latestVersion),
          );
          // The replacement proxy starts a worker running the new version.
          process.exit(0);
        } else {
          logger.always(
            `[updater] WARNING: proxy unhealthy after update to ${result.latestVersion}`,
          );
          let failureMessage = rollingFailure
            ? `rolling candidate failed: ${rollingFailure}`
            : `proxy did not report v${result.latestVersion} healthy within ${UPDATE_TIMEOUT_MS}ms`;
          if (rollingSupervisor) {
            try {
              const rollbackResolution = resolveGlobalInstaller({
                entryScript: process.argv[1],
              });
              const rollbackInstaller = rollbackResolution.installer;
              if (!rollbackInstaller) {
                throw new Error(
                  "no usable package manager is available for rollback",
                );
              }
              logger.always(
                `[updater] rolling activation failed; restoring @juspay/neurolink@${runningVersion}`,
              );
              execFileSync(
                rollbackInstaller.bin,
                getGlobalInstallArgs(
                  rollbackInstaller.kind,
                  `@juspay/neurolink@${runningVersion}`,
                ),
                { timeout: 120_000, stdio: "pipe" },
              );
              writeTrampoline();
              const rollbackValidation = await validateInstalledVersion({
                binPath: TRAMPOLINE_PATH,
                expectedVersion: runningVersion,
              });
              if (rollbackValidation.version !== runningVersion) {
                throw new Error(
                  `rollback trampoline reported v${rollbackValidation.version ?? "unknown"}; expected v${runningVersion}`,
                );
              }
              // Reinstalling the old package is not enough: the supervisor was
              // told to activate result.latestVersion, so its recovery loop
              // keeps demanding the new version against the now-downgraded
              // installation and can never serve a worker again. Re-point the
              // supervisor at runningVersion and report success only once it
              // actually serves that version again.
              const rollbackActivated = await activateRollbackVersion(
                host,
                port,
                parentPid,
                runningVersion,
                UPDATE_TIMEOUT_MS,
              );
              if (!rollbackActivated) {
                throw new Error(
                  `supervisor did not report v${runningVersion} healthy within ${UPDATE_TIMEOUT_MS}ms after rollback`,
                );
              }
              logger.always(
                `[updater] package rollback complete; v${runningVersion} active again`,
              );
            } catch (rollbackError) {
              const rollbackMessage =
                rollbackError instanceof Error
                  ? rollbackError.message
                  : String(rollbackError);
              failureMessage += `; package rollback failed: ${rollbackMessage}`;
              logger.always(`[updater] WARNING: ${failureMessage}`);
            }
          }
          persistUpdaterState("record update failure", () =>
            recordUpdateFailure(result.latestVersion, "health", failureMessage),
          );
          persistUpdaterState("abandon unhealthy pending update", () =>
            abandonPendingUpdate(result.latestVersion),
          );
          persistUpdaterState("suppress unhealthy update", () =>
            suppressVersion(result.latestVersion, "unhealthy_after_restart"),
          );
          updateRestartInProgress = false;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.always(`[updater] update check error: ${message}`);
        persistUpdaterState("record update failure", () =>
          recordUpdateFailure(updateVersion, "check", message),
        );
      } finally {
        if (drainActive && !updateRestartInProgress) {
          const resumed = await resumeProxyUpdateDrain(host, port);
          if (!resumed && getProcessStatus(parentPid) !== "not_running") {
            logger.always(
              `[updater] WARNING: failed to resume inference admission after deferred update`,
            );
          }
        }
        updateInProgress = false;
      }
    };

    const scheduleUpdateRetry = (reason: string, version: string): void => {
      if (guardStopping || updateRetryTimeout) {
        return;
      }
      if (updateRetryVersion !== version) {
        updateRetryVersion = version;
        updateRetryAttempts = 0;
      }
      if (updateRetryAttempts >= UPDATE_RETRY_MAX_ATTEMPTS) {
        logger.always(
          `[updater] retry budget exhausted after ${updateRetryAttempts} attempt(s); waiting for the periodic check`,
        );
        return;
      }
      updateRetryAttempts += 1;
      const delay = Math.min(
        UPDATE_RETRY_MAX_DELAY_MS,
        UPDATE_RETRY_DELAY_MS * 2 ** (updateRetryAttempts - 1),
      );
      logger.always(
        `[updater] retry scheduled reason=${reason} attempt=${updateRetryAttempts}/${UPDATE_RETRY_MAX_ATTEMPTS} delayMs=${delay}`,
      );
      updateRetryTimeout = setTimeout(() => {
        updateRetryTimeout = undefined;
        void runUpdateCheck();
      }, delay);
      updateRetryTimeout.unref?.();
    };

    // Run first check after a short delay, then on interval
    if (canAutoUpdate) {
      updateCheckTimeout = setTimeout(runUpdateCheck, 30_000);
      updateCheckInterval = setInterval(
        runUpdateCheck,
        UPDATE_CHECK_INTERVAL_MS,
      );
    }

    const startedAt = Date.now();
    let parentStatus = getProcessStatus(parentPid);
    let consecutiveUnhealthy = 0;

    // Keep monitoring for as long as the parent can affect Claude settings.
    while (true) {
      const healthy = await isProxyHealthy(host, port, 1_500);

      if (healthy) {
        if (updaterOnly && consecutiveUnhealthy >= failureThreshold) {
          logger.always(
            `[updater] proxy health recovered after ${consecutiveUnhealthy} failed checks`,
          );
        }
        consecutiveUnhealthy = 0;
      } else {
        consecutiveUnhealthy += 1;
        if (updaterOnly && consecutiveUnhealthy === failureThreshold) {
          logger.always(
            `[updater] proxy health unavailable after ${consecutiveUnhealthy} checks; worker remains active`,
          );
        }
      }

      if (parentStatus === "not_running" && !updateRestartInProgress) {
        if (updaterOnly) {
          logger.always(
            `[updater] parent pid=${parentPid} exited; updater worker stopping`,
          );
        }
        // Parent is gone (and we're not mid-update-restart).
        // If endpoint is still healthy, another proxy took over.
        if (healthy) {
          stopUpdateChecks();
          return;
        }
        break;
      }

      if (
        !updaterOnly &&
        !updateRestartInProgress &&
        !healthy &&
        consecutiveUnhealthy >= failureThreshold
      ) {
        // A detached guard cannot safely decide that a live process should be
        // replaced. Leave recovery to the foreground operator or launchd.
        if (!argv.quiet) {
          logger.always(
            `[proxy] fail-open guard observed an unhealthy live parent; leaving process supervision unchanged`,
          );
        }
        stopUpdateChecks();
        return;
      }

      if (maxWaitMs > 0 && Date.now() - startedAt >= maxWaitMs) {
        stopUpdateChecks();
        return;
      }

      await sleep(pollIntervalMs);
      parentStatus = getProcessStatus(parentPid);
    }

    stopUpdateChecks();

    if (updaterOnly) {
      return;
    }

    const guardHost = host === "0.0.0.0" ? "localhost" : host;
    const expectedBaseUrl = `http://${guardHost}:${port}`;

    // The parent is confirmed gone and no replacement is healthy. Foreground
    // guards are cleanup-only; they never restart or signal proxy processes.
    const cleared = await clearClaudeProxySettings(expectedBaseUrl);
    try {
      await clearOpenCodeProxySettings(`${expectedBaseUrl}/v1`);
    } catch {
      // non-fatal
    }

    const state = loadProxyState();
    if (
      state &&
      state.host === host &&
      state.port === port &&
      !isProcessRunning(state.pid)
    ) {
      clearProxyState();
    }

    if (cleared && !argv.quiet) {
      logger.always(
        `[proxy] fail-open guard removed stale ${expectedBaseUrl} from Claude settings`,
      );
    }
  },
};

// =============================================================================
// PROXY SETUP COMMAND
// =============================================================================

export const proxySetupCommand: CommandModule = {
  command: "setup",
  describe:
    "One-command setup: login + install proxy as persistent service + configure Claude Code",
  builder: (yargs: Argv) => {
    return yargs
      .option("port", {
        type: "number",
        alias: "p",
        default: 55669,
        description: "Proxy port",
      })
      .option("method", {
        type: "string",
        default: "oauth",
        choices: ["oauth", "api-key"],
        description: "Auth method",
      })
      .option("no-service", {
        type: "boolean",
        default: false,
        description:
          "Skip service installation and start proxy in foreground instead",
      })
      .option("env-file", {
        type: "string",
        alias: "envFile",
        description: "Path to proxy provider env file to persist for the proxy",
      })
      .example("neurolink proxy setup", "Full setup with defaults")
      .example("neurolink proxy setup -p 9000", "Setup on custom port")
      .example(
        "neurolink proxy setup --no-service",
        "Setup without installing as service",
      ) as Argv;
  },
  handler: async (argv) => {
    console.info("\n" + chalk.bold("NeuroLink Proxy Setup\n"));

    const port = (argv.port as number) ?? 55669;
    const noService = argv["no-service"] as boolean;

    // Step 1: Check existing accounts
    console.info(chalk.blue("Step 1:") + " Checking accounts...");
    const { tokenStore } = await import("../../lib/auth/tokenStore.js");
    const allKeys = await tokenStore.listProviders();
    const anthropicKeys = allKeys.filter(
      (k) => k.startsWith("anthropic:") || k === "anthropic",
    );
    const validKeys: string[] = [];
    for (const key of anthropicKeys) {
      const tokens = await tokenStore.loadTokens(key);
      if (tokens && (!tokens.expiresAt || tokens.expiresAt > Date.now())) {
        validKeys.push(key);
      }
    }

    // Also check legacy credentials file
    try {
      const fs = await import("fs");
      const credPath = join(
        homedir(),
        ".neurolink",
        "anthropic-credentials.json",
      );
      const creds = JSON.parse(fs.readFileSync(credPath, "utf8"));
      if (creds.oauth?.accessToken && creds.oauth?.expiresAt > Date.now()) {
        validKeys.push("legacy-anthropic");
        console.info(chalk.green("  ✓ Found valid OAuth account"));
      }
    } catch {
      /* no file */
    }

    if (validKeys.length > 0) {
      console.info(
        chalk.green(`  ✓ Found ${validKeys.length} valid account(s)`),
      );
    } else {
      // Step 2: Login
      console.info(
        chalk.yellow("  No valid accounts found. Starting login..."),
      );
      console.info(chalk.blue("\nStep 2:") + " Authenticating...");
      const { handleLogin } = await import("./auth.js");
      await handleLogin({
        provider: "anthropic",
        method: argv.method as string,
      } as Parameters<typeof handleLogin>[0]);
      console.info(chalk.green("  ✓ Authentication complete"));
    }

    // Step 3: Install as persistent service (macOS) or start foreground
    const stepNum = validKeys.length > 0 ? 2 : 3;

    if (!noService && process.platform === "darwin") {
      console.info(
        chalk.blue(`\nStep ${stepNum}:`) +
          " Installing proxy as persistent service...",
      );
      await (proxyInstallCommand.handler as Function)({
        ...argv,
        port,
        host: "127.0.0.1",
      });

      // Step 4: Configure Claude Code settings
      const nextStep = stepNum + 1;
      console.info(
        chalk.blue(`\nStep ${nextStep}:`) + " Configuring Claude Code...",
      );
      const url = `http://127.0.0.1:${port}`;
      try {
        await setClaudeProxySettings(url);
        console.info(chalk.green("  ✓ Claude Code configured"));
      } catch (e) {
        console.info(
          chalk.yellow(
            `  ⚠ Could not auto-configure Claude Code: ${e instanceof Error ? e.message : String(e)}`,
          ),
        );
        console.info(chalk.yellow(`  Set manually: ANTHROPIC_BASE_URL=${url}`));
      }
      try {
        await setOpenCodeProxySettings(`${url}/v1`);
        console.info(chalk.green("  ✓ OpenCode configured"));
      } catch (e) {
        console.info(
          chalk.yellow(
            `  ⚠ Could not auto-configure OpenCode: ${e instanceof Error ? e.message : String(e)}`,
          ),
        );
      }

      // Done!
      console.info("");
      console.info(chalk.bold.green("Setup complete!"));
      console.info(`  Proxy running as daemon on ${chalk.cyan(url)}`);
      console.info(`  Auto-restarts on crash (5s throttle) and on login`);
      console.info("");
      console.info(chalk.gray("  Status:    neurolink proxy status"));
      console.info(
        chalk.gray("  Logs:      ~/.neurolink/logs/proxy-launchd-*.log"),
      );
      console.info(chalk.gray("  Uninstall: neurolink proxy uninstall"));
      console.info("");
    } else {
      // Foreground mode (--no-service or non-macOS)
      if (noService) {
        console.info(
          chalk.blue(`\nStep ${stepNum}:`) + " Starting proxy in foreground...",
        );
      } else {
        console.info(chalk.blue(`\nStep ${stepNum}:`) + " Starting proxy...");
        console.info(
          chalk.yellow(
            "  Note: No daemon support on this platform. Proxy runs in foreground.",
          ),
        );
      }
      // Delegate to proxy start handler — blocks until Ctrl+C
      await (proxyStartCommand.handler as Function)({
        ...argv,
        quiet: false,
      });
    }
  },
};

// =============================================================================
// PROXY INSTALL / UNINSTALL — launchd service (macOS)
// =============================================================================

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build a PATH for the launchd plist that includes the current Node/pnpm
 * bin directories so the guard process can find npm/pnpm for update checks.
 */
function buildLaunchdPath(): string {
  const fallback = "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin";
  const nodeDir = dirname(process.execPath);
  const segments = new Set<string>();

  // Add the directory containing the Node binary that launched this process
  if (nodeDir && nodeDir !== ".") {
    segments.add(nodeDir);
  }

  // Add pnpm home if available (e.g., ~/.local/share/pnpm)
  const pnpmHome = process.env.PNPM_HOME;
  if (pnpmHome) {
    segments.add(pnpmHome);
  }

  // Add the standard system paths
  for (const p of fallback.split(":")) {
    segments.add(p);
  }

  return [...segments].join(":");
}

function buildPlist(
  port: number,
  host: string,
  envFile?: string,
  configFile?: string,
): string {
  // The plist invokes the trampoline script (a tiny shell wrapper at
  // ~/.neurolink/bin/neurolink-proxy) which re-resolves the real
  // `neurolink` binary via PATH on every launch.  This way, launchd
  // is never pinned to a version-specific pnpm store path.
  const trampolinePath = escapeXml(TRAMPOLINE_PATH);
  const envFileArgs = envFile
    ? `
    <string>--env-file</string>
    <string>${escapeXml(envFile)}</string>`
    : "";
  const configArgs = configFile
    ? `
    <string>--config</string>
    <string>${escapeXml(configFile)}</string>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_LABEL}</string>

  <key>ProgramArguments</key>
  <array>
    <string>${trampolinePath}</string>
    <string>proxy</string>
    <string>start</string>
    <string>--port</string>
    <string>${port}</string>
    <string>--host</string>
    <string>${host}</string>
${envFileArgs}
${configArgs}
    <string>--quiet</string>
  </array>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>

  <key>ThrottleInterval</key>
  <integer>5</integer>

  <key>ExitTimeOut</key>
  <integer>45</integer>

  <key>StandardOutPath</key>
  <string>${join(homedir(), ".neurolink", "logs", "proxy-launchd-stdout.log")}</string>

  <key>StandardErrorPath</key>
  <string>${join(homedir(), ".neurolink", "logs", "proxy-launchd-stderr.log")}</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${buildLaunchdPath()}</string>
    <key>HOME</key>
    <string>${homedir()}</string>
  </dict>
</dict>
</plist>`;
}

export const proxyInstallCommand: CommandModule = {
  command: "install",
  describe:
    "Install proxy as a persistent background service (auto-restarts on crash/reboot)",
  builder: (yargs: Argv) => {
    return yargs
      .option("port", {
        type: "number",
        alias: "p",
        default: 55669,
        description: "Proxy port",
      })
      .option("host", {
        type: "string",
        default: "127.0.0.1",
        description: "Proxy host",
      })
      .option("env-file", {
        type: "string",
        alias: "envFile",
        description:
          "Path to proxy provider env file to persist for the service",
      })
      .option("config", {
        type: "string",
        description:
          "Path to proxy routing config file to persist for the service",
      })
      .example("neurolink proxy install", "Install with defaults (port 55669)")
      .example(
        "neurolink proxy install -p 9000",
        "Install on custom port",
      ) as Argv;
  },
  handler: async (argv) => {
    const port = (argv.port as number) ?? 55669;
    const host = (argv.host as string) ?? "127.0.0.1";

    if (process.platform !== "darwin") {
      console.info(
        chalk.red("proxy install is currently macOS-only (uses launchd)."),
      );
      console.info(
        chalk.yellow("On Linux, use systemd. On Windows, use Task Scheduler."),
      );
      process.exit(1);
    }

    const { writeFileSync, mkdirSync, existsSync } = await import("fs");
    const envResolution = resolveProxyEnvFile({
      explicitEnvFile: (argv as { envFile?: string }).envFile,
    });
    const envFile = envResolution.path;
    const explicitConfig = (argv as { config?: string }).config;
    const configPath = explicitConfig
      ? resolve(explicitConfig)
      : join(homedir(), ".neurolink", "proxy-config.yaml");
    if (explicitConfig && !existsSync(configPath)) {
      console.info(chalk.red(`Proxy config file not found: ${configPath}`));
      process.exit(1);
    }
    const configFile = existsSync(configPath) ? configPath : undefined;

    if (envFile && !existsSync(envFile)) {
      console.info(chalk.red(`Proxy env file not found: ${envFile}`));
      process.exit(1);
    }

    const logsDir = join(homedir(), ".neurolink", "logs");
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    if (!existsSync(PLIST_DIR)) {
      mkdirSync(PLIST_DIR, { recursive: true });
    }

    writeTrampoline();
    console.info(chalk.green(`✓ Trampoline written to ${TRAMPOLINE_PATH}`));

    // Sanity-check: run the trampoline itself and confirm it resolves to
    // a working neurolink binary. This catches environments where every
    // PATH-based candidate is broken AND the baked-in path is unreachable.
    const trampolineVersion = probeBinVersion(TRAMPOLINE_PATH);
    if (!trampolineVersion) {
      console.info(
        chalk.red(
          `✗ Trampoline validation failed: ${TRAMPOLINE_PATH} --version did not run cleanly.`,
        ),
      );
      console.info(
        chalk.yellow(
          `  The launchd service would not be able to start neurolink. Fix your install first.`,
        ),
      );
      console.info(
        chalk.yellow(
          `  Try: 'pnpm add -g @juspay/neurolink' or set NEUROLINK_BIN=/path/to/working/neurolink.`,
        ),
      );
      process.exit(1);
    }
    if (trampolineVersion !== PROXY_VERSION) {
      console.info(
        chalk.red(
          `✗ Trampoline resolves to v${trampolineVersion} but this installer is v${PROXY_VERSION}.`,
        ),
      );
      console.info(
        chalk.yellow(
          `  PATH may shadow this installation with an older version. Fix your PATH or set NEUROLINK_BIN.`,
        ),
      );
      process.exit(1);
    }
    console.info(
      chalk.green(
        `✓ Trampoline validated (resolves to neurolink v${trampolineVersion})`,
      ),
    );

    const plist = buildPlist(port, host, envFile, configFile);
    writeFileSync(PLIST_PATH, plist, "utf-8");
    console.info(chalk.green(`✓ Plist written to ${PLIST_PATH}`));
    if (envFile) {
      console.info(chalk.green(`✓ Proxy env file: ${envFile}`));
    }

    try {
      const { execFileSync } = await import("node:child_process");
      execFileSync("launchctl", ["unload", PLIST_PATH], {
        stdio: "ignore",
      });
    } catch {
      /* not loaded yet */
    }

    try {
      const { execFileSync } = await import("node:child_process");
      execFileSync("launchctl", ["load", PLIST_PATH]);
      console.info(chalk.green(`✓ Service loaded and started`));
    } catch (e) {
      console.info(chalk.red(`Failed to load service: ${e}`));
      process.exit(1);
    }

    console.info("");
    console.info(chalk.bold("Proxy is now a persistent service:"));
    console.info(`  • Auto-starts on login`);
    console.info(`  • Auto-restarts on crash (5s throttle)`);
    console.info(`  • Listening on http://${host}:${port}`);
    console.info(`  • Logs: ~/.neurolink/logs/proxy-launchd-*.log`);
    console.info("");
    console.info(chalk.gray(`  Manage: launchctl start/stop ${PLIST_LABEL}`));
    console.info(chalk.gray(`  Remove: neurolink proxy uninstall`));
  },
};

export const proxyUninstallCommand: CommandModule = {
  command: "uninstall",
  describe: "Remove proxy background service",
  builder: (yargs: Argv) => yargs,
  handler: async () => {
    if (process.platform !== "darwin") {
      console.info(chalk.red("proxy uninstall is currently macOS-only."));
      process.exit(1);
    }

    const { existsSync, unlinkSync } = await import("fs");

    if (!existsSync(PLIST_PATH)) {
      if (!(await ensureSupervisorStoppedBeforeClear())) {
        console.info(
          chalk.red(
            "A proxy supervisor is still running and could not be stopped; leaving its state intact. Stop it manually and retry.",
          ),
        );
        process.exit(1);
      }
      clearProxyState();
      clearProxySupervisorState();
      console.info(chalk.yellow("No proxy service installed."));
      return;
    }

    try {
      const { execFileSync } = await import("node:child_process");
      execFileSync("launchctl", ["unload", PLIST_PATH]);
      console.info(chalk.green(`✓ Service stopped`));
    } catch {
      /* may not be loaded */
    }

    // Do not delete supervisor state while a supervisor still owns the
    // listener: a swallowed unload failure (or a supervisor started outside
    // launchd) would otherwise be orphaned.
    if (!(await ensureSupervisorStoppedBeforeClear())) {
      console.info(
        chalk.red(
          "launchctl could not stop the running supervisor; aborting uninstall so its state is preserved. Stop it manually and retry.",
        ),
      );
      process.exit(1);
    }

    unlinkSync(PLIST_PATH);
    clearProxyState();
    clearProxySupervisorState();
    console.info(chalk.green(`✓ Plist removed from ${PLIST_PATH}`));
    console.info(chalk.green(`✓ Proxy service uninstalled`));
  },
};
