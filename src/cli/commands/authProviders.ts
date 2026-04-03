// src/cli/commands/authProviders.ts

/**
 * Multi-provider authentication CLI handlers.
 *
 * Provides commands for listing, validating, and health-checking
 * authentication providers (Auth0, Clerk, Firebase, Supabase, etc.).
 */

import chalk from "chalk";
import type { ArgumentsCamelCase } from "yargs";
import { AuthProviderFactory } from "../../lib/auth/AuthProviderFactory.js";
import type {
  AuthProviderConfig,
  AuthProviderType,
} from "../../lib/types/index.js";
import { logger } from "../../lib/utils/logger.js";

/**
 * Auth command argument types
 */
export type AuthProvidersArgs = {
  format?: "text" | "json" | "table";
};

export type AuthValidateArgs = {
  token: string;
  provider: AuthProviderType;
  domain?: string;
  clientId?: string;
  secretKey?: string;
  secret?: string;
  url?: string;
  anonKey?: string;
  apiKey?: string;
  format?: "text" | "json";
};

export type AuthHealthArgs = {
  provider: AuthProviderType;
  domain?: string;
  clientId?: string;
  secretKey?: string;
  secret?: string;
  url?: string;
  anonKey?: string;
  apiKey?: string;
  format?: "text" | "json";
};

/**
 * Provider information for display
 */
const PROVIDER_INFO: Record<
  AuthProviderType,
  {
    name: string;
    description: string;
    requiredConfig: string[];
    website: string;
  }
> = {
  auth0: {
    name: "Auth0",
    description: "Enterprise identity platform with JWT and session support",
    requiredConfig: ["domain", "clientId"],
    website: "https://auth0.com",
  },
  clerk: {
    name: "Clerk",
    description: "Modern authentication with session-based and JWT support",
    requiredConfig: ["publishableKey", "secretKey"],
    website: "https://clerk.com",
  },
  supabase: {
    name: "Supabase Auth",
    description: "Open-source Firebase alternative with JWT authentication",
    requiredConfig: ["url", "anonKey"],
    website: "https://supabase.com",
  },
  firebase: {
    name: "Firebase Auth",
    description: "Google's authentication service with multiple providers",
    requiredConfig: ["projectId"],
    website: "https://firebase.google.com",
  },
  workos: {
    name: "WorkOS",
    description: "Enterprise-ready authentication with SSO support",
    requiredConfig: ["apiKey", "clientId"],
    website: "https://workos.com",
  },
  "better-auth": {
    name: "Better Auth",
    description: "Self-hosted authentication solution",
    requiredConfig: ["secret", "baseUrl"],
    website: "https://github.com/better-auth/better-auth",
  },
  custom: {
    name: "Custom",
    description: "Custom authentication adapter for any provider",
    requiredConfig: ["validateToken"],
    website: "",
  },
  oauth2: {
    name: "OAuth2",
    description: "Generic OAuth2 authentication with configurable endpoints",
    requiredConfig: [
      "clientId",
      "clientSecret",
      "authorizationUrl",
      "tokenUrl",
    ],
    website: "https://oauth.net/2/",
  },
  cognito: {
    name: "AWS Cognito",
    description: "AWS Cognito user pools with JWT authentication",
    requiredConfig: ["userPoolId", "clientId", "region"],
    website: "https://aws.amazon.com/cognito/",
  },
  keycloak: {
    name: "Keycloak",
    description: "Open-source identity and access management",
    requiredConfig: ["realm", "serverUrl", "clientId"],
    website: "https://www.keycloak.org/",
  },
  jwt: {
    name: "JWT",
    description: "Generic JWT token validation with configurable secret/keys",
    requiredConfig: ["secret"],
    website: "https://jwt.io/",
  },
};

/**
 * Handle 'auth providers' command
 */
export async function handleProvidersCommand(
  argv: ArgumentsCamelCase<AuthProvidersArgs>,
): Promise<void> {
  const providers = Object.entries(PROVIDER_INFO).filter(
    ([key]) => key !== "custom",
  );

  if (argv.format === "json") {
    const output = providers.map(([type, info]) => ({
      type,
      ...info,
    }));
    logger.always(JSON.stringify(output, null, 2));
    return;
  }

  if (argv.format === "table") {
    logger.always(chalk.bold("\nAvailable Authentication Providers\n"));
    logger.always(
      chalk.gray(
        "+-----------------+--------------------------------------------------+",
      ),
    );
    logger.always(
      chalk.gray("| ") +
        chalk.bold("Provider".padEnd(15)) +
        chalk.gray(" | ") +
        chalk.bold("Description".padEnd(48)) +
        chalk.gray(" |"),
    );
    logger.always(
      chalk.gray(
        "+-----------------+--------------------------------------------------+",
      ),
    );

    for (const [type, info] of providers) {
      logger.always(
        chalk.gray("| ") +
          chalk.cyan(type.padEnd(15)) +
          chalk.gray(" | ") +
          info.description.substring(0, 48).padEnd(48) +
          chalk.gray(" |"),
      );
    }

    logger.always(
      chalk.gray(
        "+-----------------+--------------------------------------------------+",
      ),
    );
    return;
  }

  // Text format (default)
  logger.always(chalk.bold("\nAvailable Authentication Providers\n"));

  for (const [type, info] of providers) {
    logger.always(chalk.cyan.bold(`  ${info.name} (${type})`));
    logger.always(chalk.gray(`    ${info.description}`));
    logger.always(
      chalk.gray(`    Required config: ${info.requiredConfig.join(", ")}`),
    );
    if (info.website) {
      logger.always(chalk.gray(`    Website: ${info.website}`));
    }
    logger.always("");
  }

  logger.always(
    chalk.gray(
      "Use 'neurolink auth validate <token> --provider <type>' to validate a token",
    ),
  );
  logger.always(
    chalk.gray(
      "Use 'neurolink auth health --provider <type>' to check provider health\n",
    ),
  );
}

