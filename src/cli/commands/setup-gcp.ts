#!/usr/bin/env node

/**
 * Google Vertex AI Setup Command
 *
 * Supports three authentication methods:
 * - Method 1: File Path (GOOGLE_APPLICATION_CREDENTIALS)
 * - Method 2: JSON String (GOOGLE_SERVICE_ACCOUNT_KEY)
 * - Method 3: Individual Vars (GOOGLE_AUTH_CLIENT_EMAIL + GOOGLE_AUTH_PRIVATE_KEY)
 *
 * All methods require GOOGLE_VERTEX_PROJECT
 * Optional: GOOGLE_VERTEX_LOCATION (defaults to 'us-central1')
 */

import fs from "fs";
import path from "path";
import os from "os";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";

type GCPSetupOptions = {
  checkOnly?: boolean;
  interactive?: boolean;
};

type GCPSetupArgv = {
  check?: boolean;
  nonInteractive?: boolean;
};

type AuthMethodStatus = {
  method1: {
    complete: boolean;
    hasCredentials: boolean;
    missingVars: string[];
  };
  method2: {
    complete: boolean;
    hasServiceAccountKey: boolean;
    missingVars: string[];
  };
  method3: {
    complete: boolean;
    hasClientEmail: boolean;
    hasPrivateKey: boolean;
    missingVars: string[];
  };
  common: {
    hasProject: boolean;
    hasLocation: boolean;
    missingVars: string[];
  };
};

enum AuthMethod {
  FILE_PATH = "file-path",
  JSON_STRING = "json-string",
  INDIVIDUAL_VARS = "individual-vars",
}

const AUTH_METHOD_NAMES = {
  [AuthMethod.FILE_PATH]: "Method 1: File Path",
  [AuthMethod.JSON_STRING]: "Method 2: JSON String",
  [AuthMethod.INDIVIDUAL_VARS]: "Method 3: Individual Vars",
};

export async function handleGCPSetup(argv: GCPSetupArgv): Promise<void> {
  try {
    const options: GCPSetupOptions = {
      checkOnly: argv.check || false,
      interactive: !argv.nonInteractive,
    };

    logger.always(chalk.blue("🔍 Checking environment..."));

    // Step 1: Detect current authentication method status
    const status = detectAuthMethodStatus();

    // Step 2: Display current status
    displayAuthStatus(status);

    // Check-only mode - show status and exit
    if (options.checkOnly) {
      const completeMethod = getCompleteMethod(status);
      if (completeMethod) {
        logger.always(
          chalk.green(
            "✅ Google Vertex setup complete with " +
              AUTH_METHOD_NAMES[completeMethod],
          ),
        );
        if (status.common.hasProject) {
          logger.always(`   Project: ${process.env.GOOGLE_VERTEX_PROJECT}`);
        }
        if (status.common.hasLocation) {
          logger.always(`   Location: ${process.env.GOOGLE_VERTEX_LOCATION}`);
        } else {
          logger.always(`   Location: us-central1 (default)`);
        }
      }
      return;
    }

    // Step 3: Check if any method is complete and offer to reconfigure
    const completeMethod = getCompleteMethod(status);
    if (completeMethod) {
      logger.always(
        chalk.green(
          "✅ Current setup: " +
            AUTH_METHOD_NAMES[completeMethod] +
            " (Complete)",
        ),
      );
      if (status.common.hasProject) {
        logger.always(`   Project: ${process.env.GOOGLE_VERTEX_PROJECT}`);
      }
      if (status.common.hasLocation) {
        logger.always(`   Location: ${process.env.GOOGLE_VERTEX_LOCATION}`);
      } else {
        logger.always(`   Location: us-central1 (default)`);
      }

      const { reconfigure } = await inquirer.prompt([
        {
          type: "confirm",
          name: "reconfigure",
          message:
            "Setup is already complete. Do you want to reconfigure or switch methods?",
          default: false,
        },
      ]);

      if (!reconfigure) {
        logger.always(chalk.blue("👍 Keeping existing configuration."));
        return;
      }
    }

    // Step 4: Interactive setup
    if (!options.interactive) {
      logger.always(chalk.yellow("⚠️  Non-interactive mode: setup incomplete"));
      return;
    }

    // Step 5: Method selection
    const selectedMethod = await selectAuthMethod(status);

    logger.always(
      chalk.blue(
        `👉 You selected ${AUTH_METHOD_NAMES[selectedMethod]}. Completing setup...`,
      ),
    );

    // Step 6: Prompt for missing values
    const config = await promptForMissingValues(selectedMethod, status);

    // Step 7: Update .env file
    await updateEnvFile(selectedMethod, config);

    // Step 8: Success message
    logger.always(
      chalk.green(
        `✅ Google Vertex setup complete with ${AUTH_METHOD_NAMES[selectedMethod]}`,
      ),
    );
    logger.always(`   Project: ${config.project}`);
    logger.always(`   Location: ${config.location || "us-central1"}`);
  } catch (error) {
    logger.error(chalk.red("❌ GCP setup failed:"));
    logger.error(
      chalk.red(error instanceof Error ? error.message : "Unknown error"),
    );
    process.exit(1);
  }
}

