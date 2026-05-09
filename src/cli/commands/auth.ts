#!/usr/bin/env node

/**
 * NeuroLink Auth Command
 *
 * Unified authentication command for AI providers supporting:
 * - API key authentication (traditional)
 * - OAuth 2.1 authentication with PKCE (for Claude subscription)
 *
 * Subcommands:
 * - login: Authenticate with a provider (supports --add/--label for multi-account)
 * - logout: Clear stored credentials
 * - status: Show authentication status
 * - refresh: Manually refresh OAuth tokens
 * - list: List all authenticated accounts
 * - remove: Remove an authenticated account
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
import type {
  AccountQuota,
  AuthCommandArgs,
  AuthStatusResult,
  CliProxyConfigDoc,
  OAuthTokens as OAuthTokensType,
  StoredCredentials,
  SupportedProvider,
  YamlModule,
} from "../../lib/types/index.js";
import { loadAccountQuotas } from "../../lib/proxy/accountQuota.js";

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

// =============================================================================
// SUBCOMMAND HANDLERS
// =============================================================================

/**
 * Handle the login subcommand
 * `neurolink auth login <provider>`
 *
 * When --add is specified, saves tokens to the TokenStore with a compound key
 * (e.g., "anthropic:alice") to support multi-account pools.
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
    // Each handler returns true when credentials were written to a file,
    // false for .env-only or "keep existing" paths.
    let wroteCredentials = false;
    if (argv.method) {
      if (argv.method === "api-key") {
        wroteCredentials = await handleApiKeyAuth(
          provider,
          !argv.nonInteractive,
        );
      } else if (argv.method === "oauth") {
        await handleOAuthAuth(provider);
        wroteCredentials = true;
      } else if (argv.method === "create-api-key") {
        await handleCreateApiKeyOAuth(provider);
        wroteCredentials = true;
      }
    } else {
      // Interactive mode - ask user which method they prefer
      wroteCredentials = await handleInteractiveAuth(provider);
    }

    // Only save to TokenStore when the auth flow actually wrote credentials.
    // Skip for .env-only or "keep existing" paths — re-reading a stale or
    // nonexistent credentials file is wasteful and can produce wrong entries.
    if (wroteCredentials) {
      await saveAccountToPool(provider, argv.label);
    }
  } catch (error) {
    logger.error(chalk.red("Authentication failed:"));
    logger.error(
      chalk.red(error instanceof Error ? error.message : "Unknown error"),
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Quota display helpers
// ---------------------------------------------------------------------------

/**
 * Convert a future unix timestamp (seconds) into a human-readable relative
 * duration like "2h 15m" or "4d 3h".  Returns "now" if the time has passed.
 */
