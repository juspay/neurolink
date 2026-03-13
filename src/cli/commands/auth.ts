#!/usr/bin/env node

/**
 * NeuroLink Auth Command
 *
 * Unified authentication command for AI providers supporting:
 * - API key authentication (traditional)
 * - OAuth 2.1 authentication with PKCE (for Claude subscription)
 *
 * Subcommands:
 * - login: Authenticate with a provider
 * - logout: Clear stored credentials
 * - status: Show authentication status
 * - refresh: Manually refresh OAuth tokens
 *
 * Currently supports:
 * - Anthropic (API key + OAuth)
 */

import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { randomBytes, createHash } from "crypto";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import { defaultTokenStore } from "../../lib/auth/tokenStore.js";
import {
  CLAUDE_CODE_CLIENT_ID,
  ANTHROPIC_AUTH_URL,
  ANTHROPIC_TOKEN_URL,
  ANTHROPIC_REDIRECT_URI,
  CLAUDE_CLI_USER_AGENT,
  OAUTH_BETA_HEADERS,
} from "../../lib/auth/anthropicOAuth.js";
import type { AuthCommandArgs } from "../factories/authCommandFactory.js";

// =============================================================================
// CONSTANTS
// =============================================================================

const NEUROLINK_CONFIG_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || ".",
  ".neurolink",
);
const ENV_FILE_PATH = path.join(process.cwd(), ".env");

// Anthropic OAuth Configuration (Claude Code Official) - For direct OAuth usage
// Uses claude.ai/oauth/authorize for Claude Pro/Max subscription access
const ANTHROPIC_OAUTH_CONFIG = {
  clientId: CLAUDE_CODE_CLIENT_ID,
  // NOTE: Uses claude.ai NOT console.anthropic.com for direct OAuth
  authorizationUrl: ANTHROPIC_AUTH_URL,
  tokenUrl: ANTHROPIC_TOKEN_URL,
  redirectUri: ANTHROPIC_REDIRECT_URI,
  // Scopes for direct OAuth (no API key creation needed)
  scope: "user:profile user:inference",
  userAgent: CLAUDE_CLI_USER_AGENT,
  betaHeaders: OAUTH_BETA_HEADERS,
};

// Anthropic Console OAuth Configuration - For API key creation flow
// This uses console.anthropic.com for authorization which grants org:create_api_key scope
const ANTHROPIC_CONSOLE_OAUTH_CONFIG = {
  clientId: CLAUDE_CODE_CLIENT_ID,
  // Authorization URL for console (required for API key creation scope)
  authorizationUrl: "https://console.anthropic.com/oauth/authorize",
  tokenUrl: ANTHROPIC_TOKEN_URL,
  redirectUri: ANTHROPIC_REDIRECT_URI,
  // Required scopes - org:create_api_key is needed for API key creation
  scope: "org:create_api_key user:profile user:inference",
  userAgent: CLAUDE_CLI_USER_AGENT,
  // API key creation endpoint
  createApiKeyUrl:
    "https://api.anthropic.com/api/oauth/claude_cli/create_api_key",
};

// Supported providers
const SUPPORTED_PROVIDERS = ["anthropic"] as const;
type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

// =============================================================================
// TYPES (imported from canonical locations)
// =============================================================================

import type {
  OAuthTokens as OAuthTokensType,
  ClaudeSubscriptionTier,
} from "../../lib/types/subscriptionTypes.js";

interface StoredCredentials {
  type: "api-key" | "oauth";
  apiKey?: string;
  oauth?: OAuthTokensType;
  provider: string;
  subscriptionTier?: ClaudeSubscriptionTier;
  createdAt: number;
  updatedAt: number;
}

interface AuthStatusResult {
  provider: string;
  isAuthenticated: boolean;
  method: "api-key" | "oauth" | "none";
  subscriptionTier?: string;
  tokenExpiry?: string;
  hasRefreshToken?: boolean;
  needsRefresh?: boolean;
}

// =============================================================================
// SUBCOMMAND HANDLERS
// =============================================================================

/**
 * Handle the login subcommand
 * `neurolink auth login <provider>`
 */
export async function handleLogin(argv: AuthCommandArgs): Promise<void> {
  try {
    const provider = argv.provider?.toLowerCase() as SupportedProvider;

    // Validate provider
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      logger.error(
        chalk.red(
          `Unsupported provider: ${provider}. Supported: ${SUPPORTED_PROVIDERS.join(", ")}`,
        ),
      );
      process.exit(1);
    }

    // If method is specified, use it directly
    if (argv.method) {
      if (argv.method === "api-key") {
        await handleApiKeyAuth(provider, !argv.nonInteractive);
      } else if (argv.method === "oauth") {
        await handleOAuthAuth(provider);
      } else if (argv.method === "create-api-key") {
        await handleCreateApiKeyOAuth(provider);
      }
    } else {
      // Interactive mode - ask user which method they prefer
      await handleInteractiveAuth(provider);
    }
  } catch (error) {
    logger.error(chalk.red("Authentication failed:"));
    logger.error(
      chalk.red(error instanceof Error ? error.message : "Unknown error"),
    );
    process.exit(1);
  }
}

