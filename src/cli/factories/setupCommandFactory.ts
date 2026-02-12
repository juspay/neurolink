/**
 * Setup Command Factory for NeuroLink
 * Consolidates all provider setup commands into a unified interface
 */

import type { CommandModule, Argv } from "yargs";
import type { BaseCommandArgs } from "../../lib/types/cli.js";
import { handleGCPSetup } from "../commands/setup-gcp.js";
import { handleBedrockSetup } from "../commands/setup-bedrock.js";
import { handleOpenAISetup } from "../commands/setup-openai.js";
import { handleGoogleAISetup } from "../commands/setup-google-ai.js";
import { handleAnthropicSetup } from "../commands/setup-anthropic.js";
import { handleAzureSetup } from "../commands/setup-azure.js";
import { handleHuggingFaceSetup } from "../commands/setup-huggingface.js";
import { handleMistralSetup } from "../commands/setup-mistral.js";
import { handleSetup } from "../commands/setup.js";

type SetupCommandArgs = BaseCommandArgs & {
  check?: boolean;
  nonInteractive?: boolean;
  provider?: string;
  list?: boolean;
  status?: boolean;
};

/**
 * Setup Command Factory
 */
export class SetupCommandFactory {
  /**
   * Create the main setup command with all provider subcommands
   */
  static createSetupCommands(): CommandModule {
    return {
      command: ["setup [provider]", "s [provider]"],
      describe: "Setup AI provider configurations",
      builder: (yargs) => {
        return (
          yargs
            .positional("provider", {
              type: "string" as const,
              description: "Specific provider to set up",
              choices: [
                "google-ai",
                "openai",
                "anthropic",
                "azure",
                "bedrock",
                "gcp",
                "vertex",
                "huggingface",
                "mistral",
              ],
            })
            .option("list", {
              type: "boolean" as const,
              description: "List all available providers",
              alias: "l",
            })
            .option("status", {
              type: "boolean" as const,
              description: "Show provider configuration status",
            })
            .option("check", {
              type: "boolean" as const,
              description:
                "Only check existing configuration without prompting",
              default: false,
            })
            .option("non-interactive", {
              type: "boolean" as const,
              description: "Skip interactive prompts",
              default: false,
            })
            .option("quiet", {
              type: "boolean" as const,
              alias: "q",
              default: false,
              description: "Suppress non-essential output",
            })
            .option("debug", {
              type: "boolean" as const,
              default: false,
              description: "Enable debug output",
            })
            // Subcommands for each provider
            .command(
              "google-ai",
              "Setup Google AI Studio configuration",
              (y) => this.buildProviderOptions(y),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              async (argv) => await handleGoogleAISetup(argv as any),
            )
            .command(
              "openai",
              "Setup OpenAI configuration",
              (y) => this.buildProviderOptions(y),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              async (argv) => await handleOpenAISetup(argv as any),
            )
            .command(
              "anthropic",
              "Setup Anthropic Claude configuration",
              (y) => this.buildProviderOptions(y),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              async (argv) => await handleAnthropicSetup(argv as any),
            )
            .command(
              "azure",
              "Setup Azure OpenAI configuration",
              (y) => this.buildProviderOptions(y),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              async (argv) => await handleAzureSetup(argv as any),
            )
            .command(
              "bedrock",
              "Setup AWS Bedrock configuration",
              (y) => this.buildProviderOptions(y),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              async (argv) => await handleBedrockSetup(argv as any),
            )
            .command(
              ["gcp", "vertex"],
              "Setup Google Cloud Platform / Vertex AI configuration",
              (y) => this.buildProviderOptions(y),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              async (argv) => await handleGCPSetup(argv as any),
            )
            .command(
              "huggingface",
              "Setup Hugging Face configuration",
              (y) => this.buildProviderOptions(y),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              async (argv) => await handleHuggingFaceSetup(argv as any),
            )
            .command(
              "mistral",
              "Setup Mistral AI configuration",
              (y) => this.buildProviderOptions(y),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              async (argv) => await handleMistralSetup(argv as any),
            )
            .example("$0 setup", "Interactive setup wizard")
            .example("$0 setup google-ai", "Setup Google AI Studio")
            .example("$0 setup openai --check", "Check OpenAI configuration")
            .example("$0 setup --list", "List all providers")
            .example("$0 setup --status", "Check provider status")
            .help()
        );
      },
      handler: async (argv) => {
        // If no subcommand specified, run main setup wizard
        await handleSetup(argv as SetupCommandArgs);
      },
    };
  }

  /**
   * Build common options for provider setup commands
   */
  private static buildProviderOptions(yargs: Argv): Argv {
    return yargs
      .option("check", {
        type: "boolean" as const,
        describe: "Only check existing configuration without prompting",
        default: false,
      })
      .option("non-interactive", {
        type: "boolean" as const,
        describe: "Skip interactive prompts",
        default: false,
      })
      .option("quiet", {
        type: "boolean" as const,
        alias: "q",
        default: false,
        description: "Suppress non-essential output",
      })
      .option("debug", {
        type: "boolean" as const,
        default: false,
        description: "Enable debug output",
      });
  }
}
