/**
 * `neurolink voices` — list the TTS voices a provider offers.
 *
 * `--tts-voice` on `generate` takes a provider-specific identifier
 * (`en-US-Neural2-C`, `alloy`, `en-US-JennyNeural`), and nothing in the CLI
 * previously printed what those identifiers are. This is the discovery half
 * of that flag.
 *
 * @module cli/commands/voices
 */

import type { CommandModule, Argv } from "yargs";
import chalk from "chalk";
import type { CliVoicesCommandArgs, TTSVoice } from "../../lib/types/index.js";
import { TTSProcessor } from "../../lib/utils/ttsProcessor.js";
import { logger } from "../../lib/utils/logger.js";

export class VoicesCommandFactory {
  static createVoicesCommand(): CommandModule<object, CliVoicesCommandArgs> {
    return {
      command: "voices",
      describe: "List the text-to-speech voices a provider offers",
      builder: (yargs: Argv) =>
        yargs
          .option("provider", {
            type: "string",
            demandOption: true,
            description:
              "TTS provider to query (e.g. google-ai, openai-tts, elevenlabs)",
          })
          .option("language", {
            type: "string",
            description: "Only show voices for this language (e.g. en-US)",
          })
          .option("json", {
            type: "boolean",
            default: false,
            description: "Emit the voice list as JSON",
          })
          .example(
            "$0 voices --provider openai-tts",
            "List every OpenAI TTS voice",
          )
          .example(
            "$0 voices --provider google-ai --language en-US",
            "List Google Cloud TTS voices for US English",
          )
          .example(
            "$0 voices --provider elevenlabs --json",
            "Emit the voice list as JSON for scripting",
          ) as Argv<CliVoicesCommandArgs>,
      handler: async (argv) => {
        await VoicesCommandFactory.execute(argv);
      },
    };
  }

  /**
   * Registration is credential-gated — `registerDefaultTTSHandlers()` skips
   * any handler whose API key is absent — so an unconfigured provider is
   * indistinguishable from a misspelled one at the registry. Naming what IS
   * registered turns both into the same actionable message.
   */
  private static async execute(argv: CliVoicesCommandArgs): Promise<void> {
    const { ProviderRegistry } =
      await import("../../lib/factories/providerRegistry.js");
    await ProviderRegistry.registerAllProviders();

    let voices: TTSVoice[];
    try {
      voices = await TTSProcessor.getVoices(argv.provider, {
        ...(argv.language !== undefined ? { languageCode: argv.language } : {}),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.always(chalk.red(`Could not list voices: ${message}`));
      process.exitCode = 1;
      return;
    }

    const sorted = [...voices].sort((a, b) =>
      // Codepoint order, not localeCompare: collation depends on the Node ICU
      // build, so the same list would sort differently on two machines.
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    );

    if (argv.json === true) {
      logger.always(JSON.stringify(sorted, null, 2));
      return;
    }

    if (sorted.length === 0) {
      logger.always(
        chalk.yellow(
          argv.language !== undefined
            ? `No voices for language "${argv.language}" on provider "${argv.provider}".`
            : `Provider "${argv.provider}" reported no voices.`,
        ),
      );
      return;
    }

    logger.always(VoicesCommandFactory.formatTable(sorted));
    logger.always(
      chalk.gray(
        `\n${sorted.length} voice${sorted.length === 1 ? "" : "s"} for ${argv.provider}` +
          (argv.language !== undefined ? ` (language: ${argv.language})` : ""),
      ),
    );
  }

  private static formatTable(voices: readonly TTSVoice[]): string {
    const headers = ["ID", "NAME", "LANGUAGE", "GENDER", "TYPE"] as const;
    const rows = voices.map((voice) => [
      voice.id,
      voice.name,
      voice.languageCode,
      voice.gender ?? "-",
      voice.type ?? "-",
    ]);

    const widths = headers.map((header, column) =>
      rows.reduce(
        (widest, row) => Math.max(widest, (row[column] ?? "").length),
        header.length,
      ),
    );
    const line = (cells: readonly string[], paint: (s: string) => string) =>
      paint(
        cells
          .map((cell, column) => cell.padEnd(widths[column] ?? 0))
          .join("  ")
          .trimEnd(),
      );

    return [
      line(headers, chalk.bold),
      chalk.gray(widths.map((width) => "-".repeat(width)).join("  ")),
      ...rows.map((row) => line(row, (s) => s)),
    ].join("\n");
  }
}