/**
 * Handle 'auth validate' command
 */
export async function handleValidateCommand(
  argv: ArgumentsCamelCase<AuthValidateArgs>,
): Promise<void> {
  try {
    const providerConfig = buildProviderConfig(argv);

    if (!providerConfig) {
      logger.error(
        chalk.red(
          `\nError: Missing required configuration for ${argv.provider} provider.\n`,
        ),
      );
      logger.always(
        chalk.gray(
          `Required: ${PROVIDER_INFO[argv.provider].requiredConfig.join(", ")}`,
        ),
      );
      logger.always(
        chalk.gray(
          "\nProvide via CLI options or environment variables (e.g., AUTH0_DOMAIN)",
        ),
      );
      process.exit(1);
    }

    const provider = await AuthProviderFactory.createProvider(
      argv.provider,
      providerConfig as AuthProviderConfig,
    );

    const result = await provider.authenticateToken(argv.token);

    if (argv.format === "json") {
      logger.always(JSON.stringify(result, null, 2));
      return;
    }

    logger.always("");
    if (result.valid) {
      logger.always(chalk.green.bold("Token is VALID"));
      logger.always("");

      if (result.user) {
        logger.always(chalk.bold("User Information:"));
        logger.always(chalk.gray(`  ID:       ${result.user.id}`));
        if (result.user.email) {
          logger.always(chalk.gray(`  Email:    ${result.user.email}`));
        }
        if (result.user.name) {
          logger.always(chalk.gray(`  Name:     ${result.user.name}`));
        }
        if (result.user.roles.length > 0) {
          logger.always(
            chalk.gray(`  Roles:    ${result.user.roles.join(", ")}`),
          );
        }
        if (result.user.permissions.length > 0) {
          logger.always(
            chalk.gray(`  Permissions: ${result.user.permissions.join(", ")}`),
          );
        }
      }

      if (result.expiresAt) {
        logger.always("");
        logger.always(chalk.gray(`Expires: ${result.expiresAt.toISOString()}`));
      }

      if (result.tokenType) {
        logger.always(chalk.gray(`Token Type: ${result.tokenType}`));
      }
    } else {
      logger.always(chalk.red.bold("Token is INVALID"));
      if (result.error) {
        logger.always(chalk.red(`\nError: ${result.error}`));
      }
      process.exit(1);
    }
    logger.always("");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Token validation failed:", error);

    if (argv.format === "json") {
      logger.always(JSON.stringify({ valid: false, error: message }, null, 2));
    } else {
      logger.error(chalk.red(`\nValidation Error: ${message}\n`));
    }
    process.exit(1);
  }
}

/**
 * Handle 'auth health' command
 */
