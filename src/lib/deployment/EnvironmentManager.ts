/**
 * Environment Manager
 *
 * Manages environment variables for deployment across different
 * environments and platforms.
 *
 * @packageDocumentation
 * @module @neurolink/deployment
 */

import fs from "node:fs";
import path from "node:path";
import { logger } from "../utils/logger.js";
import { ConfigurationError, EnvironmentError } from "./DeploymentErrors.js";
import type { DeploymentPlatform, EnvironmentConfig, EnvironmentVariable } from "./types/deploymentTypes.js";

/**
 * Environment variable validation rule
 */
export interface ValidationRule {
  /** Regex pattern for validation */
  pattern?: RegExp;
  /** Required for deployment */
  required?: boolean;
  /** Default value if not provided */
  defaultValue?: string;
  /** Description of the variable */
  description?: string;
  /** Secret - should not be logged */
  secret?: boolean;
}

/**
 * Platform-specific environment requirements
 */
export const PLATFORM_ENV_REQUIREMENTS: Record<DeploymentPlatform, Record<string, ValidationRule>> = {
  vercel: {
    VERCEL_TOKEN: {
      required: false,
      secret: true,
      description: "Vercel API token for deployments",
    },
    VERCEL_ORG_ID: {
      required: false,
      description: "Vercel organization ID",
    },
    VERCEL_PROJECT_ID: {
      required: false,
      description: "Vercel project ID",
    },
  },
  cloudflare: {
    CLOUDFLARE_API_TOKEN: {
      required: false,
      secret: true,
      description: "Cloudflare API token",
    },
    CLOUDFLARE_ACCOUNT_ID: {
      required: false,
      description: "Cloudflare account ID",
    },
  },
  netlify: {
    NETLIFY_AUTH_TOKEN: {
      required: false,
      secret: true,
      description: "Netlify authentication token",
    },
    NETLIFY_SITE_ID: {
      required: false,
      description: "Netlify site ID",
    },
  },
  lambda: {
    AWS_ACCESS_KEY_ID: {
      required: false,
      secret: true,
      description: "AWS access key ID",
    },
    AWS_SECRET_ACCESS_KEY: {
      required: false,
      secret: true,
      description: "AWS secret access key",
    },
    AWS_REGION: {
      required: false,
      defaultValue: "us-east-1",
      description: "AWS region",
    },
  },
  docker: {
    DOCKER_REGISTRY: {
      required: false,
      description: "Docker registry URL",
    },
    DOCKER_USERNAME: {
      required: false,
      description: "Docker registry username",
    },
    DOCKER_PASSWORD: {
      required: false,
      secret: true,
      description: "Docker registry password",
    },
  },
  flyio: {
    FLY_API_TOKEN: {
      required: false,
      secret: true,
      description: "Fly.io API token",
    },
    FLY_APP: {
      required: false,
      description: "Fly.io application name",
    },
  },
};

/**
 * Common NeuroLink environment variables
 */
export const NEUROLINK_ENV_REQUIREMENTS: Record<string, ValidationRule> = {
  NEUROLINK_API_KEY: {
    required: false,
    secret: true,
    description: "NeuroLink API key for production",
  },
  NEUROLINK_ENV: {
    required: false,
    defaultValue: "production",
    description: "Environment name (development, staging, production)",
  },
  NEUROLINK_LOG_LEVEL: {
    required: false,
    defaultValue: "info",
    description: "Logging level",
  },
};

/**
 * Environment Manager
 *
 * Manages environment variables for deployments, including
 * validation, merging, and platform-specific handling.
 *
 * @example
 * ```typescript
 * const envManager = new EnvironmentManager();
 *
 * // Load from .env file
 * envManager.loadFromFile('.env.production');
 *
 * // Validate for platform
 * const validation = envManager.validateForPlatform('vercel');
 *
 * // Get deployment environment
 * const env = envManager.getDeploymentEnv('vercel');
 * ```
 */
export class EnvironmentManager {
  private variables: Map<string, EnvironmentVariable> = new Map();
  private environments: Map<string, EnvironmentConfig> = new Map();

  constructor() {
    // Load from process.env by default
    this.loadFromProcess();
  }

