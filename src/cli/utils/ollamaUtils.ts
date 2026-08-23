import {
  spawnSync,
  spawn,
  type SpawnSyncReturns,
  type SpawnSyncOptions,
  type SpawnSyncOptionsWithStringEncoding,
} from "child_process";
import chalk from "chalk";
import ora from "ora";

import { logger } from "../../lib/utils/logger.js";
import type { AllowedCommand } from "../../lib/types/index.js";

/**
 * Ceiling for a synchronous Ollama query (`list`, `--version`, `rm`, …).
 *
 * `spawnSync` blocks the event loop, so an unresponsive daemon does not make
 * the CLI slow — it makes it unkillable by anything short of Ctrl-C, with no
 * output and no error. These calls are local IPC that normally answer in
 * milliseconds, so a ceiling this generous only ever fires on a genuine wedge.
 *
 * `killSignal: "SIGKILL"` is not decoration. `spawnSync`'s `timeout` sends
 * SIGTERM by default and then keeps waiting, so a child that ignores SIGTERM
 * hangs forever anyway and the timeout buys nothing.
 *
 * Long-running commands (`ollama pull`) must pass their own `timeout` — the
 * spread below lets a caller override this — because a model download
 * legitimately runs for many minutes.
 */
const OLLAMA_QUERY_TIMEOUT_MS = 15_000;

/**
 * Ceiling for the whole readiness loop, not one probe inside it.
 *
 * Ollama normally answers within seconds of starting; a wait longer than this
 * means it is not coming up, and continuing to spin helps nobody. Sized to
 * outlast a slow cold start while staying far below the ~15 minutes that 30
 * attempts of bounded probes could otherwise reach.
 */
const READINESS_DEADLINE_MS = 90_000;

/**
 * Shared Ollama utilities for CLI commands
 */
export class OllamaUtils {
  /**
   * Secure wrapper around spawnSync to prevent command injection.
   */
  public static safeSpawn(
    command: AllowedCommand,
    args: string[],
    options: SpawnSyncOptions = {},
  ): SpawnSyncReturns<string> {
    const defaultOptions: SpawnSyncOptionsWithStringEncoding = {
      timeout: OLLAMA_QUERY_TIMEOUT_MS,
      killSignal: "SIGKILL",
      ...options,
      encoding: "utf8", // Always enforce utf8 encoding
    };
    return spawnSync(command, args, defaultOptions);
  }

  /**
   * Whether a `safeSpawn` call actually succeeded.
   *
   * `spawnSync` reports failure by RETURNING — `error` set (ENOENT, ETIMEDOUT)
   * or a non-zero `status` — never by throwing. Every `try/catch` around one of
   * these calls was therefore dead code, which is why several fallbacks in this
   * file had never run.
   */
  private static spawnSucceeded(result: SpawnSyncReturns<string>): boolean {
    return !result.error && result.status === 0;
  }

  /**
   * Check if Ollama command line is available
   */
  private static isOllamaCommandReady(): boolean {
    const cmdCheck = this.safeSpawn("ollama", ["list"]);
    return !cmdCheck.error && cmdCheck.status === 0;
  }

  /**
   * Validate HTTP API response from Ollama
   */
  private static validateApiResponse(output: string): boolean {
    const httpCodeMatch = output.match(/(\d{3})$/);
    if (!httpCodeMatch || httpCodeMatch[1] !== "200") {
      return false;
    }

    // Try to parse the JSON response (excluding HTTP code)
    const jsonResponse = output.replace(/\d{3}$/, "");
    try {
      const parsedResponse = JSON.parse(jsonResponse);
      return parsedResponse && typeof parsedResponse === "object";
    } catch {
      // JSON parsing failed, but HTTP 200 is good enough
      return true;
    }
  }

  /**
   * Check if Ollama HTTP API is ready
   */
  private static isOllamaApiReady(): boolean {
    try {
      const apiCheck = this.safeSpawn("curl", [
        "-s",
        "--max-time",
        "3",
        "--fail", // Fail on HTTP error codes
        "-w",
        "%{http_code}",
        "http://localhost:11434/api/tags",
      ]);

      if (apiCheck.error || apiCheck.status !== 0 || !apiCheck.stdout.trim()) {
        return false;
      }

      return this.validateApiResponse(apiCheck.stdout.trim());
    } catch {
      return false;
    }
  }