/**
 * Handle the logout subcommand
 * `neurolink auth logout <provider>`
 */
export async function handleLogout(argv: AuthCommandArgs): Promise<void> {
  try {
    const provider = argv.provider?.toLowerCase() as SupportedProvider;

    // Validate provider
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      logger.error(
        chalk.red(
          `Unsupported provider: ${provider}. Supported: ${SUPPORTED_PROVIDERS.join(", ")}`,
        ),
      );
      process.exit(1);
    }

    logger.always(chalk.blue(`\nClearing ${provider} credentials...\n`));

    const spinner = argv.quiet
      ? null
      : ora("Removing stored credentials...").start();

    try {
      // Clear stored credentials file
      const credentialsFile = path.join(
        NEUROLINK_CONFIG_DIR,
        `${provider}-credentials.json`,
      );
      if (fs.existsSync(credentialsFile)) {
        fs.unlinkSync(credentialsFile);
        if (spinner) {
          spinner.succeed("Stored credentials removed");
        }
      } else {
        if (spinner) {
          spinner.info("No stored credentials found");
        }
      }

      // Also clear from TokenStore if OAuth
      try {
        await defaultTokenStore.clearTokens(provider);
      } catch {
        // Ignore if no tokens stored
      }

      // Check for environment variable
      const envVar = getEnvVarName(provider);
      const hasEnvKey = !!process.env[envVar];

      if (hasEnvKey) {
        logger.always("");
        logger.always(
          chalk.yellow(
            `Note: ${envVar} is still set in your environment or .env file.`,
          ),
        );
        logger.always(
          chalk.yellow(
            "You may need to manually remove it from your shell profile or .env file.",
          ),
        );

        // Offer to remove from .env if it exists
        if (fs.existsSync(ENV_FILE_PATH)) {
          const { removeFromEnv } = await inquirer.prompt([
            {
              type: "confirm",
              name: "removeFromEnv",
              message: `Remove ${envVar} from .env file?`,
              default: false,
            },
          ]);

          if (removeFromEnv) {
            await removeFromEnvFile(envVar);
            logger.always(chalk.green(`Removed ${envVar} from .env file`));
          }
        }
      }

      logger.always("");
      logger.always(
        chalk.green(`${provider} credentials cleared successfully.`),
      );
    } catch (error) {
      if (spinner) {
        spinner.fail("Failed to clear credentials");
      }
      throw error;
    }
  } catch (error) {
    logger.error(chalk.red("Logout failed:"));
    logger.error(
      chalk.red(error instanceof Error ? error.message : "Unknown error"),
    );
    process.exit(1);
  }
}

/**
 * Handle the status subcommand
 * `neurolink auth status [provider]`
 */
export async function handleStatus(argv: AuthCommandArgs): Promise<void> {
  try {
    const provider = argv.provider?.toLowerCase() as
      | SupportedProvider
      | undefined;

    // If provider specified, show just that provider
    const providersToCheck: SupportedProvider[] = provider
      ? [provider]
      : [...SUPPORTED_PROVIDERS];

    const results: AuthStatusResult[] = [];

    for (const p of providersToCheck) {
      const status = await getAuthStatus(p);
      results.push(status);
    }

    // Output results
    if (argv.format === "json") {
      logger.always(JSON.stringify(results, null, 2));
    } else {
      logger.always(chalk.bold("\nAuthentication Status:\n"));

      for (const status of results) {
        const providerName =
          status.provider.charAt(0).toUpperCase() + status.provider.slice(1);
        const statusIcon = status.isAuthenticated
          ? chalk.green("[Authenticated]")
          : chalk.yellow("[Not Authenticated]");

        logger.always(`${chalk.cyan(providerName)} ${statusIcon}`);

        if (status.isAuthenticated) {
          logger.always(`  Method: ${status.method}`);

          if (status.subscriptionTier) {
            logger.always(
              `  Subscription: ${chalk.blue(status.subscriptionTier)}`,
            );
          }

          if (status.method === "oauth") {
            if (status.tokenExpiry) {
              const isExpired = status.needsRefresh;
              const expiryLabel = isExpired
                ? chalk.red("Expired")
                : chalk.green(status.tokenExpiry);
              logger.always(`  Token Expires: ${expiryLabel}`);
            }

            if (status.hasRefreshToken) {
              logger.always(`  Refresh Token: ${chalk.green("Available")}`);
            } else {
              logger.always(
                `  Refresh Token: ${chalk.yellow("Not available")}`,
              );
            }

            if (status.needsRefresh && status.hasRefreshToken) {
              logger.always(
                chalk.yellow(
                  `  Run 'neurolink auth refresh ${status.provider}' to refresh tokens`,
                ),
              );
            }
          }
        } else {
          logger.always(
            chalk.blue(
              `  Run 'neurolink auth login ${status.provider}' to authenticate`,
            ),
          );
        }

        logger.always("");
      }
    }
  } catch (error) {
    logger.error(chalk.red("Status check failed:"));
    logger.error(
      chalk.red(error instanceof Error ? error.message : "Unknown error"),
    );
    process.exit(1);
  }
}

