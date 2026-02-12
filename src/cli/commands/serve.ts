/**
 * Serve CLI Commands for NeuroLink
 * Simplified HTTP server management commands for Server Adapters feature
 *
 * Usage:
 *   neurolink serve --framework <hono|express|fastify|koa> --port <n>
 *   neurolink serve --config <file>
 *   neurolink serve --cors --rate-limit
 *   neurolink serve status
 */

import chalk from "chalk";
import fs from "fs";
import ora from "ora";
import path from "path";
import type { Argv, CommandModule } from "yargs";
import { NeuroLink } from "../../lib/neurolink.js";
import {
  ConfigurationError,
  ServerStartError,
} from "../../lib/server/errors.js";
import type {
  RouteDefinition,
  RouteGroup,
  ServerAdapterConfig,
  ServerFramework,
} from "../../lib/server/types.js";
import { withTimeout } from "../../lib/utils/errorHandling.js";
import { logger } from "../../lib/utils/logger.js";
import {
  formatUptime,
  isProcessRunning,
  StateFileManager,
} from "../utils/serverUtils.js";

// ============================================
// Types
// ============================================

/**
 * Serve command arguments
 */
type ServeCommandArgs = {
  port?: number;
  host?: string;
  framework?: ServerFramework;
  basePath?: string;
  cors?: boolean;
  rateLimit?: number;
  swagger?: boolean;
  config?: string;
  watch?: boolean;
  quiet?: boolean;
  debug?: boolean;
  format?: "text" | "json";
};

/**
 * Server configuration file format
 */
type ServerConfigFile = {
  port?: number;
  host?: string;
  framework?: ServerFramework;
  basePath?: string;
  cors?: {
    enabled?: boolean;
    origins?: string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
    maxAge?: number;
  };
  rateLimit?: {
    enabled?: boolean;
    windowMs?: number;
    maxRequests?: number;
    message?: string;
    skipPaths?: string[];
  };
  bodyParser?: {
    enabled?: boolean;
    maxSize?: string;
    jsonLimit?: string;
    urlEncoded?: boolean;
  };
  logging?: {
    enabled?: boolean;
    level?: "debug" | "info" | "warn" | "error";
    includeBody?: boolean;
    includeResponse?: boolean;
  };
  timeout?: number;
  enableMetrics?: boolean;
  enableSwagger?: boolean;
};

/**
 * Minimal interface for the server instance returned by createServer.
 * Avoids importing BaseServerAdapter (which is dynamically loaded).
 */
type ServerInstance = {
  initialize: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  registerRouteGroup: (group: RouteGroup) => void;
  listRoutes?: () => RouteDefinition[];
};

/**
 * Server state stored in state file
 */
type ServeState = {
  pid: number;
  port: number;
  host: string;
  framework: string;
  startTime: string;
  basePath: string;
  configFile?: string;
};

// ============================================
// State Management
// ============================================

// Use StateFileManager for serve state persistence
const serveStateManager = new StateFileManager<ServeState>("serve-state.json");

function saveServeState(state: ServeState): void {
  serveStateManager.save(state);
}

function loadServeState(): ServeState | null {
  return serveStateManager.load();
}

function clearServeState(): void {
  serveStateManager.clear();
}

function loadConfigFile(configPath: string): ServerConfigFile {
  const absolutePath = path.isAbsolute(configPath)
    ? configPath
    : path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(absolutePath)) {
    throw new ConfigurationError(`Config file not found: ${absolutePath}`, {
      configPath,
      absolutePath,
    });
  }

  const content = fs.readFileSync(absolutePath, "utf8");

  // Support both JSON and JS/TS module format (for JSON only at runtime)
  if (absolutePath.endsWith(".json")) {
    return JSON.parse(content) as ServerConfigFile;
  }

  throw new ConfigurationError(
    "Only JSON config files are supported. Use .json extension.",
    {
      configPath,
      absolutePath,
    },
  );
}

// ============================================
// Watch Mode Utilities
// ============================================

