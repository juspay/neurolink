/**
 * Interactive Setup Utilities for NeuroLink CLI
 *
 * Provides interactive configuration wizard with provider selection,
 * credential collection, testing, and environment file management.
 */

import { AIProviderName } from "../../lib/constants/enums.js";
import { NeuroLink } from "../../lib/neurolink.js";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import type {
  InteractiveProviderConfig,
  SetupResult,
} from "../../lib/types/index.js";

export const PROVIDER_CONFIGS: InteractiveProviderConfig[] = [
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
  {
    id: AIProviderName.LITELLM,
    name: "LiteLLM",
    description: "Access 100+ models via LiteLLM proxy server",
    envVars: [
      {
        key: "LITELLM_BASE_URL",
        prompt: "LiteLLM Proxy Server URL",
        default: "http://localhost:4000",
        secure: false,
      },
      {
        key: "LITELLM_API_KEY",
        prompt: "LiteLLM API Key (or random value)",
        default: "sk-anything",
        secure: false,
        optional: true,
      },
    ],
  },
  {
    id: AIProviderName.OPENAI_COMPATIBLE,
    name: "OpenAI Compatible",
    description: "Any OpenAI-compatible endpoint (OpenRouter, vLLM, etc.)",
    envVars: [
      {
        key: "OPENAI_COMPATIBLE_BASE_URL",
        prompt:
          "OpenAI-compatible endpoint URL (e.g., https://api.openrouter.ai/api/v1)",
        secure: false,
      },
      {
        key: "OPENAI_COMPATIBLE_API_KEY",
        prompt: "API Key for the OpenAI-compatible service",
        secure: true,
      },
      {
        key: "OPENAI_COMPATIBLE_MODEL",
        prompt: "Model name (optional - will auto-discover if not specified)",
        secure: false,
        optional: true,
      },
    ],
  },
  {
    id: AIProviderName.SAGEMAKER,
    name: "Amazon SageMaker",
    description: "Custom models deployed on Amazon SageMaker endpoints",
    envVars: [
      {
        key: "AWS_ACCESS_KEY_ID",
        prompt: "AWS Access Key ID",
        secure: true,
      },
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
      {
        key: "SAGEMAKER_DEFAULT_ENDPOINT",
        prompt: "SageMaker Endpoint Name",
        secure: false,
      },
    ],
  },
  {
    id: AIProviderName.DEEPSEEK,
    name: "DeepSeek",
    description:
      "Cost-efficient frontier models (deepseek-chat V3, deepseek-reasoner R1)",
    envVars: [
      {
        key: "DEEPSEEK_API_KEY",
        prompt: "DeepSeek API Key (get one at https://platform.deepseek.com)",
        secure: true,
      },
    ],
  },
  {
    id: AIProviderName.NVIDIA_NIM,
    name: "NVIDIA NIM",
    description:
      "NVIDIA-hosted Llama, Nemotron, Mistral, and DeepSeek-R1 models",
    envVars: [
      {
        key: "NVIDIA_NIM_API_KEY",
        prompt:
          "NVIDIA NIM API Key (get one at https://build.nvidia.com/settings/api-keys)",
        secure: true,
      },
    ],
  },
  {
    id: AIProviderName.LM_STUDIO,
    name: "LM Studio",
    description:
      "Local inference via LM Studio desktop app (https://lmstudio.ai)",
    envVars: [
      {
        key: "LM_STUDIO_BASE_URL",
        prompt: "LM Studio server URL",
        default: "http://localhost:1234/v1",
        secure: false,
        optional: true,
      },
      {
        key: "LM_STUDIO_API_KEY",
        prompt:
          "LM Studio API Key (leave blank — only needed behind an auth proxy)",
        secure: false,
        optional: true,
      },
    ],
  },
  {
    id: AIProviderName.LLAMACPP,
    name: "llama.cpp",
    description:
      "Local inference via llama-server (https://github.com/ggerganov/llama.cpp). Start with: ./llama-server -m model.gguf --port 8080 --jinja",
    envVars: [
      {
        key: "LLAMACPP_BASE_URL",
        prompt: "llama-server URL",
        default: "http://localhost:8080/v1",
        secure: false,
        optional: true,
      },
      {
        key: "LLAMACPP_API_KEY",
        prompt:
          "llama-server API Key (leave blank — only needed behind an auth proxy)",
        secure: false,
        optional: true,
      },
    ],
  },
];

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
    logger.always(chalk.blue("\n🎉 Welcome to NeuroLink Interactive Setup!"));
    logger.always(
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
    logger.always(
      chalk.blue("\n🔑 Collecting credentials for selected providers...\n"),
    );
  }

  for (const providerId of selectedProviders) {
    const config = PROVIDER_CONFIGS.find((c) => c.id === providerId);
    if (!config) {
      continue;
    }

    if (!quiet) {
      logger.always(chalk.yellow(`\n📋 Configuring ${config.name}:`));
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
    logger.always(chalk.blue("\n🧪 Testing provider connectivity...\n"));
  }

  const spinner = quiet ? null : ora().start();

  for (const provider of providers) {
    if (spinner) {
      spinner.text = `Testing ${provider}...`;
    }

    try {
      const start = Date.now();
      await sdk.generate({ input: { text: "test" }, provider, maxTokens: 1 });
      const duration = Date.now() - start;

      results.push({ provider, status: "working", responseTime: duration });

      if (spinner) {
        spinner.succeed(
          `${provider}: ${chalk.green("✅ Working")} (${duration}ms)`,
        );
        spinner.start(); // Restart for next provider
      } else if (!quiet) {
        logger.always(
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
        logger.error(
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

  logger.always(chalk.blue("\n📊 Setup Summary:"));
  logger.always(chalk.blue("================"));
  logger.always(`Selected providers: ${result.selectedProviders.length}`);
  logger.always(`Working providers: ${working}/${total}`);

  if (result.envFileBackup) {
    logger.always(chalk.gray(`Environment backup: ${result.envFileBackup}`));
  }

  if (working > 0) {
    logger.always(chalk.green("\n✅ Setup completed successfully!"));
    logger.always(
      chalk.yellow(
        "💡 You can now use NeuroLink with your configured providers.",
      ),
    );
    logger.always(chalk.gray('   Try: neurolink generate "Hello, AI!"'));
  } else {
    logger.always(chalk.red("\n❌ No providers are working."));
    logger.always(
      chalk.yellow("💡 Please check your credentials and try again."),
    );
    logger.always(chalk.gray("   Run: neurolink config setup"));
  }

  logger.always(
    chalk.blue("\n📚 Documentation: https://github.com/juspay/neurolink#setup"),
  );
}
