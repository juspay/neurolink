/**
 * Auth Command Factory for NeuroLink
 *
 * Creates the unified authentication command with subcommands for AI providers.
 * Subcommands:
 * - login, logout, status, refresh: Anthropic OAuth (API key + OAuth)
 * - providers, validate, health: Multi-provider auth management
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
 * - login: Authenticate with a provider (Anthropic OAuth)
 * - logout: Clear stored credentials
 * - status: Show authentication status
 * - refresh: Manually refresh OAuth tokens
 * - providers: List available auth providers
 * - validate: Validate a token against a provider
 * - health: Check auth provider health
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
          .command(
            "providers",
            "List available authentication providers",
            (yargs) =>
              yargs.option("format", {
                type: "string",
                choices: ["text", "json", "table"] as const,
                default: "text",
                description: "Output format",
                alias: "f",
              }),
            async (argv) => {
              const { handleProvidersCommand } =
                await import("../commands/authProviders.js");
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await handleProvidersCommand(argv as any);
            },
          )
          .command(
            "validate <token>",
            "Validate an authentication token",
            (yargs) => this.buildValidateOptions(yargs),
            async (argv) => {
              const { handleValidateCommand } =
                await import("../commands/authProviders.js");
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await handleValidateCommand(argv as any);
            },
          )
          .command(
            "health",
            "Check authentication provider health",
            (yargs) => this.buildHealthOptions(yargs),
            async (argv) => {
              const { handleHealthCommand } =
                await import("../commands/authProviders.js");
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await handleHealthCommand(argv as any);
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

  /**
   * Auth provider choices for multi-provider commands
   */
  private static readonly AUTH_PROVIDER_CHOICES = [
    "auth0",
    "clerk",
    "supabase",
    "firebase",
    "workos",
    "better-auth",
    "jwt",
    "oauth2",
    "cognito",
    "keycloak",
  ] as const;

  /**
   * Build common provider options for validate/health commands
   */
  private static buildProviderOptions(yargs: Argv): Argv {
    return yargs
      .option("provider", {
        type: "string",
        choices: this.AUTH_PROVIDER_CHOICES,
        default: "auth0",
        description: "Authentication provider type",
        alias: "p",
      })
      .option("domain", {
        type: "string",
        description: "Auth0 domain (for auth0 provider)",
      })
      .option("clientId", {
        type: "string",
        description: "Client ID (for auth0 provider)",
        alias: "client-id",
      })
      .option("secretKey", {
        type: "string",
        description: "Secret key (for clerk provider)",
        alias: "secret-key",
      })
      .option("url", {
        type: "string",
        description: "Provider URL (for supabase, better-auth)",
      })
      .option("anonKey", {
        type: "string",
        description: "Anon key (for supabase provider)",
        alias: "anon-key",
      })
      .option("apiKey", {
        type: "string",
        description: "API key (for workos provider)",
        alias: "api-key",
      })
      .option("format", {
        type: "string",
        choices: ["text", "json"] as const,
        default: "text",
        description: "Output format",
        alias: "f",
      });
  }

  /**
   * Build options for validate subcommand
   */
  private static buildValidateOptions(yargs: Argv): Argv {
    return this.buildProviderOptions(
      yargs.positional("token", {
        type: "string",
        description: "The token to validate (JWT or session token)",
        demandOption: true,
      }),
    );
  }

  /**
   * Build options for health subcommand
   */
  private static buildHealthOptions(yargs: Argv): Argv {
    return this.buildProviderOptions(yargs);
  }
}
