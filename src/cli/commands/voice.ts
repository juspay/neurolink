/**
 * Voice CLI Commands for NeuroLink
 *
 * Provides CLI commands for voice operations including:
 * - Text-to-Speech synthesis
 * - Speech-to-Text transcription
 * - Provider management
 *
 * @module cli/commands/voice
 */

import type { Argv, CommandModule } from "yargs";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";

import { logger } from "../../lib/utils/logger.js";
import { VoiceFactory } from "../../lib/voice/voiceFactory.js";
import { VoiceRegistry } from "../../lib/voice/voiceRegistry.js";
import type { TTSOptions } from "../../lib/types/ttsTypes.js";
import type { STTOptions } from "../../lib/types/sttTypes.js";

/**
 * Voice command argument types
 */
interface VoiceSynthesizeArgs {
  text: string;
  provider?: string;
  voice?: string;
  output?: string;
  format?: string;
  speed?: number;
  pitch?: number;
  play?: boolean;
}

interface VoiceTranscribeArgs {
  file: string;
  provider?: string;
  language?: string;
  format?: string;
  diarization?: boolean;
  wordTimestamps?: boolean;
  output?: string;
}

interface VoiceProvidersArgs {
  type?: "tts" | "stt" | "realtime" | "all";
}

/**
 * Initialize voice providers
 */
async function ensureVoiceProviders(): Promise<void> {
  if (!VoiceRegistry.isRegistered()) {
    await VoiceRegistry.registerAllProviders();
  }
}

/**
 * Voice synthesize command handler
 */
async function handleSynthesize(argv: VoiceSynthesizeArgs): Promise<void> {
  const spinner = ora("Initializing TTS provider...").start();

  try {
    await ensureVoiceProviders();

    const providerName = argv.provider ?? "google-tts";

    if (!VoiceFactory.hasTTSProvider(providerName)) {
      spinner.fail(`TTS provider '${providerName}' not found`);
      logger.always(
        chalk.yellow(
          `Available TTS providers: ${VoiceFactory.getAvailableTTSProviders().join(", ")}`,
        ),
      );
      process.exit(1);
    }

    spinner.text = `Creating TTS provider: ${providerName}...`;
    const provider = await VoiceFactory.createTTSProvider(providerName);

    if (!provider.isConfigured()) {
      spinner.fail(`TTS provider '${providerName}' is not configured`);
      logger.always(
        chalk.yellow(
          "Please set the required API key environment variable for this provider.",
        ),
      );
      process.exit(1);
    }

    spinner.text = `Synthesizing speech with ${providerName}...`;

    const options: TTSOptions = {
      voice: argv.voice,
      format: argv.format as "mp3" | "wav" | "ogg" | "opus",
      speed: argv.speed,
      pitch: argv.pitch,
    };

    const startTime = Date.now();
    const result = await provider.synthesize(argv.text, options);
    const duration = Date.now() - startTime;

    spinner.succeed(`Speech synthesized in ${duration}ms`);

    // Display result info
    logger.always(chalk.blue("\nSynthesis Results:"));
    logger.always(`  Provider: ${chalk.white(providerName)}`);
    logger.always(`  Voice: ${chalk.white(result.voice ?? "default")}`);
    logger.always(`  Format: ${chalk.white(result.format)}`);
    logger.always(`  Size: ${chalk.white(formatBytes(result.size))}`);
    if (result.duration) {
      logger.always(`  Duration: ${chalk.white(result.duration.toFixed(2))}s`);
    }
    if (result.metadata?.latency) {
      logger.always(`  Latency: ${chalk.white(result.metadata.latency)}ms`);
    }

    // Save to file if output specified
    if (argv.output) {
      const outputPath = path.resolve(argv.output);
      fs.writeFileSync(outputPath, result.buffer);
      logger.always(chalk.green(`\nAudio saved to: ${outputPath}`));
    } else {
      // Default output path
      const defaultOutput = `neurolink-tts-${Date.now()}.${result.format}`;
      const outputPath = path.resolve(defaultOutput);
      fs.writeFileSync(outputPath, result.buffer);
      logger.always(chalk.green(`\nAudio saved to: ${outputPath}`));
    }

    // Play audio if requested
    if (argv.play) {
      logger.always(
        chalk.gray("\nNote: Audio playback not yet implemented in CLI."),
      );
      logger.always(chalk.gray("Use a media player to play the saved file."));
    }
  } catch (err) {
    spinner.fail("Speech synthesis failed");
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(chalk.red(`Error: ${errorMessage}`));
    process.exit(1);
  }
}

/**
 * Voice transcribe command handler
 */