/**
 * Directories to watch for changes in watch mode
 */
const WATCH_DIRS = ["src", "lib"];

/**
 * File extensions to watch for changes
 */
const WATCH_EXTENSIONS = [".ts", ".js", ".json"];

/**
 * Debounce time for file changes (ms)
 */
const WATCH_DEBOUNCE_MS = 500;

/**
 * Create a file watcher for watch mode
 * Returns a cleanup function to stop watching
 */
function createFileWatcher(
  onRestart: () => Promise<void>,
  quiet: boolean,
): () => void {
  const watchers: fs.FSWatcher[] = [];
  let debounceTimer: NodeJS.Timeout | null = null;
  let isRestarting = false;

  const handleChange = (eventType: string, filename: string | null) => {
    // Skip if no filename or if it doesn't match our extensions
    if (!filename) {
      return;
    }
    const ext = path.extname(filename);
    if (!WATCH_EXTENSIONS.includes(ext)) {
      return;
    }

    // Debounce rapid changes
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      if (isRestarting) {
        return;
      }
      isRestarting = true;

      if (!quiet) {
        logger.always("");
        logger.always(
          chalk.yellow(`File changed: ${filename}. Restarting server...`),
        );
      }

      try {
        await onRestart();
      } finally {
        isRestarting = false;
      }
    }, WATCH_DEBOUNCE_MS);
  };

  // Watch each directory
  const cwd = process.cwd();
  for (const dir of WATCH_DIRS) {
    const watchPath = path.join(cwd, dir);
    if (fs.existsSync(watchPath)) {
      try {
        const watcher = fs.watch(watchPath, { recursive: true }, handleChange);
        watchers.push(watcher);
      } catch {
        // Ignore errors for directories that can't be watched
      }
    }
  }

  // Return cleanup function
  return () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    for (const watcher of watchers) {
      watcher.close();
    }
  };
}

// ============================================
// Serve Command Factory
// ============================================

/**
 * Serve CLI command factory
 */
