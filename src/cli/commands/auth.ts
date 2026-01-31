/**
 * Auth CLI Commands for NeuroLink
 *
 * Provides CLI commands for managing authentication providers,
 * sessions, and user authentication.
 *
 * @packageDocumentation
 * @module @juspay/neurolink/cli
 * @category CLI
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import type { Argv, CommandModule } from "yargs";
import { AuthProviderFactory, getAuthProviderFactory } from "../../lib/auth/AuthProviderFactory.js";
import { SessionManager } from "../../lib/auth/sessionManager.js";
import type { AuthProviderConfig, AuthProviderType, AuthSession } from "../../lib/types/authTypes.js";
import { logger } from "../../lib/utils/logger.js";

/**
 * Auth configuration file path
 */
const AUTH_CONFIG_PATH = path.join(os.homedir(), ".neurolink", "auth.json");

// Type alias for backward compatibility
type AuthProviderName = AuthProviderType;

/**
 * Provider info for CLI display
 */
interface ProviderConfigInfo {
  requiredConfig: string[];
  optionalConfig: string[];
}

/**
 * Hardcoded provider configuration requirements for CLI
 * (since factory doesn't expose this directly)
 */
const PROVIDER_CONFIG_INFO: Record<string, ProviderConfigInfo> = {
  auth0: {
    requiredConfig: ["domain", "clientId"],
    optionalConfig: ["clientSecret", "audience"],
  },
  clerk: {
    requiredConfig: ["publishableKey"],
    optionalConfig: ["secretKey"],
  },
  firebase: {
    requiredConfig: ["apiKey", "projectId"],
    optionalConfig: ["authDomain"],
  },
  supabase: {
    requiredConfig: ["url", "anonKey"],
    optionalConfig: ["serviceRoleKey"],
  },
  workos: {
    requiredConfig: ["apiKey", "clientId"],
    optionalConfig: ["webhookSecret"],
  },
  "better-auth": {
    requiredConfig: ["baseUrl"],
    optionalConfig: ["secret"],
  },
};

/**
 * Stored session info in auth config
 */
interface StoredSessionInfo {
  sessionId: string;
  provider: AuthProviderName;
  userId: string;
  userEmail?: string;
  userName?: string;
  expiresAt: number;
  createdAt: number;
}

/**
 * Auth configuration type
 */
type AuthConfig = {
  defaultProvider?: AuthProviderName;
  providers: Partial<Record<AuthProviderName, AuthProviderConfig>>;
  currentSession?: StoredSessionInfo;
};

/**
 * Load auth configuration
 */
function loadAuthConfig(): AuthConfig {
  try {
    if (fs.existsSync(AUTH_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(AUTH_CONFIG_PATH, "utf-8"));
    }
  } catch {
    // Ignore errors, return default
  }
  return { providers: {} };
}

/**
 * Save auth configuration
 */