/**
 * Detect the current status of all authentication methods
 */
function detectAuthMethodStatus(): AuthMethodStatus {
  const hasCredentials = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const hasServiceAccountKey = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const hasClientEmail = !!process.env.GOOGLE_AUTH_CLIENT_EMAIL;
  const hasPrivateKey = !!process.env.GOOGLE_AUTH_PRIVATE_KEY;
  const hasProject = !!process.env.GOOGLE_VERTEX_PROJECT;
  const hasLocation = !!process.env.GOOGLE_VERTEX_LOCATION;

  const status: AuthMethodStatus = {
    method1: {
      complete: hasCredentials && hasProject,
      hasCredentials,
      missingVars: [],
    },
    method2: {
      complete: hasServiceAccountKey && hasProject,
      hasServiceAccountKey,
      missingVars: [],
    },
    method3: {
      complete: hasClientEmail && hasPrivateKey && hasProject,
      hasClientEmail,
      hasPrivateKey,
      missingVars: [],
    },
    common: {
      hasProject,
      hasLocation,
      missingVars: [],
    },
  };

  // Calculate missing variables for each method
  if (!hasCredentials) {
    status.method1.missingVars.push("GOOGLE_APPLICATION_CREDENTIALS");
  }
  if (!hasProject) {
    status.method1.missingVars.push("GOOGLE_VERTEX_PROJECT");
  }

  if (!hasServiceAccountKey) {
    status.method2.missingVars.push("GOOGLE_SERVICE_ACCOUNT_KEY");
  }
  if (!hasProject) {
    status.method2.missingVars.push("GOOGLE_VERTEX_PROJECT");
  }

  if (!hasClientEmail) {
    status.method3.missingVars.push("GOOGLE_AUTH_CLIENT_EMAIL");
  }
  if (!hasPrivateKey) {
    status.method3.missingVars.push("GOOGLE_AUTH_PRIVATE_KEY");
  }
  if (!hasProject) {
    status.method3.missingVars.push("GOOGLE_VERTEX_PROJECT");
  }

  if (!hasProject) {
    status.common.missingVars.push("GOOGLE_VERTEX_PROJECT");
  }

  return status;
}

/**
 * Display the current authentication status
 */
function displayAuthStatus(status: AuthMethodStatus): void {
  if (status.method1.complete) {
    logger.always(chalk.green("✔ Method 1: Complete"));
  } else if (status.method1.hasCredentials) {
    logger.always(
      chalk.yellow(
        `⚠ Method 1: Partially set (missing ${status.method1.missingVars.join(", ")})`,
      ),
    );
  } else {
    logger.always(chalk.red("✘ Method 1: Not set"));
  }

  if (status.method2.complete) {
    logger.always(chalk.green("✔ Method 2: Complete"));
  } else if (status.method2.hasServiceAccountKey) {
    logger.always(
      chalk.yellow(
        `⚠ Method 2: Partially set (missing ${status.method2.missingVars.join(", ")})`,
      ),
    );
  } else {
    logger.always(chalk.red("✘ Method 2: Not set"));
  }

  if (status.method3.complete) {
    logger.always(chalk.green("✔ Method 3: Complete"));
  } else if (status.method3.hasClientEmail || status.method3.hasPrivateKey) {
    logger.always(
      chalk.yellow(
        `⚠ Method 3: Partially set (missing ${status.method3.missingVars.join(", ")})`,
      ),
    );
  } else {
    logger.always(chalk.red("✘ Method 3: Not set"));
  }
}

