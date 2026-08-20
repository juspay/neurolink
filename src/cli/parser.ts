import chalk from "chalk";
// `@types/yargs` is pinned to the v17 line while the runtime `yargs` dependency
// is v18 — a real, currently unfixable skew. DefinitelyTyped has no v18 types
// package, and yargs 18's package.json `exports` map gives the main entry no
// `types` condition, so there is no way to get types straight from the
// runtime package either. `@types/yargs` therefore stays load-bearing here
// until DefinitelyTyped (or yargs itself) ships v18-compatible types. This
// file is the canonical place for that note, not the only import site —
// yargs is imported across roughly two dozen files in this codebase.
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import packageJson from "../../package.json" with { type: "json" };
import { globalSession } from "../lib/session/globalSessionState.js";
import { logger } from "../lib/utils/logger.js";
import { handleError } from "./errorHandler.js";
import { CLICommandFactory } from "./factories/commandFactory.js";
import { SetupCommandFactory } from "./factories/setupCommandFactory.js";
import { AuthCommandFactory } from "./factories/authCommandFactory.js";
import { ServerCommandFactory } from "./commands/server.js";
import { ServeCommandFactory } from "./commands/serve.js";
import { ragCommand } from "./commands/rag.js";
import { ObservabilityCommandFactory } from "./commands/observability.js";
import { TelemetryCommandFactory } from "./commands/telemetry.js";
import {
  proxyStartCommand,
  proxyStatusCommand,
  proxyTelemetryCommand,
  proxySetupCommand,
  proxyGuardCommand,
  proxyInstallCommand,
  proxyUninstallCommand,
} from "./commands/proxy.js";
import { proxyAnalyzeCommand } from "./commands/proxyAnalyze.js";
import { proxyShareCommand } from "./commands/proxyShare.js";
import { proxyPeerCommand } from "./commands/proxyPeer.js";
import { proxyExposeCommand } from "./commands/proxyExpose.js";
import { proxyReplayCommand } from "./commands/proxyReplay.js";
import { EvaluateCommandFactory } from "./commands/evaluate.js";
import { TaskCommandFactory } from "./commands/task.js";
import { AutoresearchCommandFactory } from "./commands/autoresearch.js";
import { voiceServerCommand } from "./commands/voiceServer.js";
import { DocsCommandFactory } from "./commands/docs.js";
import { UsageCommandFactory } from "./commands/usage.js";

