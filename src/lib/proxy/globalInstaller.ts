import {
  execFileSync as nodeExecFileSync,
  spawn as nodeSpawn,
} from "node:child_process";
import {
  accessSync,
  constants,
  existsSync,
  realpathSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  renameSync,
  chmodSync,
  rmSync,
} from "node:fs";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  resolve,
  relative,
} from "node:path";
import type {
  ProxyServiceInstallSettings,
  ProxyPackageSelection,
  ProxyPackageSelectionState,
  ProxyStagedInstallOptions,
  GlobalInstallerExecFile,
  GlobalInstallerKind,
  GlobalInstallerProbe,
  GlobalInstallerResolution,
  InstalledVersionValidation,
  ResolveGlobalInstallerOptions,
  ValidateInstalledVersionOptions,
} from "../types/index.js";

function runText(
  execFileSync: GlobalInstallerExecFile,
  bin: string,
  args: string[],
): string {
  return String(
    execFileSync(bin, args, {
      encoding: "utf8",
      timeout: 10_000,
      stdio: ["ignore", "pipe", "pipe"],
    }),
  ).trim();
}

function writableDirectory(path: string): boolean {
  try {
    if (!existsSync(path)) {
      return false;
    }
    accessSync(path, constants.W_OK | constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function isPathInside(path: string | undefined, parent: string): boolean {
  if (!path) {
    return false;
  }
  try {
    const candidate = realpathSync(path);
    const root = realpathSync(parent);
    return candidate === root || candidate.startsWith(`${root}/`);
  } catch {
    const candidate = resolve(path);
    const root = resolve(parent);
    return candidate === root || candidate.startsWith(`${root}/`);
  }
}

function probeInstaller(
  kind: GlobalInstallerKind,
  bin: string,
  entryScript: string | undefined,
  execFileSync: GlobalInstallerExecFile,
): GlobalInstallerProbe {
  const base: GlobalInstallerProbe = {
    kind,
    bin,
    working: false,
    installable: false,
    matchesCurrentInstall: false,
  };

  try {
    base.version = runText(execFileSync, bin, ["--version"]);
    base.working = base.version.length > 0;
    base.globalRoot = runText(execFileSync, bin, ["root", "-g"]);
    base.globalBinDir =
      kind === "pnpm"
        ? runText(execFileSync, bin, ["bin", "-g"])
        : join(runText(execFileSync, bin, ["prefix", "-g"]), "bin");

    if (!base.globalRoot || !writableDirectory(base.globalRoot)) {
      base.reason = "global package root is missing or not writable";
      return base;
    }
    if (!base.globalBinDir || !writableDirectory(base.globalBinDir)) {
      base.reason = "global executable directory is missing or not writable";
      return base;
    }

    base.installable = true;
    // Global npm packages install their entrypoints under <prefix>/bin while
    // their package contents live in <prefix>/lib/node_modules. A running
    // process can retain its argv path after that shim has disappeared, so
    // retain the lexical bin-directory check as well as the resolved package
    // root check.
    base.matchesCurrentInstall =
      isPathInside(entryScript, base.globalRoot) ||
      isPathInside(entryScript, base.globalBinDir);
    return base;
  } catch (error) {
    base.reason = error instanceof Error ? error.message : String(error);
    return base;
  }
}

function resolveFromPath(
  command: string,
  execFileSync: GlobalInstallerExecFile,
): string | undefined {
  try {
    const result = runText(execFileSync, "which", [command]);
    return result || undefined;
  } catch {
    return undefined;
  }
}

/** Resolve a package manager that can update the installation currently running. */
export function resolveGlobalInstaller(
  options: ResolveGlobalInstallerOptions = {},
): GlobalInstallerResolution {
  const env = options.env ?? process.env;
  const homeDir = options.homeDir ?? homedir();
  const entryScript = options.entryScript ?? process.argv[1];
  const execFileSync = options.execFileSync ?? nodeExecFileSync;
  const candidates: Array<{ kind: GlobalInstallerKind; bin: string }> = [];

  if (env.NEUROLINK_PACKAGE_MANAGER_PATH) {
    const configuredKind = env.NEUROLINK_PACKAGE_MANAGER?.toLowerCase();
    const inferredName = basename(env.NEUROLINK_PACKAGE_MANAGER_PATH);
    const kind: GlobalInstallerKind =
      configuredKind === "npm" || configuredKind === "pnpm"
        ? configuredKind
        : inferredName.startsWith("npm")
          ? "npm"
          : "pnpm";
    candidates.push({ kind, bin: env.NEUROLINK_PACKAGE_MANAGER_PATH });
  }
  if (env.NEUROLINK_PNPM_PATH) {
    candidates.push({ kind: "pnpm", bin: env.NEUROLINK_PNPM_PATH });
  }
  if (env.PNPM_HOME) {
    candidates.push({ kind: "pnpm", bin: join(env.PNPM_HOME, "pnpm") });
  }

  const nodeBinDir = dirname(process.execPath);
  candidates.push({ kind: "npm", bin: join(nodeBinDir, "npm") });
  const pathPnpm = resolveFromPath("pnpm", execFileSync);
  const pathNpm = resolveFromPath("npm", execFileSync);
  if (pathPnpm) {
    candidates.push({ kind: "pnpm", bin: pathPnpm });
  }
  if (pathNpm) {
    candidates.push({ kind: "npm", bin: pathNpm });
  }
  candidates.push(
    { kind: "pnpm", bin: join(homeDir, ".local", "share", "pnpm", "pnpm") },
    { kind: "pnpm", bin: join(homeDir, "Library", "pnpm", "pnpm") },
    { kind: "npm", bin: "/opt/homebrew/bin/npm" },
    { kind: "npm", bin: "/usr/local/bin/npm" },
  );

  const seen = new Set<string>();
  const tried = candidates
    .filter(({ kind, bin }) => {
      const key = `${kind}:${bin}`;
      if (!bin || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .map(({ kind, bin }) =>
      probeInstaller(kind, bin, entryScript, execFileSync),
    );

  const matchingInstaller = tried.find(
    (probe) => probe.installable && probe.matchesCurrentInstall,
  );
  // When the running entry script is known, installing into a different
  // global root cannot update that process and may shadow another install.
  const installer = entryScript
    ? matchingInstaller
    : (matchingInstaller ?? tried.find((probe) => probe.installable));
  return { installer, tried };
}

export function getGlobalInstallArgs(
  kind: GlobalInstallerKind,
  packageSpec: string,
): string[] {
  return kind === "pnpm"
    ? ["add", "-g", packageSpec]
    : ["install", "--global", "--no-audit", "--no-fund", packageSpec];
}

const TRANSIENT_INSTALL_FAILURE_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
  "EPIPE",
  "ETIMEDOUT",
]);
const MAX_INSTALL_FAILURE_CAUSE_DEPTH = 10;

/**
 * Return whether a global package-manager failure is likely environmental and
 * worth retrying. Configuration and permission failures deliberately return
 * false so the updater does not repeatedly mutate a broken installation.
 *
 * @param error - The package-manager error, including any nested `cause` chain.
 */
export function isTransientInstallFailure(error: unknown): boolean {
  let current: unknown = error;
  const seen = new Set<object>();
  for (
    let depth = 0;
    depth < MAX_INSTALL_FAILURE_CAUSE_DEPTH && current;
    depth++
  ) {
    if (typeof current !== "object") {
      return false;
    }
    if (seen.has(current)) {
      return false;
    }
    seen.add(current);
    const candidate = current as {
      code?: unknown;
      cause?: unknown;
    };
    if (
      typeof candidate.code === "string" &&
      TRANSIENT_INSTALL_FAILURE_CODES.has(candidate.code)
    ) {
      return true;
    }
    current = candidate.cause;
  }
  return false;
}

/**
 * Validate a freshly installed CLI with retries. Global package replacement
 * can leave executable shims briefly unavailable while filesystem metadata and
 * cold module loading settle, so a single short probe is not authoritative.
 */
export async function validateInstalledVersion(
  options: ValidateInstalledVersionOptions,
): Promise<InstalledVersionValidation> {
  if (!isAbsolute(options.binPath)) {
    return {
      attempts: 0,
      failure: `binPath must be absolute: ${options.binPath}`,
    };
  }
  const execFileSync = options.execFileSync ?? nodeExecFileSync;
  const sleepFn =
    options.sleep ??
    ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const maxAttempts = Math.max(1, options.maxAttempts ?? 5);
  const delayMs = Math.max(0, options.delayMs ?? 2_000);
  const timeoutMs = Math.max(1_000, options.timeoutMs ?? 10_000);
  let lastVersion: string | undefined;
  let lastFailure: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const output = String(
        execFileSync(options.binPath, ["--version"], {
          encoding: "utf8",
          timeout: timeoutMs,
          stdio: ["ignore", "pipe", "pipe"],
        }),
      ).trim();
      lastVersion = output || undefined;
      if (lastVersion === options.expectedVersion) {
        return { version: lastVersion, attempts: attempt };
      }
      lastFailure = lastVersion
        ? `resolved to v${lastVersion}; expected v${options.expectedVersion}`
        : "version command returned empty output";
    } catch (error) {
      lastFailure = describeInstallFailure(error);
    }

    if (attempt < maxAttempts) {
      await sleepFn(delayMs);
    }
  }

  return {
    version: lastVersion,
    attempts: maxAttempts,
    failure: lastFailure ?? "version validation failed",
  };
}

function capturedOutput(error: unknown, key: "stdout" | "stderr"): string {
  if (!error || typeof error !== "object" || !(key in error)) {
    return "";
  }
  const raw = (error as Record<string, unknown>)[key];
  return String(raw ?? "")
    .trim()
    .slice(0, 1_000);
}

export function describeInstallFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const stdout = capturedOutput(error, "stdout");
  const stderr = capturedOutput(error, "stderr");
  return [message, stdout && `stdout: ${stdout}`, stderr && `stderr: ${stderr}`]
    .filter(Boolean)
    .join("\n");
}

/** Read package metadata without importing the CLI/provider/telemetry graph. */
export function inspectProxyPackage(
  entryScript: string,
  nodePath = process.execPath,
): ProxyPackageSelection {
  const entry = realpathSync(entryScript);
  let directory = dirname(entry);
  while (true) {
    const manifestPath = join(directory, "package.json");
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        name?: unknown;
        version?: unknown;
      };
      if (manifest.name === "@juspay/neurolink") {
        if (
          typeof manifest.version !== "string" ||
          !/^\d+\.\d+\.\d+$/.test(manifest.version)
        ) {
          throw new Error("Invalid proxy package version");
        }
        return { version: manifest.version, entryScript: entry, nodePath };
      }
    }
    const parent = dirname(directory);
    if (parent === directory) {
      throw new Error("Proxy entrypoint has no package manifest");
    }
    directory = parent;
  }
}

