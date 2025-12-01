/**
 * Voices CLI Commands for NeuroLink
 * Implements TTS voice discovery and listing commands
 * Part of TTS-026 - CLI Voices Command
 */

import type { CommandModule, Argv } from "yargs";
import type { BaseCommandArgs } from "../../lib/types/cli.js";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import {
  GOOGLE_TTS_VOICES,
  TTS_PROVIDERS,
  type VoiceInfo,
} from "../../lib/tts/voiceData.js";

/**
 * Voice command arguments type
 */
export type VoicesCommandArgs = BaseCommandArgs & {
  /** AI provider to list voices for */
  provider?: string;
  /** Language code filter (e.g., en-US, fr-FR) */
  language?: string;
};

/**
 * Get voices for a specific provider
 */
function getVoicesForProvider(provider?: string): VoiceInfo[] {
  // For google-ai and vertex, both use Google Cloud TTS
  if (!provider || provider === "google-ai" || provider === "vertex") {
    return GOOGLE_TTS_VOICES;
  }

  // Provider not supported for TTS
  return [];
}

/**
 * Filter voices by language code
 */
function filterVoicesByLanguage(
  voices: VoiceInfo[],
  language?: string,
): VoiceInfo[] {
  if (!language) {
    return voices;
  }

  const normalizedLanguage = language.toLowerCase();
  return voices.filter(
    (voice) =>
      voice.languageCode.toLowerCase().startsWith(normalizedLanguage) ||
      voice.languageCode.toLowerCase() === normalizedLanguage,
  );
}

/**
 * Get unique languages from voices
 */
function getUniqueLanguages(voices: VoiceInfo[]): string[] {
  const languages = new Set(voices.map((v) => v.languageCode));
  return Array.from(languages).sort();
}

/**
 * Format voice for display
 */
function formatVoiceForDisplay(voice: VoiceInfo): string {
  const genderIcon =
    voice.gender === "MALE" ? "♂" : voice.gender === "FEMALE" ? "♀" : "⚥";
  const typeColor =
    voice.type === "NEURAL2"
      ? chalk.green
      : voice.type === "WAVENET"
        ? chalk.blue
        : chalk.gray;
  return `${chalk.cyan(voice.name)} ${genderIcon} ${typeColor(voice.type)} [${voice.languageCode}]`;
}

/**
 * Voices CLI command factory
 */
export class VoicesCommandFactory {
  /**
   * Create the main voices command
   */
  static createVoicesCommand(): CommandModule {
    return {
      command: "voices",
      describe: "List available TTS (Text-to-Speech) voices for a provider",
      builder: (yargs: Argv) => {
        return yargs
          .option("provider", {
            type: "string",
            choices: TTS_PROVIDERS,
            description: "TTS provider to list voices for (default: google-ai)",
            alias: "p",
          })
          .option("language", {
            type: "string",
            description:
              "Filter voices by language code (e.g., en-US, fr-FR, es-ES)",
            alias: "l",
          })
          .option("format", {
            choices: ["text", "json", "table"] as const,
            default: "text" as const,
            description: "Output format",
            alias: "f",
          })
          .option("quiet", {
            type: "boolean",
            default: false,
            description: "Suppress non-essential output",
            alias: "q",
          })
          .option("debug", {
            type: "boolean",
            default: false,
            description: "Enable debug output",
          })
          .example("neurolink voices", "List all available TTS voices")
          .example(
            "neurolink voices --provider google-ai",
            "List Google AI TTS voices",
          )
          .example(
            "neurolink voices --language en-US",
            "List US English voices",
          )
          .example(
            "neurolink voices --language fr --format json",
            "List French voices as JSON",
          )
          .example(
            "neurolink voices --format table",
            "Display voices in table format",
          );
      },
      handler: async (argv) => {
        await VoicesCommandFactory.executeVoices(argv as VoicesCommandArgs);
      },
    };
  }

