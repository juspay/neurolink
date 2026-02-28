/**
 * Auth Command Factory for NeuroLink
 *
 * Creates the unified authentication command with subcommands for AI providers.
 * Follows the MCP command pattern with subcommands: login, logout, status, refresh.
 *
 * Supported providers:
 * - Anthropic (API key + OAuth for Claude subscription plans)
 */

import type { CommandModule, Argv } from "yargs";

/**
 * Auth command arguments interface
 */
export interface AuthCommandArgs {
  provider?: string;
  method?: "api-key" | "oauth" | "create-api-key";
  format?: "text" | "json";
  quiet?: boolean;
  debug?: boolean;
  nonInteractive?: boolean;
}

/**
 * Supported providers for authentication
 */
const SUPPORTED_PROVIDERS = ["anthropic"] as const;

/**
 * Auth Command Factory
 *
 * Creates the main auth command with subcommands:
 * - login: Authenticate with a provider
 * - logout: Clear stored credentials
 * - status: Show authentication status
 * - refresh: Manually refresh OAuth tokens
 */
export class AuthCommandFactory {
  /**
   * Create the main auth command with subcommands
   */
  static createAuthCommands(): CommandModule {
    return {
      command: "auth <subcommand>",
      describe: "Manage authentication with AI providers (API key or OAuth)",
      builder: (yargs) => {
        return yargs
          .command(
            "login <provider>",
            "Authenticate with an AI provider",
            (yargs) => this.buildLoginOptions(yargs),
            async (argv) => {
              const { handleLogin } = await import("../commands/auth.js");
              await handleLogin(argv as AuthCommandArgs);
            },
          )
          .command(
            "logout <provider>",
            "Clear stored credentials for a provider",
            (yargs) => this.buildLogoutOptions(yargs),
            async (argv) => {
              const { handleLogout } = await import("../commands/auth.js");
              await handleLogout(argv as AuthCommandArgs);
            },
          )
          .command(
            "status [provider]",
            "Show authentication status for provider(s)",
            (yargs) => this.buildStatusOptions(yargs),
            async (argv) => {
              const { handleStatus } = await import("../commands/auth.js");
              await handleStatus(argv as AuthCommandArgs);
            },
          )
          .command(
            "refresh <provider>",
            "Manually refresh OAuth tokens for a provider",
            (yargs) => this.buildRefreshOptions(yargs),
            async (argv) => {
              const { handleRefresh } = await import("../commands/auth.js");
              await handleRefresh(argv as AuthCommandArgs);
            },
          )
          .option("format", {
            choices: ["text", "json"] as const,
            default: "text",
            description: "Output format",
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
          .demandCommand(1, "Please specify an auth subcommand")
          .example("$0 auth login anthropic", "Authenticate with Anthropic")
          .example(
            "$0 auth login anthropic --method create-api-key",
            "Create API key via OAuth (Claude Pro/Max - Recommended)",
          )
          .example(
            "$0 auth status",
            "Show authentication status for all providers",
          )
          .example(
            "$0 auth logout anthropic",
            "Clear Anthropic stored credentials",
          )
          .example(
            "$0 auth refresh anthropic",
            "Refresh Anthropic OAuth tokens",
          )
          .help();
      },
      handler: () => {
        // No-op handler as subcommands handle everything
      },
    };
  }

  /**
   * Build options for login subcommand
   */
  private static buildLoginOptions(yargs: Argv): Argv {
    return yargs
      .positional("provider", {
        type: "string",
        description: "AI provider to authenticate with",
        choices: SUPPORTED_PROVIDERS,
        demandOption: true,
      })
      .option("method", {
        type: "string",
        alias: "m",
        description: "Authentication method",
        choices: ["api-key", "oauth", "create-api-key"] as const,
      })
      .option("non-interactive", {
        type: "boolean",
        description:
          "Skip interactive prompts (requires environment variables)",
        default: false,
      })
      .example(
        "$0 auth login anthropic",
        "Interactive authentication (choose method)",
      )
      .example(
        "$0 auth login anthropic --method api-key",
        "API key authentication",
      )
      .example(
        "$0 auth login anthropic --method create-api-key",
        "Create API key via OAuth (Claude Pro/Max)",
      )
      .example(
        "$0 auth login anthropic --method oauth",
        "Direct OAuth (experimental)",
      );
  }

  /**
   * Build options for logout subcommand
   */
  private static buildLogoutOptions(yargs: Argv): Argv {
    return yargs
      .positional("provider", {
        type: "string",
        description: "AI provider to log out from",
        choices: SUPPORTED_PROVIDERS,
        demandOption: true,
      })
      .example("$0 auth logout anthropic", "Clear all Anthropic credentials");
  }

  /**
   * Build options for status subcommand
   */
  private static buildStatusOptions(yargs: Argv): Argv {
    return yargs
      .positional("provider", {
        type: "string",
        description:
          "AI provider to check (optional, shows all if not specified)",
        choices: SUPPORTED_PROVIDERS,
      })
      .example("$0 auth status", "Show status for all configured providers")
      .example(
        "$0 auth status anthropic",
        "Show Anthropic authentication status",
      )
      .example("$0 auth status --format json", "Show status in JSON format");
  }

  /**
   * Build options for refresh subcommand
   */
  private static buildRefreshOptions(yargs: Argv): Argv {
    return yargs
      .positional("provider", {
        type: "string",
        description: "AI provider to refresh tokens for",
        choices: SUPPORTED_PROVIDERS,
        demandOption: true,
      })
      .example("$0 auth refresh anthropic", "Refresh Anthropic OAuth tokens");
  }
}