/**
 * Check if any authentication method is complete
 */
function getCompleteMethod(status: AuthMethodStatus): AuthMethod | null {
  if (status.method1.complete) {
    return AuthMethod.FILE_PATH;
  }
  if (status.method2.complete) {
    return AuthMethod.JSON_STRING;
  }
  if (status.method3.complete) {
    return AuthMethod.INDIVIDUAL_VARS;
  }
  return null;
}

/**
 * Let user select authentication method
 */
async function selectAuthMethod(status: AuthMethodStatus): Promise<AuthMethod> {
  // Check for partially filled methods
  const partiallyFilledMethods: {
    method: AuthMethod;
    name: string;
    count: number;
  }[] = [];

  if (status.method1.hasCredentials && !status.method1.complete) {
    partiallyFilledMethods.push({
      method: AuthMethod.FILE_PATH,
      name: "Method 1",
      count: 1,
    });
  }

  if (status.method2.hasServiceAccountKey && !status.method2.complete) {
    partiallyFilledMethods.push({
      method: AuthMethod.JSON_STRING,
      name: "Method 2",
      count: 1,
    });
  }

  if (
    (status.method3.hasClientEmail || status.method3.hasPrivateKey) &&
    !status.method3.complete
  ) {
    const count =
      (status.method3.hasClientEmail ? 1 : 0) +
      (status.method3.hasPrivateKey ? 1 : 0);
    partiallyFilledMethods.push({
      method: AuthMethod.INDIVIDUAL_VARS,
      name: "Method 3",
      count,
    });
  }

  // If there's a partially filled method, suggest continuing with it
  if (partiallyFilledMethods.length > 0) {
    const partial = partiallyFilledMethods[0];
    const totalVars = partial.method === AuthMethod.INDIVIDUAL_VARS ? 2 : 1;

    logger.always(
      chalk.yellow(
        `\nYou already have ${partial.count}/${totalVars} values set for ${partial.name}.`,
      ),
    );

    const { continueWithPartial } = await inquirer.prompt([
      {
        type: "confirm",
        name: "continueWithPartial",
        message: `Do you want to continue with ${partial.name} or pick another method?`,
        default: true,
      },
    ]);

    if (continueWithPartial) {
      return partial.method;
    }
  }

  // Present method selection
  const { method } = await inquirer.prompt([
    {
      type: "list",
      name: "method",
      message: "Which authentication method would you like to use?",
      choices: [
        {
          name: "File Path (Recommended for local development)",
          value: AuthMethod.FILE_PATH,
        },
        {
          name: "JSON String (Good for containers/cloud)",
          value: AuthMethod.JSON_STRING,
        },
        {
          name: "Individual Vars (Good for CI/CD)",
          value: AuthMethod.INDIVIDUAL_VARS,
        },
      ],
    },
  ]);

  return method;
}

/**
 * Prompt user for missing values based on selected method
 */