// Enhanced CLI with Professional UX
export function initializeCliParser() {
  return (
    yargs(hideBin(process.argv))
      .scriptName("neurolink")
      .usage("Usage: $0 <command> [options]")
      .version(packageJson.version)
      .help()
      .alias("h", "help")
      .alias("V", "version")
      .strictOptions()
      .strictCommands()
      .demandCommand(1, "")
      .recommendCommands()
      .epilogue(
        "For more info: https://github.com/juspay/neurolink\n\n" +
          "Anthropic Subscription Tiers:\n" +
          "  free  - Limited free tier access\n" +
          "  pro   - Professional tier ($20/mo)\n" +
          "  max   - Maximum tier with highest limits\n" +
          "  api   - Direct API access (pay-per-use)\n\n" +
          "Use 'neurolink auth login anthropic' to configure authentication",
      )
      .showHelpOnFail(true, "Specify --help for available options")
      .middleware((argv: { noColor?: boolean; [key: string]: unknown }) => {
        // Handle no-color option globally
        if (argv.noColor || process.env.NO_COLOR || !process.stdout.isTTY) {
          process.env.FORCE_COLOR = "0";
        }

        // Handle custom config file
        if (argv.configFile) {
          process.env.NEUROLINK_CONFIG_FILE = argv.configFile as string;
        }

        // Control SDK logging based on debug flag
        if (argv.debug) {
          process.env.NEUROLINK_DEBUG = "true";
        } else {
          // Always set to false when debug is not enabled (including when not provided)
          process.env.NEUROLINK_DEBUG = "false";
        }

        // Keep existing quiet middleware
        if (
          process.env.NEUROLINK_QUIET === "true" &&
          typeof argv.quiet === "undefined"
        ) {
          argv.quiet = true;
        }
      })
      .fail((msg, err, yargsInstance) => {
        // If we are in a loop, we don't want to exit the process.
        // Instead, we just want to display the error and help text.
        if (globalSession.getCurrentSessionId()) {
          if (msg) {
            logger.error(chalk.red(msg)); // This is a yargs validation error (e.g., missing argument)
            yargsInstance.showHelp("log");
          } else if (err) {
            // This is an error thrown from a command handler
            // The loop's catch block will handle this, so we just re-throw.
            // throw err;
            handleError(err as Error, "CLI Error in Loop Session");
          }
          return;
        }

        // Original logic for single-command execution
        const exitProcess = () => {
          if (!process.exitCode) {
            process.exit(1);
          }
        };

        if (err) {
          // Error likely from an async command handler (e.g., via _handleError)
          // _handleError already prints and calls process.exit(1).
          // If we're here, it means _handleError's process.exit might not have been caught by the top-level async IIFE.
          // Or, it's a synchronous yargs error during parsing that yargs itself throws.
          const alreadyExitedByHandleError =
            (err as Error & { exitCode?: number })?.exitCode !== undefined;
          // A simple heuristic: if the error message doesn't look like one of our handled generic messages,
          // it might be a direct yargs parsing error.
          const isLikelyYargsInternalError =
            err.message && // Ensure err.message exists
            !err.message.includes("Authentication error") &&
            !err.message.includes("Network error") &&
            !err.message.includes("Authorization error") &&
            !err.message.includes("Permission denied") && // from config export
            !err.message.includes("Invalid or unparseable JSON"); // from config import

          if (!alreadyExitedByHandleError) {
            process.stderr.write(
              chalk.red(
                `CLI Error: ${err.message || msg || "An unexpected error occurred."}\n`,
              ),
            );
            // If it's a yargs internal parsing error, show help.
            if (isLikelyYargsInternalError && msg) {
              yargsInstance.showHelp((h) => {
                process.stderr.write(h + "\n");
                exitProcess();
              });
              return;
            }
            exitProcess();
          }
          return; // Exit was already called or error handled
        }

        // Yargs parsing/validation error (msg is present, err is null)
        if (msg) {
          let processedMsg = `Error: ${msg}\n`;
          if (
            msg.includes("Not enough non-option arguments") ||
            msg.includes("Missing required argument") ||
            msg.includes("Unknown command")
          ) {
            process.stderr.write(chalk.red(processedMsg)); // Print error first
            yargsInstance.showHelp((h) => {
              process.stderr.write("\n" + h + "\n");
              exitProcess();
            });
            return; // Exit happens in callback
          } else if (
            msg.includes("Unknown argument") ||
            msg.includes("Invalid values")
          ) {
            processedMsg = `Error: ${msg}\nUse --help to see available options.\n`;
          }
          process.stderr.write(chalk.red(processedMsg));
        } else {
          // No specific message, but failure occurred (e.g. demandCommand failed silently)
          yargsInstance.showHelp((h) => {
            process.stderr.write(h + "\n");
            exitProcess();
          });
          return; // Exit happens in callback
        }
        exitProcess(); // Default exit
      })

      // Generate Command (Primary) - Using CLICommandFactory
      .command(CLICommandFactory.createGenerateCommand())
      // Docs MCP Server Command
      .command(DocsCommandFactory.createDocsCommand())

      .command(UsageCommandFactory.createUsageCommands())

      // Stream Text Command - Using CLICommandFactory
      .command(CLICommandFactory.createStreamCommand())

      // Batch Processing Command - Using CLICommandFactory
      .command(CLICommandFactory.createBatchCommand())

      // Provider Command Group - Using CLICommandFactory
      .command(CLICommandFactory.createProviderCommands())

      // Status command alias - Using CLICommandFactory
      .command(CLICommandFactory.createStatusCommand())

      // Models Command Group - Using CLICommandFactory
      .command(CLICommandFactory.createModelsCommands())

      // MCP Command Group - Using CLICommandFactory
      .command(CLICommandFactory.createMCPCommands())

      // Discover Command - Using CLICommandFactory
      .command(CLICommandFactory.createDiscoverCommand())

      // Configuration Command Group - Using CLICommandFactory
      .command(CLICommandFactory.createConfigCommands())

      // Memory Command Group - Using CLICommandFactory
      .command(CLICommandFactory.createMemoryCommands())

      // Skills Command Group - Using CLICommandFactory
      .command(CLICommandFactory.createSkillsCommands())

      // Get Best Provider Command - Using CLICommandFactory
      .command(CLICommandFactory.createBestProviderCommand())

      // Validate Command (alias for config validate)
      .command(CLICommandFactory.createValidateCommand())

      // Completion Command - Using CLICommandFactory
      .command(CLICommandFactory.createCompletionCommand())

      // Ollama Command Group - Using CLICommandFactory
      .command(CLICommandFactory.createOllamaCommands())

      // SageMaker Command Group - Using CLICommandFactory
      .command(CLICommandFactory.createSageMakerCommands())

      // Loop Command - Using CLICommandFactory
      .command(CLICommandFactory.createLoopCommand())

      // Agent Commands - Using CLICommandFactory (Multi-Agent Orchestration)
      .command(CLICommandFactory.createAgentCommands())

      // Network Commands - Using CLICommandFactory (Agent Network Orchestration)
      .command(CLICommandFactory.createNetworkCommands())

      // Setup Commands - Using SetupCommandFactory
      .command(SetupCommandFactory.createSetupCommands())

      // Server Command Group - Using ServerCommandFactory
      .command(ServerCommandFactory.createServerCommands())

      // Serve Command - Simplified server start - Using ServeCommandFactory
      .command(ServeCommandFactory.createServeCommands())

      // RAG Document Processing Commands
      .command(ragCommand)

      // Observability Commands
      .command(ObservabilityCommandFactory.createObservabilityCommands())

      // Telemetry Commands
      .command(TelemetryCommandFactory.createTelemetryCommands())

      // Auth Commands - Authentication management
      .command(AuthCommandFactory.createAuthCommands())

      // Proxy Commands - Claude multi-account proxy
      .command({
        command: "proxy",
        describe: "Manage Claude multi-account proxy server",
        builder: (yargs) =>
          yargs
            .command(proxyStartCommand)
            .command(proxyStatusCommand)
            .command(proxyShareCommand)
            .command(proxyPeerCommand)
            .command(proxyExposeCommand)
            .command(proxyAnalyzeCommand)
            .command(proxyReplayCommand)
            .command(proxyTelemetryCommand)
            .command(proxySetupCommand)
            .command(proxyGuardCommand)
            .command(proxyInstallCommand)
            .command(proxyUninstallCommand)
            .demandCommand(
              1,
              "Please specify a proxy subcommand: start, status, share <create|provision|url|list|status|pause|resume|revoke|topup|set|link|rotate|level|note|notes|receipts|delete>, peer <add|request|sync|receipts|net|redeem|list|status|test|remove|pause|resume|set>, expose, analyze, replay <export|compare>, telemetry <setup|start|stop|status|logs|import-dashboard>, setup, guard, install, or uninstall",
            ),
        handler: () => {},
      })

      // Evaluate Command Group - Using EvaluateCommandFactory
      .command(EvaluateCommandFactory.createEvaluateCommand())

      // Task Command Group - Scheduled and self-running tasks
      .command(TaskCommandFactory.createTaskCommands())

      // AutoResearch Command Group - Automated AI-driven research experiments
      .command(AutoresearchCommandFactory.createAutoresearchCommands())

      // Real-time voice server (Soniox STT + Cartesia TTS + Cobra VAD)
      .command(voiceServerCommand)
  ); // Close the main return statement
}