function saveAuthConfig(config: AuthConfig): void {
  const dir = path.dirname(AUTH_CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(AUTH_CONFIG_PATH, JSON.stringify(config, null, 2));
}

/**
 * Get a SessionManager instance for file-based storage
 */
function getFileSessionManager(): SessionManager {
  return new SessionManager({
    storage: "memory", // Use memory for CLI as file storage isn't implemented
    duration: 86400, // 24 hours
  });
}

/**
 * Auth command arguments
 */
type AuthConfigureArgs = {
  provider: AuthProviderName;
  interactive?: boolean;
  "client-id"?: string;
  "client-secret"?: string;
  domain?: string;
  "api-url"?: string;
};

type AuthLoginArgs = {
  provider?: AuthProviderName;
  email?: string;
  password?: string;
};

type AuthStatusArgs = {
  verbose?: boolean;
};

/**
 * Auth CLI command factory
 */
export class AuthCommandFactory {
  /**
   * Create the main auth command with subcommands
   */
  static createAuthCommands(): CommandModule {
    return {
      command: "auth [subcommand]",
      describe: "Manage authentication providers and sessions",
      builder: (yargs) => {
        return (
          yargs
            // @ts-expect-error - yargs type inference is overly strict for nested commands
            .command({
              command: "configure",
              describe: "Configure an authentication provider",
              builder: (y: Argv) => AuthCommandFactory.buildConfigureOptions(y),
              handler: AuthCommandFactory.executeConfigure,
            })
            // @ts-expect-error - yargs type inference is overly strict for nested commands
            .command({
              command: "login",
              describe: "Authenticate with a provider",
              builder: (y: Argv) => AuthCommandFactory.buildLoginOptions(y),
              handler: AuthCommandFactory.executeLogin,
            })
            .command({
              command: "logout",
              describe: "Log out and clear current session",
              builder: {},
              handler: AuthCommandFactory.executeLogout,
            })
            // @ts-expect-error - yargs type inference is overly strict for nested commands
            .command({
              command: "status",
              describe: "Show current authentication status",
              builder: (y: Argv) => AuthCommandFactory.buildStatusOptions(y),
              handler: AuthCommandFactory.executeStatus,
            })
            .command({
              command: "providers",
              describe: "List available authentication providers",
              builder: {},
              handler: AuthCommandFactory.executeListProviders,
            })
            .command({
              command: "sessions",
              describe: "List active sessions",
              builder: {},
              handler: AuthCommandFactory.executeListSessions,
            })
            .example("neurolink auth configure --provider auth0", "Configure Auth0 provider")
            .example("neurolink auth login --provider auth0 --email user@example.com", "Login with Auth0")
            .example("neurolink auth status", "Show current auth status")
            .example("neurolink auth logout", "Logout from current session")
            .help()
        );
      },
      handler: () => {
        // No-op - handled by subcommands
      },
    };
  }

  /**
   * Build options for configure command
   */
  private static buildConfigureOptions(yargs: Argv): Argv {
    return yargs
      .option("provider", {
        type: "string",
        choices: ["better-auth", "auth0", "clerk", "firebase", "supabase", "workos"] as const,
        required: true,
        description: "Authentication provider to configure",
        alias: "p",
      })
      .option("interactive", {
        type: "boolean",
        default: true,
        description: "Use interactive prompts",
        alias: "i",
      })
      .option("client-id", {
        type: "string",
        description: "Client ID for the provider",
      })
      .option("client-secret", {
        type: "string",
        description: "Client secret for the provider",
      })
      .option("domain", {
        type: "string",
        description: "Domain for the provider (e.g., Auth0 tenant)",
      })
      .option("api-url", {
        type: "string",
        description: "API URL for the provider",
      })
      .example("neurolink auth configure --provider auth0", "Configure Auth0 interactively")
      .example(
        'neurolink auth configure --provider supabase --api-url https://project.supabase.co --client-id "anon-key"',
        "Configure Supabase with options",
      );
  }

  /**
   * Build options for login command
   */
  private static buildLoginOptions(yargs: Argv): Argv {
    return yargs
      .option("provider", {
        type: "string",
        choices: ["better-auth", "auth0", "clerk", "firebase", "supabase", "workos"] as const,
        description: "Authentication provider to use",
        alias: "p",
      })
      .option("email", {
        type: "string",
        description: "Email address for authentication",
        alias: "e",
      })
      .option("password", {
        type: "string",
        description: "Password for authentication",
      })
      .example("neurolink auth login --provider auth0", "Login with Auth0 (interactive)")
      .example("neurolink auth login --email user@example.com --password secret", "Login with email/password");
  }

  /**
   * Build options for status command
   */
  private static buildStatusOptions(yargs: Argv): Argv {
    return yargs.option("verbose", {
      type: "boolean",
      default: false,
      description: "Show detailed session information",
      alias: "v",
    });
  }

  /**
   * Execute configure command
   */
  private static async executeConfigure(argv: AuthConfigureArgs): Promise<void> {
    const provider = argv.provider;
    const config = loadAuthConfig();

    logger.always(chalk.blue(`\nConfiguring ${provider.toUpperCase()} provider\n`));

    // Get provider config info
    const providerInfo = PROVIDER_CONFIG_INFO[provider];

    if (!providerInfo) {
      logger.error(chalk.red(`Unknown provider: ${provider}`));
      process.exit(1);
    }

    let providerConfig: AuthProviderConfig;

    if (argv.interactive) {
      providerConfig = await AuthCommandFactory.interactiveProviderSetup(
        provider,
        providerInfo.requiredConfig,
        providerInfo.optionalConfig,
      );
    } else {
      // Build config from command line options
      providerConfig = {
        type: provider,
        clientId: argv["client-id"],
        clientSecret: argv["client-secret"],
        domain: argv.domain,
        apiUrl: argv["api-url"],
      } as AuthProviderConfig;

      // Validate required fields
      const missingFields = providerInfo.requiredConfig.filter(
        (field) => !(providerConfig as Record<string, unknown>)[field],
      );
      if (missingFields.length > 0) {
        logger.error(chalk.red(`Missing required configuration: ${missingFields.join(", ")}`));
        process.exit(1);
      }
    }

    // Save configuration
    config.providers[provider] = providerConfig;
    if (!config.defaultProvider) {
      config.defaultProvider = provider;
    }
    saveAuthConfig(config);

    // Test the configuration
    const spinner = ora("Testing provider configuration...").start();
    try {
      const factory = getAuthProviderFactory();
      await factory.create(provider, providerConfig);
      spinner.succeed(chalk.green("Provider configured successfully!"));

      logger.always(chalk.dim(`\nConfiguration saved to ${AUTH_CONFIG_PATH}`));
      logger.always(chalk.blue(`\nNext step: neurolink auth login --provider ${provider}`));
    } catch (error) {
      spinner.fail(chalk.red("Provider configuration test failed"));
      logger.error(chalk.red(error instanceof Error ? error.message : "Unknown error"));
      process.exit(1);
    }
  }

  /**
   * Interactive provider setup
   */
  private static async interactiveProviderSetup(
    provider: AuthProviderName,
    requiredConfig: string[],
    optionalConfig?: string[],
  ): Promise<AuthProviderConfig> {
    const questions: Array<{
      type: string;
      name: string;
      message: string;
      mask?: string;
      validate?: (value: string) => boolean | string;
    }> = [];

    // Build questions for required fields
    for (const field of requiredConfig) {
      questions.push({
        type: field.includes("secret") || field.includes("password") || field.includes("key") ? "password" : "input",
        name: field,
        message: `Enter ${field}:`,
        validate: (value: string) => value.length > 0 || `${field} is required`,
      });
    }

    // Build questions for optional fields
    if (optionalConfig) {
      for (const field of optionalConfig) {
        if (field !== "options") {
          questions.push({
            type:
              field.includes("secret") || field.includes("password") || field.includes("key") ? "password" : "input",
            name: field,
            message: `Enter ${field} (optional):`,
          });
        }
      }
    }

    const answers = await inquirer.prompt(questions);

    // Map answers to config format
    const config: AuthProviderConfig = {
      type: provider,
    } as AuthProviderConfig;

    for (const [key, value] of Object.entries(answers)) {
      if (value) {
        // Convert field names to camelCase config keys
        const configKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        (config as Record<string, unknown>)[configKey] = value;
      }
    }

    return config;
  }

  /**
   * Execute login command
   *
   * Note: The auth providers use token-based authentication (JWT/OAuth).
   * Direct email/password login is not supported. Users should obtain
   * tokens through their provider's authentication flow (OAuth redirect,
   * device code, etc.) and then use those tokens with the SDK.
   */
  private static async executeLogin(argv: AuthLoginArgs): Promise<void> {
    const config = loadAuthConfig();

    // Determine provider to use
    let provider = argv.provider;
    if (!provider) {
      if (config.defaultProvider) {
        provider = config.defaultProvider;
      } else {
        // Interactive provider selection
        const { selectedProvider } = await inquirer.prompt([
          {
            type: "list",
            name: "selectedProvider",
            message: "Select authentication provider:",
            choices:
              Object.keys(config.providers).length > 0
                ? Object.keys(config.providers)
                : ["auth0", "clerk", "supabase", "firebase", "workos", "better-auth"],
          },
        ]);
        provider = selectedProvider as AuthProviderName;
      }
    }

    // Get provider config
    const providerConfig = config.providers[provider];
    if (!providerConfig) {
      logger.error(
        chalk.red(`Provider ${provider} not configured. Run: neurolink auth configure --provider ${provider}`),
      );
      process.exit(1);
    }

    // Check if a token was provided via environment or prompt
    let token = process.env.NEUROLINK_AUTH_TOKEN;

    if (!token) {
      const answers = await inquirer.prompt([
        {
          type: "password",
          name: "token",
          message: "Enter your authentication token (from your provider's auth flow):",
          mask: "*",
          validate: (value: string) => value.length > 10 || "Please enter a valid token",
        },
      ]);
      token = answers.token;
    }

    if (!token) {
      logger.error(chalk.red("No token provided"));
      process.exit(1);
    }

    const spinner = ora("Validating token...").start();

    try {
      const factory = getAuthProviderFactory();
      const authProvider = await factory.create(provider, providerConfig);

      // Validate the token
      const result = await authProvider.authenticateToken(token);

      if (!result.valid) {
        spinner.fail(chalk.red("Token validation failed"));
        logger.error(chalk.red(result.error || "Invalid token"));
        process.exit(1);
      }

      // Store session info in config (simplified for CLI)
      const sessionInfo: StoredSessionInfo = {
        sessionId: crypto.randomUUID(),
        provider,
        userId: result.user?.id || "unknown",
        userEmail: result.user?.email,
        userName: result.user?.name,
        expiresAt: result.expiresAt?.getTime() || Date.now() + 86400000,
        createdAt: Date.now(),
      };

      config.currentSession = sessionInfo;
      saveAuthConfig(config);

      spinner.succeed(chalk.green("Token validated successfully!"));

      logger.always(chalk.cyan(`\nWelcome, ${result.user?.name || result.user?.email || "User"}!`));
      logger.always(chalk.dim(`Session ID: ${sessionInfo.sessionId}`));
      logger.always(chalk.dim(`Expires: ${new Date(sessionInfo.expiresAt).toLocaleString()}`));
    } catch (error) {
      spinner.fail(chalk.red("Authentication failed"));
      logger.error(chalk.red(error instanceof Error ? error.message : "Unknown error"));
      process.exit(1);
    }
  }

  /**
   * Execute logout command
   */
  private static async executeLogout(): Promise<void> {
    const config = loadAuthConfig();

    if (!config.currentSession) {
      logger.always(chalk.yellow("No active session to log out from."));
      return;
    }

    const spinner = ora("Logging out...").start();

    try {
      // Clear current session from config
      delete config.currentSession;
      saveAuthConfig(config);

      spinner.succeed(chalk.green("Logged out successfully!"));
    } catch (error) {
      spinner.fail(chalk.red("Logout failed"));
      logger.error(chalk.red(error instanceof Error ? error.message : "Unknown error"));
      process.exit(1);
    }
  }

  /**
   * Execute status command
   */
  private static async executeStatus(argv: AuthStatusArgs): Promise<void> {
    const config = loadAuthConfig();

    logger.always(chalk.blue("\nAuthentication Status\n"));

    // Show configured providers
    logger.always(chalk.cyan("Configured Providers:"));
    const providers = Object.keys(config.providers);
    if (providers.length === 0) {
      logger.always(chalk.dim("  No providers configured"));
    } else {
      for (const provider of providers) {
        const isDefault = provider === config.defaultProvider;
        logger.always(`  ${chalk.green("✓")} ${provider}${isDefault ? chalk.dim(" (default)") : ""}`);
      }
    }

    // Show current session
    logger.always(chalk.cyan("\nCurrent Session:"));
    if (!config.currentSession) {
      logger.always(chalk.dim("  Not logged in"));
      return;
    }

    const session = config.currentSession;

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      logger.always(chalk.yellow("  Session expired"));
      delete config.currentSession;
      saveAuthConfig(config);
      return;
    }

    logger.always(`  Provider: ${chalk.white(session.provider)}`);
    logger.always(`  User: ${chalk.white(session.userName || session.userEmail || session.userId)}`);

    if (session.userEmail) {
      logger.always(`  Email: ${chalk.white(session.userEmail)}`);
    }

    const expiresIn = session.expiresAt - Date.now();
    const expiresText = expiresIn > 0 ? `in ${Math.round(expiresIn / 1000 / 60)} minutes` : chalk.red("EXPIRED");
    logger.always(`  Expires: ${expiresText}`);

    if (argv.verbose) {
      logger.always(chalk.cyan("\nSession Details:"));
      logger.always(`  Session ID: ${session.sessionId}`);
      logger.always(`  Created: ${new Date(session.createdAt).toLocaleString()}`);
    }
  }

  /**
   * Execute list providers command
   */
  private static async executeListProviders(): Promise<void> {
    const factory = getAuthProviderFactory();

    logger.always(chalk.blue("\nAvailable Authentication Providers\n"));

    // Get provider info from factory
    const providerInfos = factory.getAllProviderInfo();

    for (const info of providerInfos) {
      const metadata = info.metadata;
      logger.always(`${chalk.cyan(info.type)}`);
      logger.always(`  ${metadata?.description || "Authentication provider"}`);

      const configInfo = PROVIDER_CONFIG_INFO[info.type];
      if (configInfo) {
        logger.always(chalk.dim(`  Required: ${configInfo.requiredConfig.join(", ")}`));
        if (configInfo.optionalConfig && configInfo.optionalConfig.length > 0) {
          logger.always(chalk.dim(`  Optional: ${configInfo.optionalConfig.join(", ")}`));
        }
      }
      if (info.aliases.length > 0) {
        logger.always(chalk.dim(`  Aliases: ${info.aliases.join(", ")}`));
      }
      logger.always();
    }

    logger.always(chalk.dim("Configure a provider: neurolink auth configure --provider <name>"));
  }

  /**
   * Execute list sessions command
   */
  private static async executeListSessions(): Promise<void> {
    const config = loadAuthConfig();

    logger.always(chalk.blue("\nActive Sessions\n"));

    // We store session info in the config file for CLI
    if (!config.currentSession) {
      logger.always(chalk.dim("No active sessions"));
      return;
    }

    const session = config.currentSession;

    // Check if expired
    if (Date.now() > session.expiresAt) {
      logger.always(chalk.dim("No active sessions (session expired)"));
      delete config.currentSession;
      saveAuthConfig(config);
      return;
    }

    logger.always(`${chalk.green("●")} ${session.userEmail || session.userId}`);
    logger.always(`  Provider: ${session.provider}`);
    logger.always(`  Session ID: ${session.sessionId}`);
    logger.always(`  Created: ${new Date(session.createdAt).toLocaleString()}`);

    const expiresIn = session.expiresAt - Date.now();
    if (expiresIn > 0) {
      logger.always(`  Expires: in ${Math.round(expiresIn / 1000 / 60)} minutes`);
    } else {
      logger.always(`  Status: ${chalk.red("EXPIRED")}`);
    }
  }
}

/**
 * Export the auth command
 */
export const authCommand = AuthCommandFactory.createAuthCommands();

export default authCommand;
