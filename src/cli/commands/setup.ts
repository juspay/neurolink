#!/usr/bin/env node

/**
 * NeuroLink Setup Command - Main Provider Setup Wizard
 *
 * Provides a beautiful welcome experience for new users and guided
 * provider selection, while delegating to existing setup commands.
 */

import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import { NeuroLink } from "../../lib/neurolink.js";

// Import existing setup handlers
import { handleOpenAISetup } from "./setup-openai.js";
import { handleGoogleAISetup } from "./setup-google-ai.js";
import { handleAnthropicSetup } from "./setup-anthropic.js";
import { handleAzureSetup } from "./setup-azure.js";
import { handleBedrockSetup } from "./setup-bedrock.js";
import { handleGCPSetup } from "./setup-gcp.js";
import { handleHuggingFaceSetup } from "./setup-huggingface.js";
import { handleMistralSetup } from "./setup-mistral.js";

type SetupArgs = {
  provider?: string;
  list?: boolean;
  status?: boolean;
  interactive?: boolean;
  help?: boolean;
};

type ProviderInfo = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  setupTime: string;
  cost: string;
  bestFor: string;
  models: string;
  strengths: string;
  pricing: string;
  setupCommand: string;
};

// Provider information database
const PROVIDERS: ProviderInfo[] = [
  {
    id: "google-ai",
    name: "Google AI Studio",
    emoji: "🟡",
    description: "Fast setup, free tier, latest models",
    setupTime: "2 min",
    cost: "Free tier",
    bestFor: "General tasks",
    models: "Gemini 2.5 Pro, Gemini 2.5 Flash",
    strengths: "Latest technology, multimodal, generous free tier",
    pricing: "Free tier → $7 per 1M tokens",
    setupCommand: "neurolink setup --provider google-ai",
  },
  {
    id: "openai",
    name: "OpenAI",
    emoji: "🔵",
    description: "Industry standard, reliable",
    setupTime: "2 min",
    cost: "Pay-per-use",
    bestFor: "Code & reasoning",
    models: "GPT-4o, GPT-4o-mini, GPT-4-turbo",
    strengths: "Industry standard, proven reliability, fast",
    pricing: "$2.50-$10 per 1M tokens",
    setupCommand: "neurolink setup --provider openai",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    emoji: "🟣",
    description: "Best for analysis and safety",
    setupTime: "3 min",
    cost: "Pay-per-use",
    bestFor: "Analysis & chat",
    models: "Claude 3.5 Sonnet, Claude 3 Haiku",
    strengths: "Safety-focused, excellent analysis, long context",
    pricing: "$3-$15 per 1M tokens",
    setupCommand: "neurolink setup --provider anthropic",
  },
  {
    id: "azure",
    name: "Azure OpenAI",
    emoji: "🔷",
    description: "Enterprise features and compliance",
    setupTime: "5 min",
    cost: "Enterprise",
    bestFor: "Business use",
    models: "GPT-4, GPT-3.5, Embeddings",
    strengths: "Enterprise compliance, SLA, data residency",
    pricing: "Azure pricing model",
    setupCommand: "neurolink setup --provider azure",
  },
  {
    id: "bedrock",
    name: "AWS Bedrock",
    emoji: "🟠",
    description: "Integrated with AWS ecosystem",
    setupTime: "10 min",
    cost: "AWS pricing",
    bestFor: "Cloud native",
    models: "Claude, Llama, Titan, Command",
    strengths: "AWS integration, multiple model access, enterprise",
    pricing: "AWS Bedrock pricing",
    setupCommand: "neurolink setup --provider bedrock",
  },
  {
    id: "vertex",
    name: "Google Cloud",
    emoji: "🔴",
    description: "Advanced GCP integration",
    setupTime: "10 min",
    cost: "GCP pricing",
    bestFor: "Advanced ML",
    models: "Gemini, PaLM, Codey",
    strengths: "Advanced ML pipelines, GCP integration",
    pricing: "Google Cloud pricing",
    setupCommand: "neurolink setup --provider vertex",
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    emoji: "🤗",
    description: "Open source models",
    setupTime: "3 min",
    cost: "Free tier",
    bestFor: "Open source",
    models: "Llama, Mistral, CodeLlama, FLAN-T5",
    strengths: "Open source, community models, free tier",
    pricing: "Free tier available",
    setupCommand: "neurolink setup --provider huggingface",
  },
  {
    id: "mistral",
    name: "Mistral",
    emoji: "🌟",
    description: "European, privacy-focused",
    setupTime: "2 min",
    cost: "Free tier",
    bestFor: "European privacy",
    models: "Mistral 7B, Mixtral 8x7B, Mistral Large",
    strengths: "European privacy, efficient models, free tier",
    pricing: "Free tier → €7 per 1M tokens",
    setupCommand: "neurolink setup --provider mistral",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    emoji: "🔀",
    description: "100+ models, unified API access",
    setupTime: "2 min",
    cost: "Pay-per-use",
    bestFor: "Model variety",
    models: "GPT-4, Claude, Gemini, Llama, Mixtral, etc.",
    strengths: "Access 100+ models via single API, model routing, fallbacks",
    pricing: "Per-model pricing, free tier available",
    setupCommand: "neurolink setup --provider openrouter",
  },
];