function validateProxyPackageSelection(
  value: unknown,
): ProxyPackageSelection | null {
  try {
    if (!value || typeof value !== "object") {
      return null;
    }
    const selection = value as Partial<ProxyPackageSelection>;
    if (
      typeof selection.entryScript !== "string" ||
      typeof selection.nodePath !== "string" ||
      !isAbsolute(selection.entryScript) ||
      !isAbsolute(selection.nodePath)
    ) {
      return null;
    }
    const actual = inspectProxyPackage(
      selection.entryScript,
      selection.nodePath,
    );
    return actual.version === selection.version ? actual : null;
  } catch {
    return null;
  }
}

/** Read active and rollback selections from one committed generation. */
function readProxyPackageSelections(
  packagesDir: string,
): ProxyPackageSelectionState | null {
  let value: unknown;
  try {
    value = JSON.parse(
      readFileSync(join(packagesDir, "selections.json"), "utf8"),
    );
  } catch (error) {
    // Legacy migration is allowed only when no atomic record has ever been
    // published. Invalid/unreadable committed state must not revive stale files.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      return null;
    }
    const readLegacy = (file: string) => {
      try {
        return validateProxyPackageSelection(
          JSON.parse(readFileSync(join(packagesDir, file), "utf8")),
        );
      } catch {
        return null;
      }
    };
    return {
      schemaVersion: 1,
      active: readLegacy("active.json"),
      previous: readLegacy("previous.json"),
    };
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  const state = value as Partial<ProxyPackageSelectionState>;
  if (
    state.schemaVersion !== 1 ||
    !("active" in state) ||
    !("previous" in state)
  ) {
    return null;
  }
  return {
    schemaVersion: 1,
    active: validateProxyPackageSelection(state.active),
    previous: validateProxyPackageSelection(state.previous),
  };
}