async function handleTranscribe(argv: VoiceTranscribeArgs): Promise<void> {
  const spinner = ora("Initializing STT provider...").start();

  try {
    await ensureVoiceProviders();

    // Validate input file exists
    const inputPath = path.resolve(argv.file);
    if (!fs.existsSync(inputPath)) {
      spinner.fail(`File not found: ${inputPath}`);
      process.exit(1);
    }

    const providerName = argv.provider ?? "whisper";

    if (!VoiceFactory.hasSTTProvider(providerName)) {
      spinner.fail(`STT provider '${providerName}' not found`);
      logger.always(
        chalk.yellow(
          `Available STT providers: ${VoiceFactory.getAvailableSTTProviders().join(", ")}`,
        ),
      );
      process.exit(1);
    }

    spinner.text = `Creating STT provider: ${providerName}...`;
    const provider = await VoiceFactory.createSTTProvider(providerName);

    if (!provider.isConfigured()) {
      spinner.fail(`STT provider '${providerName}' is not configured`);
      logger.always(
        chalk.yellow(
          "Please set the required API key environment variable for this provider.",
        ),
      );
      process.exit(1);
    }

    // Read audio file
    spinner.text = `Reading audio file: ${path.basename(inputPath)}...`;
    const audioBuffer = fs.readFileSync(inputPath);

    // Detect format from extension
    const ext = path.extname(inputPath).toLowerCase().slice(1);
    const format = argv.format ?? ext;

    spinner.text = `Transcribing with ${providerName}...`;

    const options: STTOptions = {
      language: argv.language,
      format: format as "wav" | "mp3" | "m4a" | "flac" | "ogg" | "webm" | "mp4",
      diarization: argv.diarization,
      wordTimestamps: argv.wordTimestamps,
    };

    const startTime = Date.now();
    const result = await provider.transcribe(audioBuffer, options);
    const duration = Date.now() - startTime;

    spinner.succeed(`Transcription completed in ${duration}ms`);

    // Display result
    logger.always(chalk.blue("\nTranscription Results:"));
    logger.always(`  Provider: ${chalk.white(providerName)}`);
    logger.always(`  Language: ${chalk.white(result.language)}`);
    logger.always(`  Duration: ${chalk.white(result.duration.toFixed(2))}s`);
    logger.always(
      `  Confidence: ${chalk.white((result.confidence * 100).toFixed(1))}%`,
    );
    if (result.metadata.speakerCount) {
      logger.always(`  Speakers: ${chalk.white(result.metadata.speakerCount)}`);
    }
    logger.always(`  Latency: ${chalk.white(result.metadata.latency)}ms`);

    logger.always(chalk.blue("\nTranscribed Text:"));
    logger.always(chalk.white(result.text));

    // Show segments if word timestamps enabled
    if (argv.wordTimestamps && result.segments.length > 0) {
      logger.always(chalk.blue("\nSegments:"));
      for (const segment of result.segments) {
        const timeRange = `[${segment.start.toFixed(2)}s - ${segment.end.toFixed(2)}s]`;
        const speaker = segment.speaker ? `(${segment.speaker}) ` : "";
        logger.always(chalk.gray(timeRange) + " " + speaker + segment.text);
      }
    }

    // Save to file if output specified
    if (argv.output) {
      const outputPath = path.resolve(argv.output);
      const outputData = {
        text: result.text,
        language: result.language,
        duration: result.duration,
        confidence: result.confidence,
        segments: result.segments,
        metadata: result.metadata,
      };
      fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
      logger.always(chalk.green(`\nTranscription saved to: ${outputPath}`));
    }
  } catch (err) {
    spinner.fail("Transcription failed");
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(chalk.red(`Error: ${errorMessage}`));
    process.exit(1);
  }
}

/**
 * Voice providers command handler
 */