/**
 * Main setup command handler
 */
export async function handleSetup(argv: SetupArgs): Promise<void> {
  try {
    // Handle specific flags
    if (argv.list) {
      return await showProviderList();
    }

    if (argv.status) {
      return await showProviderStatus();
    }

    if (argv.provider && argv.provider !== "auto") {
      return await delegateToProviderSetup(argv.provider);
    }

    // Main setup wizard
    await showWelcomeScreen();
    await runSetupWizard();
  } catch (error) {
    logger.error(chalk.red("❌ Setup failed:"));
    logger.error(
      chalk.red(error instanceof Error ? error.message : "Unknown error"),
    );
    process.exit(1);
  }
}

/**
 * Show the welcome screen
 */
async function showWelcomeScreen(): Promise<void> {
  // Clear screen for better presentation
  process.stdout.write("\x1B[2J\x1B[0f");

  logger.always(
    chalk.blue(
      "╭─────────────────────────────────────────────────────────────╮",
    ),
  );
  logger.always(
    chalk.blue(
      "│                                                             │",
    ),
  );
  logger.always(
    chalk.blue("│  ") +
      chalk.bold.white("🧠 Welcome to NeuroLink - Enterprise AI Platform") +
      chalk.blue("          │"),
  );
  logger.always(
    chalk.blue(
      "│                                                             │",
    ),
  );
  logger.always(
    chalk.blue("│  ") +
      chalk.gray("Universal interface for 8+ AI providers") +
      chalk.blue("                   │"),
  );
  logger.always(
    chalk.blue("│  ") +
      chalk.gray("• Generate text, code, and creative content") +
      chalk.blue("               │"),
  );
  logger.always(
    chalk.blue("│  ") +
      chalk.gray("• Stream responses in real-time") +
      chalk.blue("                           │"),
  );
  logger.always(
    chalk.blue("│  ") +
      chalk.gray("• Built-in analytics and evaluation") +
      chalk.blue("                       │"),
  );
  logger.always(
    chalk.blue("│  ") +
      chalk.gray("• Enterprise-grade tool integration") +
      chalk.blue("                      │"),
  );
  logger.always(
    chalk.blue(
      "│                                                             │",
    ),
  );
  logger.always(
    chalk.blue(
      "╰─────────────────────────────────────────────────────────────╯",
    ),
  );
  logger.always("");
}

/**
 * Run the main setup wizard
 */
async function runSetupWizard(): Promise<void> {
  const spinner = ora("🔍 Scanning for existing configurations...").start();

  // Check existing provider configurations
  const configuredProviders = await checkExistingConfigurations();

  spinner.stop();

  // Show current status
  await displayCurrentStatus(configuredProviders);

  // Show provider comparison table
  await displayProviderComparison();

  // Main menu
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        {
          name: "🚀 Set up a new AI provider",
          value: "setup",
        },
        {
          name: "📖 Learn more about providers",
          value: "learn",
        },
        {
          name: "📊 Check provider status",
          value: "status",
        },
        {
          name: "❌ Exit",
          value: "exit",
        },
      ],
    },
  ]);

  switch (action) {
    case "setup":
      await runProviderSelection();
      break;
    case "learn":
      await showProviderList();
      break;
    case "status":
      await showProviderStatus();
      break;
    case "exit":
      logger.always(chalk.blue("👋 Come back anytime with 'neurolink setup'"));
      break;
  }
}

/**
 * Check which providers are already configured
 */