/**
 * Handle the refresh subcommand
 * `neurolink auth refresh <provider>`
 */
export async function handleRefresh(argv: AuthCommandArgs): Promise<void> {
  try {
    const provider = argv.provider?.toLowerCase() as SupportedProvider;

    // Validate provider
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      logger.error(
        chalk.red(
          `Unsupported provider: ${provider}. Supported: ${SUPPORTED_PROVIDERS.join(", ")}`,
        ),
      );
      process.exit(1);
    }

    logger.always(chalk.blue(`\nRefreshing ${provider} OAuth tokens...\n`));

    const spinner = argv.quiet ? null : ora("Reading stored tokens...").start();

    try {
      // Get stored credentials
      const credentials = await getStoredCredentials(provider);

      if (!credentials || credentials.type !== "oauth") {
        if (spinner) {
          spinner.fail("No OAuth credentials found");
        }
        logger.error(
          chalk.red(
            `No OAuth authentication found for ${provider}. Use 'neurolink auth login ${provider} --method oauth' first.`,
          ),
        );
        process.exit(1);
      }

      if (!credentials.oauth?.refreshToken) {
        if (spinner) {
          spinner.fail("No refresh token available");
        }
        logger.error(
          chalk.red(
            "No refresh token available. Please re-authenticate with OAuth.",
          ),
        );
        process.exit(1);
      }

      if (spinner) {
        spinner.text = "Refreshing access token...";
      }

      // Refresh the token with Claude CLI User-Agent
      // IMPORTANT: Uses JSON body, not URLSearchParams
      const tokenResponse = await fetch(ANTHROPIC_OAUTH_CONFIG.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": ANTHROPIC_OAUTH_CONFIG.userAgent,
        },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: credentials.oauth.refreshToken,
          client_id: ANTHROPIC_OAUTH_CONFIG.clientId,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(
          `Token refresh failed: ${tokenResponse.status} - ${errorText}`,
        );
      }

      const tokenData = (await tokenResponse.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type?: string;
        scope?: string;
      };

      // Update stored tokens
      const newTokens: OAuthTokensType = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || credentials.oauth.refreshToken,
        expiresAt: tokenData.expires_in
          ? Date.now() + tokenData.expires_in * 1000
          : undefined,
        tokenType: tokenData.token_type || "Bearer",
        scope: tokenData.scope,
      };

      await saveStoredCredentials(provider, {
        type: "oauth",
        oauth: newTokens,
        provider,
        subscriptionTier: credentials.subscriptionTier,
        createdAt: credentials.createdAt,
        updatedAt: Date.now(),
      });

      if (spinner) {
        spinner.succeed("Access token refreshed successfully!");
      }

      logger.always("");
      logger.always(chalk.green("Token refresh complete!"));
      if (newTokens.expiresAt) {
        logger.always(
          `  New expiry: ${new Date(newTokens.expiresAt).toLocaleString()}`,
        );
      }
    } catch (error) {
      if (spinner) {
        spinner.fail("Token refresh failed");
      }
      throw error;
    }
  } catch (error) {
    logger.error(chalk.red("Token refresh failed:"));
    logger.error(
      chalk.red(error instanceof Error ? error.message : "Unknown error"),
    );
    process.exit(1);
  }
}

// =============================================================================
// LEGACY HANDLER (for backward compatibility)
// =============================================================================

/**
 * Legacy main auth command handler
 * @deprecated Use subcommand handlers instead
 */
export async function handleAuth(argv: {
  provider?: string;
  method?: "api-key" | "oauth";
  status?: boolean;
  logout?: boolean;
  nonInteractive?: boolean;
  debug?: boolean;
}): Promise<void> {
  // Map legacy flags to subcommands
  if (argv.status) {
    await handleStatus({
      provider: argv.provider,
      format: "text",
      quiet: false,
      debug: argv.debug,
    });
  } else if (argv.logout) {
    await handleLogout({
      provider: argv.provider,
      format: "text",
      quiet: false,
      debug: argv.debug,
    });
  } else {
    await handleLogin({
      provider: argv.provider,
      method: argv.method,
      format: "text",
      quiet: false,
      nonInteractive: argv.nonInteractive,
      debug: argv.debug,
    });
  }
}

// =============================================================================
// AUTHENTICATION METHODS
// =============================================================================

/**
 * Interactive authentication - ask user which method they prefer
 */
