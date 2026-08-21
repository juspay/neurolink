/**
 * One AI coding CLI the proxy can point at itself.
 *
 * Adding a CLI means adding one implementation of this type and one line in
 * `src/cli/proxy-clients/registry.ts`. Nothing else in the proxy should need
 * to know the client exists.
 */
export type CliProxyClientConfigurator = {
  /** Stable kebab-case identifier, e.g. "claude-code". */
  id: string;
  /** Human-readable name used in CLI output, e.g. "Claude Code". */
  displayName: string;
  /**
   * Whether this CLI appears to be installed. Configurators must not create
   * config files for a CLI the user never installed.
   */
  detect: () => Promise<boolean>;
  /**
   * Point the CLI at the proxy. `proxyBaseUrl` is the bare proxy origin
   * (e.g. "http://127.0.0.1:55669"); the configurator appends whatever path
   * suffix its CLI needs. Returns false when nothing was written, so callers
   * never print a success message for work that did not happen.
   */
  apply: (proxyBaseUrl: string) => Promise<boolean>;
  /**
   * Restore the user's previous configuration. `proxyBaseUrl` is the same bare
   * origin; a configurator that finds a different URL configured must leave it
   * alone and return false.
   */
  restore: (proxyBaseUrl: string) => Promise<boolean>;
};

/** Outcome of applying one configurator, for per-client CLI reporting. */
export type CliProxyClientApplyResult = {
  id: string;
  displayName: string;
  /** True only when the configurator actually wrote configuration. */
  applied: boolean;
  /** Present when the configurator threw; the caller decides how loud to be. */
  error?: Error;
};

/** Outcome of restoring one configurator. */
export type CliProxyClientRestoreResult = {
  id: string;
  displayName: string;
  /** True only when a previous configuration was actually restored. */
  restored: boolean;
  error?: Error;
};

/**
 * Raw contents of a Qwen Code `settings.json`. Deliberately open-ended: the
 * configurator rewrites only `security.auth` and must round-trip every other
 * key the user has set, including ones this repo does not know about.
 */
export type CliQwenSettings = Record<string, unknown>;
