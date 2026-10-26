/**
 * Implicit `.env` bootstrap for the CLI, and an explicit one for SDK hosts.
 *
 * Who loads `.env`:
 *
 * - The **CLI** loads `<cwd>/.env` at startup (or `DOTENV_CONFIG_PATH`),
 *   because a terminal session in a project directory is the use case the
 *   file exists for. `NEUROLINK_DOTENV=0` turns that off.
 * - The **SDK** does not. Importing a library must not read the working
 *   directory: a dependency that runs inside an untrusted checkout would
 *   otherwise pick up that checkout's `.env`. A host that wants the old
 *   behaviour calls `loadDotenv()` itself, or starts the process with
 *   `NEUROLINK_DOTENV=1` in the real environment (the variable cannot come
 *   from the file it enables).
 *
 * What is refused even when a file is loaded. dotenv never overrides a
 * variable that is already set, but it sets every one that is not — and
 * among those are the variables that decide *where* a request goes: the
 * provider `*_BASE_URL` / `*_ENDPOINT(S)` overrides, `NEUROLINK_*_DIR`
 * directories, and `DOTENV_CONFIG_PATH`. A `.env` that supplies one of them
 * can redirect a key exported in the shell to a host of its choosing. So,
 * for exactly those names, the file has to be trustworthy: owned by the
 * current user and not group/world-writable. Otherwise they are deleted
 * again and named on stderr. When they are kept, a one-line notice says
 * which ones the file set.
 *
 * `DOTENV_CONFIG_PATH` is honoured because a direct `config()` call does not
 * read it on its own (only dotenv's `dotenv/config` preload does), and the
 * test strip `DOTENV_CONFIG_PATH=/dev/null` depends on it (#1744).
 */

import { statSync } from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";
import type {
  DotenvBootstrapOptions,
  DotenvBootstrapResult,
} from "../types/index.js";

/** `0` / `false` disables every implicit load; `1` / `true` opts the SDK in. */
export const DOTENV_TOGGLE_ENV = "NEUROLINK_DOTENV";

/**
 * Names whose value decides where traffic or file access goes. Built from
 * the provider descriptors at load time as well (see
 * `collectDescriptorEndpointEnvNames`); this pattern is the floor that
 * holds even when the descriptors cannot be imported.
 */
export const ENDPOINT_OVERRIDE_ENV_PATTERN =
  /_BASE_URL$|_ENDPOINTS?$|^NEUROLINK_.*_DIR$|^DOTENV_CONFIG_PATH$/;

function isDisabled(): boolean {
  const value = process.env[DOTENV_TOGGLE_ENV];
  return value === "0" || value === "false";
}

/** True when `NEUROLINK_DOTENV` explicitly opts an SDK import into loading. */
export function isSdkDotenvOptIn(): boolean {
  const value = process.env[DOTENV_TOGGLE_ENV];
  return value === "1" || value === "true";
}

async function collectDescriptorEndpointEnvNames(): Promise<Set<string>> {
  const names = new Set<string>();
  try {
    const { PROVIDER_DESCRIPTORS } =
      await import("../factories/providerDescriptors.js");
    for (const descriptor of PROVIDER_DESCRIPTORS) {
      const { baseURL, baseURLFallbacks, extraRequired } = descriptor.envVars;
      if (baseURL) {
        names.add(baseURL);
      }
      for (const name of baseURLFallbacks ?? []) {
        names.add(name);
      }
      for (const name of extraRequired ?? []) {
        if (/ENDPOINT|URL|HOST/.test(name)) {
          names.add(name);
        }
      }
    }
  } catch {
    // The pattern above still covers every shipped name.
  }
  return names;
}

