/**
 * Server CLI Commands for NeuroLink
 * Implements HTTP server management commands
 */

import type { CommandModule, Argv } from "yargs";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import path from "path";
import { logger } from "../../lib/utils/logger.js";
import { NeuroLink } from "../../lib/neurolink.js";
import { withTimeout } from "../../lib/utils/errorHandling.js";
import {
  isProcessRunning,
  formatUptime,
  ensureStateDir,
  getNeuroLinkDir,
} from "../utils/serverUtils.js";
import type {
  CliServeFlatRoute,
  CliServeRouteGroup,
  ServerCommandArgs,
  ServerConfig,
  ServerState,
} from "../../lib/types/index.js";

// ============================================
// State Management
// ============================================

const STATE_FILE = path.join(getNeuroLinkDir(), "server-state.json");

function saveServerState(state: ServerState): void {
  ensureStateDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadServerState(): ServerState | null {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const content = fs.readFileSync(STATE_FILE, "utf8");
      return JSON.parse(content) as ServerState;
    }
  } catch {
    // Ignore errors
  }
  return null;
}

function clearServerState(): void {
  try {
    if (fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
    }
  } catch {
    // Ignore errors
  }
}

// ============================================
// Config Management
// ============================================

const CONFIG_FILE = path.join(getNeuroLinkDir(), "server-config.json");

function loadServerConfig(): ServerConfig {
  const defaults: ServerConfig = {
    defaultPort: 3000,
    defaultHost: "0.0.0.0",
    defaultFramework: "hono",
    defaultBasePath: "/api",
    cors: { enabled: true },
    rateLimit: { enabled: true, windowMs: 60000, maxRequests: 100 },
    swagger: { enabled: true, path: "/docs" },
  };

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, "utf8");
      return { ...defaults, ...JSON.parse(content) };
    }
  } catch {
    // Return defaults on error
  }
  return defaults;
}

function saveServerConfig(config: ServerConfig): void {
  ensureStateDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Helper to get nested config values
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let value: unknown = obj;
  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return value;
}

// Helper to set nested config values
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const keys = path.split(".");
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    // Guard against prototype pollution - abort entire operation
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      logger.warn(
        chalk.yellow(`[ServerConfig] Blocked dangerous config key: ${path}`),
      );
      return; // Abort - don't continue traversal
    }
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  const finalKey = keys[keys.length - 1];
  // Guard against prototype pollution for final key
  if (
    finalKey === "__proto__" ||
    finalKey === "constructor" ||
    finalKey === "prototype"
  ) {
    logger.warn(
      chalk.yellow(`[ServerConfig] Blocked dangerous config key: ${path}`),
    );
    return; // Skip dangerous keys
  }
  current[finalKey] = value;
}

// Helper to parse config values
function parseConfigValue(value: string): unknown {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (!isNaN(Number(value))) {
    return Number(value);
  }
  return value;
}

// ============================================
// Server Command Factory
// ============================================

/**
 * Server CLI command factory
 */
export class ServerCommandFactory {
  /**
   * Create the main server command with subcommands
   */
  static createServerCommands(): CommandModule {
    return {
      command: "server <subcommand>",
      describe: "Manage NeuroLink HTTP server",
      builder: (yargs) => {
        return yargs
          .command(
            "start",
            "Start the HTTP server",
            (yargs) => this.buildStartOptions(yargs),
            (argv) => this.executeStart(argv as ServerCommandArgs),
          )
          .command(
            "stop",
            "Stop the running server",
            (yargs) => this.buildStopOptions(yargs),
            (argv) => this.executeStop(argv as ServerCommandArgs),
          )
          .command(
            "status",
            "Show server status",
            (yargs) => this.buildStatusOptions(yargs),
            (argv) => this.executeStatus(argv as ServerCommandArgs),
          )
          .command(
            "openapi",
            "Generate OpenAPI specification",
            (yargs) => this.buildOpenAPIOptions(yargs),
            (argv) => this.executeOpenAPI(argv as ServerCommandArgs),
          )
          .command(
            "routes",
            "List all registered server routes",
            (yargs) => this.buildRoutesOptions(yargs),
            (argv) => this.executeRoutes(argv as ServerCommandArgs),
          )
          .command(
            "config",
            "Show or modify server configuration",
            (yargs) => this.buildConfigOptions(yargs),
            (argv) => this.executeConfig(argv as ServerCommandArgs),
          )
          .demandCommand(1, "Please specify a server subcommand")
          .help();
      },
      handler: () => {
        // No-op handler as subcommands handle everything
      },
    };
  }

  // ============================================
  // Option Builders
  // ============================================