async function checkExistingConfigurations(): Promise<string[]> {
  const configured: string[] = [];

  // Check for environment variables that indicate configured providers
  if (
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY
  ) {
    configured.push("google-ai");
  }
  if (process.env.OPENAI_API_KEY) {
    configured.push("openai");
  }
  if (process.env.ANTHROPIC_API_KEY) {
    configured.push("anthropic");
  }
  if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
    configured.push("azure");
  }
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    configured.push("bedrock");
  }
  if (
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  ) {
    configured.push("vertex");
  }
  if (
    process.env.HUGGINGFACE_API_KEY ||
    process.env.HUGGINGFACE_API_TOKEN ||
    process.env.HF_TOKEN ||
    process.env.HF_API_TOKEN
  ) {
    configured.push("huggingface");
  }
  if (process.env.MISTRAL_API_KEY) {
    configured.push("mistral");
  }
  if (process.env.OPENROUTER_API_KEY) {
    configured.push("openrouter");
  }

  return configured;
}

/**
 * Display current configuration status
 */
async function displayCurrentStatus(
  configuredProviders: string[],
): Promise<void> {
  logger.always("Current Status:");

  if (configuredProviders.length === 0) {
    logger.always(chalk.red("❌ No AI providers configured yet"));
  } else {
    logger.always(
      chalk.green(`✅ ${configuredProviders.length} provider(s) configured:`),
    );
    configuredProviders.forEach((id) => {
      const provider = PROVIDERS.find((p) => p.id === id);
      if (provider) {
        logger.always(`   ${provider.emoji} ${provider.name}`);
      }
    });
  }

  logger.always("");
}

/**
 * Display provider comparison table
 */
async function displayProviderComparison(): Promise<void> {
  logger.always("Available Providers:");
  logger.always("");

  // Create a simple table
  logger.always(
    "┌─────────────────┬──────────────┬─────────────┬─────────────────┐",
  );
  logger.always(
    "│ Provider        │ Setup Time   │ Cost        │ Best For        │",
  );
  logger.always(
    "├─────────────────┼──────────────┼─────────────┼─────────────────┤",
  );

  PROVIDERS.forEach((provider) => {
    const name = `${provider.emoji} ${provider.name}`.padEnd(15);
    const setupTime = provider.setupTime.padEnd(12);
    const cost = provider.cost.padEnd(11);
    const bestFor = provider.bestFor.padEnd(15);

    logger.always(`│ ${name} │ ${setupTime} │ ${cost} │ ${bestFor} │`);
  });

  logger.always(
    "└─────────────────┴──────────────┴─────────────┴─────────────────┘",
  );
  logger.always("");
  logger.always(
    chalk.yellow(
      "💡 Recommendation: Start with Google AI (free) or OpenAI (industry standard)",
    ),
  );
  logger.always("");
}

/**
 * Run provider selection
 */
async function runProviderSelection(): Promise<void> {
  logger.always(chalk.blue("🎯 Perfect! Let's get you connected."));
  logger.always("");

  const choices: Array<{ name: string; value: string } | inquirer.Separator> =
    PROVIDERS.map((provider) => ({
      name: `${provider.emoji} ${provider.name.padEnd(18)} - ${provider.description}`,
      value: provider.id,
    }));

  // Add a non-selectable separator row
  choices.push(new inquirer.Separator("─".repeat(60)));
  choices.push({
    name: chalk.yellow(
      "💡 New to AI? Google AI Studio is perfect for getting started!",
    ),
    value: "tip",
  });

  const { selectedProvider } = await inquirer.prompt([
    {
      type: "list",
      name: "selectedProvider",
      message: "Which AI provider would you like to configure?",
      choices,
      pageSize: 12,
    },
  ]);

  if (selectedProvider !== "tip") {
    logger.always("");
    logger.always(chalk.blue("🔄 Launching provider setup..."));
    logger.always("");
    await delegateToProviderSetup(selectedProvider);
  }
}

/**
 * Delegate to existing provider setup commands
 */
async function delegateToProviderSetup(providerId: string): Promise<void> {
  const setupArgs = {
    nonInteractive: false,
    "non-interactive": false,
    check: false,
    _: [] as (string | number)[],
    $0: "neurolink",
  };

  switch (providerId) {
    case "google-ai":
      await handleGoogleAISetup(setupArgs);
      break;
    case "openai":
      await handleOpenAISetup(setupArgs);
      break;
    case "anthropic":
      await handleAnthropicSetup(setupArgs);
      break;
    case "azure":
      await handleAzureSetup(setupArgs);
      break;
    case "bedrock":
      await handleBedrockSetup(setupArgs);
      break;
    case "vertex":
      await handleGCPSetup(setupArgs);
      break;
    case "huggingface":
      await handleHuggingFaceSetup(setupArgs);
      break;
    case "mistral":
      await handleMistralSetup(setupArgs);
      break;
    case "openrouter":
      await handleOpenRouterSetup();
      break;
    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }

  // After successful setup, show completion message
  await showSetupCompletion(providerId);
}