function inspectDotenvFile(envPath: string): {
  trustworthy: boolean;
  reason?: string;
  outsideHome: boolean;
} {
  const relativeToHome = path.relative(homedir(), envPath);
  const outsideHome =
    relativeToHome.startsWith("..") || path.isAbsolute(relativeToHome);
  try {
    const stat = statSync(envPath);
    const uid = typeof process.getuid === "function" ? process.getuid() : null;
    if (uid !== null && stat.uid !== uid) {
      return {
        trustworthy: false,
        reason: "the file is not owned by the current user",
        outsideHome,
      };
    }
    if (process.platform !== "win32" && (stat.mode & 0o022) !== 0) {
      return {
        trustworthy: false,
        reason: "the file is group- or world-writable",
        outsideHome,
      };
    }
    return { trustworthy: true, outsideHome };
  } catch (error) {
    return {
      trustworthy: false,
      reason: `the file could not be inspected (${error instanceof Error ? error.message : String(error)})`,
      outsideHome,
    };
  }
}

/**
 * Load `.env` into `process.env` under the rules in this module's header and
 * report what happened. Never throws: a missing dotenv module degrades to
 * "nothing loaded".
 */
export async function loadProcessDotenv(
  options: DotenvBootstrapOptions = {},
): Promise<DotenvBootstrapResult> {
  const notify =
    options.notify ??
    ((line: string): void => {
      process.stderr.write(`${line}\n`);
    });
  const empty = (reason?: string): DotenvBootstrapResult => ({
    loaded: false,
    supplied: [],
    endpointOverrides: [],
    refused: [],
    ...(reason ? { reason } : {}),
  });

  if (isDisabled()) {
    return empty(`${DOTENV_TOGGLE_ENV} disables .env loading`);
  }

  try {
    // Suppress dotenv v17's stdout banner — it pollutes CLI JSON output.
    process.env.DOTENV_CONFIG_QUIET = process.env.DOTENV_CONFIG_QUIET ?? "true";
    const { config } = await import("dotenv");
    const configuredPath = process.env.DOTENV_CONFIG_PATH;
    const envPath = path.resolve(
      process.cwd(),
      configuredPath && configuredPath.length > 0 ? configuredPath : ".env",
    );
    const before = new Set(Object.keys(process.env));
    // Pass `path` only when set: `{ path: undefined }` is not the same as
    // omitting it for every dotenv version.
    const outcome = configuredPath
      ? config({ quiet: true, path: configuredPath })
      : config({ quiet: true });
    const parsed = outcome.parsed ?? {};
    const supplied = Object.keys(parsed).filter(
      (name) => !before.has(name) && process.env[name] !== undefined,
    );
    const result: DotenvBootstrapResult = {
      loaded: outcome.error === undefined,
      path: envPath,
      supplied,
      endpointOverrides: [],
      refused: [],
    };
    if (supplied.length === 0) {
      return result;
    }

    const descriptorNames = await collectDescriptorEndpointEnvNames();
    const endpointOverrides = supplied.filter(
      (name) =>
        ENDPOINT_OVERRIDE_ENV_PATTERN.test(name) || descriptorNames.has(name),
    );
    result.endpointOverrides = endpointOverrides;
    if (endpointOverrides.length === 0) {
      return result;
    }

    const verdict = inspectDotenvFile(envPath);
    const names = endpointOverrides.join(", ");
    if (!verdict.trustworthy) {
      for (const name of endpointOverrides) {
        delete process.env[name];
      }
      result.refused = endpointOverrides;
      result.endpointOverrides = [];
      result.reason = verdict.reason;
      notify(
        `[neurolink] Refused ${endpointOverrides.length} endpoint override(s) from ${envPath} because ${verdict.reason}: ${names}. Export them in your shell to use them.`,
      );
      return result;
    }

    notify(
      `[neurolink] .env at ${envPath} set endpoint override(s): ${names}${
        verdict.outsideHome
          ? " (the file is outside your home directory; make sure you trust this project)"
          : ""
      }`,
    );
    return result;
  } catch {
    // dotenv ships as a runtime dependency, so this is only reachable in an
    // install that pruned or bundled dependencies unusually. A missing module
    // degrades to "no .env loaded" instead of crashing the entry point.
    return empty("dotenv is not available");
  }
}

/**
 * Explicit opt-in for SDK hosts that want `.env` loaded the way the CLI does,
 * with the same endpoint-override checks. Call it before constructing
 * `NeuroLink`.
 */
export async function loadDotenv(
  options: DotenvBootstrapOptions = {},
): Promise<DotenvBootstrapResult> {
  return loadProcessDotenv({ caller: "sdk", ...options });
}
