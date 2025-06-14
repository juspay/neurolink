/**
 * Interactive Setup Utilities for NeuroLink CLI
 *
 * Provides interactive configuration wizard with provider selection,
 * credential collection, testing, and environment file management.
 */

import { AIProviderName } from "../../lib/core/types.js";
import { NeuroLink } from "../../lib/neurolink.js";
import chalk from "chalk";
import ora from "ora";

// Provider configuration definitions
export interface ProviderConfig {
  id: AIProviderName;
  name: string;
  description: string;
  envVars: Array<{
    key: string;
    prompt: string;
    secure?: boolean;
    default?: string;
    optional?: boolean;
  }>;
}

export const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    id: AIProviderName.OPENAI,
    name: "OpenAI",
    description: "GPT-4, GPT-3.5, and other OpenAI models",
    envVars: [
      {
        key: "OPENAI_API_KEY",
        prompt: "OpenAI API Key (sk-...)",
        secure: true,
      },
    ],
  },
  {
    id: AIProviderName.GOOGLE_AI,
    name: "Google AI Studio",
    description: "Gemini models via Google AI Studio",
    envVars: [
      {
        key: "GOOGLE_AI_API_KEY",
        prompt: "Google AI Studio API Key (AIza-...)",
        secure: true,
      },
    ],
  },
  {
    id: AIProviderName.ANTHROPIC,
    name: "Anthropic",
    description: "Claude models via Anthropic API",
    envVars: [
      {
        key: "ANTHROPIC_API_KEY",
        prompt: "Anthropic API Key (sk-ant-...)",
        secure: true,
      },
    ],
  },
  {
    id: AIProviderName.BEDROCK,
    name: "AWS Bedrock",
    description: "Claude, Llama, and other models via AWS Bedrock",
    envVars: [
      { key: "AWS_ACCESS_KEY_ID", prompt: "AWS Access Key ID", secure: false },
      {
        key: "AWS_SECRET_ACCESS_KEY",
        prompt: "AWS Secret Access Key",
        secure: true,
      },
      {
        key: "AWS_REGION",
        prompt: "AWS Region",
        default: "us-east-1",
        secure: false,
      },
    ],
  },
  {
    id: AIProviderName.VERTEX,
    name: "Google Vertex AI",
    description: "Gemini models via Google Cloud Vertex AI",
    envVars: [
      {
        key: "GOOGLE_APPLICATION_CREDENTIALS",
        prompt: "Path to Service Account JSON file",
        secure: false,
      },
      {
        key: "GOOGLE_VERTEX_PROJECT",
        prompt: "Google Cloud Project ID",
        secure: false,
      },
    ],
  },
  {
    id: AIProviderName.AZURE,
    name: "Azure OpenAI",
    description: "GPT models via Azure OpenAI Service",
    envVars: [
      {
        key: "AZURE_OPENAI_API_KEY",
        prompt: "Azure OpenAI API Key",
        secure: true,
      },
      {
        key: "AZURE_OPENAI_ENDPOINT",
        prompt: "Azure OpenAI Endpoint URL",
        secure: false,
      },
    ],
  },
  {
    id: AIProviderName.HUGGINGFACE,
    name: "Hugging Face",
    description: "100,000+ open source models",
    envVars: [
      {
        key: "HUGGINGFACE_API_KEY",
        prompt: "Hugging Face API Token (hf_...)",
        secure: true,
      },
    ],
  },
  {
    id: AIProviderName.OLLAMA,
    name: "Ollama",
    description: "Local AI models running on your machine",
    envVars: [
      {
        key: "OLLAMA_BASE_URL",
        prompt: "Ollama Server URL",
        default: "http://localhost:11434",
        secure: false,
        optional: true,
      },
    ],
  },
  {
    id: AIProviderName.MISTRAL,
    name: "Mistral AI",
    description: "European GDPR-compliant AI models",
    envVars: [
      { key: "MISTRAL_API_KEY", prompt: "Mistral AI API Key", secure: true },
    ],
  },
];

export interface SetupResult {
  selectedProviders: AIProviderName[];
  credentials: Record<string, string>;
  envFileBackup?: string;
  testResults: Array<{
    provider: AIProviderName;
    status: "working" | "failed";
    error?: string;
    responseTime?: number;
  }>;
}

/**
 * Run the interactive setup wizard
 */