export function readProxyPackageSelection(
  packagesDir: string,
  previous = false,
): ProxyPackageSelection | null {
  const state = readProxyPackageSelections(packagesDir);
  return (previous ? state?.previous : state?.active) ?? null;
}

/** Resolve immutable selections before consulting an older mutable global entry. */
export function resolveProxyWorkerPackage(options: {
  packagesDir: string;
  entryScript: string;
  expectedVersion: string;
}): ProxyPackageSelection {
  const state = readProxyPackageSelections(options.packagesDir);
  for (const selection of [state?.active, state?.previous]) {
    if (selection?.version === options.expectedVersion) {
      return selection;
    }
  }
  try {
    const original = inspectProxyPackage(options.entryScript);
    if (original.version === options.expectedVersion) {
      return original;
    }
  } catch {
    // A global upgrade/removal may invalidate the original entry while an
    // already selected private package remains the valid recovery target.
  }
  throw new Error(
    `No validated package selection for worker v${options.expectedVersion}`,
  );
}

function assertPackageSelectionOwner(isCurrentOwner?: () => boolean): void {
  if (isCurrentOwner && !isCurrentOwner()) {
    throw new Error(
      "Proxy update owner changed; package selection was not modified",
    );
  }
}

/** Persist only package selection; runtime env, config and launchd settings are untouched. */
export function selectProxyPackage(
  packagesDir: string,
  selection: ProxyPackageSelection,
  isCurrentOwner?: () => boolean,
): void {
  assertPackageSelectionOwner(isCurrentOwner);
  mkdirSync(packagesDir, { recursive: true, mode: 0o700 });
  const current = readProxyPackageSelections(packagesDir);
  if (!current) {
    throw new Error("Proxy package selection state is unreadable or invalid");
  }
  // Manifest reads can outlive a service owner, even before private staging.
  assertPackageSelectionOwner(isCurrentOwner);
  const state: ProxyPackageSelectionState = {
    schemaVersion: 1,
    active: selection,
    previous:
      current.active && current.active.version !== selection.version
        ? current.active
        : current.previous,
  };
  const temporary = join(
    packagesDir,
    `selections-${process.pid}-${randomUUID()}.tmp`,
  );
  try {
    writeFileSync(temporary, JSON.stringify(state), {
      mode: 0o600,
      flag: "wx",
    });
    assertPackageSelectionOwner(isCurrentOwner);
    // One rename publishes both versions. A stale owner never mutates rollback
    // state independently, and must never attempt to restore a newer owner's state.
    renameSync(temporary, join(packagesDir, "selections.json"));
  } finally {
    rmSync(temporary, { force: true });
  }
}

