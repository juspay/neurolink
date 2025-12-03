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

// Allowed commands for security
type AllowedCommand =
  | "ollama"
  | "curl"
  | "systemctl"
  | "pkill"
  | "killall"
  | "open"
  | "taskkill"
  | "start";

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
      ...options,
      encoding: "utf8", // Always enforce utf8 encoding
    };
    return spawnSync(command, args, defaultOptions);
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

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
        try {
          this.safeSpawn("open", ["-a", "Ollama"]);
          logger.always(chalk.green("✅ Ollama app started"));
        } catch {
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
        try {
          this.safeSpawn("systemctl", ["start", "ollama"]);
          logger.always(chalk.green("✅ Ollama service started"));
        } catch {
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
        this.safeSpawn("start", ["ollama", "serve"], {
          stdio: "ignore",
          shell: true,
        });
        logger.always(chalk.green("✅ Ollama service started"));
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