async function handleInteractiveAuth(
  provider: SupportedProvider,
): Promise<void> {
  logger.always(
    chalk.blue(
      `\n${provider.charAt(0).toUpperCase() + provider.slice(1)} Authentication Setup\n`,
    ),
  );

  const currentStatus = await checkExistingAuth(provider);

  if (currentStatus.hasValidAuth) {
    logger.always(
      chalk.green("You already have valid authentication configured."),
    );
    logger.always(`  Type: ${currentStatus.type}`);
    if (currentStatus.type === "api-key") {
      logger.always(`  Key: ${maskCredential(currentStatus.credential || "")}`);
    }
    logger.always("");

    const { reconfigure } = await inquirer.prompt([
      {
        type: "confirm",
        name: "reconfigure",
        message: "Would you like to reconfigure authentication?",
        default: false,
      },
    ]);

    if (!reconfigure) {
      logger.always(chalk.blue("Keeping existing configuration."));
      return;
    }
  }

  // Show authentication method options
  const { method } = await inquirer.prompt([
    {
      type: "list",
      name: "method",
      message: "Select authentication method:",
      choices: [
        {
          name: "API Key - Traditional authentication with API key (pay-per-use)",
          value: "api-key",
        },
        {
          name: "Claude Pro/Max OAuth - Use subscription directly (Recommended for Pro/Max users)",
          value: "oauth",
        },
        {
          name: "Create API Key (via OAuth) - Creates a real API key using your account",
          value: "create-api-key",
        },
      ],
    },
  ]);

  if (method === "api-key") {
    await handleApiKeyAuth(provider, true);
  } else if (method === "create-api-key") {
    await handleCreateApiKeyOAuth(provider);
  } else {
    await handleOAuthAuth(provider);
  }
}

/**
 * Handle API key authentication
 */