async function promptForMissingValues(
  method: AuthMethod,
  status: AuthMethodStatus,
): Promise<{
  credentialsPath?: string;
  serviceAccountKey?: string;
  clientEmail?: string;
  privateKey?: string;
  project?: string;
  location?: string;
}> {
  const config: {
    credentialsPath?: string;
    serviceAccountKey?: string;
    clientEmail?: string;
    privateKey?: string;
    project?: string;
    location?: string;
  } = {};

  switch (method) {
    case AuthMethod.FILE_PATH:
      if (!status.method1.hasCredentials) {
        // Try to auto-detect ADC file first
        const adcPath = path.join(
          os.homedir(),
          ".config",
          "gcloud",
          "application_default_credentials.json",
        );

        if (fs.existsSync(adcPath)) {
          logger.always(
            chalk.green("✔ Found Application Default Credentials"),
          );
          logger.always(chalk.blue(`   Location: ${adcPath}`));
          config.credentialsPath = adcPath;
        } else {
          const { credentialsPath } = await inquirer.prompt([
            {
              type: "input",
              name: "credentialsPath",
              message:
                "Enter the path to your Google Cloud credentials JSON file:",
              validate: validateCredentialsFile,
              transformer: (input: string) => input.replace(/^~/, os.homedir()),
            },
          ]);

          config.credentialsPath = credentialsPath.replace(/^~/, os.homedir());
        }
      }
      break;

    case AuthMethod.JSON_STRING:
      if (!status.method2.hasServiceAccountKey) {
        const { serviceAccountKey } = await inquirer.prompt([
          {
            type: "password",
            mask: "*",
            name: "serviceAccountKey",
            message: "Enter your service account JSON as a string:",
            validate: validateServiceAccountJSON,
          },
        ]);

        config.serviceAccountKey = serviceAccountKey;
      }
      break;

    case AuthMethod.INDIVIDUAL_VARS:
      if (!status.method3.hasClientEmail) {
        const { clientEmail } = await inquirer.prompt([
          {
            type: "input",
            name: "clientEmail",
            message:
              "Enter your service account client email (format: name@project.iam.gserviceaccount.com):",
            validate: (input: string) => {
              if (!input.trim()) {
                return "Client email is required";
              }

              // Check for basic email format
              if (!input.includes("@")) {
                return "Invalid email format. Expected: service-account@project-id.iam.gserviceaccount.com";
              }

              // Check for Google service account domain
              if (!input.endsWith(".iam.gserviceaccount.com")) {
                return "Invalid service account email. Must end with '.iam.gserviceaccount.com'\nExample: my-service-account@my-project.iam.gserviceaccount.com";
              }

              // Validate the structure: name@project.iam.gserviceaccount.com
              const emailPattern =
                /^[a-z0-9-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com$/;
              if (!emailPattern.test(input.trim())) {
                return "Invalid format. Expected: service-account-name@project-id.iam.gserviceaccount.com\nExample: my-service-account@my-project-123.iam.gserviceaccount.com";
              }

              return true;
            },
          },
        ]);

        config.clientEmail = clientEmail.trim();
      }

      if (!status.method3.hasPrivateKey) {
        const { privateKey } = await inquirer.prompt([
          {
            type: "password",
            mask: "*",
            name: "privateKey",
            message: "Enter your service account private key:",
            validate: (input: string) => {
              if (!input.trim()) {
                return "Private key is required";
              }
              if (
                !input.includes("BEGIN PRIVATE KEY") ||
                !input.includes("END PRIVATE KEY")
              ) {
                return "Invalid private key format. Should include BEGIN and END markers.";
              }
              return true;
            },
          },
        ]);

        config.privateKey = privateKey.trim();
      }
      break;
  }

  // Always prompt for project if missing
  if (!status.common.hasProject) {
    const { project } = await inquirer.prompt([
      {
        type: "input",
        name: "project",
        message: "Enter your Google Cloud Project ID:",
        validate: (input: string) => {
          if (!input.trim()) {
            return "Project ID is required";
          }
          if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(input.trim())) {
            return "Invalid project ID format. Must be 6-30 characters, start with lowercase letter, contain only lowercase letters, numbers, and hyphens.";
          }
          return true;
        },
      },
    ]);

    config.project = project.trim();
  } else {
    config.project = process.env.GOOGLE_VERTEX_PROJECT;
  }

  // Always prompt for location if missing, with default
  if (!status.common.hasLocation) {
    const { location } = await inquirer.prompt([
      {
        type: "input",
        name: "location",
        message:
          "Enter your Google Vertex AI location (or 'global' for global endpoint):",
        default: "us-central1",
        validate: (input: string) => {
          if (!input.trim()) {
            return "Location is required";
          }
          return true;
        },
      },
    ]);

    config.location = location.trim();
  } else {
    config.location = process.env.GOOGLE_VERTEX_LOCATION;
  }

  return config;
}

/**
 * Validate credentials file path
 */
function validateCredentialsFile(input: string): boolean | string {
  if (!input.trim()) {
    return "Credentials path is required";
  }

  const expandedPath = input.replace(/^~/, os.homedir());
  if (!fs.existsSync(expandedPath)) {
    return `File not found: ${expandedPath}`;
  }

  try {
    const content = fs.readFileSync(expandedPath, "utf8");
    const parsed = JSON.parse(content);

    if (!parsed.client_email || !parsed.private_key) {
      return "Invalid service account file: missing client_email or private_key";
    }

    return true;
  } catch {
    return "Invalid JSON file";
  }
}