/** No startup probes: IPC descriptors and OTel initialization belong to the real process. */
export function writeProxyPackageLauncher(
  path: string,
  selection: ProxyPackageSelection,
  isCurrentOwner?: () => boolean,
): void {
  assertPackageSelectionOwner(isCurrentOwner);
  const quote = (value: string) => `'${value.replace(/'/g, "'\\''")}'`;
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  // --version reads the manifest in a tiny isolated Node process. This proves
  // the selected files still exist without cold-loading every provider twice.
  const probe = `const fs=require('node:fs');let p=${JSON.stringify(dirname(selection.entryScript))};for(;;){const f=p+'/package.json';if(fs.existsSync(f)){const m=JSON.parse(fs.readFileSync(f,'utf8'));if(m.name==='@juspay/neurolink'){if(m.version!==${JSON.stringify(selection.version)})process.exit(1);console.log(m.version);break;}}const q=require('node:path').dirname(p);if(q===p)process.exit(1);p=q;}`;
  const script = `#!/bin/sh\n# Generated proxy package selection. Service environment is inherited.\n[ -f ${quote(selection.entryScript)} ] || exit 127\nif [ "$#" = "1" ] && [ "$1" = "--version" ]; then\n  exec ${quote(selection.nodePath)} -e ${quote(probe)}\nfi\nexec ${quote(selection.nodePath)} ${quote(selection.entryScript)} "$@"\n`;
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, script, { mode: 0o755 });
  chmodSync(temporary, 0o755);
  assertPackageSelectionOwner(isCurrentOwner);
  renameSync(temporary, path);
}