function formatTimeUntil(unixTimestamp: number): string {
  const ms = unixTimestamp * 1000 - Date.now();
  if (ms <= 0) {
    return "now";
  }
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return `${days}d ${remainHours}h`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Format session/weekly quota into compact display strings.
 */
function formatQuotaColumns(quota: AccountQuota): {
  sessionText: string;
  weeklyText: string;
  sessionReset: string;
  weeklyReset: string;
} {
  const sessionRemaining = Math.round((1 - quota.sessionUsed) * 100);
  const weeklyRemaining = Math.round((1 - quota.weeklyUsed) * 100);

  const colorize = (pct: number, text: string): string => {
    if (pct <= 10) {
      return chalk.red(text);
    }
    if (pct <= 30) {
      return chalk.yellow(text);
    }
    return chalk.green(text);
  };

  return {
    sessionText: colorize(sessionRemaining, `${sessionRemaining}% left`),
    weeklyText: colorize(weeklyRemaining, `${weeklyRemaining}% left`),
    sessionReset:
      quota.sessionResetAt > 0
        ? chalk.gray(`resets ${formatTimeUntil(quota.sessionResetAt)}`)
        : "",
    weeklyReset:
      quota.weeklyResetAt > 0
        ? chalk.gray(`resets ${formatTimeUntil(quota.weeklyResetAt)}`)
        : "",
  };
}

/**
 * Handle the list subcommand
 * `neurolink auth list`
 *
 * Lists all authenticated accounts from the TokenStore.
 */
export async function handleList(argv: AuthCommandArgs): Promise<void> {
  try {
    const allKeys = await defaultTokenStore.listProviders();

    if (allKeys.length === 0) {
      if (argv.format === "json") {
        logger.always(JSON.stringify([], null, 2));
      } else {
        logger.always(chalk.yellow("\nNo authenticated accounts found.\n"));
        logger.always(
          chalk.blue(
            "Run 'neurolink auth login <provider>' to authenticate.\n",
          ),
        );
      }
      return;
    }

    // Build enriched account list with token metadata
    const enrichedAccounts = await Promise.all(
      allKeys.map(async (key) => {
        const parts = key.split(":");
        const provider = parts[0];
        const label = parts.length > 1 ? parts.slice(1).join(":") : undefined;
        let tier: string | undefined;
        let email: string | undefined;
        let tokenStatus: "valid" | "expired" | "unknown" = "unknown";
        let expiresAt: number | undefined;

        // Derive email from the compound key label when it looks like an email.
        // The credentials file is a shared singleton that gets overwritten on
        // every login — reading email from it would show the LATEST login's
        // email for ALL accounts.  The label is the per-account source of truth.
        if (label && label.includes("@")) {
          email = label;
        }

        // Fall back to credentials file ONLY for the default (unlabeled) account.
        // Compound-key entries (labeled accounts) must NOT read the shared
        // credentials file because it gets overwritten on every login and would
        // show the latest login's email/tier for all accounts.  Per-account
        // metadata is encoded in the token's scope field instead.
        if (!email && !label) {
          try {
            const credPath = path.join(
              NEUROLINK_CONFIG_DIR,
              `${provider}-credentials.json`,
            );
            if (fs.existsSync(credPath)) {
              const creds = JSON.parse(
                fs.readFileSync(credPath, "utf-8"),
              ) as StoredCredentials;
              email = creds.email;
              if (creds.subscriptionTier) {
                tier = creds.subscriptionTier;
              }
            }
          } catch {
            /* non-fatal */
          }
        }

        try {
          const tokens = await defaultTokenStore.loadTokens(key);
          if (tokens) {
            expiresAt = tokens.expiresAt;
            const isExpired = defaultTokenStore.isTokenExpired(tokens, 0);
            tokenStatus = isExpired ? "expired" : "valid";
            // Extract per-account metadata from scope (e.g. "tier:pro email:user@example.com")
            if (tokens.scope) {
              if (!tier) {
                const tierMatch = tokens.scope.match(/tier:(\w+)/);
                if (tierMatch) {
                  tier = tierMatch[1];
                }
              }
              if (!email) {
                const emailMatch = tokens.scope.match(/email:(\S+)/);
                if (emailMatch) {
                  email = emailMatch[1];
                }
              }
            }
          }
        } catch {
          // Token load failed — show as unknown
        }

        return { key, provider, label, email, tier, tokenStatus, expiresAt };
      }),
    );

    // Load persisted quota data (captured from proxy responses).
    let quotas: Record<string, AccountQuota> = {};
    try {
      quotas = await loadAccountQuotas();
    } catch {
      // Non-fatal — quota display is best-effort
    }

    if (argv.format === "json") {
      // Merge quota data into each account object for JSON output
      const withQuota = enrichedAccounts.map((acct) => {
        const quotaKey = acct.label ?? acct.key;
        const quota = quotas[quotaKey] ?? null;
        return { ...acct, quota };
      });
      logger.always(JSON.stringify(withQuota, null, 2));
    } else {
      logger.always(chalk.bold("\nAuthenticated Accounts:\n"));

      // Check if any account has quota data to decide column layout
      const hasQuota = enrichedAccounts.some((acct) => {
        const quotaKey = acct.label ?? acct.key;
        return quotas[quotaKey] !== undefined;
      });

      // Table header
      const colKey = "LABEL".padEnd(20);
      const colEmail = "EMAIL".padEnd(28);
      const colStatus = "TOKEN STATUS".padEnd(14);
      const colProvider = "PROVIDER".padEnd(12);
      const colSession = hasQuota ? "SESSION".padEnd(10) : "";
      const colWeekly = hasQuota ? "WEEKLY".padEnd(10) : "";
      logger.always(
        `  ${chalk.gray(colKey)} ${chalk.gray(colProvider)} ${chalk.gray(colEmail)} ${chalk.gray(colStatus)}${hasQuota ? ` ${chalk.gray(colSession)} ${chalk.gray(colWeekly)}` : ""}`,
      );
      logger.always(`  ${chalk.gray("-".repeat(hasQuota ? 100 : 78))}`);

      for (const acct of enrichedAccounts) {
        const displayLabel = (acct.label ?? acct.key).padEnd(20);
        const displayEmail = (acct.email ?? "-").padEnd(28);
        const displayProvider = acct.provider.padEnd(12);

        let statusText: string;
        if (acct.tokenStatus === "valid") {
          statusText = chalk.green("valid".padEnd(14));
        } else if (acct.tokenStatus === "expired") {
          statusText = chalk.red("expired".padEnd(14));
        } else {
          statusText = chalk.yellow("unknown".padEnd(14));
        }

        const quotaKey = acct.label ?? acct.key;
        const quota = quotas[quotaKey];

        if (hasQuota && quota) {
          const qc = formatQuotaColumns(quota);
          logger.always(
            `  ${chalk.cyan(displayLabel)} ${displayProvider} ${displayEmail} ${statusText} ${qc.sessionText.padEnd(10)} ${qc.weeklyText.padEnd(10)}`,
          );
          // Second line: reset times (indented under session/weekly columns)
          if (qc.sessionReset || qc.weeklyReset) {
            const indent = " ".repeat(2 + 20 + 1 + 12 + 1 + 28 + 1 + 14 + 1);
            logger.always(
              `${indent}${(qc.sessionReset || "").padEnd(10)} ${qc.weeklyReset || ""}`,
            );
          }
        } else {
          logger.always(
            `  ${chalk.cyan(displayLabel)} ${displayProvider} ${displayEmail} ${statusText}${hasQuota ? "  -          -" : ""}`,
          );
        }
      }
      logger.always("");
    }
  } catch (error) {
    logger.error(chalk.red("Failed to list accounts:"));
    logger.error(
      chalk.red(error instanceof Error ? error.message : "Unknown error"),
    );
    process.exit(1);
  }
}

/**
 * Handle the remove subcommand
 * `neurolink auth remove <provider> --label <label>` or `neurolink auth remove <provider> --account <key>`
 *
 * Removes an authenticated account from the TokenStore.
 * When neither --label nor --account is given, removes the default (unlabelled) account
 * for the specified provider.
 */
export async function handleRemove(argv: AuthCommandArgs): Promise<void> {
  try {
    const provider = argv.provider?.toLowerCase() ?? "anthropic";

    // Resolve the compound key from --account, --label, or provider default
    let compoundKey: string;

    if (argv.account) {
      compoundKey = argv.account;
    } else if (argv.label) {
      compoundKey = `${provider}:${argv.label}`;
    } else {
      // Remove the default (unlabelled) account for this provider
      compoundKey = provider;
    }

    // Check if the account exists
    const allKeys = await defaultTokenStore.listProviders();
    if (!allKeys.includes(compoundKey)) {
      logger.error(chalk.red(`Account not found: ${compoundKey}`));
      logger.always(
        chalk.blue(
          "\nRun 'neurolink auth list' to see all authenticated accounts.\n",
        ),
      );
      process.exit(1);
    }

    await defaultTokenStore.clearTokens(compoundKey);

    // Only remove the legacy credentials file for bare provider keys.
    // Compound keys (e.g., "anthropic:alice") should not touch the shared
    // legacy credentials file — it may belong to the default account.
    if (!compoundKey.includes(":")) {
      const legacyCredFile = path.join(
        NEUROLINK_CONFIG_DIR,
        `${compoundKey}-credentials.json`,
      );
      try {
        if (fs.existsSync(legacyCredFile)) {
          fs.unlinkSync(legacyCredFile);
          logger.debug(`Removed legacy credentials file: ${legacyCredFile}`);
        }
      } catch {
        // Non-fatal — legacy file may not exist or may already be gone
      }
    }

    logger.always(chalk.green(`\nAccount removed: ${compoundKey}\n`));
  } catch (error) {
    logger.error(chalk.red("Failed to remove account:"));
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

      // Also clear from TokenStore — both the bare provider key and all
      // compound-key entries (provider:label) used by the account pool.
      try {
        await defaultTokenStore.clearTokens(provider);
      } catch {
        // Ignore if no tokens stored for bare key
      }
      try {
        const allKeys = await defaultTokenStore.listProviders();
        for (const k of allKeys) {
          if (k.startsWith(`${provider}:`)) {
            await defaultTokenStore.clearTokens(k);
            logger.debug(`Cleared pooled account: ${k}`);
          }
        }
      } catch {
        // Ignore if listing/clearing fails
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

      // Also update the TokenStore pool entries for this provider.
      // Update both the bare provider key and compound "provider:label" keys
      // so that pooled accounts created via saveAccountToPool() stay current.
      try {
        const allKeys = await defaultTokenStore.listProviders();
        for (const key of allKeys) {
          if (key === provider || key.startsWith(`${provider}:`)) {
            const existingTokens = await defaultTokenStore.loadTokens(key);
            if (existingTokens) {
              await defaultTokenStore.saveTokens(key, {
                accessToken: newTokens.accessToken,
                refreshToken: newTokens.refreshToken,
                expiresAt: newTokens.expiresAt ?? Date.now() + 3600 * 1000,
                tokenType: newTokens.tokenType || "Bearer",
                scope: existingTokens.scope, // preserve existing scope metadata
              });
              logger.debug(`Updated TokenStore entry: ${key}`);
            }
          }
        }
      } catch (poolErr) {
        logger.debug(
          `[auth] Failed to update TokenStore pool entries: ${poolErr instanceof Error ? poolErr.message : String(poolErr)}`,
        );
      }

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

/**
 * Handle the cleanup subcommand
 * `neurolink auth cleanup [--force]`
 *
 * Removes stale accounts from the token store:
 *   1. Expired entries with no refresh token (via pruneExpired)
 *   2. Permanently disabled entries (after confirmation)
 */
export async function handleCleanup(argv: AuthCommandArgs): Promise<void> {
  try {
    const removed: Array<{ key: string; reason: string }> = [];

    // Step 1: Prune expired entries that have no refresh token
    const pruned = await defaultTokenStore.pruneExpired();
    for (const key of pruned) {
      removed.push({ key, reason: "expired, no refresh token" });
    }

    // Step 2: Find disabled entries (pruneExpired already removes disabled
    // entries, but in case the user runs cleanup with entries that were
    // disabled between the prune call and now, check again)
    const disabledKeys = await defaultTokenStore.listDisabled();

    if (disabledKeys.length > 0) {
      let shouldRemove = false;

      if (argv.force || argv.nonInteractive) {
        shouldRemove = true;
      } else {
        logger.always(
          chalk.yellow(`\nFound ${disabledKeys.length} disabled account(s):`),
        );
        for (const key of disabledKeys) {
          logger.always(`  - ${key}`);
        }

        const { confirm } = await inquirer.prompt([
          {
            name: "confirm",
            type: "confirm",
            message: "Remove these disabled accounts?",
            default: false,
          },
        ]);
        shouldRemove = confirm;
      }

      if (shouldRemove) {
        for (const key of disabledKeys) {
          await defaultTokenStore.clearTokens(key);
          removed.push({ key, reason: "disabled: refresh_failed" });
        }
      }
    }

    // Report results
    if (removed.length === 0) {
      logger.always(chalk.green("No stale accounts found."));
    } else {
      logger.always(
        chalk.green(
          `\nCleaned up ${removed.length} stale account${removed.length === 1 ? "" : "s"}:`,
        ),
      );
      for (const entry of removed) {
        logger.always(`  - ${entry.key} (${entry.reason})`);
      }
      logger.always("");
    }
  } catch (error) {
    logger.error(chalk.red("Cleanup failed:"));
    logger.error(
      chalk.red(error instanceof Error ? error.message : "Unknown error"),
    );
    process.exit(1);
  }
}

/**
 * Handle the enable subcommand
 * `neurolink auth enable <account>`
 *
 * Re-enables a previously disabled account so it can be used by the proxy pool again.
 */
export async function handleEnable(argv: AuthCommandArgs): Promise<void> {
  try {
    // Resolve account key from --account option or positional arg
    const accountKey =
      argv.account || (argv._ && argv._[2] ? String(argv._[2]) : undefined);

    if (!accountKey) {
      logger.error(chalk.red("Missing required argument: <account>"));
      logger.always(
        chalk.blue(
          "\nUsage: neurolink auth enable <account>\n" +
            "Run 'neurolink auth list' to see all accounts.\n",
        ),
      );
      process.exit(1);
    }

    // Check if account exists in the token store
    const allKeys = await defaultTokenStore.listProviders();
    if (!allKeys.includes(accountKey)) {
      logger.error(chalk.red(`Account not found: ${accountKey}`));
      logger.always(
        chalk.blue(
          "\nRun 'neurolink auth list' to see all authenticated accounts.\n",
        ),
      );
      process.exit(1);
    }

    await defaultTokenStore.markEnabled(accountKey);
    logger.always(chalk.green(`\nRe-enabled account: ${accountKey}\n`));
  } catch (error) {
    logger.error(chalk.red("Failed to enable account:"));
    logger.error(
      chalk.red(error instanceof Error ? error.message : "Unknown error"),
    );
    process.exit(1);
  }
}

// =============================================================================
// PRIMARY ACCOUNT (proxy routing.primaryAccount in YAML)
// =============================================================================

const DEFAULT_PROXY_CONFIG_PATH = path.join(
  NEUROLINK_CONFIG_DIR,
  "proxy-config.yaml",
);

/** Lazy-load js-yaml. Returns undefined if unavailable; callers that need YAML
 *  output (rather than JSON fallback) should error with install guidance. */
async function tryLoadJsYaml(): Promise<YamlModule | undefined> {
  try {
    return (await import(/* @vite-ignore */ "js-yaml" as string)) as YamlModule;
  } catch {
    return undefined;
  }
}

function isYamlPath(p: string): boolean {
  const lower = p.toLowerCase();
  return lower.endsWith(".yaml") || lower.endsWith(".yml");
}

/** Read and parse a proxy config file. Returns an empty object when the file
 *  doesn't exist (caller can mutate and write). Detects YAML vs JSON by
 *  extension; falls back to JSON parsing if js-yaml is unavailable for a YAML
 *  file (errors loudly if neither parser can read it). */
async function readProxyConfigFile(
  filePath: string,
): Promise<CliProxyConfigDoc> {
  const yamlExpected = isYamlPath(filePath);
  let raw: string | undefined;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return {
        data: {},
        format: yamlExpected ? "yaml" : "json",
        hadComments: false,
      };
    }
    throw err;
  }

  const hadComments = /^\s*#/m.test(raw);
  if (yamlExpected) {
    const yaml = await tryLoadJsYaml();
    if (yaml) {
      const parsed = yaml.default?.load?.(raw) ?? yaml.load(raw);
      return {
        data:
          parsed && typeof parsed === "object"
            ? (parsed as Record<string, unknown>)
            : {},
        format: "yaml",
        hadComments,
      };
    }
    // YAML expected but js-yaml absent — try JSON
    try {
      return { data: JSON.parse(raw), format: "json", hadComments };
    } catch {
      throw new Error(
        `Cannot edit ${filePath}: js-yaml is not installed and the file is ` +
          `not valid JSON. Install js-yaml (pnpm add -D js-yaml) or convert ` +
          `the file to JSON.`,
      );
    }
  }
  return { data: JSON.parse(raw), format: "json", hadComments };
}

/** Serialize and write a proxy config file. */
async function writeProxyConfigFile(
  filePath: string,
  doc: CliProxyConfigDoc,
): Promise<void> {
  let serialized: string;
  if (doc.format === "yaml") {
    const yaml = await tryLoadJsYaml();
    if (!yaml) {
      throw new Error(
        `Cannot write ${filePath} as YAML: js-yaml is not installed. ` +
          `Install it (pnpm add -D js-yaml) or use a .json config path.`,
      );
    }
    const dump = yaml.default?.dump ?? yaml.dump;
    if (!dump) {
      throw new Error(
        `Cannot write ${filePath} as YAML: js-yaml module does not expose ` +
          `a dump function (unexpected version).`,
      );
    }
    serialized = dump(doc.data, {
      lineWidth: 100,
      noRefs: true,
    });
  } else {
    serialized = `${JSON.stringify(doc.data, null, 2)}\n`;
  }
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, serialized, "utf-8");
}

function getRoutingObject(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const routing = data.routing;
  if (routing && typeof routing === "object" && !Array.isArray(routing)) {
    return routing as Record<string, unknown>;
  }
  const fresh: Record<string, unknown> = {};
  data.routing = fresh;
  return fresh;
}

function readPrimaryFromRouting(
  routing: Record<string, unknown> | undefined,
): string | undefined {
  if (!routing) {
    return undefined;
  }
  const kebab = routing["primary-account"];
  if (typeof kebab === "string" && kebab.trim() !== "") {
    return kebab.trim();
  }
  const camel = routing.primaryAccount;
  if (typeof camel === "string" && camel.trim() !== "") {
    return camel.trim();
  }
  return undefined;
}

/** Best-effort detection of a running proxy. Mirrors `proxy status` semantics
 *  without importing the proxy module. */
function detectRunningProxyPid(): number | undefined {
  try {
    const stateFile = path.join(NEUROLINK_CONFIG_DIR, "proxy-state.json");
    if (!fs.existsSync(stateFile)) {
      return undefined;
    }
    const parsed = JSON.parse(fs.readFileSync(stateFile, "utf-8")) as {
      pid?: number;
    };
    if (!parsed.pid || typeof parsed.pid !== "number") {
      return undefined;
    }
    process.kill(parsed.pid, 0);
    return parsed.pid;
  } catch {
    return undefined;
  }
}

/**
 * Handle the set-primary subcommand
 * `neurolink auth set-primary <email> [--config <path>]`
 *
 * Writes routing.primary-account to the proxy config YAML so the proxy
 * tries this account first under fill-first/round-robin home semantics.
 * Does not touch the token store.
 */
export async function handleSetPrimary(argv: AuthCommandArgs): Promise<void> {
  const email =
    argv.email ?? (argv._ && argv._[2] ? String(argv._[2]) : undefined);
  if (!email || email.trim() === "") {
    logger.error(chalk.red("Missing required argument: <email>"));
    logger.always(
      chalk.blue(
        "\nUsage: neurolink auth set-primary <email> [--config <path>]\n" +
          "Run 'neurolink auth list' to see authenticated accounts.\n",
      ),
    );
    process.exit(1);
  }
  const trimmed = email.trim();
  const filePath = argv.config ?? DEFAULT_PROXY_CONFIG_PATH;

  try {
    const doc = await readProxyConfigFile(filePath);
    if (doc.hadComments) {
      logger.always(
        chalk.yellow(
          `⚠ Note: existing YAML comments in ${filePath} will not be preserved.`,
        ),
      );
    }
    const routing = getRoutingObject(doc.data);
    delete routing.primaryAccount;
    routing["primary-account"] = trimmed;
    await writeProxyConfigFile(filePath, doc);

    logger.always(chalk.green(`✓ Set primary account → ${trimmed}`));
    logger.always(chalk.green(`✓ Saved to ${filePath}`));

    // Token-store presence check (non-fatal)
    const compoundKey = `anthropic:${trimmed}`;
    const known = await defaultTokenStore.listByPrefix("anthropic:");
    if (!known.includes(compoundKey)) {
      logger.always("");
      logger.always(
        chalk.yellow(
          "⚠ This account is not currently authenticated. Run\n" +
            "  `neurolink auth login --add` to add it. The proxy will fall\n" +
            "  back to the first enabled account until then.",
        ),
      );
    }

    // Restart hint
    const pid = detectRunningProxyPid();
    if (pid) {
      logger.always("");
      logger.always(
        chalk.yellow(
          `⚠ A proxy is currently running (PID ${pid}). Restart it to pick\n` +
            "  up the change: `neurolink proxy stop && neurolink proxy start`.",
        ),
      );
    }
  } catch (err) {
    logger.error(chalk.red("Failed to set primary account:"));
    logger.error(
      chalk.red(err instanceof Error ? err.message : "Unknown error"),
    );
    process.exit(1);
  }
}

/**
 * Handle the get-primary subcommand
 * `neurolink auth get-primary [--config <path>]`
 */
export async function handleGetPrimary(argv: AuthCommandArgs): Promise<void> {
  const filePath = argv.config ?? DEFAULT_PROXY_CONFIG_PATH;
  try {
    if (!fs.existsSync(filePath)) {
      logger.always(chalk.blue(`No proxy config file found at ${filePath}.`));
      logger.always(
        "Falling back to insertion-order index 0 (no primary configured).",
      );
      return;
    }
    const doc = await readProxyConfigFile(filePath);
    const routing =
      typeof doc.data.routing === "object" && doc.data.routing
        ? (doc.data.routing as Record<string, unknown>)
        : undefined;
    const primary = readPrimaryFromRouting(routing);
    if (!primary) {
      logger.always(
        chalk.blue(
          `No primary account configured. Falling back to insertion-order ` +
            `index 0.`,
        ),
      );
      logger.always(
        `Source: ${filePath} (no \`routing.primaryAccount\` field)`,
      );
      return;
    }
    const compoundKey = `anthropic:${primary}`;
    const known = await defaultTokenStore.listByPrefix("anthropic:");
    const present = known.includes(compoundKey);
    logger.always(chalk.bold(`Configured primary: ${primary}`));
    logger.always(
      `Status: ${
        present
          ? chalk.green(`authenticated (${compoundKey} present in token store)`)
          : chalk.yellow(
              `not authenticated (token store has no ${compoundKey})`,
            )
      }`,
    );
    logger.always(`Source: ${filePath}`);
  } catch (err) {
    logger.error(chalk.red("Failed to read primary account:"));
    logger.error(
      chalk.red(err instanceof Error ? err.message : "Unknown error"),
    );
    process.exit(1);
  }
}

/**
 * Handle the clear-primary subcommand
 * `neurolink auth clear-primary [--config <path>]`
 */
export async function handleClearPrimary(argv: AuthCommandArgs): Promise<void> {
  const filePath = argv.config ?? DEFAULT_PROXY_CONFIG_PATH;
  try {
    if (!fs.existsSync(filePath)) {
      logger.always(chalk.blue(`No proxy config file found at ${filePath}.`));
      logger.always("Nothing to clear.");
      return;
    }
    const doc = await readProxyConfigFile(filePath);
    const routing =
      typeof doc.data.routing === "object" && doc.data.routing
        ? (doc.data.routing as Record<string, unknown>)
        : undefined;
    const before = readPrimaryFromRouting(routing);
    if (!before || !routing) {
      logger.always(chalk.blue("No primary account was configured."));
      return;
    }
    if (doc.hadComments) {
      logger.always(
        chalk.yellow(
          `⚠ Note: existing YAML comments in ${filePath} will not be preserved.`,
        ),
      );
    }
    delete routing.primaryAccount;
    delete routing["primary-account"];
    await writeProxyConfigFile(filePath, doc);
    logger.always(chalk.green(`✓ Cleared primary account (was: ${before})`));
    logger.always(chalk.green(`✓ Saved to ${filePath}`));

    const pid = detectRunningProxyPid();
    if (pid) {
      logger.always("");
      logger.always(
        chalk.yellow(
          `⚠ A proxy is currently running (PID ${pid}). Restart it to pick\n` +
            "  up the change: `neurolink proxy stop && neurolink proxy start`.",
        ),
      );
    }
  } catch (err) {
    logger.error(chalk.red("Failed to clear primary account:"));
    logger.error(
      chalk.red(err instanceof Error ? err.message : "Unknown error"),
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
): Promise<boolean> {
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
      return false;
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
    return await handleApiKeyAuth(provider, true);
  } else if (method === "create-api-key") {
    await handleCreateApiKeyOAuth(provider);
    return true;
  } else {
    await handleOAuthAuth(provider);
    return true;
  }
}

/**
 * Handle API key authentication
 */
async function handleApiKeyAuth(
  provider: SupportedProvider,
  interactive: boolean,
): Promise<boolean> {
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
      return true;
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
      throw new Error(
        "The API key could not be validated. Please check and try again.",
      );
    }

    spinner.succeed("API key validated successfully");
  } catch (error) {
    spinner.fail("API key validation failed");
    throw error instanceof Error
      ? error
      : new Error(String(error) || "Validation error");
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

    // Credentials file was written only if user chose "config" or "both"
    return storageOption === "config" || storageOption === "both";
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
  logger.always(chalk.dim("  Authentication URL:"));
  logger.always(chalk.cyan(`  ${authUrl.toString()}`));
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
  logger.always(chalk.dim("  Authentication URL:"));
  logger.always(chalk.cyan(`  ${authUrl.toString()}`));
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
    // Token exchange may include account/org info (primary email source)
    account?: { uuid?: string; email_address?: string };
    organization?: { uuid?: string; name?: string };
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

  // === Triple fallback chain for email & subscription tier ===
  // Primary: extract email from token exchange response
  let email: string | undefined = tokenData.account?.email_address;
  let subscriptionTier: "free" | "pro" | "max" | "api" | undefined;

  // Fallback 1: validation endpoint (/v1/oauth/validate)
  // Always try when email OR tier is missing — token exchange gives email but not tier
  if (!email || !subscriptionTier) {
    try {
      const { AnthropicOAuth } =
        await import("../../lib/auth/anthropicOAuth.js");
      const oauth = new AnthropicOAuth();
      const validationResult = await oauth.validateTokenWithDetails(
        tokens.accessToken,
      );
      if (validationResult.user) {
        email = email || validationResult.user.email;
        if (validationResult.user.subscription) {
          subscriptionTier = validationResult.user
            .subscription as typeof subscriptionTier;
        }
      }
    } catch {
      /* non-fatal — validation is best-effort */
    }
  }

  // Fallback 2: /v1/me endpoint (also detects subscription tier)
  if (!subscriptionTier || !email) {
    const meResult = await detectSubscriptionTierAndEmail(tokens.accessToken);
    if (!subscriptionTier && meResult.tier) {
      subscriptionTier = meResult.tier;
    }
    if (!email && meResult.email) {
      email = meResult.email;
    }
  }

  await saveStoredCredentials(provider, {
    type: "oauth",
    oauth: tokens,
    provider,
    subscriptionTier,
    email,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  exchangeSpinner.succeed("OAuth authentication successful!");

  logger.always("");
  logger.always(chalk.green("═".repeat(60)));
  logger.always(chalk.green.bold("  Authentication configured successfully!"));
  logger.always(chalk.green("═".repeat(60)));
  logger.always("");
  if (email) {
    logger.always(`  Email:             ${chalk.blue(email)}`);
  }
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
// MULTI-ACCOUNT HELPERS
// =============================================================================

/**
 * Save the most recently authenticated credentials to the TokenStore
 * using a compound key (e.g., "anthropic:alice") for multi-account pools.
 *
 * Reads back the credentials file that was just written by the auth flow,
 * then saves the tokens into the TokenStore under the compound key.
 */
async function saveAccountToPool(
  provider: SupportedProvider,
  label?: string,
): Promise<void> {
  const credentials = await getStoredCredentials(provider);
  if (!credentials) {
    logger.error(
      chalk.red(
        "Could not read back credentials after authentication. Multi-account save skipped.",
      ),
    );
    return;
  }

  // Determine the compound key
  // Use email as the label when available (human-readable, unique per account)
  const credEmail = credentials.email;
  let compoundKey: string;
  if (label) {
    compoundKey = `${provider}:${label}`;
  } else {
    const autoLabel = credEmail ?? Date.now().toString(36).slice(-6);
    compoundKey = `${provider}:${autoLabel}`;
  }

  // Decision 10A: Auto-prune stale token-prefix entries when email is known.
  // When we have a real email, remove old entries whose stored token value is
  // identical to the one we are about to save.  This avoids false positives on
  // legitimate user labels like "primary", "work123", or "office42" that the old
  // broad regex (^[A-Za-z0-9_]{5,8}$) would incorrectly match.
  if (credEmail) {
    const newAccessToken =
      credentials.type === "oauth"
        ? credentials.oauth?.accessToken
        : credentials.apiKey;
    try {
      const allKeys = await defaultTokenStore.listProviders();
      for (const k of allKeys) {
        if (!k.startsWith(`${provider}:`)) {
          continue;
        }
        const existingLabel = k.split(":").slice(1).join(":");
        // Skip the email key we are about to write
        if (existingLabel === credEmail) {
          continue;
        }
        // Skip the explicit user label we are about to write
        if (label && existingLabel === label) {
          continue;
        }
        // Only prune when the stored token value is identical (true duplicate)
        if (newAccessToken) {
          try {
            const existingTokens = await defaultTokenStore.loadTokens(k);
            if (
              existingTokens &&
              existingTokens.accessToken === newAccessToken
            ) {
              logger.debug(`Auto-pruning duplicate token entry: ${k}`);
              await defaultTokenStore.clearTokens(k);
            }
          } catch {
            // Non-fatal — skip entries we can't read
          }
        }
      }
    } catch {
      // Non-fatal — dedup is best-effort
      logger.debug("Failed to auto-prune stale entries during login");
    }
  }

  // Build per-account metadata scope string so email/tier are stored
  // alongside the token rather than in the shared credentials file.
  const metaParts: string[] = [];
  if (credentials.subscriptionTier) {
    metaParts.push(`tier:${credentials.subscriptionTier}`);
  }
  if (credentials.email) {
    metaParts.push(`email:${credentials.email}`);
  }

  // Build StoredOAuthTokens for the TokenStore
  if (credentials.type === "oauth" && credentials.oauth) {
    const baseScope = credentials.oauth.scope ?? "";
    const scopeWithMeta = [baseScope, ...metaParts].filter(Boolean).join(" ");
    await defaultTokenStore.saveTokens(compoundKey, {
      accessToken: credentials.oauth.accessToken,
      refreshToken: credentials.oauth.refreshToken,
      expiresAt: credentials.oauth.expiresAt ?? Date.now() + 3600 * 1000,
      tokenType: credentials.oauth.tokenType || "Bearer",
      scope: scopeWithMeta || undefined,
    });
  } else if (credentials.type === "api-key" && credentials.apiKey) {
    // For API keys, store as a non-expiring token in the TokenStore.
    // Use Number.MAX_SAFE_INTEGER so isTokenExpired() and pruneExpired()
    // never treat a perfectly valid API key as expired.
    const scopeWithMeta = metaParts.join(" ") || undefined;
    await defaultTokenStore.saveTokens(compoundKey, {
      accessToken: credentials.apiKey,
      expiresAt: Number.MAX_SAFE_INTEGER,
      tokenType: "api-key",
      scope: scopeWithMeta,
    });
  } else {
    logger.error(
      chalk.red("No valid credentials found. Multi-account save skipped."),
    );
    return;
  }

  logger.always(chalk.green(`\nAccount added: ${compoundKey}\n`));
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
 * Detect subscription tier and email from /v1/me endpoint.
 * Returns both tier and email when available (used as fallback 2 in the
 * triple fallback chain for email resolution).
 */
async function detectSubscriptionTierAndEmail(
  accessToken: string,
): Promise<{ tier?: "free" | "pro" | "max" | "api"; email?: string }> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": "claude-cli/2.1.80 (external, cli)",
        "anthropic-version": "2023-06-01",
      },
    });

    if (response.ok) {
      const data = (await response.json()) as {
        subscription?: string;
        email?: string;
        email_address?: string;
      };
      return {
        tier: data.subscription as "free" | "pro" | "max" | "api" | undefined,
        email: data.email || data.email_address,
      };
    }
  } catch {
    // Ignore errors - subscription/email detection is optional
  }

  return {};
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