  private static buildStartOptions(yargs: Argv): Argv {
    return yargs
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
        choices: ["hono", "express", "fastify", "koa"],
        default: "hono",
        description: "Web framework to use",
      })
      .option("basePath", {
        type: "string",
        default: "/api",
        description: "Base path for all routes",
      })
      .option("cors", {
        type: "boolean",
        default: true,
        description: "Enable CORS",
      })
      .option("rateLimit", {
        type: "boolean",
        default: true,
        description: "Enable rate limiting",
      })
      .option("quiet", {
        type: "boolean",
        alias: "q",
        default: false,
        description: "Suppress non-essential output",
      })
      .option("debug", {
        type: "boolean",
        default: false,
        description: "Enable debug output",
      })
      .example("neurolink server start", "Start server on default port 3000")
      .example("neurolink server start -p 8080", "Start server on port 8080")
      .example(
        "neurolink server start --framework express",
        "Start with Express",
      );
  }

  private static buildStopOptions(yargs: Argv): Argv {
    return yargs
      .option("force", {
        type: "boolean",
        default: false,
        description: "Force stop even if server is not responding",
      })
      .option("quiet", {
        type: "boolean",
        alias: "q",
        default: false,
        description: "Suppress non-essential output",
      })
      .example("neurolink server stop", "Stop the running server");
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
      .example("neurolink server status", "Show server status")
      .example("neurolink server status --format json", "Show status as JSON");
  }

  private static buildOpenAPIOptions(yargs: Argv): Argv {
    return yargs
      .option("output", {
        type: "string",
        alias: "o",
        description: "Output file path (default: stdout)",
      })
      .option("format", {
        type: "string",
        choices: ["json", "yaml"],
        default: "json",
        description: "Output format",
      })
      .option("basePath", {
        type: "string",
        default: "/api",
        description: "Base path for all routes",
      })
      .option("title", {
        type: "string",
        description: "API title",
      })
      .option("version", {
        type: "string",
        description: "API version",
      })
      .option("quiet", {
        type: "boolean",
        alias: "q",
        default: false,
        description: "Suppress non-essential output",
      })
      .example("neurolink server openapi", "Generate OpenAPI spec to stdout")
      .example("neurolink server openapi -o openapi.json", "Save to file")
      .example(
        "neurolink server openapi --format yaml -o openapi.yaml",
        "Generate YAML spec",
      );
  }

  private static buildRoutesOptions(yargs: Argv): Argv {
    return yargs
      .option("format", {
        type: "string",
        choices: ["text", "json", "table"],
        default: "table",
        description: "Output format",
      })
      .option("group", {
        type: "string",
        choices: ["agent", "tool", "mcp", "memory", "health", "all"],
        default: "all",
        description: "Filter by route group",
      })
      .option("method", {
        type: "string",
        choices: ["GET", "POST", "PUT", "DELETE", "PATCH", "all"],
        default: "all",
        description: "Filter by HTTP method",
      })
      .option("quiet", {
        type: "boolean",
        alias: "q",
        default: false,
        description: "Suppress non-essential output",
      })
      .example("neurolink server routes", "List all registered routes")
      .example(
        "neurolink server routes --group agent",
        "List agent routes only",
      )
      .example("neurolink server routes --format json", "Output as JSON");
  }

  private static buildConfigOptions(yargs: Argv): Argv {
    return yargs
      .option("get", {
        type: "string",
        description: "Get a specific config value (e.g., defaultPort)",
      })
      .option("set", {
        type: "string",
        description: "Set a config value (format: key=value)",
      })
      .option("reset", {
        type: "boolean",
        default: false,
        description: "Reset configuration to defaults",
      })
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
      .example("neurolink server config", "Show all configuration")
      .example(
        "neurolink server config --get defaultPort",
        "Get specific value",
      )
      .example(
        "neurolink server config --set defaultPort=8080",
        "Set config value",
      )
      .example("neurolink server config --reset", "Reset to defaults");
  }

  // ============================================
  // Command Executors
  // ============================================

  private static async executeStart(argv: ServerCommandArgs): Promise<void> {
    const spinner = argv.quiet ? null : ora("Starting server...").start();

    try {
      // Check if server is already running
      const existingState = loadServerState();
      if (existingState && isProcessRunning(existingState.pid)) {
        if (spinner) {
          spinner.fail(
            chalk.red(
              `Server already running on port ${existingState.port} (PID: ${existingState.pid})`,
            ),
          );
        }
        logger.always(
          chalk.yellow("Use 'neurolink server stop' to stop it first"),
        );
        process.exit(1);
      }

      // Create NeuroLink instance
      const neurolink = new NeuroLink();

      // Dynamically import server module
      const { createServer, registerAllRoutes } =
        await import("../../lib/server/index.js");

      const framework = (argv.framework ?? "hono") as
        | "hono"
        | "express"
        | "fastify"
        | "koa";

      // Create server
      const server = await createServer(neurolink, {
        framework,
        config: {
          port: argv.port ?? 3000,
          host: argv.host ?? "0.0.0.0",
          basePath: argv.basePath ?? "/api",
          cors: {
            enabled: argv.cors ?? true,
          },
          rateLimit: {
            enabled: argv.rateLimit ?? true,
          },
          disableBuiltInHealth: true, // We register health routes separately
        },
      });

      // Register all routes
      registerAllRoutes(server, argv.basePath ?? "/api");

      // Initialize and start with timeout
      await withTimeout(
        server.initialize(),
        30000,
        new Error("Server initialization timed out after 30 seconds"),
      );
      await withTimeout(
        server.start(),
        30000,
        new Error("Server startup timed out after 30 seconds"),
      );

      // Save state
      const state: ServerState = {
        pid: process.pid,
        port: argv.port ?? 3000,
        host: argv.host ?? "0.0.0.0",
        framework,
        startTime: new Date().toISOString(),
        basePath: argv.basePath ?? "/api",
      };
      saveServerState(state);

      if (spinner) {
        spinner.succeed(chalk.green("Server started successfully"));
      }

      const url = `http://${state.host === "0.0.0.0" ? "localhost" : state.host}:${state.port}`;
      logger.always(chalk.bold("\nServer Information:"));
      logger.always(`  URL: ${chalk.cyan(url)}`);
      logger.always(`  Framework: ${chalk.cyan(framework)}`);
      logger.always(`  Base Path: ${chalk.cyan(state.basePath)}`);
      logger.always(`  PID: ${chalk.cyan(state.pid)}`);

      logger.always(chalk.bold("\nAvailable Endpoints:"));
      logger.always(`  ${chalk.green("GET")}  ${state.basePath}/health`);
      logger.always(`  ${chalk.green("GET")}  ${state.basePath}/ready`);
      logger.always(`  ${chalk.green("GET")}  ${state.basePath}/metrics`);
      logger.always(`  ${chalk.blue("POST")} ${state.basePath}/agent/execute`);
      logger.always(`  ${chalk.blue("POST")} ${state.basePath}/agent/stream`);
      logger.always(
        `  ${chalk.green("GET")}  ${state.basePath}/agent/providers`,
      );
      logger.always(`  ${chalk.green("GET")}  ${state.basePath}/tools`);
      logger.always(`  ${chalk.green("GET")}  ${state.basePath}/mcp/servers`);

      logger.always(chalk.gray("\nPress Ctrl+C to stop the server"));

      // Keep process running
      process.on("SIGINT", async () => {
        logger.always(chalk.yellow("\nShutting down server..."));
        try {
          await server.stop();
          clearServerState();
          logger.always(chalk.green("Server stopped"));
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
          await server.stop();
          clearServerState();
          process.exit(0);
        } catch (error) {
          logger.error(
            chalk.red(
              `Error stopping server: ${error instanceof Error ? error.message : String(error)}`,
            ),
          );
          clearServerState();
          process.exit(1);
        }
      });
    } catch (error) {
      if (spinner) {
        spinner.fail(chalk.red("Failed to start server"));
      }
      logger.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );

      if (argv.debug) {
        logger.error(
          chalk.gray(
            error instanceof Error ? (error.stack ?? "") : String(error),
          ),
        );
      }

      process.exit(1);
    }
  }

  private static async executeStop(
    argv: ServerCommandArgs & { force?: boolean },
  ): Promise<void> {
    const spinner = argv.quiet ? null : ora("Stopping server...").start();

    try {
      const state = loadServerState();

      if (!state) {
        if (spinner) {
          spinner.warn(chalk.yellow("No server state found"));
        }
        logger.always(
          chalk.yellow(
            "Server may not be running or was started in a different way",
          ),
        );
        return;
      }

      if (!isProcessRunning(state.pid)) {
        if (spinner) {
          spinner.warn(chalk.yellow("Server process not found"));
        }
        logger.always(
          chalk.yellow(`Server process ${state.pid} is not running`),
        );
        clearServerState();
        return;
      }

      // Send SIGTERM to stop the server
      try {
        process.kill(state.pid, "SIGTERM");

        // Wait for process to stop
        let attempts = 0;
        const maxAttempts = 10;
        while (isProcessRunning(state.pid) && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          attempts++;
        }

        if (isProcessRunning(state.pid)) {
          if (argv.force) {
            process.kill(state.pid, "SIGKILL");
            if (spinner) {
              spinner.succeed(chalk.green("Server force stopped"));
            }
          } else {
            if (spinner) {
              spinner.warn(
                chalk.yellow("Server not responding, use --force to kill"),
              );
            }
            return;
          }
        } else {
          if (spinner) {
            spinner.succeed(chalk.green("Server stopped successfully"));
          }
        }
      } catch (killError) {
        if (spinner) {
          spinner.fail(chalk.red("Failed to stop server"));
        }
        logger.error(
          chalk.red(
            `Error: ${killError instanceof Error ? killError.message : String(killError)}`,
          ),
        );
        return;
      }

      clearServerState();
      logger.always(chalk.green(`Stopped server (PID: ${state.pid})`));
    } catch (error) {
      if (spinner) {
        spinner.fail(chalk.red("Failed to stop server"));
      }
      logger.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exit(1);
    }
  }

  private static async executeStatus(argv: ServerCommandArgs): Promise<void> {
    try {
      const state = loadServerState();

      const status = {
        running: false,
        pid: null as number | null,
        port: null as number | null,
        host: null as string | null,
        framework: null as string | null,
        basePath: null as string | null,
        uptime: null as number | null,
        startTime: null as string | null,
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
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(status, null, 2));
        return;
      }

      // Text format
      logger.always(chalk.bold("\nNeuroLink Server Status:"));
      logger.always("");

      if (status.running) {
        logger.always(`  Status: ${chalk.green("RUNNING")}`);
        logger.always(`  PID: ${chalk.cyan(status.pid)}`);
        logger.always(
          `  URL: ${chalk.cyan(`http://${status.host === "0.0.0.0" ? "localhost" : status.host}:${status.port}`)}`,
        );
        logger.always(`  Framework: ${chalk.cyan(status.framework)}`);
        logger.always(`  Base Path: ${chalk.cyan(status.basePath)}`);
        logger.always(`  Started: ${chalk.cyan(status.startTime)}`);
        logger.always(
          `  Uptime: ${chalk.cyan(formatUptime(status.uptime ?? 0))}`,
        );
      } else {
        logger.always(`  Status: ${chalk.yellow("NOT RUNNING")}`);
        logger.always("");
        logger.always(
          chalk.gray("Use 'neurolink server start' to start the server"),
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

  private static async executeOpenAPI(
    argv: ServerCommandArgs & {
      title?: string;
      version?: string;
    },
  ): Promise<void> {
    const spinner = argv.quiet
      ? null
      : ora("Generating OpenAPI specification...").start();

    try {
      // Dynamically import OpenAPI generator
      const { OpenAPIGenerator } =
        await import("../../lib/server/openapi/index.js");

      const generator = new OpenAPIGenerator({
        basePath: argv.basePath ?? "/api",
        info: {
          title: argv.title,
          version: argv.version,
        },
      });

      const spec = generator.generate();

      let output: string;
      if (argv.format === "yaml") {
        // Simple YAML conversion (for production, use a proper YAML library)
        output = generator.toYAML();
      } else {
        output = JSON.stringify(spec, null, 2);
      }

      if (argv.output) {
        // Ensure directory exists
        const dir = path.dirname(argv.output);
        if (dir && dir !== "." && !fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(argv.output, output);

        if (spinner) {
          spinner.succeed(chalk.green(`OpenAPI spec saved to ${argv.output}`));
        }

        logger.always(chalk.bold("\nGenerated OpenAPI Specification:"));
        logger.always(`  File: ${chalk.cyan(argv.output)}`);
        logger.always(`  Format: ${chalk.cyan(argv.format ?? "json")}`);
        logger.always(
          `  Endpoints: ${chalk.cyan(Object.keys(spec.paths).length)}`,
        );
        logger.always(
          `  Schemas: ${chalk.cyan(Object.keys(spec.components.schemas).length)}`,
        );
      } else {
        if (spinner) {
          spinner.stop();
        }
        logger.always(output);
      }
    } catch (error) {
      if (spinner) {
        spinner.fail(chalk.red("Failed to generate OpenAPI spec"));
      }
      logger.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exit(1);
    }
  }

  private static async executeRoutes(
    argv: ServerCommandArgs & {
      group?: string;
      method?: string;
    },
  ): Promise<void> {
    try {
      // Dynamically import route definitions and types
      const { createAllRoutes } =
        await import("../../lib/server/routes/index.js");

      const routeGroups = createAllRoutes(
        argv.basePath ?? "/api",
      ) as CliServeRouteGroup[];

      // Flatten route groups into individual routes with group info
      let flatRoutes: CliServeFlatRoute[] = [];
      for (const group of routeGroups) {
        // Extract group name from prefix (e.g., "/api/agent" -> "agent")
        const groupName =
          group.prefix.split("/").filter(Boolean).pop() || "root";
        for (const route of group.routes) {
          flatRoutes.push({
            method: route.method,
            path: route.path,
            description: route.description,
            group: groupName,
          });
        }
      }

      // Filter routes by group and method
      if (argv.group && argv.group !== "all") {
        flatRoutes = flatRoutes.filter((r) => r.group === argv.group);
      }
      if (argv.method && argv.method !== "all") {
        flatRoutes = flatRoutes.filter((r) => r.method === argv.method);
      }

      // Output based on format
      const format = argv.format as string;
      if (format === "json") {
        logger.always(JSON.stringify(flatRoutes, null, 2));
      } else if (format === "table") {
        // Table format output
        logger.always(chalk.bold("\nRegistered Routes:"));
        logger.always("");

        const methodColors: Record<string, (s: string) => string> = {
          GET: chalk.green,
          POST: chalk.blue,
          PUT: chalk.yellow,
          DELETE: chalk.red,
          PATCH: chalk.magenta,
        };

        for (const route of flatRoutes) {
          const colorFn = methodColors[route.method] || chalk.white;
          logger.always(
            `  ${colorFn(route.method.padEnd(7))} ${route.path.padEnd(40)} ${chalk.gray(route.description || "")}`,
          );
        }

        logger.always("");
        logger.always(chalk.gray(`Total: ${flatRoutes.length} routes`));
      } else {
        // Text format
        for (const route of flatRoutes) {
          logger.always(`${route.method} ${route.path}`);
        }
      }
    } catch (error) {
      logger.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exit(1);
    }
  }

  private static async executeConfig(
    argv: ServerCommandArgs & {
      get?: string;
      set?: string;
      reset?: boolean;
    },
  ): Promise<void> {
    try {
      // Handle reset
      if (argv.reset) {
        try {
          if (fs.existsSync(CONFIG_FILE)) {
            fs.unlinkSync(CONFIG_FILE);
          }
          logger.always(chalk.green("Configuration reset to defaults"));
          return;
        } catch {
          logger.error(chalk.red("Failed to reset configuration"));
          process.exit(1);
        }
      }

      const config = loadServerConfig();

      // Handle --get
      if (argv.get) {
        const value = getNestedValue(
          config as unknown as Record<string, unknown>,
          argv.get,
        );
        if (value === undefined) {
          logger.error(chalk.red(`Unknown config key: ${argv.get}`));
          process.exit(1);
        }
        if (argv.format === "json") {
          logger.always(JSON.stringify({ [argv.get]: value }, null, 2));
        } else {
          logger.always(`${argv.get}: ${JSON.stringify(value)}`);
        }
        return;
      }

      // Handle --set
      if (argv.set) {
        const [key, ...valueParts] = argv.set.split("=");
        const value = valueParts.join("=");
        if (!key || value === undefined || value === "") {
          logger.error(chalk.red("Invalid format. Use: key=value"));
          process.exit(1);
        }

        setNestedValue(
          config as unknown as Record<string, unknown>,
          key,
          parseConfigValue(value),
        );
        saveServerConfig(config);
        logger.always(chalk.green(`Set ${key} = ${value}`));
        return;
      }

      // Show all config
      if (argv.format === "json") {
        logger.always(JSON.stringify(config, null, 2));
      } else {
        logger.always(chalk.bold("\nServer Configuration:"));
        logger.always("");
        logger.always(`  ${chalk.cyan("Port:")}      ${config.defaultPort}`);
        logger.always(`  ${chalk.cyan("Host:")}      ${config.defaultHost}`);
        logger.always(
          `  ${chalk.cyan("Framework:")} ${config.defaultFramework}`,
        );
        logger.always(
          `  ${chalk.cyan("Base Path:")} ${config.defaultBasePath}`,
        );
        logger.always("");
        logger.always(
          `  ${chalk.cyan("CORS:")}      ${config.cors.enabled ? "enabled" : "disabled"}`,
        );
        logger.always(
          `  ${chalk.cyan("Rate Limit:")} ${config.rateLimit.enabled ? "enabled" : "disabled"}`,
        );
        logger.always(
          `  ${chalk.cyan("Swagger:")}   ${config.swagger.enabled ? "enabled" : "disabled"}`,
        );
        logger.always("");
        logger.always(chalk.gray(`Config file: ${CONFIG_FILE}`));
      }
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