/** Install in a private tree, then publish the immutable directory after validation. */
export async function installStagedProxyPackage(
  options: ProxyStagedInstallOptions,
): Promise<ProxyPackageSelection> {
  if (!/^\d+\.\d+\.\d+$/.test(options.version)) {
    throw new Error("Invalid proxy package version");
  }
  await mkdir(options.packagesDir, { recursive: true, mode: 0o700 });
  const destination = join(options.packagesDir, options.version);
  const validate = (root: string): ProxyPackageSelection => {
    const packageRoot = join(root, "node_modules", "@juspay", "neurolink");
    const manifest = JSON.parse(
      readFileSync(join(packageRoot, "package.json"), "utf8"),
    ) as { bin?: string | Record<string, string> };
    const bin =
      typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.neurolink;
    if (!bin) {
      throw new Error("Candidate package is missing its neurolink executable");
    }
    const entry = realpathSync(resolve(packageRoot, bin));
    const rel = relative(realpathSync(packageRoot), entry);
    if (rel.startsWith("..") || isAbsolute(rel)) {
      throw new Error("Candidate executable escapes its package");
    }
    const selection = inspectProxyPackage(entry);
    if (selection.version !== options.version) {
      throw new Error(
        `Candidate version ${selection.version} does not match ${options.version}`,
      );
    }
    (options.execFileSync ?? nodeExecFileSync)(
      selection.nodePath,
      ["--check", selection.entryScript],
      { timeout: 10_000, stdio: "pipe" },
    );
    return selection;
  };
  if (existsSync(destination)) {
    return validate(destination);
  }
  const staging = await mkdtemp(
    join(options.packagesDir, `.install-${options.version}-`),
  );
  try {
    await writeFile(
      join(staging, "package.json"),
      JSON.stringify({ private: true }),
      { mode: 0o600 },
    );
    const spec = `@juspay/neurolink@${options.version}`;
    const args =
      options.installer.kind === "npm"
        ? [
            "install",
            "--prefix",
            staging,
            "--no-save",
            "--package-lock=false",
            "--no-audit",
            "--no-fund",
            "--omit=dev",
            "--loglevel=http",
            spec,
          ]
        : [
            "add",
            "--dir",
            staging,
            "--no-lockfile",
            "--prod",
            "--reporter=ndjson",
            spec,
          ];
    await new Promise<void>((resolveInstall, rejectInstall) => {
      const started = Date.now();
      let lastProgress = started;
      let bytes = 0;
      let failureCode: string | undefined;
      let failure: Error | undefined;
      let killTimer: NodeJS.Timeout | undefined;
      const child = (options.spawn ?? nodeSpawn)(options.installer.bin, args, {
        cwd: staging,
        env: { ...process.env, npm_config_update_notifier: "false" },
        stdio: ["ignore", "pipe", "pipe"],
        detached: process.platform !== "win32",
      });
      const progress = (chunk: Buffer | string) => {
        bytes += Buffer.byteLength(chunk);
        lastProgress = Date.now();
        // Retain a machine code only: npm output can include authenticated URLs.
        const text = String(chunk);
        const code =
          text.match(/npm (?:ERR!|error) code ([A-Z][A-Z0-9_]+)/)?.[1] ??
          text.match(
            /\b(?:ECONNRESET|ECONNREFUSED|EAI_AGAIN|EHOSTUNREACH|ENETUNREACH|ENOTFOUND|EPIPE|ETIMEDOUT)\b/,
          )?.[0];
        if (code) {
          failureCode = code;
        }
      };
      child.stdout?.on("data", progress);
      child.stderr?.on("data", progress);
      const signal = (value: NodeJS.Signals) => {
        try {
          if (process.platform !== "win32" && child.pid) {
            process.kill(-child.pid, value);
          } else {
            child.kill(value);
          }
        } catch {
          /* child already exited */
        }
      };
      const interval = setInterval(
        () => {
          const now = Date.now();
          options.onProgress?.({
            elapsedMs: now - started,
            outputBytes: bytes,
          });
          if (
            !failure &&
            (now - started >= (options.maxDurationMs ?? 15 * 60_000) ||
              now - lastProgress >= (options.idleTimeoutMs ?? 120_000))
          ) {
            failure = Object.assign(
              new Error(
                `Staged install timed out after ${now - started}ms (${bytes} output bytes, idle ${now - lastProgress}ms)`,
              ),
              { code: "ETIMEDOUT" },
            );
            signal("SIGTERM");
            killTimer = setTimeout(
              () => signal("SIGKILL"),
              options.killGraceMs ?? 5_000,
            );
          }
        },
        Math.min(5_000, Math.max(10, (options.idleTimeoutMs ?? 120_000) / 4)),
      );
      const cleanup = () => {
        clearInterval(interval);
        clearTimeout(killTimer);
      };
      child.once("error", (error) => {
        cleanup();
        rejectInstall(error);
      });
      child.once("close", (code, signalName) => {
        cleanup();
        if (failure) {
          rejectInstall(failure);
        } else if (code !== 0) {
          rejectInstall(
            Object.assign(
              new Error(
                `Staged install exited code=${code} signal=${signalName ?? "none"} errorCode=${failureCode ?? "unknown"}`,
              ),
              {
                code:
                  failureCode ??
                  (code === null ? "ECONNRESET" : "INSTALL_FAILED"),
              },
            ),
          );
        } else {
          resolveInstall();
        }
      });
    });
    validate(staging);
    await rename(staging, destination);
    return validate(destination);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

/** Only operator runtime settings survive reinstall, never worker IPC identity. */
export function isProxyServiceEnvironmentKey(name: string): boolean {
  return (
    (name.startsWith("OTEL_") ||
      name.startsWith("NEUROLINK_PROXY_") ||
      [
        "NEUROLINK_PACKAGE_MANAGER",
        "NEUROLINK_PACKAGE_MANAGER_PATH",
        "NEUROLINK_PNPM_PATH",
        "PNPM_HOME",
      ].includes(name)) &&
    ![
      "NEUROLINK_PROXY_SOCKET_WORKER",
      "NEUROLINK_PROXY_WORKER_GENERATION",
      "NEUROLINK_PROXY_WORKER_EXPECTED_VERSION",
      "NEUROLINK_PROXY_UPDATE_CONTROL_TOKEN",
      "NEUROLINK_PROXY_ROLLING_SUPERVISOR",
      "NEUROLINK_PROXY_TRAMPOLINE_EXEC_ONLY",
      "NEUROLINK_PROXY_TEST_ISOLATED",
    ].includes(name)
  );
}

/** Parse plutil JSON without exposing credentials or invoking the saved launcher. */
export function parseProxyServiceInstallSettings(
  value: unknown,
): ProxyServiceInstallSettings {
  const settings: ProxyServiceInstallSettings = { environment: {} };
  if (!value || typeof value !== "object") {
    return settings;
  }
  const plist = value as {
    ProgramArguments?: unknown;
    EnvironmentVariables?: unknown;
  };
  const args = Array.isArray(plist.ProgramArguments)
    ? plist.ProgramArguments
    : [];
  const option = (name: string): string | undefined => {
    const index = args.indexOf(name);
    return index >= 0 && typeof args[index + 1] === "string"
      ? args[index + 1]
      : undefined;
  };
  settings.envFile = option("--env-file");
  settings.configFile = option("--config");
  settings.host = option("--host");
  const port = Number(option("--port"));
  if (Number.isInteger(port) && port > 0 && port <= 65535) {
    settings.port = port;
  }
  if (
    plist.EnvironmentVariables &&
    typeof plist.EnvironmentVariables === "object"
  ) {
    for (const [name, entry] of Object.entries(plist.EnvironmentVariables)) {
      if (isProxyServiceEnvironmentKey(name) && typeof entry === "string") {
        settings.environment[name] = entry;
      }
    }
  }
  return settings;
}

/** Distinguish an absent launchd job from permission failures without logging plist/env data. */
export function probeProxyLaunchdPresence(options: {
  label: string;
  uid: number;
  execFileSync?: GlobalInstallerExecFile;
}): "loaded" | "not_loaded" | "unknown" {
  try {
    (options.execFileSync ?? nodeExecFileSync)(
      "launchctl",
      ["print", `gui/${options.uid}/${options.label}`],
      { encoding: "utf8", timeout: 5_000, stdio: ["ignore", "pipe", "pipe"] },
    );
    // A loaded but currently idle KeepAlive job can start immediately. It must
    // be explicitly unloaded before regenerating its launcher and environment.
    return "loaded";
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      error.status === 113 &&
      "stderr" in error &&
      /could not find service/i.test(String(error.stderr))
    ) {
      return "not_loaded";
    }
    return "unknown";
  }
}

/** Read-only guard: callers must run this before every reinstall mutation. */
export function assertProxyServiceInstallIdle(options: {
  pids: number[];
  getProcessStatus: (pid: number) => "running" | "not_running" | "unknown";
  launchdPresence: "loaded" | "not_loaded" | "unknown";
}): void {
  if (
    options.launchdPresence !== "not_loaded" ||
    options.pids.some(
      (pid) =>
        Number.isSafeInteger(pid) &&
        pid > 0 &&
        options.getProcessStatus(pid) !== "not_running",
    )
  ) {
    throw new Error(
      "Proxy service is running or could still run. Reinstall was refused before changing files or processes. Use 'neurolink proxy restart' for a safe rolling replacement, or explicitly stop and unload the service before an intended reinstall.",
    );
  }
}
