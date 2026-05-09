/**
 * Auth Command Factory for NeuroLink
 *
 * Creates the unified authentication command with subcommands for AI providers.
 * Subcommands:
 * - login, logout, status, refresh: Anthropic OAuth (API key + OAuth)
 * - providers, validate, health: Multi-provider auth management
 */

import type { CommandModule, Argv, ArgumentsCamelCase } from "yargs";
import type {
  AuthCommandArgs,
  AuthProvidersArgs,
  AuthValidateArgs,
  AuthHealthArgs,
} from "../../lib/types/index.js";
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
            "list",
            "List all authenticated accounts",
            (yargs) => this.buildListOptions(yargs),
            async (argv) => {
              const { handleList } = await import("../commands/auth.js");
              await handleList(argv as AuthCommandArgs);
            },
          )
          .command(
            "remove <provider>",
            "Remove an authenticated account",
            (yargs) => this.buildRemoveOptions(yargs),
            async (argv) => {
              const { handleRemove } = await import("../commands/auth.js");
              await handleRemove(argv as AuthCommandArgs);
            },
          )
          .command(
            "cleanup",
            "Remove expired and disabled accounts from token store",
            (yargs) => this.buildCleanupOptions(yargs),
            async (argv) => {
              const { handleCleanup } = await import("../commands/auth.js");
              await handleCleanup(argv as AuthCommandArgs);
            },
          )
          .command(
            "enable <account>",
            "Re-enable a previously disabled account",
            (yargs) => this.buildEnableOptions(yargs),
            async (argv) => {
              const { handleEnable } = await import("../commands/auth.js");
              await handleEnable(argv as AuthCommandArgs);
            },
          )
          .command(
            "set-primary <email>",
            "Set the proxy's primary (home) Anthropic account",
            (yargs) => this.buildSetPrimaryOptions(yargs),
            async (argv) => {
              const { handleSetPrimary } = await import("../commands/auth.js");
              await handleSetPrimary(argv as AuthCommandArgs);
            },
          )
          .command(
            "get-primary",
            "Show the proxy's currently configured primary account",
            (yargs) => this.buildPrimaryConfigOption(yargs),
            async (argv) => {
              const { handleGetPrimary } = await import("../commands/auth.js");
              await handleGetPrimary(argv as AuthCommandArgs);
            },
          )
          .command(
            "clear-primary",
            "Clear the proxy's configured primary account",
            (yargs) => this.buildPrimaryConfigOption(yargs),
            async (argv) => {
              const { handleClearPrimary } =
                await import("../commands/auth.js");
              await handleClearPrimary(argv as AuthCommandArgs);
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
              await handleProvidersCommand(
                argv as ArgumentsCamelCase<AuthProvidersArgs>,
              );
            },
          )
          .command(
            "validate <token>",
            "Validate an authentication token",
            (yargs) => this.buildValidateOptions(yargs),
            async (argv) => {
              const { handleValidateCommand } =
                await import("../commands/authProviders.js");
              await handleValidateCommand(
                argv as ArgumentsCamelCase<AuthValidateArgs>,
              );
            },
          )
          .command(
            "health",
            "Check authentication provider health",
            (yargs) => this.buildHealthOptions(yargs),
            async (argv) => {
              const { handleHealthCommand } =
                await import("../commands/authProviders.js");
              await handleHealthCommand(
                argv as ArgumentsCamelCase<AuthHealthArgs>,
              );
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
            "$0 auth login anthropic --add --label alice",
            "Add additional account with label",
          )
          .example("$0 auth list", "List all authenticated accounts")
          .example(
            "$0 auth status",
            "Show authentication status for all providers",
          )
          .example(
            "$0 auth logout anthropic",
            "Clear Anthropic stored credentials",
          )
          .example(
            "$0 auth remove anthropic --label alice",
            "Remove a specific account",
          )
          .example(
            "$0 auth refresh anthropic",
            "Refresh Anthropic OAuth tokens",
          )
          .example("$0 auth cleanup", "Remove expired and disabled accounts")
          .example(
            "$0 auth cleanup --force",
            "Remove stale accounts without confirmation",
          )
          .example(
            "$0 auth enable anthropic:1-VjRIq",
            "Re-enable a disabled account",
          )
          .example(
            "$0 auth set-primary alice@example.com",
            "Make alice@example.com the proxy's primary (home) account",
          )
          .example(
            "$0 auth get-primary",
            "Show the proxy's currently configured primary account",
          )
          .example(
            "$0 auth clear-primary",
            "Remove the configured primary account (use insertion-order fallback)",
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
      .option("add", {
        type: "boolean",
        default: false,
        description:
          "Add as additional account to the pool (instead of replacing)",
      })
      .option("label", {
        type: "string",
        description: "Human-readable label for this account (used with --add)",
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
      )
      .example(
        "$0 auth login anthropic --add --label alice",
        "Add as additional account with label",
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
   * Build options for list subcommand
   */
  private static buildListOptions(yargs: Argv): Argv {
    return yargs
      .example("$0 auth list", "List all authenticated accounts")
      .example("$0 auth list --format json", "List accounts in JSON format");
  }

  /**
   * Build options for remove subcommand
   */
  private static buildRemoveOptions(yargs: Argv): Argv {
    return yargs
      .positional("provider", {
        type: "string",
        description: "AI provider to remove account from",
        choices: SUPPORTED_PROVIDERS,
        demandOption: true,
      })
      .option("label", {
        type: "string",
        description: "Label of the account to remove (e.g., alice)",
      })
      .option("account", {
        type: "string",
        description:
          "Full compound key of the account to remove (e.g., anthropic:alice)",
      })
      .conflicts("label", "account")
      .check((argv) => {
        if (
          argv.account &&
          !String(argv.account).startsWith(`${String(argv.provider)}:`)
        ) {
          throw new Error("--account must belong to the selected provider");
        }
        return true;
      })
      .example(
        "$0 auth remove anthropic --label alice",
        "Remove account with label alice",
      )
      .example(
        "$0 auth remove anthropic --account anthropic:alice",
        "Remove account by compound key",
      );
  }

  /**
   * Build options for cleanup subcommand
   */
  private static buildCleanupOptions(yargs: Argv): Argv {
    return yargs
      .option("force", {
        type: "boolean",
        default: false,
        description: "Skip confirmation when removing disabled accounts",
      })
      .example("$0 auth cleanup", "Remove expired and disabled accounts")
      .example(
        "$0 auth cleanup --force",
        "Remove stale accounts without confirmation",
      );
  }

  /**
   * Build options for enable subcommand
   */
  private static buildEnableOptions(yargs: Argv): Argv {
    return yargs
      .positional("account", {
        type: "string",
        description: "Account key to re-enable (e.g., anthropic:1-VjRIq)",
        demandOption: true,
      })
      .example(
        "$0 auth enable anthropic:1-VjRIq",
        "Re-enable a disabled account",
      );
  }

  /**
   * Build options for set-primary subcommand
   */
  private static buildSetPrimaryOptions(yargs: Argv): Argv {
    return yargs
      .positional("email", {
        type: "string",
        description:
          "Email/label of the Anthropic account to make primary (home)",
        demandOption: true,
      })
      .option("config", {
        type: "string",
        description:
          "Path to the proxy config YAML (default: ~/.neurolink/proxy-config.yaml)",
      })
      .example(
        "$0 auth set-primary alice@example.com",
        "Write routing.primary-account to the default proxy config",
      )
      .example(
        "$0 auth set-primary alice@example.com --config ./proxy.yaml",
        "Use a non-default config path",
      );
  }

  /**
   * Build options for get-primary / clear-primary subcommands.
   */
  private static buildPrimaryConfigOption(yargs: Argv): Argv {
    return yargs.option("config", {
      type: "string",
      description:
        "Path to the proxy config YAML (default: ~/.neurolink/proxy-config.yaml)",
    });
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
      .option("secret", {
        type: "string",
        description:
          "Secret (for better-auth, jwt providers). Can also be set via BETTER_AUTH_SECRET or JWT_SECRET env vars.",
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