export async function handleHealthCommand(
  argv: ArgumentsCamelCase<AuthHealthArgs>,
): Promise<void> {
  try {
    const providerConfig = buildProviderConfig(argv);

    if (!providerConfig) {
      logger.error(
        chalk.red(
          `\nError: Missing required configuration for ${argv.provider} provider.\n`,
        ),
      );
      logger.always(
        chalk.gray(
          `Required: ${PROVIDER_INFO[argv.provider].requiredConfig.join(", ")}`,
        ),
      );
      logger.always(
        chalk.gray(
          "\nProvide via CLI options or environment variables (e.g., AUTH0_DOMAIN)",
        ),
      );
      process.exit(1);
    }

    const provider = await AuthProviderFactory.createProvider(
      argv.provider,
      providerConfig as AuthProviderConfig,
    );

    const health = await provider.healthCheck?.();

    if (!health) {
      logger.error(
        chalk.red(
          `\nProvider ${argv.provider} does not support health checks.\n`,
        ),
      );
      process.exit(1);
    }

    if (argv.format === "json") {
      logger.always(JSON.stringify(health, null, 2));
      return;
    }

    logger.always("");
    logger.always(chalk.bold(`Auth Provider Health: ${argv.provider}`));
    logger.always("");

    const statusIcon = health.healthy ? chalk.green("OK") : chalk.red("FAIL");
    logger.always(`  Overall Status:     ${statusIcon}`);
    logger.always(
      `  Provider Connected: ${health.providerConnected ? chalk.green("Yes") : chalk.red("No")}`,
    );
    logger.always(
      `  Session Storage:    ${health.sessionStorageHealthy ? chalk.green("Healthy") : chalk.red("Unhealthy")}`,
    );

    if (health.lastSuccessfulAuth) {
      logger.always(
        chalk.gray(
          `  Last Auth:          ${health.lastSuccessfulAuth.toISOString()}`,
        ),
      );
    }

    if (health.error) {
      logger.always(chalk.red(`\n  Error: ${health.error}`));
    }

    logger.always("");

    if (!health.healthy) {
      process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Health check failed:", error);

    if (argv.format === "json") {
      logger.always(
        JSON.stringify({ healthy: false, error: message }, null, 2),
      );
    } else {
      logger.error(chalk.red(`\nHealth Check Error: ${message}\n`));
    }
    process.exit(1);
  }
}

/**
 * Build provider configuration from CLI args and environment variables
 */
function buildProviderConfig(
  argv: ArgumentsCamelCase<AuthValidateArgs | AuthHealthArgs>,
): Record<string, unknown> | null {
  switch (argv.provider) {
    case "auth0": {
      const domain = argv.domain || process.env.AUTH0_DOMAIN;
      const clientId = argv.clientId || process.env.AUTH0_CLIENT_ID;
      if (!domain || !clientId) {
        return null;
      }
      return {
        type: argv.provider,
        domain,
        clientId,
        audience: process.env.AUTH0_AUDIENCE,
      };
    }

    case "clerk": {
      const secretKey = argv.secretKey || process.env.CLERK_SECRET_KEY;
      const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || "";
      if (!secretKey) {
        return null;
      }
      return {
        type: argv.provider,
        publishableKey,
        secretKey,
      };
    }

    case "supabase": {
      const url = argv.url || process.env.SUPABASE_URL;
      const anonKey = argv.anonKey || process.env.SUPABASE_ANON_KEY;
      if (!url || !anonKey) {
        return null;
      }
      return {
        type: argv.provider,
        url,
        anonKey,
        jwtSecret: process.env.SUPABASE_JWT_SECRET,
      };
    }

    case "firebase": {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      if (!projectId) {
        return null;
      }
      return {
        type: argv.provider,
        projectId,
        apiKey: process.env.FIREBASE_API_KEY,
      };
    }

    case "workos": {
      const apiKey = argv.apiKey || process.env.WORKOS_API_KEY;
      const clientId = argv.clientId || process.env.WORKOS_CLIENT_ID;
      if (!apiKey || !clientId) {
        return null;
      }
      return {
        type: argv.provider,
        apiKey,
        clientId,
      };
    }

    case "better-auth": {
      const secret = argv.secret || process.env.BETTER_AUTH_SECRET;
      const baseUrl = argv.url || process.env.BETTER_AUTH_BASE_URL;
      if (!secret || !baseUrl) {
        return null;
      }
      return {
        type: argv.provider,
        secret,
        baseUrl,
      };
    }

    case "oauth2": {
      const clientId = argv.clientId || process.env.OAUTH2_CLIENT_ID;
      const clientSecret = process.env.OAUTH2_CLIENT_SECRET;
      const authorizationUrl = process.env.OAUTH2_AUTHORIZATION_URL;
      const tokenUrl = process.env.OAUTH2_TOKEN_URL;
      if (!clientId || !authorizationUrl || !tokenUrl) {
        return null;
      }
      return {
        type: argv.provider,
        clientId,
        clientSecret,
        authorizationUrl,
        tokenUrl,
        userInfoUrl: process.env.OAUTH2_USERINFO_URL,
        jwksUrl: process.env.OAUTH2_JWKS_URL,
      };
    }

    case "cognito": {
      const userPoolId = process.env.COGNITO_USER_POOL_ID;
      const clientId = argv.clientId || process.env.COGNITO_CLIENT_ID;
      const region = process.env.COGNITO_REGION || process.env.AWS_REGION;
      if (!userPoolId || !clientId || !region) {
        return null;
      }
      return {
        type: argv.provider,
        userPoolId,
        clientId,
        region,
      };
    }

    case "keycloak": {
      const realm = process.env.KEYCLOAK_REALM;
      const serverUrl = argv.url || process.env.KEYCLOAK_SERVER_URL;
      const clientId = argv.clientId || process.env.KEYCLOAK_CLIENT_ID;
      if (!realm || !serverUrl || !clientId) {
        return null;
      }
      return {
        type: argv.provider,
        realm,
        serverUrl,
        clientId,
      };
    }

    case "jwt": {
      const secret = argv.secret || process.env.JWT_SECRET;
      const publicKey = process.env.JWT_PUBLIC_KEY;
      if (!secret && !publicKey) {
        return null;
      }
      return {
        type: argv.provider,
        secret,
        publicKey,
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
      };
    }

    case "custom": {
      // Custom provider requires a validateToken function which can't be
      // provided via CLI flags. Return null to show guidance message.
      return null;
    }

    default:
      return null;
  }
}
