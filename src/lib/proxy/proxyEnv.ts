import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import type {
  ProxyEnvLoadResult,
  ProxyEnvOptions,
  ProxyEnvResolution,
} from "../types/index.js";

export function resolveProxyEnvFile(
  options: ProxyEnvOptions = {},
): ProxyEnvResolution {
  const env = options.env ?? process.env;
  const homeDir = options.homeDir ?? homedir();

  if (options.explicitEnvFile?.trim()) {
    return {
      path: resolve(options.explicitEnvFile.trim()),
      source: "cli",
      required: true,
    };
  }

  if (env.NEUROLINK_ENV_FILE?.trim()) {
    return {
      path: resolve(env.NEUROLINK_ENV_FILE.trim()),
      source: "environment",
      required: true,
    };
  }

  const defaultPath = resolve(homeDir, ".neurolink", ".env");
  if (existsSync(defaultPath)) {
    return {
      path: defaultPath,
      source: "default",
      required: false,
    };
  }

  return {
    source: "none",
    required: false,
  };
}

export async function loadProxyEnvFile(
  options: ProxyEnvOptions = {},
): Promise<ProxyEnvLoadResult> {
  const resolution = resolveProxyEnvFile(options);
  const env = options.env ?? process.env;

  if (!resolution.path) {
    return {
      loaded: false,
      source: "none",
    };
  }

  if (!existsSync(resolution.path)) {
    if (resolution.required) {
      throw new Error(`Proxy env file not found: ${resolution.path}`);
    }

    return {
      loaded: false,
      source: resolution.source,
    };
  }

  try {
    const { config } = await import("dotenv");
    const result = config({
      path: resolution.path,
      override: true,
      quiet: true,
    });

    if (result.error) {
      throw result.error;
    }
  } catch (error) {
    throw new Error(
      `Failed to load proxy env file ${resolution.path}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }

  env.NEUROLINK_ENV_FILE = resolution.path;

  return {
    loaded: true,
    path: resolution.path,
    source: resolution.source,
  };
}