  /**
   * Execute the voices command
   */
  private static async executeVoices(argv: VoicesCommandArgs): Promise<void> {
    const spinner = argv.quiet
      ? null
      : ora("Loading available voices...").start();

    try {
      const provider = argv.provider || "google-ai";

      // Check if provider supports TTS
      if (!TTS_PROVIDERS.includes(provider as (typeof TTS_PROVIDERS)[number])) {
        if (spinner) {
          spinner.fail(`Provider "${provider}" does not support TTS voices`);
        }
        logger.error(
          chalk.red(`\n❌ Provider "${provider}" is not supported for TTS.`),
        );
        logger.always(
          chalk.yellow(`Supported TTS providers: ${TTS_PROVIDERS.join(", ")}`),
        );
        process.exit(1);
      }

      // Get voices for provider
      let voices = getVoicesForProvider(provider);

      // Filter by language if specified
      if (argv.language) {
        voices = filterVoicesByLanguage(voices, argv.language);
      }

      if (spinner) {
        spinner.succeed(`Found ${voices.length} voices`);
      }

      if (voices.length === 0) {
        if (argv.language) {
          logger.always(
            chalk.yellow(
              `\n⚠️ No voices found for language "${argv.language}"`,
            ),
          );
          logger.always(chalk.gray("\nAvailable languages:"));
          const allVoices = getVoicesForProvider(provider);
          const languages = getUniqueLanguages(allVoices);
          languages.forEach((lang) => logger.always(chalk.gray(`  • ${lang}`)));
        } else {
          logger.always(chalk.yellow("\n⚠️ No voices available"));
        }
        return;
      }

      // Display results based on format
      if (argv.format === "json") {
        logger.always(JSON.stringify(voices, null, 2));
      } else if (argv.format === "table") {
        // Table format
        logger.always(chalk.bold(`\n🎤 TTS Voices for ${provider}:\n`));

        // Group by language
        const voicesByLanguage = new Map<string, VoiceInfo[]>();
        for (const voice of voices) {
          const existing = voicesByLanguage.get(voice.languageCode) || [];
          existing.push(voice);
          voicesByLanguage.set(voice.languageCode, existing);
        }

        // Display header
        logger.always(
          chalk.gray(
            "┌─────────────────────────────┬────────────┬────────┬──────────┐",
          ),
        );
        logger.always(
          chalk.gray("│ ") +
            chalk.bold("Voice Name                  ") +
            chalk.gray("│ ") +
            chalk.bold("Language  ") +
            chalk.gray("│ ") +
            chalk.bold("Gender") +
            chalk.gray(" │ ") +
            chalk.bold("Type    ") +
            chalk.gray(" │"),
        );
        logger.always(
          chalk.gray(
            "├─────────────────────────────┼────────────┼────────┼──────────┤",
          ),
        );

        // Display voices
        for (const voice of voices) {
          const name = voice.name.padEnd(27);
          const lang = voice.languageCode.padEnd(10);
          const gender = voice.gender.padEnd(6);
          const typeColor =
            voice.type === "NEURAL2"
              ? chalk.green
              : voice.type === "WAVENET"
                ? chalk.blue
                : chalk.gray;
          const type = typeColor(voice.type.padEnd(8));

          logger.always(
            chalk.gray("│ ") +
              chalk.cyan(name) +
              chalk.gray("│ ") +
              lang +
              chalk.gray("│ ") +
              gender +
              chalk.gray("│ ") +
              type +
              chalk.gray(" │"),
          );
        }

        logger.always(
          chalk.gray(
            "└─────────────────────────────┴────────────┴────────┴──────────┘",
          ),
        );

        // Show summary
        logger.always(
          chalk.gray(
            `\nTotal: ${voices.length} voices across ${getUniqueLanguages(voices).length} languages`,
          ),
        );
      } else {
        // Text format (default)
        logger.always(chalk.bold(`\n🎤 TTS Voices for ${provider}:\n`));

        // Group by language
        const voicesByLanguage = new Map<string, VoiceInfo[]>();
        for (const voice of voices) {
          const existing = voicesByLanguage.get(voice.languageCode) || [];
          existing.push(voice);
          voicesByLanguage.set(voice.languageCode, existing);
        }

        // Display grouped by language
        for (const [languageCode, langVoices] of voicesByLanguage) {
          logger.always(chalk.yellow(`\n${languageCode}:`));
          for (const voice of langVoices) {
            logger.always(`  ${formatVoiceForDisplay(voice)}`);
          }
        }

        // Show summary
        logger.always(
          chalk.gray(`\n─────────────────────────────────────────`),
        );
        logger.always(
          chalk.gray(
            `Total: ${voices.length} voices across ${voicesByLanguage.size} languages`,
          ),
        );

        // Show usage tips
        if (!argv.quiet) {
          logger.always(chalk.blue("\n💡 Usage Tips:"));
          logger.always(
            chalk.gray("  • Neural2 voices offer the highest quality"),
          );
          logger.always(
            chalk.gray(
              "  • Wavenet voices are high quality and cost-effective",
            ),
          );
          logger.always(
            chalk.gray("  • Use --language to filter by language code"),
          );
          logger.always(
            chalk.gray(
              '\n  Example: neurolink generate "Hello" --provider google-ai --tts-voice en-US-Neural2-C',
            ),
          );
        }
      }

      if (argv.debug) {
        logger.debug("\nDebug Information:");
        logger.debug(`Provider: ${provider}`);
        logger.debug(`Language filter: ${argv.language || "none"}`);
        logger.debug(
          `Total voices loaded: ${getVoicesForProvider(provider).length}`,
        );
        logger.debug(`Voices after filter: ${voices.length}`);
      }
    } catch (error) {
      if (spinner) {
        spinner.fail("Failed to list voices");
      }
      logger.error(chalk.red(`\n❌ Error: ${(error as Error).message}`));
      process.exit(1);
    }
  }
}