/**
 * Handle OpenRouter provider setup
 */
async function handleOpenRouterSetup(): Promise<void> {
  logger.always("");
  logger.always(chalk.blue("🔀 OpenRouter Setup"));
  logger.always("");
  logger.always(
    "OpenRouter provides unified access to 100+ AI models from multiple providers",
  );
  logger.always(
    "including OpenAI, Anthropic, Google, Meta, Mistral, and more.",
  );
  logger.always("");
  logger.always(chalk.yellow("Step 1: Get your API key"));
  logger.always("  1. Go to https://openrouter.ai/keys");
  logger.always("  2. Sign in or create an account");
  logger.always("  3. Create a new API key");
  logger.always("");
  logger.always(chalk.yellow("Step 2: Set the environment variable"));
  logger.always("  Add to your shell profile (~/.bashrc, ~/.zshrc, etc.):");
  logger.always("");
  logger.always(chalk.cyan("  export OPENROUTER_API_KEY=your_api_key_here"));
  logger.always("");
  logger.always(chalk.yellow("Step 3: Test the configuration"));
  logger.always(
    chalk.cyan(
      '  neurolink generate "Hello!" --provider openrouter --model google/gemini-2.0-flash-exp:free',
    ),
  );
  logger.always("");
  logger.always(chalk.green("Available models include:"));
  logger.always("  • anthropic/claude-3.5-sonnet - Best for analysis");
  logger.always("  • openai/gpt-4o - Industry standard");
  logger.always("  • google/gemini-2.0-flash-exp:free - Free tier");
  logger.always("  • meta-llama/llama-3.1-70b-instruct - Open source");
  logger.always("");
  logger.always(chalk.gray("See all models at: https://openrouter.ai/models"));
}

/**
 * Show setup completion message
 */
async function showSetupCompletion(providerId: string): Promise<void> {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) {
    return;
  }

  logger.always("");
  logger.always(
    chalk.green("🎉 Welcome to NeuroLink! Your  provider is ready."),
  );
  logger.always("");
  logger.always("Next steps:");
  logger.always(
    chalk.cyan(
      `• Test: neurolink generate "Hello world!" --provider ${providerId}`,
    ),
  );
  logger.always(chalk.cyan("• Status: neurolink provider status"));
  logger.always(chalk.cyan("• Help: neurolink --help"));
  logger.always("");
  logger.always(chalk.blue("Happy generating! 🚀"));
}

/**
 * Show detailed provider information
 */
async function showProviderList(): Promise<void> {
  logger.always(chalk.blue("📚 NeuroLink Supported AI Providers"));
  logger.always("");

  for (const provider of PROVIDERS) {
    logger.always(
      `╭─────────────────────────────────────────────────────────────╮`,
    );
    logger.always(
      `│                   ${provider.emoji} ${provider.name.padEnd(25)}│`,
    );
    logger.always(
      `├─────────────────────────────────────────────────────────────┤`,
    );
    logger.always(`│ Setup: ${provider.setupCommand.padEnd(48)}│`);
    logger.always(`│ Models: ${provider.models.padEnd(47)}│`);
    logger.always(`│ Strengths: ${provider.strengths.padEnd(43)}│`);
    logger.always(`│ Best for: ${provider.bestFor.padEnd(44)}│`);
    logger.always(`│ Pricing: ${provider.pricing.padEnd(45)}│`);
    logger.always(`│ Setup time: ${provider.setupTime.padEnd(42)}│`);
    logger.always(
      `╰─────────────────────────────────────────────────────────────╯`,
    );
    logger.always("");
  }

  logger.always(chalk.blue("🎯 Quick Start Recommendations:"));
  logger.always("");
  logger.always(chalk.yellow("🆓 Free Tier Starter Pack:"));
  logger.always("• neurolink setup --provider google-ai");
  logger.always("• neurolink setup --provider huggingface");
  logger.always("");
  logger.always(chalk.yellow("💼 Professional Setup:"));
  logger.always("• neurolink setup --provider openai");
  logger.always("• neurolink setup --provider anthropic");
  logger.always("");
  logger.always(chalk.yellow("🏢 Enterprise Ready:"));
  logger.always("• neurolink setup --provider azure");
  logger.always("• neurolink setup --provider bedrock");
  logger.always("");

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Ready to set up a provider?",
      choices: [
        { name: "Yes, show me the setup wizard", value: "wizard" },
        { name: "No, I'll set up providers manually later", value: "exit" },
      ],
    },
  ]);

  if (action === "wizard") {
    await runProviderSelection();
  }
}

