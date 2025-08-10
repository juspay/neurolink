#!/usr/bin/env node
/**
 * NeuroLink CLI Configuration Management
 *
 * Enhanced configuration system with interactive setup,
 * multi-profile support, and smart validation.
 */

import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import os from "os";
import chalk from "chalk";
import { z } from "zod";
import { CLI_LIMITS } from "../../lib/core/constants.js";

import { logger } from "../../lib/utils/logger.js";
// Configuration schema for validation
const ConfigSchema = z.object({
  defaultProvider: z
    .enum([
      "auto",
      "openai",
      "bedrock",
      "vertex",
      "anthropic",
      "azure",
      "google-ai",
      "huggingface",
      "ollama",
      "mistral",
    ])
    .default("auto"),
  providers: z
    .object({
      openai: z
        .object({
          apiKey: z.string().optional(),
          model: z.string().default("gpt-4"),
          baseURL: z.string().optional(),
        })
        .optional(),
      bedrock: z
        .object({
          region: z.string().optional(),
          accessKeyId: z.string().optional(),
          secretAccessKey: z.string().optional(),
          sessionToken: z.string().optional(),
          model: z
            .string()
            .default(
              "arn:aws:bedrock:us-east-2:225681119357:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0",
            ),
        })
        .optional(),
      vertex: z
        .object({
          projectId: z.string().optional(),
          location: z.string().default("us-east5"),
          credentials: z.string().optional(),
          serviceAccountKey: z.string().optional(),
          clientEmail: z.string().optional(),
          privateKey: z.string().optional(),
          model: z.string().default("gemini-2.5-pro"),
        })
        .optional(),
      anthropic: z
        .object({
          apiKey: z.string().optional(),
          model: z.string().default("claude-3-5-sonnet-20241022"),
        })
        .optional(),
      azure: z
        .object({
          apiKey: z.string().optional(),
          endpoint: z.string().optional(),
          deploymentId: z.string().optional(),
          model: z.string().default("gpt-4"),
        })
        .optional(),
      "google-ai": z
        .object({
          apiKey: z.string().optional(),
          model: z.string().default("gemini-2.5-pro"),
        })
        .optional(),
      huggingface: z
        .object({
          apiKey: z.string().optional(),
          model: z.string().default("microsoft/DialoGPT-large"),
        })
        .optional(),
      ollama: z
        .object({
          baseUrl: z.string().default("http://localhost:11434"),
          model: z.string().default("llama2"),
          timeout: z.number().default(60000),
        })
        .optional(),
      mistral: z
        .object({
          apiKey: z.string().optional(),
          model: z.string().default("mistral-small"),
        })
        .optional(),
    })
    .default({}),
  profiles: z.record(z.string(), z.any()).default({}),
  preferences: z
    .object({
      outputFormat: z.enum(["text", "json", "yaml"]).default("text"),
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z
        .number()
        .min(CLI_LIMITS.maxTokens.min)
        .max(CLI_LIMITS.maxTokens.max)
        .default(CLI_LIMITS.maxTokens.default),
      enableLogging: z.boolean().default(false),
      enableCaching: z.boolean().default(true),
      cacheStrategy: z.enum(["memory", "file", "redis"]).default("memory"),
      defaultEvaluationDomain: z.string().optional(),
      enableAnalyticsByDefault: z.boolean().default(false),
      enableEvaluationByDefault: z.boolean().default(false),
    })
    .default({}),
  domains: z
    .object({
      healthcare: z
        .object({
          evaluationCriteria: z
            .array(z.string())
            .default(["accuracy", "safety", "compliance", "clarity"]),
          analyticsConfig: z
            .object({
              trackPatientData: z.boolean().default(false),
              trackDiagnosticAccuracy: z.boolean().default(true),
              trackTreatmentOutcomes: z.boolean().default(true),
            })
            .default({}),
        })
        .default({}),
      analytics: z
        .object({
          evaluationCriteria: z
            .array(z.string())
            .default(["accuracy", "relevance", "completeness", "insight"]),
          analyticsConfig: z
            .object({
              trackDataQuality: z.boolean().default(true),
              trackModelPerformance: z.boolean().default(true),
              trackBusinessImpact: z.boolean().default(true),
            })
            .default({}),
        })
        .default({}),
      finance: z
        .object({
          evaluationCriteria: z
            .array(z.string())
            .default([
              "accuracy",
              "risk-awareness",
              "compliance",
              "timeliness",
            ]),
          analyticsConfig: z
            .object({
              trackRiskMetrics: z.boolean().default(true),
              trackRegulatory: z.boolean().default(true),
              trackPortfolioImpact: z.boolean().default(false),
            })
            .default({}),
        })
        .default({}),
      ecommerce: z
        .object({
          evaluationCriteria: z
            .array(z.string())
            .default([
              "conversion-potential",
              "user-experience",
              "revenue-impact",
              "practicality",
            ]),
          analyticsConfig: z
            .object({
              trackConversions: z.boolean().default(true),
              trackUserBehavior: z.boolean().default(true),
              trackRevenueImpact: z.boolean().default(true),
            })
            .default({}),
        })
        .default({}),
    })
    .default({}),
});