async function handleProviders(argv: VoiceProvidersArgs): Promise<void> {
  const spinner = ora("Loading voice providers...").start();

  try {
    await ensureVoiceProviders();
    spinner.stop();

    const showType = argv.type ?? "all";

    logger.always(chalk.blue("\nNeuroLink Voice Providers\n"));

    // TTS Providers
    if (showType === "all" || showType === "tts") {
      const ttsProviders = VoiceFactory.getAvailableTTSProviders();
      logger.always(chalk.yellow("Text-to-Speech (TTS) Providers:"));
      if (ttsProviders.length === 0) {
        logger.always(chalk.gray("  No TTS providers available"));
      } else {
        for (const name of ttsProviders) {
          const capabilities = VoiceFactory.getProviderCapabilities(name);
          const caps = capabilities ? ` (${capabilities.join(", ")})` : "";
          logger.always(`  ${chalk.white(name)}${chalk.gray(caps)}`);
        }
      }
      logger.always("");
    }

    // STT Providers
    if (showType === "all" || showType === "stt") {
      const sttProviders = VoiceFactory.getAvailableSTTProviders();
      logger.always(chalk.yellow("Speech-to-Text (STT) Providers:"));
      if (sttProviders.length === 0) {
        logger.always(chalk.gray("  No STT providers available"));
      } else {
        for (const name of sttProviders) {
          const capabilities = VoiceFactory.getProviderCapabilities(name);
          const caps = capabilities ? ` (${capabilities.join(", ")})` : "";
          logger.always(`  ${chalk.white(name)}${chalk.gray(caps)}`);
        }
      }
      logger.always("");
    }

    // Realtime Providers
    if (showType === "all" || showType === "realtime") {
      const realtimeProviders = VoiceFactory.getAvailableRealtimeProviders();
      logger.always(chalk.yellow("Realtime Voice Providers:"));
      if (realtimeProviders.length === 0) {
        logger.always(chalk.gray("  No realtime providers available"));
      } else {
        for (const name of realtimeProviders) {
          const capabilities = VoiceFactory.getProviderCapabilities(name);
          const caps = capabilities ? ` (${capabilities.join(", ")})` : "";
          logger.always(`  ${chalk.white(name)}${chalk.gray(caps)}`);
        }
      }
      logger.always("");
    }

    // Usage hints
    logger.always(chalk.gray("Usage:"));
    logger.always(
      chalk.gray(
        '  neurolink voice synthesize "Hello world" --provider elevenlabs',
      ),
    );
    logger.always(
      chalk.gray("  neurolink voice transcribe audio.mp3 --provider whisper"),
    );
  } catch (err) {
    spinner.fail("Failed to load providers");
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(chalk.red(`Error: ${errorMessage}`));
    process.exit(1);
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Create the voice command group
 */
export function createVoiceCommands(): CommandModule {
  return {
    command: "voice <command>",
    describe: "Voice and speech operations (TTS, STT)",
    builder: (yargs: Argv) => {
      return yargs
        .command(
          "synthesize <text>",
          "Synthesize text to speech (TTS)",
          (y) =>
            y
              .positional("text", {
                describe: "Text to synthesize",
                type: "string",
                demandOption: true,
              })
              .option("provider", {
                alias: "p",
                describe: "TTS provider to use",
                type: "string",
                default: "google-tts",
              })
              .option("voice", {
                alias: "v",
                describe: "Voice ID to use",
                type: "string",
              })
              .option("output", {
                alias: "o",
                describe: "Output file path",
                type: "string",
              })
              .option("format", {
                alias: "f",
                describe: "Audio output format",
                type: "string",
                choices: ["mp3", "wav", "ogg", "opus"],
                default: "mp3",
              })
              .option("speed", {
                alias: "s",
                describe: "Speaking rate (0.25-4.0)",
                type: "number",
                default: 1.0,
              })
              .option("pitch", {
                describe: "Voice pitch adjustment",
                type: "number",
              })
              .option("play", {
                describe: "Play audio after synthesis",
                type: "boolean",
                default: false,
              }),
          handleSynthesize as (args: unknown) => Promise<void>,
        )
        .command(
          "transcribe <file>",
          "Transcribe audio to text (STT)",
          (y) =>
            y
              .positional("file", {
                describe: "Audio file to transcribe",
                type: "string",
                demandOption: true,
              })
              .option("provider", {
                alias: "p",
                describe: "STT provider to use",
                type: "string",
                default: "whisper",
              })
              .option("language", {
                alias: "l",
                describe: "Audio language code (e.g., en-US)",
                type: "string",
              })
              .option("format", {
                alias: "f",
                describe: "Audio input format (auto-detected from extension)",
                type: "string",
                choices: ["wav", "mp3", "m4a", "flac", "ogg", "webm", "mp4"],
              })
              .option("diarization", {
                alias: "d",
                describe: "Enable speaker diarization",
                type: "boolean",
                default: false,
              })
              .option("word-timestamps", {
                alias: "w",
                describe: "Enable word-level timestamps",
                type: "boolean",
                default: false,
              })
              .option("output", {
                alias: "o",
                describe: "Output JSON file path for results",
                type: "string",
              }),
          handleTranscribe as (args: unknown) => Promise<void>,
        )
        .command(
          "providers",
          "List available voice providers",
          (y) =>
            y.option("type", {
              alias: "t",
              describe: "Filter by provider type",
              type: "string",
              choices: ["tts", "stt", "realtime", "all"],
              default: "all",
            }),
          handleProviders as (args: unknown) => Promise<void>,
        )
        .demandCommand(1, "Please specify a voice command");
    },
    handler: () => {}, // No-op, subcommands handle execution
  };
}

/**
 * Add voice commands to CLI
 */
export function addVoiceCommands(cli: Argv): void {
  cli.command(createVoiceCommands());
}

export default addVoiceCommands;
