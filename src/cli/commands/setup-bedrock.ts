#!/usr/bin/env node

/**
 * AWS Bedrock Setup Command for New Developers
 *
 * Checks for AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
 * Auto-detects AWS CLI configuration, prompts for missing config, updates .env safely
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import { updateEnvFile as envUpdate } from "../utils/envManager.js";
import { getTopModelChoices } from "../../lib/utils/modelChoices.js";
import { AIProviderName } from "../../lib/types/index.js";

interface BedrockSetupOptions {
  checkOnly?: boolean;
  interactive?: boolean;
}

interface BedrockSetupArgv {
  check?: boolean;
  nonInteractive?: boolean;
}

interface ConfigData {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  model?: string;
}

interface ConfigStatus {
  hasAccessKey: boolean;
  hasSecretKey: boolean;
  hasRegion: boolean;
}

export async function handleBedrockSetup(
  argv: BedrockSetupArgv,
): Promise<void> {
  try {
    const options: BedrockSetupOptions = {
      checkOnly: argv.check || false,
      interactive: !argv.nonInteractive,
    };

    logger.always(
      chalk.blue("🔍 Checking for existing AWS Bedrock configuration..."),
    );

    const configStatus = checkExistingConfiguration();
    const config: ConfigData = {};

    // Handle existing credentials
    if (configStatus.hasAccessKey && configStatus.hasSecretKey) {
      const result = await handleExistingCredentials(
        configStatus,
        options,
        config,
      );
      if (result.shouldReturn) {
        return;
      }
    } else {
      displayCurrentStatus(configStatus);
      if (options.checkOnly) {
        return;
      }
    }

    // Auto-detect AWS CLI configuration
    await detectAndDisplayAWSConfig(configStatus, config);

    // Interactive credential setup
    if (options.interactive) {
      const setupResult = await handleInteractiveCredentialSetup(
        configStatus,
        config,
        options,
      );
      if (setupResult.shouldReturn) {
        return;
      }
    }

    // Model selection
    if (options.interactive) {
      await handleModelSelection(config);
    }

    // Update .env and show completion
    await finalizeSetup(config, options);
  } catch (error) {
    logger.error(chalk.red("❌ AWS Bedrock setup failed:"));
    logger.error(
      chalk.red(error instanceof Error ? error.message : "Unknown error"),
    );
    process.exit(1);
  }
}

async function detectAWSCredentials(): Promise<{
  accessKeyId?: string;
  secretAccessKey?: string;
}> {
  try {
    const credentialsPath = path.join(os.homedir(), ".aws", "credentials");

    if (!fs.existsSync(credentialsPath)) {
      return {};
    }

    const credentialsContent = fs.readFileSync(credentialsPath, "utf-8");

    // Parse AWS credentials file format
    const lines = credentialsContent.split("\n");
    let inDefaultProfile = false;
    const credentials: { [key: string]: string } = {};

    for (const line of lines) {
      const trimmed = line.trim();

      // Profile section headers
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        const currentProfile = trimmed.slice(1, -1);
        inDefaultProfile = currentProfile === "default";
        continue;
      }

      // Skip if not in default profile (for simplicity)
      if (!inDefaultProfile) {
        continue;
      }

      // Key-value pairs
      if (trimmed.includes("=")) {
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=").trim();
        credentials[key.trim()] = value;
      }
    }

    return {
      accessKeyId: credentials.aws_access_key_id,
      secretAccessKey: credentials.aws_secret_access_key,
    };
  } catch {
    // Silently fail - this is just auto-detection
    return {};
  }
}

async function detectAWSConfig(): Promise<{
  region?: string;
}> {
  try {
    const configPath = path.join(os.homedir(), ".aws", "config");

    if (!fs.existsSync(configPath)) {
      return {};
    }

    const configContent = fs.readFileSync(configPath, "utf-8");

    // Parse AWS config file format
    const lines = configContent.split("\n");
    let inDefaultProfile = false;
    const config: { [key: string]: string } = {};

    for (const line of lines) {
      const trimmed = line.trim();

      // Profile section headers - config uses [profile name] format except for default
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        const profileMatch = trimmed.match(/^\[(?:profile\s+)?(.+)\]$/);
        if (profileMatch) {
          const currentProfile = profileMatch[1];
          inDefaultProfile = currentProfile === "default";
        }
        continue;
      }

      // Skip if not in default profile
      if (!inDefaultProfile) {
        continue;
      }

      // Key-value pairs
      if (trimmed.includes("=")) {
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=").trim();
        config[key.trim()] = value;
      }
    }

    return {
      region: config.region,
    };
  } catch {
    // Silently fail - this is just auto-detection
    return {};
  }
}

function checkExistingConfiguration(): ConfigStatus {
  return {
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    hasRegion: !!process.env.AWS_REGION,
  };
}

function displayCurrentStatus(configStatus: ConfigStatus): void {
  if (configStatus.hasAccessKey) {
    logger.always(chalk.green("✔ AWS_ACCESS_KEY_ID found in environment"));
  } else {
    logger.always(chalk.red("✘ AWS_ACCESS_KEY_ID not found"));
  }

  if (configStatus.hasSecretKey) {
    logger.always(chalk.green("✔ AWS_SECRET_ACCESS_KEY found in environment"));
  } else {
    logger.always(chalk.red("✘ AWS_SECRET_ACCESS_KEY not found"));
  }

  if (configStatus.hasRegion) {
    logger.always(
      chalk.green(
        `✔ AWS_REGION found in environment: ${process.env.AWS_REGION}`,
      ),
    );
  } else {
    logger.always(
      chalk.yellow("⚠️  AWS_REGION not set (will default to us-east-1)"),
    );
  }
}

async function handleExistingCredentials(
  configStatus: ConfigStatus,
  options: BedrockSetupOptions,
  config: ConfigData,
): Promise<{ shouldReturn: boolean }> {
  logger.always(chalk.green("✔ AWS_ACCESS_KEY_ID found in environment"));
  logger.always(chalk.green("✔ AWS_SECRET_ACCESS_KEY found in environment"));
  logger.always(
    chalk.green(
      `✔ AWS_REGION: ${process.env.AWS_REGION || "us-east-1 (default)"}`,
    ),
  );

  if (options.checkOnly) {
    logger.always(
      chalk.green(
        "✅ Configuration check complete - credentials are available!",
      ),
    );
    return { shouldReturn: true };
  }

  if (options.interactive) {
    const { useExisting } = await inquirer.prompt([
      {
        type: "confirm",
        name: "useExisting",
        message:
          "AWS credentials detected. Do you want to use the existing credentials?",
        default: true,
      },
    ]);

    if (useExisting) {
      logger.always(chalk.green("✅ Using existing AWS credentials."));
      await handleModelSelection(config);
      await finalizeSetup(config, options);
      return { shouldReturn: true };
    } else {
      logger.always(chalk.blue("📝 Setting up new AWS credentials..."));
    }
  } else {
    logger.always(
      chalk.green("✅ Setup complete! Using existing AWS credentials."),
    );
    return { shouldReturn: true };
  }

  return { shouldReturn: false };
}

async function detectAndDisplayAWSConfig(
  configStatus: ConfigStatus,
  config: ConfigData,
): Promise<void> {
  if (!configStatus.hasAccessKey || !configStatus.hasSecretKey) {
    logger.always(chalk.blue("🔍 Checking for AWS CLI configuration..."));

    const awsCredentials = await detectAWSCredentials();

    if (!configStatus.hasAccessKey && awsCredentials.accessKeyId) {
      logger.always(
        chalk.green("✔ Found AWS_ACCESS_KEY_ID in AWS CLI configuration"),
      );
      config.accessKeyId = awsCredentials.accessKeyId;
    }

    if (!configStatus.hasSecretKey && awsCredentials.secretAccessKey) {
      logger.always(
        chalk.green("✔ Found AWS_SECRET_ACCESS_KEY in AWS CLI configuration"),
      );
      config.secretAccessKey = awsCredentials.secretAccessKey;
    }
  }

  if (!configStatus.hasRegion) {
    const awsConfig = await detectAWSConfig();
    if (awsConfig.region) {
      logger.always(
        chalk.green(
          `✔ Found AWS_REGION in AWS CLI configuration: ${awsConfig.region}`,
        ),
      );
      config.region = awsConfig.region;
    }
  }
}

async function handleInteractiveCredentialSetup(
  configStatus: ConfigStatus,
  config: ConfigData,
  _options: BedrockSetupOptions,
): Promise<{ shouldReturn: boolean }> {
  const isReconfiguring =
    configStatus.hasAccessKey && configStatus.hasSecretKey;

  // If no credentials found at all, offer choice of setup methods
  if (
    !configStatus.hasAccessKey &&
    !configStatus.hasSecretKey &&
    !config.accessKeyId &&
    !config.secretAccessKey
  ) {
    const setupMethod = await promptForSetupMethod();
    if (setupMethod === "terminal") {
      displayTerminalInstructions();
      return { shouldReturn: true };
    }
    logger.always(chalk.blue("📝 Setting up AWS credentials manually..."));
  }

  // Prompt for credentials
  await promptForCredentials(configStatus, config, isReconfiguring);
  return { shouldReturn: false };
}

async function promptForSetupMethod(): Promise<string> {
  logger.always("");
  logger.always(
    chalk.yellow("📋 No AWS credentials found. Choose your setup method:"),
  );
  logger.always("");
  logger.always(
    chalk.cyan("Option 1: Use temporary AWS credentials from AWS Console"),
  );
  logger.always("  - Go to AWS Console → IAM → Security credentials");
  logger.always("  - Create temporary credentials");
  logger.always("  - Export them in your terminal, then restart this command");
  logger.always("");
  logger.always(chalk.cyan("Option 2: Manually enter your credentials"));
  logger.always("  - Enter Access Key ID and Secret Access Key step by step");
  logger.always("");

  const { setupMethod } = await inquirer.prompt([
    {
      type: "list",
      name: "setupMethod",
      message: "How would you like to provide your AWS credentials?",
      choices: [
        {
          name: "Paste temporary credentials in terminal and restart",
          value: "terminal",
        },
        {
          name: "Manually enter credentials step by step",
          value: "manual",
        },
      ],
    },
  ]);

  return setupMethod;
}

function displayTerminalInstructions(): void {
  logger.always("");
  logger.always(chalk.blue("📝 Follow these steps:"));
  logger.always("");
  logger.always("1. Copy and paste these commands in your terminal:");
  logger.always(chalk.gray('   export AWS_ACCESS_KEY_ID="your-access-key-id"'));
  logger.always(
    chalk.gray('   export AWS_SECRET_ACCESS_KEY="your-secret-access-key"'),
  );
  logger.always(
    chalk.gray(
      '   export AWS_SESSION_TOKEN="your-session-token"  # if using temporary credentials',
    ),
  );
  logger.always(
    chalk.gray('   export AWS_REGION="your-preferred-region"  # optional'),
  );
  logger.always("");
  logger.always("2. Then run this command again:");
  logger.always(chalk.cyan("   pnpm cli setup-bedrock"));
  logger.always("");
  logger.always(
    chalk.green(
      "✅ Instructions provided! Set your credentials and restart the command.",
    ),
  );
}

async function promptForCredentials(
  configStatus: ConfigStatus,
  config: ConfigData,
  isReconfiguring: boolean,
): Promise<void> {
  // Prompt for access key
  if (isReconfiguring || (!configStatus.hasAccessKey && !config.accessKeyId)) {
    const { accessKey } = await inquirer.prompt([
      {
        type: "input",
        name: "accessKey",
        message: isReconfiguring
          ? `Enter your AWS Access Key ID ${configStatus.hasAccessKey ? "(replacing existing)" : ""}:`
          : "Enter your AWS Access Key ID:",
        validate: (input: string) => {
          if (!input.trim()) {
            return "AWS Access Key ID is required";
          }
          if (!input.startsWith("AKIA") && !input.startsWith("ASIA")) {
            return "AWS Access Key ID should start with AKIA or ASIA";
          }
          return true;
        },
      },
    ]);
    config.accessKeyId = accessKey.trim();
  }

  // Prompt for secret key
  if (
    isReconfiguring ||
    (!configStatus.hasSecretKey && !config.secretAccessKey)
  ) {
    const { secretKey } = await inquirer.prompt([
      {
        type: "password",
        name: "secretKey",
        message: isReconfiguring
          ? `Enter your AWS Secret Access Key ${configStatus.hasSecretKey ? "(replacing existing)" : ""}:`
          : "Enter your AWS Secret Access Key:",
        validate: (input: string) => {
          if (!input.trim()) {
            return "AWS Secret Access Key is required";
          }
          if (input.length < 20) {
            return "AWS Secret Access Key seems too short";
          }
          return true;
        },
      },
    ]);
    config.secretAccessKey = secretKey.trim();
  }

  // Prompt for region
  if (isReconfiguring || (!configStatus.hasRegion && !config.region)) {
    const { region } = await inquirer.prompt([
      {
        type: "input",
        name: "region",
        message: isReconfiguring
          ? `Enter your AWS Region ${configStatus.hasRegion ? "(current: " + process.env.AWS_REGION + ")" : "(or press Enter for us-east-1)"}:`
          : "Enter your AWS Region (or press Enter for us-east-1):",
        default: configStatus.hasRegion ? process.env.AWS_REGION : "us-east-1",
        validate: (input: string) => {
          const trimmed = input.trim();
          if (!trimmed) {
            return true; // Allow default
          }
          if (!/^[a-z0-9-]+$/.test(trimmed)) {
            return "AWS Region should contain only lowercase letters, numbers, and hyphens";
          }
          return true;
        },
      },
    ]);
    config.region =
      region.trim() ||
      (configStatus.hasRegion ? process.env.AWS_REGION : "us-east-1");
  }
}

async function handleModelSelection(config: ConfigData): Promise<void> {
  const hasModel = !!(
    process.env.BEDROCK_MODEL || process.env.BEDROCK_MODEL_ID
  );

  const { wantsCustomModel } = await inquirer.prompt([
    {
      type: "confirm",
      name: "wantsCustomModel",
      message: hasModel
        ? `Do you want to change the Bedrock model? (current: ${process.env.BEDROCK_MODEL || process.env.BEDROCK_MODEL_ID})`
        : "Do you want to specify a custom Bedrock model? (optional - will use default if not specified)",
      default: false,
    },
  ]);

  if (wantsCustomModel) {
    const { model } = await inquirer.prompt([
      {
        type: "list",
        name: "model",
        message: "Select a Bedrock model:",
        choices: getTopModelChoices(AIProviderName.BEDROCK, 5),
      },
    ]);

    if (model === "custom") {
      const { customModel } = await inquirer.prompt([
        {
          type: "input",
          name: "customModel",
          message: "Enter your custom Bedrock model ID or ARN:",
          validate: (input: string) => {
            if (!input.trim()) {
              return "Model ID/ARN is required";
            }
            return true;
          },
        },
      ]);
      config.model = customModel.trim();
    } else {
      config.model = model;
    }
  }
}

async function finalizeSetup(
  config: ConfigData,
  options: BedrockSetupOptions,
): Promise<void> {
  if (
    config.accessKeyId ||
    config.secretAccessKey ||
    config.region ||
    config.model
  ) {
    const newVars: Record<string, string> = {};
    if (config.accessKeyId) {
      newVars.AWS_ACCESS_KEY_ID = config.accessKeyId;
    }
    if (config.secretAccessKey) {
      newVars.AWS_SECRET_ACCESS_KEY = config.secretAccessKey;
    }
    if (config.region) {
      newVars.AWS_REGION = config.region;
    }
    if (config.model) {
      newVars.BEDROCK_MODEL_ID = config.model;
    }
    const spinner = ora("💾 Updating .env file...").start();
    try {
      const result = envUpdate(newVars, ".env", true);
      spinner.succeed(
        chalk.green(
          `✔ .env updated (added: ${result.added.length}, updated: ${result.updated.length})`,
        ),
      );
    } catch (e) {
      spinner.fail(chalk.red("❌ Failed to update .env file"));
      throw e;
    }

    logger.always(chalk.green("✅ Setup complete!"));
    if (config.accessKeyId) {
      logger.always(
        `   AWS_ACCESS_KEY_ID=${maskCredential(config.accessKeyId)}`,
      );
    }
    if (config.secretAccessKey) {
      logger.always(
        `   AWS_SECRET_ACCESS_KEY=${maskCredential(config.secretAccessKey)}`,
      );
    }
    if (config.region) {
      logger.always(`   AWS_REGION=${config.region}`);
    }
    if (config.model) {
      logger.always(`   BEDROCK_MODEL_ID=${config.model}`);
    }

    displayUsageExample();
  } else if (options.interactive && !options.checkOnly) {
    logger.always(chalk.green("✅ Setup complete!"));
    displayUsageExample();
  }
}

function displayUsageExample(): void {
  logger.always("");
  logger.always(
    chalk.green("🚀 You can now use AWS Bedrock with the NeuroLink CLI:"),
  );
  logger.always(
    chalk.cyan("   pnpm cli generate 'Hello from Bedrock!' --provider bedrock"),
  );
}

function maskCredential(credential: string): string {
  if (!credential || credential.length < 8) {
    return "****";
  }

  const start = credential.slice(0, 4);
  const end = credential.slice(-4);
  const middle = "*".repeat(Math.max(4, credential.length - 8));

  return `${start}${middle}${end}`;
}
