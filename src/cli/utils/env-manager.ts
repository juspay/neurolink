/**
 * Environment File Management Utilities for NeuroLink CLI
 *
 * Handles .env file operations including backup, update, and validation.
 */

import fs from "fs";
import chalk from "chalk";

export interface EnvBackupResult {
  backupPath?: string;
  existed: boolean;
}

export interface EnvUpdateResult {
  backup: EnvBackupResult;
  updated: string[];
  added: string[];
  unchanged: string[];
}

/**
 * Create a timestamped backup of the existing .env file
 */
export function backupEnvFile(envPath: string = ".env"): EnvBackupResult {
  const result: EnvBackupResult = {
    existed: false,
  };

  if (fs.existsSync(envPath)) {
    result.existed = true;

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .split(".")[0]; // Remove milliseconds

    const backupPath = `${envPath}.backup.${timestamp}`;

    try {
      fs.copyFileSync(envPath, backupPath);
      result.backupPath = backupPath;
    } catch (error) {
      throw new Error(
        `Failed to create backup: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return result;
}

/**
 * Parse .env file content into key-value pairs
 */
export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    // Find the first = character
    const equalIndex = trimmedLine.indexOf("=");
    if (equalIndex === -1) {
      continue; // Invalid line format
    }

    const key = trimmedLine.substring(0, equalIndex).trim();
    const value = trimmedLine.substring(equalIndex + 1).trim();

    // Remove surrounding quotes if present
    const cleanValue = value.replace(/^["']|["']$/g, "");

    result[key] = cleanValue;
  }

  return result;
}

/**
 * Generate .env file content from key-value pairs
 */
export function generateEnvContent(
  envVars: Record<string, string>,
  existingContent?: string,
): string {
  const lines: string[] = [];
  const existingVars = existingContent ? parseEnvFile(existingContent) : {};
  const processedKeys = new Set<string>();

  // If we have existing content, preserve its structure and comments
  if (existingContent) {
    const existingLines = existingContent.split("\n");

    for (const line of existingLines) {
      const trimmedLine = line.trim();

      // Preserve comments and empty lines
      if (!trimmedLine || trimmedLine.startsWith("#")) {
        lines.push(line);
        continue;
      }

      const equalIndex = trimmedLine.indexOf("=");
      if (equalIndex === -1) {
        lines.push(line); // Preserve invalid lines as-is
        continue;
      }

      const key = trimmedLine.substring(0, equalIndex).trim();

      if (Object.prototype.hasOwnProperty.call(envVars, key)) {
        // Update existing variable
        lines.push(`${key}=${envVars[key]}`);
        processedKeys.add(key);
      } else {
        // Preserve existing variable
        lines.push(line);
      }
    }
  }

  // Add new variables that weren't in the existing file
  const newVars = Object.keys(envVars).filter((key) => !processedKeys.has(key));
  if (newVars.length > 0) {
    if (lines.length > 0 && lines[lines.length - 1].trim() !== "") {
      lines.push(""); // Add blank line before new variables
    }
    if (!existingContent) {
      lines.push("# NeuroLink AI Provider Configuration");
    }

    for (const key of newVars) {
      lines.push(`${key}=${envVars[key]}`);
    }
  }

  return lines.join("\n") + (lines.length > 0 ? "\n" : "");
}

/**
 * Update .env file with new environment variables
 */
export function updateEnvFile(
  newVars: Record<string, string>,
  envPath: string = ".env",
  createBackup: boolean = true,
): EnvUpdateResult {
  const result: EnvUpdateResult = {
    backup: { existed: false },
    updated: [],
    added: [],
    unchanged: [],
  };

  // Create backup if requested and file exists
  if (createBackup) {
    result.backup = backupEnvFile(envPath);
  }

  // Read existing content
  let existingContent = "";
  let existingVars: Record<string, string> = {};

  if (fs.existsSync(envPath)) {
    existingContent = fs.readFileSync(envPath, "utf8");
    existingVars = parseEnvFile(existingContent);
  }

  // Categorize changes
  for (const [key, value] of Object.entries(newVars)) {
    if (Object.prototype.hasOwnProperty.call(existingVars, key)) {
      if (existingVars[key] !== value) {
        result.updated.push(key);
      } else {
        result.unchanged.push(key);
      }
    } else {
      result.added.push(key);
    }
  }

  // Generate new content
  const newContent = generateEnvContent(newVars, existingContent);

  // Write updated file
  try {
    fs.writeFileSync(envPath, newContent, "utf8");
  } catch (error) {
    throw new Error(
      `Failed to write .env file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return result;
}

/**
 * Display environment file update summary
 */
export function displayEnvUpdateSummary(
  result: EnvUpdateResult,
  quiet: boolean = false,
): void {
  if (quiet) {
    return;
  }

  if (result.backup.existed && result.backup.backupPath) {
    console.log(chalk.gray(`💾 Created backup: ${result.backup.backupPath}`));
  }

  if (result.added.length > 0) {
    console.log(
      chalk.green(
        `➕ Added ${result.added.length} new variables: ${result.added.join(", ")}`,
      ),
    );
  }

  if (result.updated.length > 0) {
    console.log(
      chalk.yellow(
        `🔄 Updated ${result.updated.length} existing variables: ${result.updated.join(", ")}`,
      ),
    );
  }

  if (result.unchanged.length > 0) {
    console.log(
      chalk.gray(
        `✓ ${result.unchanged.length} variables unchanged: ${result.unchanged.join(", ")}`,
      ),
    );
  }

  const totalChanges = result.added.length + result.updated.length;
  if (totalChanges > 0) {
    console.log(
      chalk.blue(`📝 Environment file updated with ${totalChanges} changes`),
    );
  } else {
    console.log(chalk.gray("📝 No changes needed to environment file"));
  }
}

/**
 * Validate .env file format and required variables
 */
export function validateEnvFile(
  envPath: string = ".env",
  requiredVars: string[] = [],
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  variables: Record<string, string>;
} {
  const result = {
    valid: true,
    errors: [] as string[],
    warnings: [] as string[],
    variables: {} as Record<string, string>,
  };

  if (!fs.existsSync(envPath)) {
    result.valid = false;
    result.errors.push(`Environment file not found: ${envPath}`);
    return result;
  }

  try {
    const content = fs.readFileSync(envPath, "utf8");
    result.variables = parseEnvFile(content);

    // Check for required variables
    for (const requiredVar of requiredVars) {
      if (
        !Object.prototype.hasOwnProperty.call(result.variables, requiredVar) ||
        !result.variables[requiredVar]
      ) {
        result.valid = false;
        result.errors.push(`Missing required variable: ${requiredVar}`);
      }
    }

    // Check for common formatting issues
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      if (!line.includes("=")) {
        result.warnings.push(`Line ${i + 1}: Invalid format (missing =)`);
      } else if (line.startsWith("=")) {
        result.warnings.push(`Line ${i + 1}: Empty variable name`);
      }
    }
  } catch (error) {
    result.valid = false;
    result.errors.push(
      `Failed to read environment file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return result;
}