async function handleApiKeyAuth(
  provider: SupportedProvider,
  interactive: boolean,
): Promise<void> {
  logger.always(chalk.blue("\nAPI Key Authentication\n"));

  if (provider === "anthropic") {
    logger.always(chalk.yellow("To get your Anthropic API key:"));
    logger.always("1. Visit: https://console.anthropic.com/");
    logger.always("2. Sign in to your Anthropic account");
    logger.always("3. Go to 'API Keys' section");
    logger.always(
      "4. Click 'Create Key' and copy the API key (starts with sk-ant-)",
    );
    logger.always("");
  }

  if (!interactive) {
    const envKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (envKey) {
      await saveStoredCredentials(provider, {
        type: "api-key",
        apiKey: envKey,
        provider,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      logger.always(chalk.green("Using ANTHROPIC_API_KEY from environment."));
      return;
    }
    throw new Error(
      "Non-interactive mode requires ANTHROPIC_API_KEY environment variable when using --method api-key",
    );
  }

  const { apiKey } = await inquirer.prompt([
    {
      type: "password",
      name: "apiKey",
      message: `Enter your ${provider} API key:`,
      validate: (input: string) => {
        if (!input.trim()) {
          return "API key is required";
        }
        if (provider === "anthropic" && !input.startsWith("sk-ant-")) {
          return "Anthropic API key should start with 'sk-ant-'";
        }
        if (input.trim().length < 20) {
          return "API key seems too short";
        }
        return true;
      },
    },
  ]);

  const trimmedKey = apiKey.trim();

  // Validate the API key
  const spinner = ora("Validating API key...").start();

  try {
    const isValid = await validateApiKey(provider, trimmedKey);

    if (!isValid) {
      spinner.fail("API key validation failed");
      logger.error(
        chalk.red(
          "The API key could not be validated. Please check and try again.",
        ),
      );
      return;
    }

    spinner.succeed("API key validated successfully");
  } catch (error) {
    spinner.fail("API key validation failed");
    logger.error(
      chalk.red(error instanceof Error ? error.message : "Validation error"),
    );
    return;
  }

  // Ask where to store the key
  const { storageOption } = await inquirer.prompt([
    {
      type: "list",
      name: "storageOption",
      message: "Where would you like to store the API key?",
      choices: [
        { name: ".env file (project-level)", value: "env" },
        { name: "NeuroLink config (user-level)", value: "config" },
        { name: "Both", value: "both" },
      ],
    },
  ]);

  const spinnerSave = ora("Saving API key...").start();

  try {
    if (storageOption === "env" || storageOption === "both") {
      await saveToEnvFile(provider, trimmedKey);
    }

    if (storageOption === "config" || storageOption === "both") {
      await saveStoredCredentials(provider, {
        type: "api-key",
        apiKey: trimmedKey,
        provider,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    spinnerSave.succeed("API key saved successfully");

    logger.always("");
    logger.always(chalk.green("Authentication configured successfully!"));
    showUsageExample(provider);
  } catch (error) {
    spinnerSave.fail("Failed to save API key");
    throw error;
  }
}

/**
 * Handle API key creation via OAuth flow
 * This authenticates via console.anthropic.com, gets an OAuth token with org:create_api_key scope,
 * then uses that to create a real API key. This is the recommended method for Claude Pro/Max users.
 *
 * Based on opencode-anthropic-auth@0.0.8 implementation.
 * Uses manual code entry since localhost redirect is not registered with Anthropic OAuth.
 */
async function handleCreateApiKeyOAuth(
  provider: SupportedProvider,
): Promise<void> {
  logger.always(chalk.blue("\nCreate API Key (via OAuth) - Claude Pro/Max\n"));

  if (provider === "anthropic") {
    logger.always(
      chalk.cyan(
        "This will authenticate using your Claude Pro or Max subscription",
      ),
    );
    logger.always(
      chalk.cyan("and create an API key for use with the Anthropic API.\n"),
    );
    logger.always(
      chalk.yellow("Note: After signing in, you'll see an authorization code."),
    );
    logger.always(chalk.yellow("Copy that code and paste it back here.\n"));
  }

  const spinner = ora("Starting OAuth flow...").start();

  // Generate PKCE challenge - OpenCode sets state = verifier
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  // Build authorization URL using CONSOLE config (for API key creation scope)
  // Based on opencode-anthropic-auth implementation
  const authUrl = new URL(ANTHROPIC_CONSOLE_OAUTH_CONFIG.authorizationUrl);
  authUrl.searchParams.set("code", "true"); // Required param
  authUrl.searchParams.set(
    "client_id",
    ANTHROPIC_CONSOLE_OAUTH_CONFIG.clientId,
  );
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set(
    "redirect_uri",
    ANTHROPIC_CONSOLE_OAUTH_CONFIG.redirectUri,
  );
  authUrl.searchParams.set("scope", ANTHROPIC_CONSOLE_OAUTH_CONFIG.scope);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  // OpenCode sets state = verifier for simplicity
  authUrl.searchParams.set("state", codeVerifier);

  spinner.text = "Opening browser for authentication...";

  // Open browser
  try {
    await openBrowser(authUrl.toString());
    spinner.succeed("Browser opened for authentication");
  } catch {
    spinner.warn("Could not open browser automatically");
    logger.always("");
    logger.always(chalk.yellow("Please open this URL manually:"));
    logger.always(chalk.cyan(authUrl.toString()));
  }

  logger.always("");
  logger.always(chalk.blue("═".repeat(60)));
  logger.always(chalk.blue.bold("  Complete authentication in your browser"));
  logger.always(chalk.blue("═".repeat(60)));
  logger.always("");
  logger.always("1. Sign in to your Anthropic account in the browser");
  logger.always("2. Authorize the application");
  logger.always("3. Copy the authorization code shown on the page");
  logger.always("4. Paste the code below");
  logger.always("");

  // Prompt user to enter the authorization code
  const { authCode } = await inquirer.prompt([
    {
      type: "input",
      name: "authCode",
      message: "Paste the authorization code:",
      validate: (input: string) => {
        if (!input.trim()) {
          return "Authorization code is required";
        }
        if (input.trim().length < 10) {
          return "Authorization code seems too short";
        }
        return true;
      },
    },
  ]);

  const exchangeSpinner = ora(
    "Exchanging authorization code for tokens...",
  ).start();

  // Parse code#state format (e.g., "abc123#xyz789")
  // IMPORTANT: OpenCode sets state = verifier in the auth URL, so the state
  // returned in code#state IS the original verifier used for the code challenge!
  const trimmedCode = authCode.trim();
  const splits = trimmedCode.split("#");
  const actualCode = splits[0];
  const codeState = splits[1] || codeVerifier;
  // Use the state as the verifier (since we set state = verifier in the auth URL)
  const actualVerifier = codeState;

  // Exchange code for tokens using JSON body (per opencode-anthropic-auth)
  const tokenResponse = await fetch(ANTHROPIC_CONSOLE_OAUTH_CONFIG.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: actualCode,
      state: codeState,
      grant_type: "authorization_code",
      client_id: ANTHROPIC_CONSOLE_OAUTH_CONFIG.clientId,
      redirect_uri: ANTHROPIC_CONSOLE_OAUTH_CONFIG.redirectUri,
      code_verifier: actualVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    exchangeSpinner.fail("Token exchange failed");
    throw new Error(
      `Token exchange failed: ${tokenResponse.status} - ${errorText}`,
    );
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };

  exchangeSpinner.succeed("OAuth tokens obtained successfully");

  // Now create an API key using the OAuth token
  const apiKeySpinner = ora("Creating API key...").start();

  try {
    const apiKeyResponse = await fetch(
      ANTHROPIC_CONSOLE_OAUTH_CONFIG.createApiKeyUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": ANTHROPIC_CONSOLE_OAUTH_CONFIG.userAgent,
        },
      },
    );

    if (!apiKeyResponse.ok) {
      const errorText = await apiKeyResponse.text();
      apiKeySpinner.fail("API key creation failed");
      throw new Error(
        `API key creation failed: ${apiKeyResponse.status} - ${errorText}`,
      );
    }

    const apiKeyData = (await apiKeyResponse.json()) as {
      raw_key: string;
      id?: string;
      name?: string;
    };

    if (!apiKeyData.raw_key) {
      apiKeySpinner.fail("API key creation failed");
      throw new Error("No API key returned from creation endpoint");
    }

    apiKeySpinner.succeed("API key created successfully!");

    // Auto-save to both locations for convenience
    const spinnerSave = ora("Saving API key...").start();

    try {
      // Save to .env file (project-level)
      await saveToEnvFile(provider, apiKeyData.raw_key);

      // Save to NeuroLink config (user-level)
      await saveStoredCredentials(provider, {
        type: "api-key",
        apiKey: apiKeyData.raw_key,
        provider,
        subscriptionTier: "pro", // Default for OAuth API-key flow; user can override via CLI
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      spinnerSave.succeed("API key saved to .env and NeuroLink config");

      logger.always("");
      logger.always(chalk.green("═".repeat(60)));
      logger.always(
        chalk.green.bold("  API key created and saved successfully!"),
      );
      logger.always(chalk.green("═".repeat(60)));
      logger.always("");
      logger.always(
        `  API Key: ${chalk.cyan(maskCredential(apiKeyData.raw_key))}`,
      );
      logger.always(`  Created via: ${chalk.blue("Claude Pro/Max OAuth")}`);

      showUsageExample(provider);
    } catch (error) {
      spinnerSave.fail("Failed to save API key");
      throw error;
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to create API key: ${String(error)}`, {
      cause: error,
    });
  }
}

/**
 * Handle OAuth authentication using code-based flow
 * User authenticates in browser and copies the authorization code back to CLI
 * Uses claude.ai/oauth/authorize for Claude Pro/Max subscription access
 */
async function handleOAuthAuth(provider: SupportedProvider): Promise<void> {
  logger.always(chalk.blue("\nClaude Pro/Max OAuth Authentication\n"));

  if (provider === "anthropic") {
    logger.always(
      chalk.cyan(
        "This will authenticate using your Claude Pro or Max subscription.",
      ),
    );
    logger.always(
      chalk.cyan("Your subscription includes API access at no extra cost!\n"),
    );
    logger.always(
      chalk.yellow("Note: After signing in, you'll see an authorization code."),
    );
    logger.always(chalk.yellow("Copy that code and paste it back here.\n"));
  }

  const { proceed } = await inquirer.prompt([
    {
      type: "confirm",
      name: "proceed",
      message: "Continue with OAuth authentication?",
      default: true,
    },
  ]);

  if (!proceed) {
    logger.always(chalk.yellow("OAuth authentication cancelled."));
    return;
  }

  const spinner = ora("Starting OAuth flow...").start();

  // Generate PKCE challenge - state = verifier (OpenCode's approach)
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  // Build authorization URL using claude.ai (NOT console.anthropic.com)
  // This is the direct OAuth flow for Claude Pro/Max
  const authUrl = new URL(ANTHROPIC_OAUTH_CONFIG.authorizationUrl);
  authUrl.searchParams.set("code", "true");
  authUrl.searchParams.set("client_id", ANTHROPIC_OAUTH_CONFIG.clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", ANTHROPIC_OAUTH_CONFIG.redirectUri);
  authUrl.searchParams.set("scope", ANTHROPIC_OAUTH_CONFIG.scope);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  // OpenCode sets state = verifier for simplicity
  authUrl.searchParams.set("state", codeVerifier);

  spinner.text = "Opening browser for authentication...";

  // Open browser
  try {
    await openBrowser(authUrl.toString());
    spinner.succeed("Browser opened for authentication");
  } catch {
    spinner.warn("Could not open browser automatically");
    logger.always("");
    logger.always(chalk.yellow("Please open this URL manually:"));
    logger.always(chalk.cyan(authUrl.toString()));
  }

  logger.always("");
  logger.always(chalk.blue("═".repeat(60)));
  logger.always(chalk.blue.bold("  Complete authentication in your browser"));
  logger.always(chalk.blue("═".repeat(60)));
  logger.always("");
  logger.always("1. Sign in to your Claude account in the browser");
  logger.always("2. Authorize the application");
  logger.always("3. Copy the authorization code shown on the page");
  logger.always("4. Paste the code below");
  logger.always("");

  // Prompt user to enter the authorization code
  const { authCode } = await inquirer.prompt([
    {
      type: "input",
      name: "authCode",
      message: "Paste the authorization code:",
      validate: (input: string) => {
        if (!input.trim()) {
          return "Authorization code is required";
        }
        if (input.trim().length < 10) {
          return "Authorization code seems too short";
        }
        return true;
      },
    },
  ]);

  const trimmedCode = authCode.trim();
  const exchangeSpinner = ora(
    "Exchanging authorization code for tokens...",
  ).start();

  // Parse code#state format (e.g., "abc123#xyz789")
  // OpenCode sets state = verifier in the auth URL, so the state
  // returned in code#state IS the original verifier used for the code challenge
  const codeParts = trimmedCode.split("#");
  const actualCode = codeParts[0];
  const codeState = codeParts[1] || codeVerifier;
  // Use the state as the verifier (since we set state = verifier in the auth URL)
  const actualVerifier = codeState;

  // Exchange code for tokens with Claude CLI User-Agent
  // IMPORTANT: Uses JSON body, not URLSearchParams
  const tokenResponse = await fetch(ANTHROPIC_OAUTH_CONFIG.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: actualCode,
      state: codeState,
      grant_type: "authorization_code",
      client_id: ANTHROPIC_OAUTH_CONFIG.clientId,
      redirect_uri: ANTHROPIC_OAUTH_CONFIG.redirectUri,
      code_verifier: actualVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    exchangeSpinner.fail("Token exchange failed");
    throw new Error(
      `Token exchange failed: ${tokenResponse.status} - ${errorText}`,
    );
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };

  // Save tokens
  const tokens: OAuthTokensType = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: tokenData.expires_in
      ? Date.now() + tokenData.expires_in * 1000
      : undefined,
    tokenType: tokenData.token_type || "Bearer",
    scope: tokenData.scope,
  };

  // Detect subscription tier if possible
  const subscriptionTier = await detectSubscriptionTier(tokens.accessToken);

  await saveStoredCredentials(provider, {
    type: "oauth",
    oauth: tokens,
    provider,
    subscriptionTier,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  exchangeSpinner.succeed("OAuth authentication successful!");

  logger.always("");
  logger.always(chalk.green("═".repeat(60)));
  logger.always(chalk.green.bold("  Authentication configured successfully!"));
  logger.always(chalk.green("═".repeat(60)));
  logger.always("");
  if (subscriptionTier) {
    logger.always(`  Subscription Tier: ${chalk.blue(subscriptionTier)}`);
  }
  logger.always(
    `  Token expires: ${tokens.expiresAt ? new Date(tokens.expiresAt).toLocaleString() : "Never"}`,
  );
  logger.always(
    `  Refresh token: ${tokens.refreshToken ? chalk.green("Available") : chalk.yellow("Not available")}`,
  );

  showUsageExample(provider);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get authentication status for a provider
 * Priority: OAuth > stored API key > environment API key
 */
async function getAuthStatus(
  provider: SupportedProvider,
): Promise<AuthStatusResult> {
  const result: AuthStatusResult = {
    provider,
    isAuthenticated: false,
    method: "none",
  };

  // Check stored credentials FIRST (OAuth takes priority over API key)
  const stored = await getStoredCredentials(provider);
  if (stored) {
    // OAuth credentials take highest priority
    if (stored.type === "oauth" && stored.oauth) {
      result.isAuthenticated = true;
      result.method = "oauth";
      result.subscriptionTier = stored.subscriptionTier;
      result.hasRefreshToken = !!stored.oauth.refreshToken;

      if (stored.oauth.expiresAt) {
        result.tokenExpiry = new Date(stored.oauth.expiresAt).toLocaleString();
        result.needsRefresh = Date.now() >= stored.oauth.expiresAt;
      }
      return result;
    }

    // Stored API key is second priority
    if (stored.type === "api-key" && stored.apiKey) {
      result.isAuthenticated = true;
      result.method = "api-key";
      return result;
    }
  }

  // Fall back to environment API key
  const envKey = getEnvApiKey(provider);
  if (envKey) {
    result.isAuthenticated = true;
    result.method = "api-key";
    return result;
  }

  return result;
}

/**
 * Detect subscription tier from token (if API supports it)
 */
async function detectSubscriptionTier(
  accessToken: string,
): Promise<"free" | "pro" | "max" | "api" | undefined> {
  try {
    // Attempt to call an endpoint that returns user info
    // This is a placeholder - actual implementation depends on Anthropic's API
    const response = await fetch("https://api.anthropic.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = (await response.json()) as { subscription?: string };
      if (data.subscription) {
        return data.subscription as "free" | "pro" | "max" | "api";
      }
    }
  } catch {
    // Ignore errors - subscription detection is optional
  }

  return undefined;
}

/**
 * Open URL in the default browser (cross-platform)
 */
async function openBrowser(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const platform = process.platform;
    let command: string;
    let args: string[];

    switch (platform) {
      case "darwin":
        command = "open";
        args = [url];
        break;
      case "win32":
        command = "cmd";
        args = ["/c", "start", "", url];
        break;
      default:
        // Linux and other Unix-like systems
        command = "xdg-open";
        args = [url];
    }

    // Use execFile instead of exec to prevent command injection
    execFile(command, args, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get environment variable name for a provider
 */
function getEnvVarName(provider: string): string {
  switch (provider) {
    case "anthropic":
      return "ANTHROPIC_API_KEY";
    default:
      return `${provider.toUpperCase()}_API_KEY`;
  }
}

/**
 * Get API key from environment
 */
function getEnvApiKey(provider: string): string | undefined {
  return process.env[getEnvVarName(provider)];
}

/**
 * Get stored credentials from file
 */
async function getStoredCredentials(
  provider: string,
): Promise<StoredCredentials | null> {
  const credentialsFile = path.join(
    NEUROLINK_CONFIG_DIR,
    `${provider}-credentials.json`,
  );

  try {
    if (fs.existsSync(credentialsFile)) {
      const data = fs.readFileSync(credentialsFile, "utf-8");
      return JSON.parse(data) as StoredCredentials;
    }
  } catch (error) {
    logger.debug(`Failed to read credentials: ${error}`);
  }

  return null;
}

/**
 * Save credentials to file
 */
async function saveStoredCredentials(
  provider: string,
  credentials: StoredCredentials,
): Promise<void> {
  // Ensure config directory exists
  if (!fs.existsSync(NEUROLINK_CONFIG_DIR)) {
    fs.mkdirSync(NEUROLINK_CONFIG_DIR, { recursive: true });
  }

  const credentialsFile = path.join(
    NEUROLINK_CONFIG_DIR,
    `${provider}-credentials.json`,
  );

  fs.writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2), {
    mode: 0o600, // Restrict permissions
  });
}

/**
 * Check existing authentication status
 */
async function checkExistingAuth(
  provider: string,
): Promise<{ hasValidAuth: boolean; type?: string; credential?: string }> {
  const envKey = getEnvApiKey(provider);
  if (envKey) {
    return { hasValidAuth: true, type: "api-key", credential: envKey };
  }

  const stored = await getStoredCredentials(provider);
  if (stored) {
    if (stored.type === "api-key" && stored.apiKey) {
      return { hasValidAuth: true, type: "api-key", credential: stored.apiKey };
    }
    if (stored.type === "oauth" && stored.oauth) {
      // Check if token is still valid
      if (stored.oauth.expiresAt) {
        const isExpired = Date.now() >= stored.oauth.expiresAt;
        if (!isExpired || stored.oauth.refreshToken) {
          return { hasValidAuth: true, type: "oauth" };
        }
      } else {
        return { hasValidAuth: true, type: "oauth" };
      }
    }
  }

  return { hasValidAuth: false };
}

/**
 * Validate API key by making a test request
 */
async function validateApiKey(
  provider: string,
  apiKey: string,
): Promise<boolean> {
  if (provider === "anthropic") {
    try {
      // Simple validation - check message API
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });

      // 200 means valid, 401 means invalid key
      // Other errors (rate limit, etc.) still mean the key format is valid
      return response.status !== 401;
    } catch {
      // Network error - assume key format is valid
      return true;
    }
  }

  return true;
}

/**
 * Save API key to .env file
 */
async function saveToEnvFile(provider: string, apiKey: string): Promise<void> {
  const envVar = getEnvVarName(provider);
  let content = "";

  if (fs.existsSync(ENV_FILE_PATH)) {
    content = fs.readFileSync(ENV_FILE_PATH, "utf-8");
  }

  // Check if variable already exists
  const regex = new RegExp(`^${envVar}=.*$`, "m");
  if (regex.test(content)) {
    // Replace existing
    content = content.replace(regex, `${envVar}=${apiKey}`);
  } else {
    // Add new
    if (content && !content.endsWith("\n")) {
      content += "\n";
    }
    content += `${envVar}=${apiKey}\n`;
  }

  fs.writeFileSync(ENV_FILE_PATH, content);
}

/**
 * Remove variable from .env file
 */
async function removeFromEnvFile(envVar: string): Promise<void> {
  if (!fs.existsSync(ENV_FILE_PATH)) {
    return;
  }

  let content = fs.readFileSync(ENV_FILE_PATH, "utf-8");
  const regex = new RegExp(`^${envVar}=.*\n?`, "m");
  content = content.replace(regex, "");
  fs.writeFileSync(ENV_FILE_PATH, content);
}

/**
 * Mask credential for display
 */
function maskCredential(credential: string): string {
  if (!credential || credential.length < 8) {
    return "****";
  }

  const knownPrefixes = ["sk-ant-", "sk-"];
  const prefix =
    knownPrefixes.find((p) => credential.startsWith(p)) ??
    credential.slice(0, 4);
  const end = credential.slice(-4);
  const stars = "*".repeat(Math.max(4, credential.length - prefix.length - 4));
  return `${prefix}${stars}${end}`;
}

/**
 * Show usage example after successful authentication
 */
function showUsageExample(provider: string): void {
  logger.always("");
  logger.always(
    chalk.green("You can now use the NeuroLink CLI with this provider:"),
  );
  logger.always(
    chalk.cyan(`   neurolink generate "Hello!" --provider ${provider}`),
  );
  logger.always(
    chalk.cyan(
      `   neurolink generate "Explain quantum computing" --provider ${provider}`,
    ),
  );
  logger.always("");
  logger.always(chalk.blue("To check authentication status:"));
  logger.always(chalk.cyan(`   neurolink auth status ${provider}`));
  logger.always("");
  logger.always(chalk.blue("To logout:"));
  logger.always(chalk.cyan(`   neurolink auth logout ${provider}`));
}