/**
 * Validate service account JSON string
 */
function validateServiceAccountJSON(input: string): boolean | string {
  if (!input.trim()) {
    return "Service account JSON is required";
  }

  try {
    const parsed = JSON.parse(input.trim());

    if (!parsed.client_email || !parsed.private_key) {
      return "Invalid service account JSON: missing client_email or private_key";
    }

    return true;
  } catch {
    return "Invalid JSON format";
  }
}

/**
 * Update .env file with selected authentication method
 */
async function updateEnvFile(
  method: AuthMethod,
  config: {
    credentialsPath?: string;
    serviceAccountKey?: string;
    clientEmail?: string;
    privateKey?: string;
    project?: string;
    location?: string;
  },
): Promise<void> {
  const envPath = path.join(process.cwd(), ".env");
  const spinner = ora("💾 Updating .env file...").start();

  try {
    let envContent = "";

    // Read existing .env file if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
    }

    // Parse existing environment variables
    const envLines = envContent.split("\n");
    const existingVars = new Map<string, string>();
    const otherLines: string[] = [];

    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const equalsIndex = trimmed.indexOf("=");
        if (equalsIndex > 0) {
          const key = trimmed.substring(0, equalsIndex);
          const value = trimmed.substring(equalsIndex + 1);
          existingVars.set(key, value);
        } else {
          otherLines.push(line);
        }
      } else {
        otherLines.push(line);
      }
    }

    // Remove all Google Vertex auth variables first (clean slate)
    existingVars.delete("GOOGLE_APPLICATION_CREDENTIALS");
    existingVars.delete("GOOGLE_SERVICE_ACCOUNT_KEY");
    existingVars.delete("GOOGLE_AUTH_CLIENT_EMAIL");
    existingVars.delete("GOOGLE_AUTH_PRIVATE_KEY");

    // Set variables for selected method
    switch (method) {
      case AuthMethod.FILE_PATH:
        if (config.credentialsPath) {
          existingVars.set(
            "GOOGLE_APPLICATION_CREDENTIALS",
            config.credentialsPath,
          );
        }
        break;

      case AuthMethod.JSON_STRING:
        if (config.serviceAccountKey) {
          existingVars.set(
            "GOOGLE_SERVICE_ACCOUNT_KEY",
            config.serviceAccountKey,
          );
        }
        break;

      case AuthMethod.INDIVIDUAL_VARS:
        if (config.clientEmail) {
          existingVars.set("GOOGLE_AUTH_CLIENT_EMAIL", config.clientEmail);
        }
        if (config.privateKey) {
          const escaped = config.privateKey
            .replace(/\r?\n/g, "\\n")
            .replace(/"/g, '\\"');
          existingVars.set("GOOGLE_AUTH_PRIVATE_KEY", `"${escaped}"`);
        }
        break;
    }

    // Always set project and location
    if (config.project) {
      existingVars.set("GOOGLE_VERTEX_PROJECT", config.project);
    }
    if (config.location) {
      existingVars.set("GOOGLE_VERTEX_LOCATION", config.location);
    }

    // Reconstruct .env content preserving structure
    const newEnvLines: string[] = [];

    // Add non-variable lines first (comments, empty lines)
    for (const line of otherLines) {
      newEnvLines.push(line);
    }

    // Add separator comment for Google Vertex if needed
    if (!envContent.includes("GOOGLE VERTEX AI CONFIGURATION")) {
      if (
        newEnvLines.length > 0 &&
        newEnvLines[newEnvLines.length - 1].trim()
      ) {
        newEnvLines.push("");
      }
      newEnvLines.push("# GOOGLE VERTEX AI CONFIGURATION");
    }

    // Add all environment variables
    for (const [key, value] of existingVars.entries()) {
      newEnvLines.push(`${key}=${value}`);
    }

    // Write updated content
    const finalContent =
      newEnvLines.join("\n") + (newEnvLines.length > 0 ? "\n" : "");
    fs.writeFileSync(envPath, finalContent, "utf8");

    spinner.succeed(chalk.green("✔ .env file updated successfully"));
  } catch (error) {
    spinner.fail(chalk.red("❌ Failed to update .env file"));
    logger.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
    throw error;
  }
}