/**
 * Show provider status with detailed information
 */
async function showProviderStatus(): Promise<void> {
  const spinner = ora("🔍 Checking all AI provider configurations...").start();

  try {
    // Get provider status using NeuroLink SDK
    const sdk = new NeuroLink();
    const results = await sdk.getProviderStatus({ quiet: true });

    spinner.stop();

    logger.always("");
    logger.always(
      "╭─────────────────────────────────────────────────────────────╮",
    );
    logger.always(
      "│                  NeuroLink Provider Status                  │",
    );
    logger.always(
      "╰─────────────────────────────────────────────────────────────╯",
    );
    logger.always("");

    const working = results.filter((r) => r.status === "working");
    const _configured = results.filter((r) => r.configured);
    const available = PROVIDERS.filter(
      (p) => !results.some((r) => r.provider === p.id && r.configured),
    );

    if (working.length > 0) {
      logger.always("✅ Working Providers:");
      logger.always(
        "┌─────────────────┬─────────────┬─────────────┬─────────────────┐",
      );
      logger.always(
        "│ Provider        │ Status      │ Model       │ Last Tested     │",
      );
      logger.always(
        "├─────────────────┼─────────────┼─────────────┼─────────────────┤",
      );

      working.forEach((result) => {
        const provider = PROVIDERS.find((p) => p.id === result.provider);
        const emoji = provider?.emoji || "⚪";
        const name = `${emoji} ${provider?.name || result.provider}`.padEnd(15);
        const status = "✅ Working".padEnd(11);
        const model = (result.model || "default").padEnd(11);
        const tested = result.responseTime ? "Just now" : "Unknown";

        logger.always(
          `│ ${name} │ ${status} │ ${model} │ ${tested.padEnd(15)} │`,
        );
      });

      logger.always(
        "└─────────────────┴─────────────┴─────────────┴─────────────────┘",
      );
      logger.always("");
    }

    if (available.length > 0) {
      logger.always("⚪ Available for Setup:");
      logger.always(
        "┌─────────────────┬──────────────┬─────────────┬─────────────────┐",
      );
      logger.always(
        "│ Provider        │ Setup Time   │ Cost Model  │ Specialty       │",
      );
      logger.always(
        "├─────────────────┼──────────────┼─────────────┼─────────────────┤",
      );

      available.forEach((provider) => {
        const name = `${provider.emoji} ${provider.name}`.padEnd(15);
        const setupTime = provider.setupTime.padEnd(12);
        const cost = provider.cost.padEnd(11);
        const specialty = provider.bestFor.padEnd(15);

        logger.always(`│ ${name} │ ${setupTime} │ ${cost} │ ${specialty} │`);
      });

      logger.always(
        "└─────────────────┴──────────────┴─────────────┴─────────────────┘",
      );
      logger.always("");
    }

    // Summary and recommendations
    logger.always(
      chalk.blue(`🎯 You have ${working.length} provider(s) working!`),
    );
    logger.always("");

    if (available.length > 0) {
      logger.always(chalk.yellow("💡 Suggestions:"));
      if (!working.some((p) => p.provider === "anthropic")) {
        logger.always(
          "• Add Anthropic for better analysis: neurolink setup --provider anthropic",
        );
      }
      if (!working.some((p) => p.provider === "huggingface")) {
        logger.always(
          "• Try Hugging Face for free open source models: neurolink setup --provider huggingface",
        );
      }
      logger.always("• Check performance: neurolink provider status");
      logger.always("");
    }

    const { setupAnother } = await inquirer.prompt([
      {
        type: "confirm",
        name: "setupAnother",
        message: "Would you like to set up another provider now?",
        default: false,
      },
    ]);

    if (setupAnother) {
      await runProviderSelection();
    } else {
      logger.always(
        chalk.blue(
          "👍 All set! Use 'neurolink setup' anytime to add more providers.",
        ),
      );
    }
  } catch (error) {
    spinner.fail("Failed to check provider status");
    logger.error(chalk.red("Error checking provider status:"), error);
  }
}