export async function runInteractiveSetup(
  quiet: boolean = false,
): Promise<SetupResult> {
  // Dynamic import to avoid bundling inquirer in SDK
  const { default: inquirer } = await import("inquirer");

  const result: SetupResult = {
    selectedProviders: [],
    credentials: {},
    testResults: [],
  };

  if (!quiet) {
    console.log(chalk.blue("\n🎉 Welcome to NeuroLink Interactive Setup!"));
    console.log(
      chalk.gray(
        "This wizard will help you configure AI providers for NeuroLink.\n",
      ),
    );
  }

  // Step 1: Provider Selection
  const providerChoices = PROVIDER_CONFIGS.map((config) => ({
    name: `${config.name} - ${config.description}`,
    value: config.id,
    checked: false,
  }));

  const { selectedProviders } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedProviders",
      message: "Which AI providers would you like to configure?",
      choices: providerChoices,
      validate: (answers: string[]) => {
        if (answers.length === 0) {
          return "Please select at least one provider.";
        }
        return true;
      },
    },
  ]);

  result.selectedProviders = selectedProviders;

  // Step 2: Credential Collection
  if (!quiet) {
    console.log(
      chalk.blue("\n🔑 Collecting credentials for selected providers...\n"),
    );
  }

  for (const providerId of selectedProviders) {
    const config = PROVIDER_CONFIGS.find((c) => c.id === providerId);
    if (!config) {
      continue;
    }

    if (!quiet) {
      console.log(chalk.yellow(`\n📋 Configuring ${config.name}:`));
    }

    for (const envVar of config.envVars) {
      const currentValue = process.env[envVar.key];
      const hasCurrentValue = !!currentValue;

      let promptMessage = envVar.prompt;
      if (hasCurrentValue) {
        promptMessage += chalk.gray(
          ` (current: ${envVar.secure ? "***" : currentValue})`,
        );
      }
      if (envVar.default) {
        promptMessage += chalk.gray(` (default: ${envVar.default})`);
      }

      const { value } = await inquirer.prompt([
        {
          type: envVar.secure ? "password" : "input",
          name: "value",
          message: promptMessage,
          default: envVar.default,
          validate: (input: string) => {
            if (!envVar.optional && !input && !hasCurrentValue) {
              return `${envVar.key} is required.`;
            }
            return true;
          },
          when: () => {
            if (hasCurrentValue && !envVar.optional) {
              // Ask if they want to update existing value
              return inquirer
                .prompt([
                  {
                    type: "confirm",
                    name: "update",
                    message: `Update existing ${envVar.key}?`,
                    default: false,
                  },
                ])
                .then((answer) => answer.update);
            }
            return true;
          },
        },
      ]);

      if (value || envVar.default) {
        result.credentials[envVar.key] = value || envVar.default || "";
      }
    }
  }

  return result;
}

/**
 * Test provider connectivity using existing logic
 */
export async function testProviderConnectivity(
  providers: AIProviderName[],
  quiet: boolean = false,
): Promise<
  Array<{
    provider: AIProviderName;
    status: "working" | "failed";
    error?: string;
    responseTime?: number;
  }>
> {
  const sdk = new NeuroLink();
  const results: Array<{
    provider: AIProviderName;
    status: "working" | "failed";
    error?: string;
    responseTime?: number;
  }> = [];

  if (!quiet) {
    console.log(chalk.blue("\n🧪 Testing provider connectivity...\n"));
  }

  const spinner = quiet ? null : ora().start();

  for (const provider of providers) {
    if (spinner) {
      spinner.text = `Testing ${provider}...`;
    }

    try {
      const start = Date.now();
      await sdk.generateText({ prompt: "test", provider, maxTokens: 1 });
      const duration = Date.now() - start;

      results.push({ provider, status: "working", responseTime: duration });

      if (spinner) {
        spinner.succeed(
          `${provider}: ${chalk.green("✅ Working")} (${duration}ms)`,
        );
        spinner.start(); // Restart for next provider
      } else if (!quiet) {
        console.log(
          `${provider}: ${chalk.green("✅ Working")} (${duration}ms)`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      results.push({ provider, status: "failed", error: errorMessage });

      if (spinner) {
        spinner.fail(
          `${provider}: ${chalk.red("❌ Failed")} - ${errorMessage.split("\n")[0]}`,
        );
        spinner.start(); // Restart for next provider
      } else if (!quiet) {
        console.error(
          `${provider}: ${chalk.red("❌ Failed")} - ${errorMessage.split("\n")[0]}`,
        );
      }
    }
  }

  if (spinner) {
    spinner.stop();
  }

  return results;
}

/**
 * Display setup summary
 */
export function displaySetupSummary(
  result: SetupResult,
  quiet: boolean = false,
): void {
  if (quiet) {
    return;
  }

  const working = result.testResults.filter(
    (r) => r.status === "working",
  ).length;
  const total = result.testResults.length;

  console.log(chalk.blue("\n📊 Setup Summary:"));
  console.log(chalk.blue("================"));
  console.log(`Selected providers: ${result.selectedProviders.length}`);
  console.log(`Working providers: ${working}/${total}`);

  if (result.envFileBackup) {
    console.log(chalk.gray(`Environment backup: ${result.envFileBackup}`));
  }

  if (working > 0) {
    console.log(chalk.green("\n✅ Setup completed successfully!"));
    console.log(
      chalk.yellow(
        "💡 You can now use NeuroLink with your configured providers.",
      ),
    );
    console.log(chalk.gray('   Try: neurolink generate-text "Hello, AI!"'));
  } else {
    console.log(chalk.red("\n❌ No providers are working."));
    console.log(
      chalk.yellow("💡 Please check your credentials and try again."),
    );
    console.log(chalk.gray("   Run: neurolink config setup"));
  }

  console.log(
    chalk.blue("\n📚 Documentation: https://github.com/juspay/neurolink#setup"),
  );
}
