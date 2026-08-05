import { execFileSync as nodeExecFileSync } from "node:child_process";
import { accessSync, constants, existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import type {
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
    base.matchesCurrentInstall = isPathInside(entryScript, base.globalRoot);
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

/**
 * Return whether a global package-manager failure is likely environmental and
 * worth retrying. Configuration and permission failures deliberately return
 * false so the updater does not repeatedly mutate a broken installation.
 */
export function isTransientInstallFailure(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    if (typeof current !== "object") {
      return false;
    }
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
