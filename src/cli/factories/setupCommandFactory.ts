/**
 * Setup Command Factory for NeuroLink
 * Consolidates all provider setup commands into a unified interface
 */

import type { CommandModule, Argv } from "yargs";
import type { SetupCommandArgs } from "../../lib/types/index.js";
import { AIProviderName } from "../../lib/constants/enums.js";
import { handleGCPSetup } from "../commands/setup-gcp.js";
import { handleBedrockSetup } from "../commands/setup-bedrock.js";
import { handleOpenAISetup } from "../commands/setup-openai.js";
import { handleGoogleAISetup } from "../commands/setup-google-ai.js";
import { handleAnthropicSetup } from "../commands/setup-anthropic.js";
import { handleAzureSetup } from "../commands/setup-azure.js";
import { handleHuggingFaceSetup } from "../commands/setup-huggingface.js";
import { handleMistralSetup } from "../commands/setup-mistral.js";
import { handleSetup } from "../commands/setup.js";

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
              // Derived from the enum, not hand-listed: the wizard's
              // handleSetup delegates every non-native provider through
              // EXTRA_PROVIDER_CONFIGS, but this hand-hardcoded 9-entry
              // list silently gated `neurolink setup <provider>` to the
              // pre-catalog era — even `setup groq` was rejected here
              // while the wizard behind it supported all 31 providers
              // (found completing the cerebras integration surface).
              // "gcp" stays as the one extra: it's a vertex alias with
              // its own native subcommand below, not an enum member.
              choices: [
                ...Object.values(AIProviderName).filter(
                  (name) => name !== AIProviderName.AUTO,
                ),
                "gcp",
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
            // Every remaining provider becomes a real subcommand routing
            // through the generic wizard (EXTRA_PROVIDER_CONFIGS). A bare
            // positional is not enough: yargs's .recommendCommands()
            // (parser.ts) edit-distance-matches unknown positionals
            // against the subcommand names above and dies with e.g.
            // "Did you mean gcp?" for `setup groq` or `setup xai` before
            // the positional choices are ever consulted. Registering the
            // ids as subcommand aliases (hidden from help — the
            // positional's choices already document the roster there)
            // shadows that recommendation, enum-derived so a new provider
            // can never be silently gated out again (this list was last
            // hand-hardcoded at 9 entries in the pre-catalog era; even
            // `setup groq` was rejected).
            .command(
              SetupCommandFactory.nonNativeProviderIds(),
              false,
              (y) => this.buildProviderOptions(y),
              async (argv) =>
                await handleSetup({
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ...(argv as any),
                  provider: String(argv._[argv._.length - 1]),
                }),
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
   * Every AIProviderName that has no dedicated native setup subcommand
   * above — these route through the generic wizard (handleSetup ->
   * delegateToProviderSetup / EXTRA_PROVIDER_CONFIGS).
   */
  private static nonNativeProviderIds(): string[] {
    const nativeSetup = new Set<string>([
      "google-ai",
      "openai",
      "anthropic",
      "azure",
      "bedrock",
      "gcp",
      "vertex",
      "huggingface",
      "mistral",
    ]);
    return Object.values(AIProviderName).filter(
      (name) => name !== AIProviderName.AUTO && !nativeSetup.has(name),
    );
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