  /**
   * Wait for Ollama service to become ready with exponential backoff
   */
  public static async waitForOllamaReady(
    maxAttempts = 30,
    initialDelay = 500,
  ): Promise<boolean> {
    let delay = initialDelay;

    // A per-call bound alone is not enough here, and adding one made this
    // worse before it made it better: each attempt can now burn the full
    // command bound plus the API bound, so 30 attempts is up to ~15 minutes of
    // spinner rather than the seconds this loop was written to take. The
    // per-attempt bound stops one wedged call; this stops the loop around it.
    const deadline = Date.now() + READINESS_DEADLINE_MS;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (Date.now() >= deadline) {
        return false;
      }
      try {
        // Try command line check first
        if (!this.isOllamaCommandReady()) {
          continue;
        }

        // If command check passes, verify HTTP API
        if (this.isOllamaApiReady()) {
          return true;
        }

        // Command check passed but API not ready, still consider ready
        return true;
      } catch {
        // Service not ready yet
      }

      // Wait before next attempt with exponential backoff (max 4 seconds)
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, 4000);
    }

    return false; // Timeout reached
  }

  /**
   * Check if Ollama service is already running
   */
  public static isOllamaRunning(): boolean {
    try {
      const check = this.safeSpawn("ollama", ["list"]);
      return !check.error && check.status === 0;
    } catch {
      return false;
    }
  }

  /**
   * Unified Ollama start logic that works across platforms
   */
  public static async startOllamaService(): Promise<void> {
    logger.always(chalk.blue("Starting Ollama service..."));

    // Check if already running
    if (this.isOllamaRunning()) {
      logger.always(chalk.yellow("Ollama service is already running!"));
      return;
    }

    try {
      if (process.platform === "darwin") {
        logger.always(chalk.gray("Starting Ollama on macOS..."));
        // `safeSpawn` RETURNS a result; it does not throw on a failed command,
        // so this catch only ever fired on a programming error and the
        // `ollama serve` fallback beneath it was effectively unreachable.
        // Bounding these calls made that worse: a timeout yields
        // `error: ETIMEDOUT` with `status: null`, still not a throw, so a
        // wedged launcher would have been reported as a successful start.
        // Branch on the result so the fallback actually runs.
        if (this.spawnSucceeded(this.safeSpawn("open", ["-a", "Ollama"]))) {
          logger.always(chalk.green("✅ Ollama app started"));
        } else {
          const child = spawn("ollama", ["serve"], {
            stdio: "ignore",
            detached: true,
          });
          child.on("error", (err) => {
            logger.error("Error starting Ollama serve process:", err);
          });
          child.unref();
          logger.always(chalk.green("✅ Ollama service started"));
        }
      } else if (process.platform === "linux") {
        logger.always(chalk.gray("Starting Ollama service on Linux..."));
        if (
          this.spawnSucceeded(this.safeSpawn("systemctl", ["start", "ollama"]))
        ) {
          logger.always(chalk.green("✅ Ollama service started"));
        } else {
          const child = spawn("ollama", ["serve"], {
            stdio: "ignore",
            detached: true,
          });
          child.on("error", (err) => {
            logger.error("Error starting Ollama serve process:", err);
          });
          child.unref();
          logger.always(chalk.green("✅ Ollama service started"));
        }
      } else {
        logger.always(chalk.gray("Starting Ollama on Windows..."));
        // Security Note: Windows shell=true usage is intentional here for 'start' command.
        // Arguments are controlled internally (no user input) and safeSpawn validates command names.
        // This is safer than alternative Windows process creation methods for this specific use case.
        const started = this.safeSpawn("start", ["ollama", "serve"], {
          stdio: "ignore",
          shell: true,
        });
        if (this.spawnSucceeded(started)) {
          logger.always(chalk.green("✅ Ollama service started"));
        } else {
          logger.always(
            chalk.yellow(
              "⚠️ Could not confirm Ollama started — check with: ollama list",
            ),
          );
        }
      }

      // Wait for service to become ready with readiness probe
      const readinessSpinner = ora(
        "Waiting for Ollama service to be ready...",
      ).start();
      const isReady = await this.waitForOllamaReady();

      if (isReady) {
        readinessSpinner.succeed("Ollama service is ready!");
      } else {
        readinessSpinner.warn(
          "Ollama service may still be starting. Try 'ollama list' to check status.",
        );
      }
    } catch (error: unknown) {
      logger.error(chalk.red("Failed to start Ollama service"));
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(chalk.red("Error:", errorMessage));
      logger.always(
        chalk.blue("\nTry starting Ollama manually or check installation"),
      );
      process.exit(1);
    }
  }
}