export type NeuroLinkConfig = z.infer<typeof ConfigSchema>;

export class ConfigManager {
  private configDir: string;
  private configFile: string;
  private config: NeuroLinkConfig;

  constructor() {
    this.configDir = path.join(os.homedir(), ".neurolink");
    this.configFile = path.join(this.configDir, "config.json");
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from file or create default
   */
  private loadConfig(): NeuroLinkConfig {
    try {
      if (fs.existsSync(this.configFile)) {
        const configData = JSON.parse(fs.readFileSync(this.configFile, "utf8"));
        return ConfigSchema.parse(configData);
      }
    } catch (error) {
      logger.warn(
        chalk.yellow(
          `⚠️  Invalid config file: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
      );
    }

    return ConfigSchema.parse({});
  }

  /**
   * Save configuration to file
   */
  private saveConfig(): void {
    try {
      // Ensure config directory exists
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      // Validate before saving
      const validatedConfig = ConfigSchema.parse(this.config);

      fs.writeFileSync(
        this.configFile,
        JSON.stringify(validatedConfig, null, 2),
      );
      logger.always(
        chalk.green(`✅ Configuration saved to ${this.configFile}`),
      );
    } catch (error) {
      logger.error(
        chalk.red(
          `❌ Failed to save config: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
      );
      process.exit(1);
    }
  }

  /**
   * Interactive configuration setup
   */
  async initInteractive(): Promise<void> {
    logger.always(chalk.blue("🧠 NeuroLink Configuration Setup\n"));

    try {
      // Basic preferences
      const preferences = await inquirer.prompt([
        {
          type: "list",
          name: "defaultProvider",
          message: "Select your default AI provider:",
          choices: [
            {
              name: "Auto (recommended) - Automatically select best available",
              value: "auto",
            },
            { name: "OpenAI - GPT models", value: "openai" },
            { name: "Amazon Bedrock - Claude, Llama, Titan", value: "bedrock" },
            { name: "Google Vertex AI - Gemini models", value: "vertex" },
            { name: "Anthropic - Claude models (direct)", value: "anthropic" },
            { name: "Azure OpenAI - Enterprise GPT", value: "azure" },
            {
              name: "Google AI Studio - Gemini models (direct)",
              value: "google-ai",
            },
            { name: "Hugging Face - Open source models", value: "huggingface" },
            {
              name: "Mistral AI - European AI with competitive pricing",
              value: "mistral",
            },
          ],
          default: this.config.defaultProvider,
        },
        {
          type: "list",
          name: "outputFormat",
          message: "Preferred output format:",
          choices: ["text", "json", "yaml"],
          default: this.config.preferences.outputFormat,
        },
        {
          type: "number",
          name: "temperature",
          message: "Default creativity level (0.0 = focused, 1.0 = creative):",
          default: this.config.preferences.temperature,
          validate: (value: number) => value >= 0 && value <= 2,
        },
        {
          type: "list",
          name: "defaultEvaluationDomain",
          message: "Default evaluation domain (optional):",
          choices: [
            { name: "None (manual selection)", value: undefined },
            { name: "Healthcare", value: "healthcare" },
            { name: "Analytics", value: "analytics" },
            { name: "Finance", value: "finance" },
            { name: "E-commerce", value: "ecommerce" },
          ],
          default: this.config.preferences.defaultEvaluationDomain,
        },
        {
          type: "confirm",
          name: "enableAnalyticsByDefault",
          message: "Enable analytics by default?",
          default: this.config.preferences.enableAnalyticsByDefault,
        },
        {
          type: "confirm",
          name: "enableEvaluationByDefault",
          message: "Enable evaluation by default?",
          default: this.config.preferences.enableEvaluationByDefault,
        },
        {
          type: "confirm",
          name: "setupProviders",
          message: "Would you like to configure provider credentials now?",
          default: true,
        },
      ]);

      // Update config with preferences
      this.config.defaultProvider = preferences.defaultProvider;
      this.config.preferences.outputFormat = preferences.outputFormat;
      this.config.preferences.temperature = preferences.temperature;
      this.config.preferences.defaultEvaluationDomain =
        preferences.defaultEvaluationDomain;
      this.config.preferences.enableAnalyticsByDefault =
        preferences.enableAnalyticsByDefault;
      this.config.preferences.enableEvaluationByDefault =
        preferences.enableEvaluationByDefault;

      // Setup providers if requested
      if (preferences.setupProviders) {
        await this.setupProviders();
      }

      this.saveConfig();

      logger.always(chalk.green("\n✅ Configuration setup complete!"));
      logger.always(
        chalk.blue(
          "💡 You can modify settings anytime with: neurolink config edit",
        ),
      );
      logger.always(chalk.blue("💡 Test your setup with: neurolink status"));
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "User force closed the prompt with 0 null"
      ) {
        logger.always(chalk.yellow("\n⚠️  Setup cancelled by user"));
        process.exit(0);
      }
      throw error;
    }
  }

  /**
   * Setup individual providers
   */
  private async setupProviders(): Promise<void> {
    const { selectedProviders } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selectedProviders",
        message: "Select providers to configure:",
        choices: [
          { name: "OpenAI (GPT-4, GPT-3.5)", value: "openai" },
          { name: "Amazon Bedrock (Claude, Llama)", value: "bedrock" },
          { name: "Google Vertex AI (Gemini)", value: "vertex" },
          { name: "Anthropic Direct (Claude)", value: "anthropic" },
          { name: "Azure OpenAI (Enterprise)", value: "azure" },
          { name: "Google AI Studio (Gemini Direct)", value: "google-ai" },
          { name: "Hugging Face (Open Source)", value: "huggingface" },
          { name: "Ollama (Local AI Models)", value: "ollama" },
          { name: "Mistral AI (European AI)", value: "mistral" },
        ],
      },
    ]);

    for (const provider of selectedProviders) {
      await this.setupProvider(provider);
    }
  }

  /**
   * Setup individual provider
   */
  private async setupProvider(provider: string): Promise<void> {
    logger.always(chalk.blue(`\n🔧 Configuring ${provider.toUpperCase()}`));

    switch (provider) {
      case "openai":
        await this.setupOpenAI();
        break;
      case "bedrock":
        await this.setupBedrock();
        break;
      case "vertex":
        await this.setupVertex();
        break;
      case "anthropic":
        await this.setupAnthropic();
        break;
      case "azure":
        await this.setupAzure();
        break;
      case "google-ai":
        await this.setupGoogleAI();
        break;
      case "huggingface":
        await this.setupHuggingFace();
        break;
      case "ollama":
        await this.setupOllama();
        break;
      case "mistral":
        await this.setupMistral();
        break;
    }
  }

  /**
   * OpenAI provider setup
   */
  private async setupOpenAI(): Promise<void> {
    const answers = await inquirer.prompt([
      {
        type: "password",
        name: "apiKey",
        message: "OpenAI API Key (sk-...):",
        validate: (value: string) =>
          value.startsWith("sk-") || 'API key should start with "sk-"',
      },
      {
        type: "list",
        name: "model",
        message: "Default model:",
        choices: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
        default: "gpt-4",
      },
      {
        type: "input",
        name: "baseURL",
        message: "Custom base URL (optional):",
        default: "",
      },
    ]);

    this.config.providers.openai = {
      apiKey: answers.apiKey,
      model: answers.model,
      ...(answers.baseURL && { baseURL: answers.baseURL }),
    };
  }

  /**
   * Amazon Bedrock provider setup
   */
  private async setupBedrock(): Promise<void> {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "region",
        message: "AWS Region:",
        default: "us-east-1",
      },
      {
        type: "input",
        name: "accessKeyId",
        message: "AWS Access Key ID (optional if using IAM roles):",
      },
      {
        type: "password",
        name: "secretAccessKey",
        message: "AWS Secret Access Key (optional if using IAM roles):",
      },
      {
        type: "password",
        name: "sessionToken",
        message: "AWS Session Token (optional):",
      },
      {
        type: "input",
        name: "model",
        message: "Model ARN:",
        default:
          "arn:aws:bedrock:us-east-2:225681119357:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0",
      },
    ]);

    this.config.providers.bedrock = {
      region: answers.region,
      ...(answers.accessKeyId && { accessKeyId: answers.accessKeyId }),
      ...(answers.secretAccessKey && {
        secretAccessKey: answers.secretAccessKey,
      }),
      ...(answers.sessionToken && { sessionToken: answers.sessionToken }),
      model: answers.model,
    };
  }

  /**
   * Google Vertex AI provider setup
   */
  private async setupVertex(): Promise<void> {
    const { authMethod } = await inquirer.prompt([
      {
        type: "list",
        name: "authMethod",
        message: "Authentication method:",
        choices: [
          { name: "Service Account File", value: "file" },
          { name: "Service Account JSON String", value: "json" },
          { name: "Individual Environment Variables", value: "env" },
        ],
      },
    ]);

    const commonAnswers = await inquirer.prompt([
      {
        type: "input",
        name: "projectId",
        message: "Google Cloud Project ID:",
        validate: (value: string) =>
          value.length > 0 || "Project ID is required",
      },
      {
        type: "input",
        name: "location",
        message: "Vertex AI Location:",
        default: "us-east5",
      },
      {
        type: "list",
        name: "model",
        message: "Default model:",
        choices: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-pro"],
        default: "gemini-2.5-pro",
      },
    ]);

    let authConfig = {};

    switch (authMethod) {
      case "file": {
        const fileAnswers = await inquirer.prompt([
          {
            type: "input",
            name: "credentials",
            message: "Path to service account JSON file:",
            validate: (value: string) =>
              fs.existsSync(value) || "File does not exist",
          },
        ]);
        authConfig = { credentials: fileAnswers.credentials };
        break;
      }

      case "json": {
        const jsonAnswers = await inquirer.prompt([
          {
            type: "input",
            name: "serviceAccountKey",
            message: "Service account JSON string:",
            validate: (value: string) => {
              try {
                JSON.parse(value);
                return true;
              } catch {
                return "Invalid JSON";
              }
            },
          },
        ]);
        authConfig = { serviceAccountKey: jsonAnswers.serviceAccountKey };
        break;
      }

      case "env": {
        const envAnswers = await inquirer.prompt([
          {
            type: "input",
            name: "clientEmail",
            message: "Service account email:",
            validate: (value: string) =>
              value.includes("@") || "Invalid email format",
          },
          {
            type: "password",
            name: "privateKey",
            message: "Private key:",
          },
        ]);
        authConfig = {
          clientEmail: envAnswers.clientEmail,
          privateKey: envAnswers.privateKey,
        };
        break;
      }
    }

    this.config.providers.vertex = {
      projectId: commonAnswers.projectId,
      location: commonAnswers.location,
      model: commonAnswers.model,
      ...authConfig,
    };
  }

  /**
   * Anthropic provider setup
   */
  private async setupAnthropic(): Promise<void> {
    const answers = await inquirer.prompt([
      {
        type: "password",
        name: "apiKey",
        message: "Anthropic API Key:",
        validate: (value: string) => value.length > 0 || "API key is required",
      },
      {
        type: "list",
        name: "model",
        message: "Default model:",
        choices: [
          "claude-3-5-sonnet-20241022",
          "claude-3-5-haiku-20241022",
          "claude-3-opus-20240229",
        ],
        default: "claude-3-5-sonnet-20241022",
      },
    ]);

    this.config.providers.anthropic = answers;
  }

  /**
   * Azure OpenAI provider setup
   */
  private async setupAzure(): Promise<void> {
    const answers = await inquirer.prompt([
      {
        type: "password",
        name: "apiKey",
        message: "Azure OpenAI API Key:",
      },
      {
        type: "input",
        name: "endpoint",
        message: "Azure OpenAI Endpoint:",
        validate: (value: string) =>
          value.startsWith("https://") || "Endpoint should start with https://",
      },
      {
        type: "input",
        name: "deploymentId",
        message: "Deployment ID:",
      },
      {
        type: "list",
        name: "model",
        message: "Model:",
        choices: ["gpt-4", "gpt-4-turbo", "gpt-35-turbo"],
        default: "gpt-4",
      },
    ]);

    this.config.providers.azure = answers;
  }

  /**
   * Google AI Studio provider setup
   */
  private async setupGoogleAI(): Promise<void> {
    const answers = await inquirer.prompt([
      {
        type: "password",
        name: "apiKey",
        message: "Google AI API Key:",
        validate: (value: string) => value.length > 0 || "API key is required",
      },
      {
        type: "list",
        name: "model",
        message: "Default model:",
        choices: ["gemini-2.5-pro", "gemini-2.5-flash"],
        default: "gemini-2.5-pro",
      },
    ]);

    this.config.providers["google-ai"] = answers;
  }

  /**
   * Hugging Face provider setup
   */
  private async setupHuggingFace(): Promise<void> {
    const answers = await inquirer.prompt([
      {
        type: "password",
        name: "apiKey",
        message: "Hugging Face API Key:",
      },
      {
        type: "input",
        name: "model",
        message: "Model name:",
        default: "microsoft/DialoGPT-large",
      },
    ]);

    this.config.providers.huggingface = answers;
  }

  /**
   * Ollama provider setup
   */
  private async setupOllama(): Promise<void> {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "baseUrl",
        message: "Ollama base URL:",
        default: "http://localhost:11434",
        validate: (value: string) =>
          value.startsWith("http") ||
          "URL should start with http:// or https://",
      },
      {
        type: "input",
        name: "model",
        message: "Default model:",
        default: "llama2",
      },
      {
        type: "number",
        name: "timeout",
        message: "Request timeout (milliseconds):",
        default: 60000,
        validate: (value: number) => value > 0 || "Timeout must be positive",
      },
    ]);

    this.config.providers.ollama = answers;
  }

  /**
   * Mistral AI provider setup
   */
  private async setupMistral(): Promise<void> {
    const answers = await inquirer.prompt([
      {
        type: "password",
        name: "apiKey",
        message: "Mistral AI API Key:",
        validate: (value: string) => value.length > 0 || "API key is required",
      },
      {
        type: "list",
        name: "model",
        message: "Default model:",
        choices: [
          "mistral-small",
          "mistral-medium",
          "mistral-large",
          "mistral-tiny",
        ],
        default: "mistral-small",
      },
    ]);

    this.config.providers.mistral = answers;
  }

  /**
  /**
   * Get current configuration
   */
  getConfig(): NeuroLinkConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<NeuroLinkConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  /**
   * Show current configuration
   */
  showConfig(): void {
    logger.always(chalk.blue("📋 Current NeuroLink Configuration\n"));

    logger.always(chalk.cyan("General Settings:"));
    logger.always(
      `  Default Provider: ${chalk.white(this.config.defaultProvider)}`,
    );
    logger.always(
      `  Output Format: ${chalk.white(this.config.preferences.outputFormat)}`,
    );
    logger.always(
      `  Temperature: ${chalk.white(this.config.preferences.temperature)}`,
    );
    logger.always(
      `  Max Tokens: ${chalk.white(this.config.preferences.maxTokens)}`,
    );
    logger.always(
      `  Default Evaluation Domain: ${chalk.white(this.config.preferences.defaultEvaluationDomain || "None")}`,
    );
    logger.always(
      `  Analytics by Default: ${chalk.white(this.config.preferences.enableAnalyticsByDefault)}`,
    );
    logger.always(
      `  Evaluation by Default: ${chalk.white(this.config.preferences.enableEvaluationByDefault)}`,
    );

    logger.always(chalk.cyan("\nConfigured Providers:"));

    Object.entries(this.config.providers).forEach(([name, config]) => {
      if (config && Object.keys(config).length > 0) {
        logger.always(`  ${chalk.green("✅")} ${name.toUpperCase()}`);
        if ("model" in config) {
          logger.always(`    Model: ${chalk.white(config.model)}`);
        }
      }
    });

    logger.always(chalk.cyan("\nConfigured Domains:"));

    Object.entries(this.config.domains).forEach(([name, config]) => {
      if (config && Object.keys(config).length > 0) {
        logger.always(`  ${chalk.green("✅")} ${name.toUpperCase()}`);
        if (config.evaluationCriteria && config.evaluationCriteria.length > 0) {
          logger.always(
            `    Evaluation Criteria: ${chalk.white(config.evaluationCriteria.join(", "))}`,
          );
        }
        if (config.analyticsConfig) {
          const analyticsEnabled = Object.values(config.analyticsConfig).some(
            Boolean,
          );
          logger.always(
            `    Analytics: ${chalk.white(analyticsEnabled ? "Configured" : "Disabled")}`,
          );
        }
      }
    });

    logger.always(chalk.cyan("\nConfiguration File:"));
    logger.always(`  Location: ${chalk.white(this.configFile)}`);
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      ConfigSchema.parse(this.config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(
          ...error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        );
      }
    }

    // Check for at least one configured provider
    const hasProvider = Object.values(this.config.providers).some(
      (provider) => provider && Object.keys(provider).length > 0,
    );

    if (!hasProvider) {
      errors.push(
        'No providers configured. Run "neurolink config init" to set up providers.',
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig(): void {
    this.config = ConfigSchema.parse({});
    this.saveConfig();
    logger.always(chalk.green("✅ Configuration reset to defaults"));
  }
}

// Export for use in other CLI commands
export const configManager = new ConfigManager();