  /**
   * Load environment variables from process.env
   */
  loadFromProcess(): void {
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        this.set(key, value, {
          secret: this.isSecretVariable(key),
          scope: "all",
        });
      }
    }
  }

  /**
   * Load environment variables from a .env file
   */
  loadFromFile(filePath: string): void {
    const fullPath = path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      logger.warn(`Environment file not found: ${filePath}`);
      return;
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      // Parse KEY=value
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        this.set(key, value, {
          secret: this.isSecretVariable(key),
          scope: "all",
        });
      }
    }

    logger.debug(`Loaded environment from ${filePath}`);
  }

  /**
   * Set an environment variable
   */
  set(
    name: string,
    value: string,
    options?: {
      secret?: boolean;
      scope?: "build" | "runtime" | "all";
      description?: string;
    },
  ): void {
    this.variables.set(name, {
      name,
      value,
      secret: options?.secret ?? this.isSecretVariable(name),
      scope: options?.scope ?? "all",
      description: options?.description,
    });
  }

  /**
   * Get an environment variable
   */
  get(name: string): string | undefined {
    return this.variables.get(name)?.value;
  }

  /**
   * Get an environment variable or throw if missing
   */
  getRequired(name: string): string {
    const value = this.get(name);
    if (value === undefined) {
      throw new EnvironmentError(`Required environment variable missing: ${name}`, name, {
        required: true,
      });
    }
    return value;
  }

  /**
   * Check if a variable exists
   */
  has(name: string): boolean {
    return this.variables.has(name);
  }

  /**
   * Delete an environment variable
   */
  delete(name: string): boolean {
    return this.variables.delete(name);
  }

  /**
   * Get all environment variables
   */
  getAll(): EnvironmentVariable[] {
    return Array.from(this.variables.values());
  }

  /**
   * Get all variables as a Record
   */
  toRecord(options?: { includeSecrets?: boolean; scope?: "build" | "runtime" | "all" }): Record<string, string> {
    const result: Record<string, string> = {};

    for (const variable of this.variables.values()) {
      // Filter by scope
      if (options?.scope && options.scope !== "all" && variable.scope !== "all" && variable.scope !== options.scope) {
        continue;
      }

      // Handle secrets
      if (variable.secret && !options?.includeSecrets) {
        continue;
      }

      result[variable.name] = variable.value;
    }

    return result;
  }

  /**
   * Validate environment for a specific platform
   */
  validateForPlatform(platform: DeploymentPlatform): {
    valid: boolean;
    errors: Array<{ variable: string; message: string }>;
    warnings: Array<{ variable: string; message: string }>;
  } {
    const errors: Array<{ variable: string; message: string }> = [];
    const warnings: Array<{ variable: string; message: string }> = [];

    // Check platform-specific requirements
    const platformReqs = PLATFORM_ENV_REQUIREMENTS[platform];
    for (const [name, rule] of Object.entries(platformReqs)) {
      const value = this.get(name);

      if (rule.required && !value) {
        errors.push({
          variable: name,
          message: `Required environment variable missing: ${name}${rule.description ? ` (${rule.description})` : ""}`,
        });
      } else if (!value && rule.defaultValue) {
        this.set(name, rule.defaultValue, {
          secret: rule.secret,
          description: rule.description,
        });
        warnings.push({
          variable: name,
          message: `Using default value for ${name}: ${rule.defaultValue}`,
        });
      }

      if (value && rule.pattern && !rule.pattern.test(value)) {
        errors.push({
          variable: name,
          message: `Invalid format for ${name}`,
        });
      }
    }

    // Check NeuroLink requirements
    for (const [name, rule] of Object.entries(NEUROLINK_ENV_REQUIREMENTS)) {
      const value = this.get(name);

      if (rule.required && !value) {
        errors.push({
          variable: name,
          message: `Required NeuroLink variable missing: ${name}`,
        });
      } else if (!value && rule.defaultValue) {
        this.set(name, rule.defaultValue, {
          secret: rule.secret,
          description: rule.description,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get deployment environment for a platform
   */
  getDeploymentEnv(platform: DeploymentPlatform, additionalEnv?: Record<string, string>): Record<string, string> {
    // Start with all runtime variables (excluding secrets by default)
    const env = this.toRecord({ scope: "runtime", includeSecrets: true });

    // Add NeuroLink-prefixed variables
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith("NEUROLINK_") && value !== undefined) {
        env[key] = value;
      }
    }

    // Add additional env
    if (additionalEnv) {
      Object.assign(env, additionalEnv);
    }

    return env;
  }

  /**
   * Create an environment configuration
   */
  createEnvironment(name: string, variables: EnvironmentVariable[]): void {
    this.environments.set(name, {
      name,
      variables,
    });
  }

  /**
   * Get an environment configuration
   */
  getEnvironment(name: string): EnvironmentConfig | undefined {
    return this.environments.get(name);
  }

  /**
   * Switch to an environment
   */
  switchEnvironment(name: string): void {
    const env = this.environments.get(name);
    if (!env) {
      throw new ConfigurationError(`Environment not found: ${name}`, "environment");
    }

    // Clear current variables
    this.variables.clear();

    // Load environment variables
    for (const variable of env.variables) {
      this.variables.set(variable.name, variable);
    }

    // Apply inheritance
    if (env.inherits) {
      for (const inheritName of env.inherits) {
        const inheritEnv = this.environments.get(inheritName);
        if (inheritEnv) {
          for (const variable of inheritEnv.variables) {
            // Don't override existing variables
            if (!this.variables.has(variable.name)) {
              this.variables.set(variable.name, variable);
            }
          }
        }
      }
    }

    logger.info(`Switched to environment: ${name}`);
  }

  /**
   * Merge another EnvironmentManager's variables
   */
  merge(other: EnvironmentManager, overwrite: boolean = false): void {
    for (const variable of other.getAll()) {
      if (overwrite || !this.has(variable.name)) {
        this.variables.set(variable.name, variable);
      }
    }
  }

  /**
   * Export environment to .env format
   */
  toEnvFile(options?: { includeSecrets?: boolean }): string {
    const lines: string[] = [];
    lines.push("# Generated by NeuroLink Deployment System");
    lines.push(`# Generated at: ${new Date().toISOString()}`);
    lines.push("");

    for (const variable of this.variables.values()) {
      if (variable.secret && !options?.includeSecrets) {
        lines.push(`# ${variable.name}=<secret>`);
      } else {
        if (variable.description) {
          lines.push(`# ${variable.description}`);
        }
        lines.push(`${variable.name}=${variable.value}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Write environment to file
   */
  writeToFile(filePath: string, options?: { includeSecrets?: boolean }): void {
    const content = this.toEnvFile(options);
    const fullPath = path.resolve(process.cwd(), filePath);

    fs.writeFileSync(fullPath, content, "utf-8");
    logger.info(`Environment written to ${filePath}`);
  }

  /**
   * Check if a variable is marked as secret (public API)
   *
   * Returns true if the variable exists and is marked as a secret,
   * or if the variable name matches secret patterns.
   */
  isSecret(name: string): boolean {
    const variable = this.variables.get(name);
    if (variable) {
      return variable.secret === true;
    }
    // If variable not found, check by name pattern
    return this.isSecretVariable(name);
  }

  /**
   * Check if a variable name indicates it's a secret
   */
  private isSecretVariable(name: string): boolean {
    const secretPatterns = [/key$/i, /secret$/i, /password$/i, /token$/i, /auth$/i, /credential/i, /private/i];

    return secretPatterns.some((pattern) => pattern.test(name));
  }

  /**
   * Sanitize value for logging (hide secrets)
   */
  sanitizeForLogging(name: string, value: string): string {
    if (this.isSecretVariable(name)) {
      if (value.length <= 8) {
        return "****";
      }
      return `${value.slice(0, 4)}****${value.slice(-4)}`;
    }
    return value;
  }

  /**
   * Get summary for logging
   */
  getSummary(): string {
    const total = this.variables.size;
    const secrets = Array.from(this.variables.values()).filter((v) => v.secret).length;
    const build = Array.from(this.variables.values()).filter((v) => v.scope === "build" || v.scope === "all").length;
    const runtime = Array.from(this.variables.values()).filter(
      (v) => v.scope === "runtime" || v.scope === "all",
    ).length;

    return `Environment: ${total} variables (${secrets} secrets, ${build} build, ${runtime} runtime)`;
  }
}

// Export singleton instance
export const environmentManager = new EnvironmentManager();