export class ServeCommandFactory {
  /**
   * Create the main serve command
   */
  static createServeCommands(): CommandModule {
    return {
      command: "serve [subcommand]",
      describe: "Start NeuroLink HTTP server with server adapters",
      builder: (yargs) => {
        return yargs
          .command(
            "status",
            "Show server status",
            (yargs) => ServeCommandFactory.buildStatusOptions(yargs),
            (argv) =>
              ServeCommandFactory.executeStatus(argv as ServeCommandArgs),
          )
          .option("port", {
            type: "number",
            alias: "p",
            default: 3000,
            description: "Port to listen on",
          })
          .option("host", {
            type: "string",
            alias: "H",
            default: "0.0.0.0",
            description: "Host to bind to",
          })
          .option("framework", {
            type: "string",
            alias: "f",
            choices: ["hono", "express", "fastify", "koa"] as ServerFramework[],
            default: "hono" as ServerFramework,
            description: "Web framework to use (hono recommended)",
          })
          .option("basePath", {
            type: "string",
            alias: "b",
            default: "/api",
            description: "Base path for all routes",
          })
          .option("cors", {
            type: "boolean",
            default: true,
            description: "Enable CORS middleware",
          })
          .option("rate-limit", {
            type: "number",
            alias: "rateLimit",
            default: 100,
            description:
              "Rate limit (requests per 15 min window, 0 to disable)",
          })
          .option("swagger", {
            type: "boolean",
            default: false,
            description: "Enable OpenAPI/Swagger documentation",
          })
          .option("config", {
            type: "string",
            alias: "c",
            description: "Path to server config file (JSON)",
          })
          .option("watch", {
            type: "boolean",
            alias: "w",
            default: false,
            description: "Watch mode (restart server on file changes)",
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
          .example(
            "neurolink serve",
            "Start server with default settings (Hono on port 3000)",
          )
          .example(
            "neurolink serve --framework express --port 8080",
            "Start Express server on port 8080",
          )
          .example(
            "neurolink serve --config server.config.json",
            "Start server with config file",
          )
          .example(
            "neurolink serve --cors --rate-limit 50",
            "Start server with CORS and rate limiting (50 req/15min)",
          )
          .example(
            "neurolink serve --swagger",
            "Start server with OpenAPI documentation enabled",
          )
          .example(
            "neurolink serve --watch",
            "Start server in watch mode (restart on changes)",
          )
          .example("neurolink serve status", "Show server status")
          .help();
      },
      handler: async (argv) => {
        // If subcommand is provided (like 'status'), it will be handled by the subcommand
        // Otherwise, start the server
        if (!argv.subcommand || argv.subcommand === "serve") {
          await ServeCommandFactory.executeServe(argv as ServeCommandArgs);
        }
      },
    };
  }

  private static buildStatusOptions(yargs: Argv): Argv {
    return yargs
      .option("format", {
        type: "string",
        choices: ["text", "json"],
        default: "text",
        description: "Output format",
      })
      .option("quiet", {
        type: "boolean",
        alias: "q",
        default: false,
        description: "Suppress non-essential output",
      })
      .example("neurolink serve status", "Show server status")
      .example("neurolink serve status --format json", "Show status as JSON");
  }

  // ============================================
  // Command Executors
  // ============================================

  private static async executeServe(argv: ServeCommandArgs): Promise<void> {
    const spinner = argv.quiet
      ? null
      : ora("Starting NeuroLink server...").start();

    try {
      // Check if server is already running
      ServeCommandFactory.guardAlreadyRunning(spinner);

      // Load config file if provided
      const fileConfig = ServeCommandFactory.loadFileConfig(argv, spinner);

      // Merge CLI args with file config (CLI takes precedence)
      const port = argv.port ?? fileConfig.port ?? 3000;
      const host = argv.host ?? fileConfig.host ?? "0.0.0.0";
      const framework = argv.framework ?? fileConfig.framework ?? "hono";
      const basePath = argv.basePath ?? fileConfig.basePath ?? "/api";

      // Build server adapter config from merged values
      const serverConfig = ServeCommandFactory.buildServerConfig(
        argv,
        fileConfig,
        {
          port,
          host,
          basePath,
        },
      );

      if (spinner) {
        spinner.text = `Creating ${framework} server...`;
      }

      // Create, register routes, initialize and start server
      const serverRef = await ServeCommandFactory.createAndStartServer(
        { framework, serverConfig, basePath, port, host },
        spinner,
      );

      // Save state and print startup banner
      ServeCommandFactory.saveAndPrintStartupInfo(
        { argv, port, host, framework, basePath, serverConfig },
        spinner,
      );

      // Set up watch mode if enabled
      const stopWatcher = ServeCommandFactory.setupWatchMode(argv, {
        serverRef,
        framework,
        serverConfig,
        basePath,
        port,
        host,
      });

      // Register signal handlers for graceful shutdown
      ServeCommandFactory.registerSignalHandlers(serverRef, stopWatcher);
    } catch (error) {
      ServeCommandFactory.handleStartupError(error, argv, spinner);
    }
  }

  // ============================================
  // executeServe Helpers
  // ============================================

  /**
   * Guard against a server that is already running. Exits the process if so.
   */
  private static guardAlreadyRunning(
    spinner: ReturnType<typeof ora> | null,
  ): void {
    const existingState = loadServeState();
    if (existingState && isProcessRunning(existingState.pid)) {
      if (spinner) {
        spinner.fail(
          chalk.red(
            `Server already running on port ${existingState.port} (PID: ${existingState.pid})`,
          ),
        );
      }
      logger.always(
        chalk.yellow(
          "Use 'neurolink server stop' or kill the process to stop it first",
        ),
      );
      process.exit(1);
    }
  }

  /**
   * Load a config file if one was specified in argv. Returns empty object otherwise.
   */
  private static loadFileConfig(
    argv: ServeCommandArgs,
    spinner: ReturnType<typeof ora> | null,
  ): ServerConfigFile {
    if (!argv.config) {
      return {};
    }
    try {
      const config = loadConfigFile(argv.config);
      if (spinner) {
        spinner.text = `Loading config from ${argv.config}...`;
      }
      return config;
    } catch (configError) {
      if (spinner) {
        spinner.fail(chalk.red("Failed to load config file"));
      }
      logger.error(
        chalk.red(
          `Error: ${configError instanceof Error ? configError.message : String(configError)}`,
        ),
      );
      process.exit(1);
    }
  }

  /**
   * Merge CLI args with file config to produce a ServerAdapterConfig.
   */
  private static buildServerConfig(
    argv: ServeCommandArgs,
    fileConfig: ServerConfigFile,
    merged: { port: number; host: string; basePath: string },
  ): ServerAdapterConfig {
    const defaultConfig = {
      cors: { enabled: true },
      rateLimit: { enabled: true, maxRequests: 100 },
    };

    return {
      port: merged.port,
      host: merged.host,
      basePath: merged.basePath,
      cors: {
        ...defaultConfig.cors,
        ...(fileConfig.cors || {}),
        enabled:
          argv.cors !== undefined
            ? argv.cors
            : (fileConfig.cors?.enabled ?? defaultConfig.cors.enabled),
      },
      rateLimit: {
        ...defaultConfig.rateLimit,
        ...(fileConfig.rateLimit || {}),
        enabled:
          argv.rateLimit !== undefined
            ? argv.rateLimit > 0
            : (fileConfig.rateLimit?.enabled ??
              defaultConfig.rateLimit.enabled),
        maxRequests:
          argv.rateLimit !== undefined
            ? argv.rateLimit
            : (fileConfig.rateLimit?.maxRequests ??
              defaultConfig.rateLimit.maxRequests),
      },
      bodyParser: fileConfig.bodyParser,
      logging: fileConfig.logging,
      timeout: fileConfig.timeout,
      enableMetrics: fileConfig.enableMetrics ?? true,
      enableSwagger:
        argv.swagger !== undefined
          ? argv.swagger
          : (fileConfig.enableSwagger ?? false),
      disableBuiltInHealth: true, // We register health routes separately
    };
  }

  /**
   * Create server, register routes, initialize and start it.
   * Returns a mutable reference wrapper so signal handlers always access the current server.
   */
  private static async createAndStartServer(
    opts: {
      framework: string;
      serverConfig: ServerAdapterConfig;
      basePath: string;
      port: number;
      host: string;
    },
    spinner: ReturnType<typeof ora> | null,
  ): Promise<{ current: ServerInstance }> {
    const { createServer, registerAllRoutes } = await import(
      "../../lib/server/index.js"
    );

    const neurolink = new NeuroLink();

    const serverRef: { current: ServerInstance } = {
      current: await createServer(neurolink, {
        framework: opts.framework as ServerFramework,
        config: opts.serverConfig,
      }),
    };

    registerAllRoutes(serverRef.current, opts.basePath);

    if (spinner) {
      spinner.text = "Initializing server...";
    }

    await withTimeout(
      serverRef.current.initialize(),
      30000,
      new ServerStartError(
        "Server initialization timed out after 30 seconds",
        undefined,
        opts.port,
        opts.host,
      ),
    );
    await withTimeout(
      serverRef.current.start(),
      30000,
      new ServerStartError(
        "Server startup timed out after 30 seconds",
        undefined,
        opts.port,
        opts.host,
      ),
    );

    return serverRef;
  }

  /**
   * Save server state and print the startup info banner.
   */
  private static saveAndPrintStartupInfo(
    opts: {
      argv: ServeCommandArgs;
      port: number;
      host: string;
      framework: string;
      basePath: string;
      serverConfig: ServerAdapterConfig;
    },
    spinner: ReturnType<typeof ora> | null,
  ): ServeState {
    const state: ServeState = {
      pid: process.pid,
      port: opts.port,
      host: opts.host,
      framework: opts.framework,
      startTime: new Date().toISOString(),
      basePath: opts.basePath,
      configFile: opts.argv.config,
    };
    saveServeState(state);

    if (spinner) {
      spinner.succeed(chalk.green("NeuroLink server started successfully"));
    }

    const url = `http://${opts.host === "0.0.0.0" ? "localhost" : opts.host}:${opts.port}`;

    const corsEnabled =
      opts.argv.cors ?? opts.serverConfig.cors?.enabled ?? true;
    const rateLimitValue =
      opts.argv.rateLimit ?? opts.serverConfig.rateLimit?.maxRequests ?? 100;
    const rateLimitEnabled = rateLimitValue > 0;
    const swaggerEnabled =
      opts.argv.swagger ?? opts.serverConfig.enableSwagger ?? false;

    ServeCommandFactory.printStartupBanner({
      url,
      framework: opts.framework,
      basePath: opts.basePath,
      pid: state.pid,
      configFile: opts.argv.config,
      corsEnabled,
      rateLimitEnabled,
      rateLimitValue,
      swaggerEnabled,
      watchEnabled: opts.argv.watch ?? false,
    });

    return state;
  }

  /**
   * Print the server startup banner with server info, middleware status and endpoints.
   */
  private static printStartupBanner(info: {
    url: string;
    framework: string;
    basePath: string;
    pid: number;
    configFile?: string;
    corsEnabled: boolean;
    rateLimitEnabled: boolean;
    rateLimitValue: number;
    swaggerEnabled: boolean;
    watchEnabled: boolean;
  }): void {
    logger.always("");
    logger.always(chalk.bold.cyan("NeuroLink Server"));
    logger.always(chalk.gray("=".repeat(50)));
    logger.always("");
    logger.always(`  ${chalk.bold("URL:")}        ${chalk.cyan(info.url)}`);
    logger.always(
      `  ${chalk.bold("Framework:")}  ${chalk.cyan(info.framework)}`,
    );
    logger.always(
      `  ${chalk.bold("Base Path:")}  ${chalk.cyan(info.basePath)}`,
    );
    logger.always(`  ${chalk.bold("PID:")}        ${chalk.cyan(info.pid)}`);
    if (info.configFile) {
      logger.always(
        `  ${chalk.bold("Config:")}     ${chalk.cyan(info.configFile)}`,
      );
    }
    logger.always("");

    logger.always(chalk.bold("Middleware:"));
    logger.always(
      `  CORS:        ${info.corsEnabled ? chalk.green("enabled") : chalk.yellow("disabled")}`,
    );
    logger.always(
      `  Rate Limit:  ${info.rateLimitEnabled ? chalk.green(`enabled (${info.rateLimitValue} req/15min)`) : chalk.yellow("disabled")}`,
    );
    logger.always(
      `  Swagger:     ${info.swaggerEnabled ? chalk.green("enabled") : chalk.yellow("disabled")}`,
    );
    if (info.watchEnabled) {
      logger.always(`  Watch Mode:  ${chalk.green("enabled")}`);
    }
    logger.always("");

    logger.always(chalk.bold("Available Endpoints:"));
    logger.always(chalk.gray("  Health & Monitoring:"));
    logger.always(`    ${chalk.green("GET")}  ${info.basePath}/health`);
    logger.always(`    ${chalk.green("GET")}  ${info.basePath}/ready`);
    logger.always(`    ${chalk.green("GET")}  ${info.basePath}/metrics`);
    logger.always("");
    logger.always(chalk.gray("  Agent API:"));
    logger.always(`    ${chalk.blue("POST")} ${info.basePath}/agent/execute`);
    logger.always(`    ${chalk.blue("POST")} ${info.basePath}/agent/stream`);
    logger.always(
      `    ${chalk.green("GET")}  ${info.basePath}/agent/providers`,
    );
    logger.always("");
    logger.always(chalk.gray("  Tools & MCP:"));
    logger.always(`    ${chalk.green("GET")}  ${info.basePath}/tools`);
    logger.always(
      `    ${chalk.blue("POST")} ${info.basePath}/tools/:name/execute`,
    );
    logger.always(`    ${chalk.green("GET")}  ${info.basePath}/mcp/servers`);
    logger.always("");
    logger.always(chalk.gray("  Memory:"));
    logger.always(
      `    ${chalk.green("GET")}  ${info.basePath}/memory/sessions`,
    );
    logger.always(
      `    ${chalk.green("GET")}  ${info.basePath}/memory/sessions/:id`,
    );

    if (info.swaggerEnabled) {
      logger.always("");
      logger.always(chalk.gray("  OpenAPI Documentation:"));
      logger.always(`    ${chalk.green("GET")}  ${info.basePath}/openapi.json`);
      logger.always(
        `    ${chalk.cyan("INFO")} Swagger UI available at ${info.url}${info.basePath}/docs`,
      );
    }
    logger.always("");

    logger.always(chalk.gray("Press Ctrl+C to stop the server"));
    logger.always("");
  }

  /**
   * Set up watch mode if enabled. Returns the stop-watcher function, or null if not enabled.
   */
  private static setupWatchMode(
    argv: ServeCommandArgs,
    ctx: {
      serverRef: { current: ServerInstance };
      framework: string;
      serverConfig: ServerAdapterConfig;
      basePath: string;
      port: number;
      host: string;
    },
  ): (() => void) | null {
    if (!argv.watch) {
      return null;
    }

    const restartServer = async () => {
      try {
        // Stop current server with timeout
        await withTimeout(
          ctx.serverRef.current.stop(),
          30000,
          new ServerStartError(
            "Server stop timed out during restart",
            undefined,
            ctx.port,
            ctx.host,
          ),
        );

        // Re-import server module with cache busting for watch mode
        const timestamp = Date.now();
        const {
          createServer: createNewServer,
          registerAllRoutes: registerNewRoutes,
        } = await import(`../../lib/server/index.js?t=${timestamp}`);

        // Create new server
        const newServer = await createNewServer(new NeuroLink(), {
          framework: ctx.framework as ServerFramework,
          config: ctx.serverConfig,
        });

        registerNewRoutes(newServer, ctx.basePath);

        // Initialize and start with timeouts
        await withTimeout(
          newServer.initialize(),
          30000,
          new ServerStartError(
            "Server initialization timed out during restart",
            undefined,
            ctx.port,
            ctx.host,
          ),
        );
        await withTimeout(
          newServer.start(),
          30000,
          new ServerStartError(
            "Server startup timed out during restart",
            undefined,
            ctx.port,
            ctx.host,
          ),
        );

        // Update the reference so signal handlers use the new server instance
        ctx.serverRef.current = newServer;

        logger.always(chalk.green("Server restarted successfully"));
      } catch (restartError) {
        logger.error(
          chalk.red(
            `Error restarting server: ${restartError instanceof Error ? restartError.message : String(restartError)}`,
          ),
        );
      }
    };

    const stopWatcher = createFileWatcher(restartServer, argv.quiet ?? false);
    logger.always(chalk.gray("Watching for file changes in src/ and lib/..."));
    logger.always("");

    return stopWatcher;
  }

  /**
   * Register SIGINT and SIGTERM handlers for graceful shutdown.
   */
  private static registerSignalHandlers(
    serverRef: { current: ServerInstance },
    stopWatcher: (() => void) | null,
  ): void {
    process.on("SIGINT", async () => {
      logger.always("");
      logger.always(chalk.yellow("Shutting down server..."));
      try {
        if (stopWatcher) {
          stopWatcher();
        }
        await serverRef.current.stop();
        clearServeState();
        logger.always(chalk.green("Server stopped gracefully"));
        process.exit(0);
      } catch (error) {
        logger.error(
          chalk.red(
            `Error stopping server: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
        process.exit(1);
      }
    });

    process.on("SIGTERM", async () => {
      try {
        if (stopWatcher) {
          stopWatcher();
        }
        await withTimeout(
          serverRef.current.stop(),
          30000,
          new Error("Server stop timed out during SIGTERM"),
        );
        clearServeState();
        process.exit(0);
      } catch (error) {
        logger.error(
          chalk.red(
            `Error stopping server: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
        clearServeState();
        process.exit(1);
      }
    });
  }

  /**
   * Handle errors during server startup: print error, troubleshooting tips, and exit.
   */
  private static handleStartupError(
    error: unknown,
    argv: ServeCommandArgs,
    spinner: ReturnType<typeof ora> | null,
  ): never {
    if (spinner) {
      spinner.fail(chalk.red("Failed to start server"));
    }
    logger.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );

    if (argv.debug && error instanceof Error && error.stack) {
      logger.error(chalk.gray(error.stack));
    }

    logger.always("");
    logger.always(chalk.bold("Troubleshooting:"));
    logger.always("  1. Check if the port is already in use");
    logger.always(
      "  2. Verify the framework is installed (npm install hono/express/fastify/koa)",
    );
    logger.always("  3. Check your config file format if using --config");
    logger.always("  4. Run with --debug for more information");
    logger.always("");

    process.exit(1);
  }

  private static async executeStatus(argv: ServeCommandArgs): Promise<void> {
    try {
      const state = loadServeState();

      const status = {
        running: false,
        pid: null as number | null,
        port: null as number | null,
        host: null as string | null,
        framework: null as string | null,
        basePath: null as string | null,
        uptime: null as number | null,
        startTime: null as string | null,
        configFile: null as string | null,
        url: null as string | null,
      };

      if (state && isProcessRunning(state.pid)) {
        status.running = true;
        status.pid = state.pid;
        status.port = state.port;
        status.host = state.host;
        status.framework = state.framework;
        status.basePath = state.basePath;
        status.startTime = state.startTime;
        status.uptime = Date.now() - new Date(state.startTime).getTime();
        status.configFile = state.configFile ?? null;
        status.url = `http://${state.host === "0.0.0.0" ? "localhost" : state.host}:${state.port}`;
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(status, null, 2));
        return;
      }

      // Text format
      logger.always("");
      logger.always(chalk.bold.cyan("NeuroLink Server Status"));
      logger.always(chalk.gray("=".repeat(50)));
      logger.always("");

      if (status.running) {
        logger.always(
          `  ${chalk.bold("Status:")}     ${chalk.green("RUNNING")}`,
        );
        logger.always(
          `  ${chalk.bold("PID:")}        ${chalk.cyan(status.pid)}`,
        );
        logger.always(
          `  ${chalk.bold("URL:")}        ${chalk.cyan(status.url)}`,
        );
        logger.always(
          `  ${chalk.bold("Framework:")}  ${chalk.cyan(status.framework)}`,
        );
        logger.always(
          `  ${chalk.bold("Base Path:")}  ${chalk.cyan(status.basePath)}`,
        );
        logger.always(
          `  ${chalk.bold("Started:")}    ${chalk.cyan(status.startTime)}`,
        );
        logger.always(
          `  ${chalk.bold("Uptime:")}     ${chalk.cyan(formatUptime(status.uptime ?? 0))}`,
        );
        if (status.configFile) {
          logger.always(
            `  ${chalk.bold("Config:")}     ${chalk.cyan(status.configFile)}`,
          );
        }
      } else {
        logger.always(
          `  ${chalk.bold("Status:")}     ${chalk.yellow("NOT RUNNING")}`,
        );
        logger.always("");
        logger.always(chalk.gray("  Start the server with: neurolink serve"));
        logger.always(
          chalk.gray(
            "  Or with custom options: neurolink serve --port 8080 --framework express",
          ),
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
  }
}

export default ServeCommandFactory;
