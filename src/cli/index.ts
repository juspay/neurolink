#!/usr/bin/env node

// CRITICAL: Set MCP logging level before ANY imports
if (!process.argv.includes("--debug")) {
  process.env.MCP_LOG_LEVEL = "error"; // Only show MCP errors unless debugging
} else {
  process.env.MCP_LOG_LEVEL = "info"; // Show MCP logs when debugging
}

/**
 * NeuroLink CLI - Enhanced Simplified Approach
 *
 * Professional CLI experience with minimal maintenance overhead.
 * Features: Spinners, colors, batch processing, provider testing, rich help
 * Implementation: ~300 lines using simple JS utility functions
 */

import { NeuroLink } from "../lib/neurolink.js";
import type { AIProviderName } from "../lib/index.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import ora from "ora";
import chalk from "chalk";
import fs from "fs";
import { addMCPCommands } from "./commands/mcp.js";
import { addOllamaCommands } from "./commands/ollama.js";
import { CLICommandFactory } from "./factories/command-factory.js";

import { logger } from "../lib/utils/logger.js";

/**
 * Helper functions for displaying analytics and evaluation results
 * Addresses DRY principle - extracted shared parts into reusable functions
 */

function displayDebugInfo(title: string, data: any, debug: boolean) {
  if (debug) {
    console.log(chalk.blue(title));
    console.log(JSON.stringify(data, null, 2));
    console.log();
  }
}

function displayMissingDataWarning(type: string) {
  console.log();
  console.log(chalk.red(`⚠️  ${type} enabled but no data received`));
  console.log();
}

function formatAnalytics(analytics: any) {
  console.log();
  console.log(chalk.blue("📊 Analytics:"));
  console.log(`   🚀 Provider: ${analytics.provider}`);
  console.log(`   🤖 Model: ${analytics.model}`);
  if (analytics.tokens) {
    console.log(
      `   💬 Tokens: ${analytics.tokens.totalTokens || analytics.tokens.total || "unknown"}`,
    );
  }
  console.log(`   ⏱️  Response Time: ${analytics.responseTime}ms`);
  if (analytics.context) {
    console.log(
      `   📋 Context: ${Object.keys(analytics.context).length} fields`,
    );
  }
  console.log();
}

function formatEvaluation(evaluation: any) {
  console.log();
  console.log(chalk.blue("⭐ Response Quality Evaluation:"));
  console.log(
    `   📊 Scores: Relevance ${evaluation.relevanceScore || evaluation.relevance}/10, Accuracy ${evaluation.accuracyScore || evaluation.accuracy}/10, Completeness ${evaluation.completenessScore || evaluation.completeness}/10`,
  );
  console.log(`   🎯 Overall Quality: ${evaluation.overall}/10`);

  const severity = evaluation.alertSeverity || "none";
  const severityColors: { [key: string]: any } = {
    high: chalk.red,
    medium: chalk.yellow,
    low: chalk.blue,
    none: chalk.green,
  };
  const severityColor = severityColors[severity] || chalk.gray;
  console.log(`   🚨 Alert Level: ${severityColor(severity)}`);

  if (evaluation.reasoning) {
    console.log(`   💭 Analysis: ${evaluation.reasoning}`);
  }
  if (evaluation.suggestedImprovements) {
    console.log(`   💡 Improvements: ${evaluation.suggestedImprovements}`);
  }

  const evalModel = evaluation.evaluationModel || "unknown";
  const evalTime = evaluation.evaluationTime
    ? `${evaluation.evaluationTime}ms`
    : "unknown";
  console.log(`   🤖 Evaluated by: ${evalModel} (${evalTime})`);
  console.log();
}

function displayAnalyticsAndEvaluation(result: any, argv: any) {
  if (result && result.analytics) {
    displayDebugInfo("📊 Analytics:", result.analytics, argv.debug);
    if (!argv.debug) {
      formatAnalytics(result.analytics);
    }
  } else if (argv.enableAnalytics) {
    displayMissingDataWarning("Analytics");
  }

  if (result && result.evaluation) {
    displayDebugInfo("⭐ Response Evaluation:", result.evaluation, argv.debug);
    if (!argv.debug) {
      formatEvaluation(result.evaluation);
    }
  } else if (argv.enableEvaluation) {
    displayMissingDataWarning("Evaluation");
  }
}

// Load environment variables from .env file
try {
  // Try to import and configure dotenv
  const { config } = await import("dotenv");
  config(); // Load .env from current working directory
} catch (error) {
  // dotenv is not available (dev dependency only) - this is fine for production
  // Environment variables should be set externally in production
}

// Utility Functions (Simple, Zero Maintenance)

function handleError(error: Error, context: string): void {
  const specificErrorMessage = error.message;
  const originalErrorMessageLowerCase = error.message
    ? error.message.toLowerCase()
    : "";
  const errorStringLowerCase = String(error).toLowerCase();

  let isAuthError = false;
  let genericMessage = specificErrorMessage; // Initialize genericMessage with the specific one

  if (
    originalErrorMessageLowerCase.includes("api_key") ||
    originalErrorMessageLowerCase.includes("google_ai_api_key") ||
    originalErrorMessageLowerCase.includes("aws_access_key_id") ||
    originalErrorMessageLowerCase.includes("aws_secret_access_key") ||
    originalErrorMessageLowerCase.includes("aws_session_token") ||
    originalErrorMessageLowerCase.includes("google_application_credentials") ||
    originalErrorMessageLowerCase.includes("google_service_account_key") ||
    originalErrorMessageLowerCase.includes("google_auth_client_email") ||
    originalErrorMessageLowerCase.includes("anthropic_api_key") ||
    originalErrorMessageLowerCase.includes("azure_openai_api_key")
  ) {
    isAuthError = true;
  } else if (
    // Fallback to checking the full stringified error if direct message didn't match
    errorStringLowerCase.includes("api_key") ||
    errorStringLowerCase.includes("google_ai_api_key") ||
    errorStringLowerCase.includes("aws_access_key_id") ||
    errorStringLowerCase.includes("aws_secret_access_key") ||
    errorStringLowerCase.includes("aws_session_token") ||
    errorStringLowerCase.includes("google_application_credentials") ||
    errorStringLowerCase.includes("google_service_account_key") ||
    errorStringLowerCase.includes("google_auth_client_email") ||
    errorStringLowerCase.includes("anthropic_api_key") ||
    errorStringLowerCase.includes("azure_openai_api_key")
  ) {
    isAuthError = true;
  }

  if (isAuthError) {
    genericMessage =
      "Authentication error: Missing or invalid API key/credentials for the selected provider.";
  } else if (
    originalErrorMessageLowerCase.includes("enotfound") || // Prefer direct message checks
    originalErrorMessageLowerCase.includes("econnrefused") ||
    originalErrorMessageLowerCase.includes("invalid-endpoint") ||
    originalErrorMessageLowerCase.includes("network error") ||
    originalErrorMessageLowerCase.includes("could not connect") ||
    originalErrorMessageLowerCase.includes("timeout") ||
    errorStringLowerCase.includes("enotfound") || // Fallback to full string
    errorStringLowerCase.includes("econnrefused") ||
    errorStringLowerCase.includes("invalid-endpoint") ||
    errorStringLowerCase.includes("network error") ||
    errorStringLowerCase.includes("could not connect") ||
    errorStringLowerCase.includes("timeout") // General timeout
  ) {
    genericMessage =
      "Network error: Could not connect to the API endpoint or the request timed out.";
  } else if (
    errorStringLowerCase.includes("not authorized") ||
    errorStringLowerCase.includes("permission denied")
  ) {
    genericMessage =
      "Authorization error: You are not authorized to perform this action or access this resource.";
  }
  // If no specific condition matched, genericMessage remains error.message

  console.error(chalk.red(`❌ ${context} failed: ${genericMessage}`));

  // Smart hints for common errors (just string matching!)
  if (
    genericMessage.toLowerCase().includes("api key") ||
    genericMessage.toLowerCase().includes("credential")
  ) {
    console.error(
      chalk.yellow(
        "💡 Set Google AI Studio API key (RECOMMENDED): export GOOGLE_AI_API_KEY=AIza-...",
      ),
    );
    console.error(
      chalk.yellow("💡 Or set OpenAI API key: export OPENAI_API_KEY=sk-..."),
    );
    console.error(
      chalk.yellow(
        "💡 Or set AWS Bedrock credentials: export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_REGION=us-east-1",
      ),
    );
    console.error(
      chalk.yellow(
        "💡 Or set Google Vertex AI credentials: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json",
      ),
    );
    console.error(
      chalk.yellow(
        "💡 Or set Anthropic API key: export ANTHROPIC_API_KEY=sk-ant-...",
      ),
    );
    console.error(
      chalk.yellow(
        "💡 Or set Azure OpenAI credentials: export AZURE_OPENAI_API_KEY=... AZURE_OPENAI_ENDPOINT=...",
      ),
    );
  }

  if (error.message.toLowerCase().includes("rate limit")) {
    console.error(
      chalk.yellow("💡 Try again in a few moments or use --provider vertex"),
    );
  }

  if (
    error.message.toLowerCase().includes("not authorized") ||
    error.message.toLowerCase().includes("permission denied")
  ) {
    console.error(
      chalk.yellow(
        "💡 Check your account permissions for the selected model/service.",
      ),
    );
    console.error(
      chalk.yellow(
        "💡 For AWS Bedrock, ensure you have permissions for the specific model and consider using inference profile ARNs.",
      ),
    );
  }

  process.exit(1);
}

// Initialize MCP system for CLI with manual config enabled
async function initializeCLI() {
  // Import and configure for CLI mode
  const { ProviderRegistry } = await import(
    "../lib/factories/provider-registry.js"
  );
  const { initializeNeuroLinkMCP } = await import("../lib/mcp/initialize.js");

  // Enable manual MCP only for CLI
  ProviderRegistry.setOptions({
    enableManualMCP: true,
  });

  // Initialize MCP system
  await initializeNeuroLinkMCP();

  logger.debug("CLI initialized with manual MCP support enabled");
}

// Initialize SDK
const sdk = new NeuroLink();

// Manual pre-validation for unknown flags
const args = hideBin(process.argv);

// Enhanced CLI with Professional UX
const cli = yargs(args)
  .scriptName("neurolink")
  .usage("Usage: $0 <command> [options]")
  .version()
  .help()
  .alias("h", "help")
  .alias("V", "version")
  .strictOptions()
  .strictCommands()
  .demandCommand(1, "")
  .epilogue("For more info: https://github.com/juspay/neurolink")
  .showHelpOnFail(true, "Specify --help for available options")
  .middleware((argv) => {
    // Control SDK logging based on debug flag
    if (argv.debug) {
      process.env.NEUROLINK_DEBUG = "true";
      process.env.MCP_LOG_LEVEL = "info"; // Show MCP logs in debug mode
    } else {
      // Always set to false when debug is not enabled (including when not provided)
      process.env.NEUROLINK_DEBUG = "false";
      process.env.MCP_LOG_LEVEL = "error"; // Hide MCP info logs when not debugging
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
    const exitProcess = () => {
      if (!process.exitCode) {
        process.exit(1);
      }
    };

    if (err) {
      // Error likely from an async command handler (e.g., via handleError)
      // handleError already prints and calls process.exit(1).
      // If we're here, it means handleError's process.exit might not have been caught by the top-level async IIFE.
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

  // Generate Command (Primary)
  .command(
    ["generate [prompt]", "gen [prompt]"],
    "Generate content using AI providers",
    (yargsInstance) =>
      yargsInstance
        .usage("Usage: $0 generate [prompt] [options]")
        .positional("prompt", {
          type: "string",
          description: "Text prompt for AI generation (or read from stdin)",
        })
        .option("provider", {
          choices: [
            "auto",
            "openai",
            "bedrock",
            "vertex",
            "google-vertex",
            "anthropic",
            "azure",
            "google-ai",
            "huggingface",
            "ollama",
            "mistral",
          ] as const,
          default: "auto",
          description: "AI provider to use (auto-selects best available)",
        })
        .option("temperature", {
          type: "number",
          default: 0.7,
          description: "Creativity level (0.0 = focused, 1.0 = creative)",
        })
        .option("max-tokens", {
          type: "number",
          default: 1000,
          description: "Maximum tokens to generate",
        })
        .option("system", {
          type: "string",
          description: "System prompt to guide AI behavior",
        })
        .option("format", {
          choices: ["text", "json"] as const,
          default: "text",
          alias: "f",
          description: "Output format",
        })
        .option("debug", {
          type: "boolean",
          default: false,
          description: "Enable debug mode with verbose output",
        }) // Kept for potential specific debug logic
        .option("model", {
          type: "string",
          description:
            "Specific model to use (e.g. gemini-2.5-pro, gemini-2.5-flash)",
        })
        .option("timeout", {
          type: "number",
          default: 120,
          description: "Maximum execution time in seconds (default: 120)",
        })
        .option("disable-tools", {
          type: "boolean",
          default: false,
          description:
            "Disable MCP tool integration (tools enabled by default)",
        })
        .option("enable-analytics", {
          type: "boolean",
          default: false,
          description: "Enable usage analytics collection",
        })
        .option("enable-evaluation", {
          type: "boolean",
          default: false,
          description: "Enable AI response quality evaluation",
        })
        .option("evaluation-domain", {
          type: "string",
          description:
            "Domain expertise for evaluation (e.g., 'AI coding assistant', 'Customer service expert')",
        })
        .option("tool-usage-context", {
          type: "string",
          description:
            "Tool usage context for evaluation (e.g., 'Used sales-data MCP tools')",
        })
        .option("lighthouse-style", {
          type: "boolean",
          default: false,
          description: "Use Lighthouse-compatible domain-aware evaluation",
        })
        .option("context", {
          type: "string",
          description: "JSON context object for custom data",
        })
        .example('$0 generate "Hello world"', "Basic content generation")
        .example(
          '$0 generate "Write a story" --provider openai',
          "Use specific provider",
        )
        .example(
          '$0 generate "What time is it?"',
          "Use with natural tool integration (default)",
        )
        .example(
          '$0 generate "Hello world" --disable-tools',
          "Use without tool integration",
        ),
    async (argv) => {
      // SOLUTION 1: Handle stdin input if no prompt provided
      if (!argv.prompt && !process.stdin.isTTY) {
        // Read from stdin
        let stdinData = "";
        process.stdin.setEncoding("utf8");

        for await (const chunk of process.stdin) {
          stdinData += chunk;
        }

        argv.prompt = stdinData.trim();

        if (!argv.prompt) {
          throw new Error("No input received from stdin");
        }
      } else if (!argv.prompt) {
        throw new Error(
          'Prompt required. Use: neurolink generate "your prompt" or echo "prompt" | neurolink generate',
        );
      }

      // SOLUTION 2: Parameter validation
      const errors: string[] = [];

      // Validate max-tokens
      if (argv.maxTokens !== undefined) {
        if (!Number.isInteger(argv.maxTokens) || argv.maxTokens < 1) {
          errors.push(
            `max-tokens must be a positive integer >= 1, got: ${argv.maxTokens}`,
          );
        }
        if (argv.maxTokens > 100000) {
          errors.push(`max-tokens too large (>100000), got: ${argv.maxTokens}`);
        }
      }

      // Validate temperature
      if (argv.temperature !== undefined) {
        if (
          typeof argv.temperature !== "number" ||
          argv.temperature < 0 ||
          argv.temperature > 1
        ) {
          errors.push(
            `temperature must be between 0.0 and 1.0, got: ${argv.temperature}`,
          );
        }
      }

      // Validate timeout
      if (argv.timeout !== undefined) {
        if (!Number.isInteger(argv.timeout) || argv.timeout < 1) {
          errors.push(
            `timeout must be a positive integer >= 1 second, got: ${argv.timeout}`,
          );
        }
        if (argv.timeout > 600) {
          errors.push(`timeout too large (>600s), got: ${argv.timeout}s`);
        }
      }

      if (errors.length > 0) {
        throw new Error(
          `Parameter validation failed:\n${errors.map((e) => `  • ${e}`).join("\n")}\n\nUse --help for valid parameter ranges.`,
        );
      }

      // Command is now the primary generate method

      let originalConsole: any = {};
      if (
        (argv.format === "json" || argv.outputFormat === "json") &&
        !argv.quiet
      ) {
        // Suppress only if not quiet, as quiet implies no spinners anyway
        originalConsole = { ...console };
        (Object.keys(originalConsole) as Array<keyof Console>).forEach(
          (key) => {
            if (typeof console[key] === "function") {
              (console[key] as any) = () => {};
            }
          },
        );
      }

      const spinner =
        argv.outputFormat === "json" || argv.format === "json" || argv.quiet
          ? null
          : ora("🤖 Generating text...").start();

      try {
        // CRITICAL: Add master timeout to prevent infinite hangs
        const cliTimeout = argv.timeout ? argv.timeout * 1000 : 120000; // Default 2 minutes
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                `CLI operation timed out after ${cliTimeout / 1000} seconds. Use --timeout to adjust.`,
              ),
            );
          }, cliTimeout);
        });

        // Parse context if provided
        let contextObj: Record<string, any> | undefined;
        if (argv.context) {
          try {
            contextObj = JSON.parse(argv.context);
          } catch {
            throw new Error("Invalid JSON provided for --context option");
          }
        }

        // Use standard SDK for all generation - tools are now built into BaseProvider
        const generatePromise = sdk.generate({
          input: { text: argv.prompt as string },
          provider:
            argv.provider === "auto"
              ? undefined
              : (argv.provider as AIProviderName | undefined),
          model: argv.model,
          temperature: argv.temperature,
          maxTokens: argv.maxTokens,
          systemPrompt: argv.system,
          timeout: argv.timeout,
          disableTools: argv.disableTools === true, // Tools are enabled by default
          // NEW: Analytics and evaluation support
          enableAnalytics: argv.enableAnalytics as boolean,
          enableEvaluation: argv.enableEvaluation as boolean,
          context: contextObj,
          // NEW: Lighthouse-compatible domain-aware evaluation
          evaluationDomain: argv.evaluationDomain,
          toolUsageContext: argv.toolUsageContext,
        });

        // Wrap generation with master timeout to prevent infinite hangs
        const result = await Promise.race([generatePromise, timeoutPromise]);

        if (argv.format === "json" && originalConsole.log) {
          Object.assign(console, originalConsole);
        }
        if (spinner) {
          spinner.succeed(chalk.green("✅ Text generated successfully!"));
        }

        // Handle NeuroLink SDK responses
        interface AIResponse {
          text?: string;
          content?: string;
          usage?: {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
          };
          provider?: string;
          responseTime?: number;
          toolCalls?: any[];
          toolResults?: any[];
          analytics?: any;
          evaluation?: any;
        }

        const typedResult = result as AIResponse | undefined;
        const responseText = typedResult?.text || typedResult?.content || "";
        const responseUsage = typedResult?.usage || {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        };

        if (argv.format === "json" || argv.outputFormat === "json") {
          // CLI debug removed - analytics and evaluation now working correctly

          const jsonOutput: any = {
            content: responseText,
            provider: typedResult?.provider || argv.provider,
            usage: responseUsage,
            responseTime: typedResult?.responseTime || 0,
            toolCalls: typedResult?.toolCalls || [],
            toolResults: typedResult?.toolResults || [],
          };

          // Include analytics if present
          if (typedResult?.analytics) {
            jsonOutput.analytics = typedResult.analytics;
          }

          // Include evaluation if present
          if (typedResult?.evaluation) {
            jsonOutput.evaluation = typedResult.evaluation;
          }

          process.stdout.write(JSON.stringify(jsonOutput, null, 2) + "\n");
        } else if (argv.debug) {
          // Debug mode: Show AI response + full metadata
          if (responseText) {
            console.log("\n" + responseText + "\n");
          }

          // Show tool calls if any
          if (
            result &&
            (result as any).toolCalls &&
            (result as any).toolCalls.length > 0
          ) {
            console.log(chalk.blue("🔧 Tools Called:"));
            for (const toolCall of (result as any).toolCalls) {
              console.log(`- ${toolCall.toolName}`);
              console.log(`  Args: ${JSON.stringify(toolCall.args)}`);
            }
            console.log();
          }

          // Show tool results if any
          if (
            result &&
            (result as any).toolResults &&
            (result as any).toolResults.length > 0
          ) {
            console.log(chalk.blue("📋 Tool Results:"));
            for (const toolResult of (result as any).toolResults) {
              console.log(`- ${toolResult.toolCallId}`);
              console.log(
                `  Result: ${JSON.stringify(toolResult.result).substring(0, 200)}...`,
              );
            }
            console.log();
          }

          // DEBUG: Show what's in the result object
          if (argv.debug) {
            logger.debug("Result object keys:", {
              keys: Object.keys(result || {}),
            });
            logger.debug("Enhancement status:", {
              hasAnalytics: !!(result && (result as any).analytics),
              hasEvaluation: !!(result && (result as any).evaluation),
              enableAnalytics: argv.enableAnalytics,
              enableEvaluation: argv.enableEvaluation,
              hasContext: !!contextObj,
            });
          }

          // Show analytics and evaluation if enabled
          displayAnalyticsAndEvaluation(result, argv);

          console.log(
            JSON.stringify(
              {
                provider: result
                  ? (result as any).provider || argv.provider
                  : argv.provider,
                usage: responseUsage,
                responseTime: result ? (result as any).responseTime || 0 : 0,
              },
              null,
              2,
            ),
          );
          if (responseUsage.totalTokens) {
            console.log(
              chalk.blue(`ℹ️  ${responseUsage.totalTokens} tokens used`),
            );
          }
        } else {
          // Default mode: Clean AI response only
          if (responseText) {
            console.log(responseText);
          }

          // Show analytics and evaluation if enabled
          displayAnalyticsAndEvaluation(result, argv);
        }

        // Explicitly exit to prevent hanging, especially with Google AI Studio
        process.exit(0);
      } catch (error) {
        if (argv.format === "json" && originalConsole.log) {
          Object.assign(console, originalConsole);
        }
        if (spinner) {
          spinner.fail();
        }
        if (argv.format === "json") {
          process.stdout.write(
            JSON.stringify(
              { error: (error as Error).message, success: false },
              null,
              2,
            ) + "\n",
          );
          process.exit(1);
        } else {
          handleError(error as Error, "Text generation");
        }
      }
    },
  )

  // Stream Text Command
  .command(
    "stream [prompt]",
    "Stream generation in real-time",
    (yargsInstance) =>
      yargsInstance
        .usage("Usage: $0 stream [prompt] [options]")
        .positional("prompt", {
          type: "string",
          description: "Text prompt for streaming (or read from stdin)",
        })
        .option("provider", {
          choices: [
            "auto",
            "openai",
            "bedrock",
            "vertex",
            "google-vertex",
            "anthropic",
            "azure",
            "google-ai",
            "huggingface",
            "ollama",
            "mistral",
          ] as const,
          default: "auto",
          description: "AI provider to use",
        })
        .option("temperature", {
          type: "number",
          default: 0.7,
          description: "Creativity level",
        })
        .option("max-tokens", {
          type: "number",
          description: "Maximum number of tokens to generate",
        })
        .option("timeout", {
          type: "string",
          default: "2m",
          description: "Timeout for streaming (e.g., 30s, 2m, 1h)",
        })
        .option("model", {
          type: "string",
          description:
            "Specific model to use (e.g., gemini-2.5-pro, gemini-2.5-flash)",
        })
        .option("debug", {
          type: "boolean",
          default: false,
          description: "Enable debug mode with interleaved logging",
        })
        .option("disable-tools", {
          type: "boolean",
          default: false,
          description:
            "Disable MCP tool integration (tools enabled by default)",
        })
        .option("enable-analytics", {
          type: "boolean",
          default: false,
          description: "Enable usage analytics collection",
        })
        .option("enable-evaluation", {
          type: "boolean",
          default: false,
          description: "Enable AI response quality evaluation",
        })
        .option("evaluation-domain", {
          type: "string",
          description:
            "Domain expertise for evaluation (e.g., 'AI coding assistant', 'Customer service expert')",
        })
        .option("tool-usage-context", {
          type: "string",
          description:
            "Tool usage context for evaluation (e.g., 'Used sales-data MCP tools')",
        })
        .option("lighthouse-style", {
          type: "boolean",
          default: false,
          description: "Use Lighthouse-compatible domain-aware evaluation",
        })
        .option("context", {
          type: "string",
          description: "JSON context object for custom data",
        })
        .example('$0 stream "Tell me a story"', "Stream a story in real-time")
        .example(
          '$0 stream "What time is it?"',
          "Stream with natural tool integration (default)",
        )
        .example(
          '$0 stream "Tell me a story" --disable-tools',
          "Stream without tool integration",
        ),
    async (argv) => {
      // SOLUTION 1: Handle stdin input if no prompt provided
      if (!argv.prompt && !process.stdin.isTTY) {
        // Read from stdin
        let stdinData = "";
        process.stdin.setEncoding("utf8");

        for await (const chunk of process.stdin) {
          stdinData += chunk;
        }

        argv.prompt = stdinData.trim();

        if (!argv.prompt) {
          throw new Error("No input received from stdin");
        }
      } else if (!argv.prompt) {
        throw new Error(
          'Prompt required. Use: neurolink stream "your prompt" or echo "prompt" | neurolink stream',
        );
      }

      // Default mode: Simple streaming message
      // Debug mode: More detailed information
      if (!argv.quiet && !argv.debug) {
        console.log(chalk.blue("🔄 Streaming..."));
      } else if (!argv.quiet && argv.debug) {
        console.log(
          chalk.blue(
            `🔄 Streaming from ${argv.provider} provider with debug logging...\n`,
          ),
        );
      }

      try {
        // Parse context if provided
        let contextObj: Record<string, any> | undefined;
        if (argv.context) {
          try {
            contextObj = JSON.parse(argv.context);
          } catch {
            throw new Error("Invalid JSON provided for --context option");
          }
        }

        // Use standard SDK streaming - tools are handled automatically
        const sdk = new NeuroLink();
        const stream = await sdk.stream({
          input: { text: argv.prompt as string },
          provider:
            argv.provider === "auto"
              ? undefined
              : (argv.provider as AIProviderName),
          model: argv.model,
          temperature: argv.temperature,
          timeout: argv.timeout,
          disableTools: argv.disableTools === true, // Tools are enabled by default
          // NEW: Analytics and evaluation support
          enableAnalytics: argv.enableAnalytics as boolean,
          enableEvaluation: argv.enableEvaluation as boolean,
          context: contextObj,
        });

        // Process the stream
        for await (const chunk of stream.stream) {
          process.stdout.write(chunk.content);
        }

        if (!argv.quiet) {
          process.stdout.write("\n");
        }

        // Clean exit for tools-disabled streaming
        process.exit(0);
      } catch (error) {
        handleError(error as Error, "Text streaming");
      }
    },
  )

  // Batch Processing Command
  .command(
    "batch <file>",
    "Process multiple prompts from a file",
    (yargsInstance) =>
      yargsInstance
        .usage("Usage: $0 batch <file> [options]")
        .positional("file", {
          type: "string",
          description: "File with prompts (one per line)",
          demandOption: true,
        })
        .option("output", {
          type: "string",
          description: "Output file for results (default: stdout)",
        })
        .option("delay", {
          type: "number",
          default: 1000,
          description: "Delay between requests in milliseconds",
        })
        .option("provider", {
          choices: [
            "auto",
            "openai",
            "bedrock",
            "vertex",
            "google-vertex",
            "anthropic",
            "azure",
            "google-ai",
            "huggingface",
            "ollama",
            "mistral",
          ] as const,
          default: "auto",
          description: "AI provider to use",
        })
        .option("timeout", {
          type: "string",
          default: "30s",
          description: "Timeout for each request (e.g., 30s, 2m, 1h)",
        })
        .option("temperature", {
          type: "number",
          description: "Global temperature for batch jobs",
        })
        .option("max-tokens", {
          type: "number",
          description: "Global max tokens for batch jobs",
        })
        .option("system", {
          type: "string",
          description: "Global system prompt for batch jobs",
        })
        .option("debug", {
          type: "boolean",
          default: false,
          description: "Enable debug mode with detailed per-item logging",
        })
        .example(
          "$0 batch prompts.txt --output results.json",
          "Process and save to file",
        ),
    async (argv) => {
      const spinner = argv.quiet ? null : ora().start();
      try {
        if (!fs.existsSync(argv.file as string)) {
          throw new Error(`File not found: ${argv.file}`);
        }

        const buffer = fs.readFileSync(argv.file as string);
        const isLikelyBinary =
          buffer.includes(0) ||
          buffer.toString("hex", 0, 100).includes("0000") ||
          (!buffer.toString("utf8", 0, 1024).includes("\n") &&
            buffer.length > 512);
        if (isLikelyBinary) {
          throw new Error(
            `Invalid file format: Binary file detected at "${argv.file}". Batch processing requires a plain text file.`,
          );
        }

        const prompts = buffer
          .toString("utf8")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        if (prompts.length === 0) {
          throw new Error("No prompts found in file");
        }

        if (spinner) {
          spinner.text = `📦 Processing ${prompts.length} prompts...`;
        } else if (!argv.quiet) {
          console.log(
            chalk.blue(`📦 Processing ${prompts.length} prompts...\n`),
          );
        }

        const results: Array<{
          prompt: string;
          response?: string;
          error?: string;
        }> = [];
        for (let i = 0; i < prompts.length; i++) {
          if (spinner) {
            spinner.text = `Processing ${i + 1}/${prompts.length}: ${prompts[i].substring(0, 30)}...`;
          }
          try {
            const result = await sdk.generate({
              input: { text: prompts[i] },
              provider:
                argv.provider === "auto"
                  ? undefined
                  : (argv.provider as AIProviderName | undefined),
              temperature: argv.temperature,
              maxTokens: argv.maxTokens,
              systemPrompt: argv.system,
              timeout: argv.timeout,
            });
            results.push({ prompt: prompts[i], response: result.content });
            if (spinner) {
              spinner.render();
            } // Update spinner without changing text
          } catch (error) {
            results.push({
              prompt: prompts[i],
              error: (error as Error).message,
            });
            if (spinner) {
              spinner.render();
            }
          }
          if (argv.delay && i < prompts.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, argv.delay));
          }
        }

        if (spinner) {
          spinner.succeed(chalk.green("✅ Batch processing complete!"));
        }
        const outputData = JSON.stringify(results, null, 2);
        if (argv.output) {
          fs.writeFileSync(argv.output, outputData);
          if (!argv.quiet) {
            console.log(chalk.green(`\n✅ Results saved to ${argv.output}`));
          }
        } else {
          process.stdout.write(outputData + "\n");
        }
      } catch (error) {
        if (spinner) {
          spinner.fail();
        }
        handleError(error as Error, "Batch processing");
      }
    },
  )

  // Provider Command Group (Corrected Structure)
  .command(
    "provider <subcommand>",
    "Manage AI provider configurations and status",
    (yargsProvider) => {
      // Builder for the main 'provider' command
      yargsProvider
        .usage("Usage: $0 provider <subcommand> [options]") // Add usage here
        .command(
          "status",
          "Check status of all configured AI providers",
          (y) =>
            y
              .usage("Usage: $0 provider status [options]")
              .option("verbose", {
                type: "boolean",
                alias: "v",
                description: "Show detailed information",
              }) // Default is handled by middleware if NEUROLINK_DEBUG is set
              .example("$0 provider status", "Check all providers")
              .example(
                "$0 provider status --verbose",
                "Show detailed status information",
              ),
          async (argv) => {
            if (argv.verbose && !argv.quiet) {
              console.log(
                chalk.yellow(
                  "ℹ️ Verbose mode enabled. Displaying detailed status.\n",
                ),
              ); // Added newline
            }
            const spinner = argv.quiet
              ? null
              : ora("🔍 Checking AI provider status...\n").start();

            const providers = [
              "openai",
              "bedrock",
              "vertex",
              "google-vertex",
              "anthropic",
              "azure",
              "google-ai",
              "huggingface",
              "ollama",
              "mistral",
            ] as const;

            // Import hasProviderEnvVars to check environment variables
            const { hasProviderEnvVars } = await import(
              "../lib/utils/providerUtils.js"
            );

            const results: Array<{
              provider: string;
              status: string;
              configured: boolean;
              authenticated?: boolean;
              responseTime?: number;
              error?: string;
            }> = [];

            for (const p of providers) {
              if (spinner) {
                spinner.text = `Testing ${p}...`;
              }

              // First check if provider has env vars configured
              const hasEnvVars = hasProviderEnvVars(p);

              if (!hasEnvVars && p !== "ollama") {
                // No env vars, don't even try to test
                results.push({
                  provider: p,
                  status: "not-configured",
                  configured: false,
                  error: "Missing required environment variables",
                });
                if (spinner) {
                  spinner.fail(
                    `${p}: ${chalk.gray("⚪ Not configured")} - Missing environment variables`,
                  );
                } else if (!argv.quiet) {
                  console.log(
                    `${p}: ${chalk.gray("⚪ Not configured")} - Missing environment variables`,
                  );
                }
                continue;
              }

              // Special handling for Ollama
              if (p === "ollama") {
                try {
                  // First, check if the service is running
                  const serviceResponse = await fetch(
                    "http://localhost:11434/api/tags",
                    {
                      method: "GET",
                      signal: AbortSignal.timeout(2000),
                    },
                  );

                  if (!serviceResponse.ok) {
                    throw new Error("Ollama service not responding");
                  }

                  // Service is running, now check if the default model is available
                  const { models } = await serviceResponse.json();
                  const defaultOllamaModel = "llama3.2:latest";
                  const modelIsAvailable = models.some(
                    (m: any) => m.name === defaultOllamaModel,
                  );

                  if (modelIsAvailable) {
                    results.push({
                      provider: p,
                      status: "working",
                      configured: true,
                      authenticated: true,
                      responseTime: 0,
                    });
                    if (spinner) {
                      spinner.succeed(
                        `${p}: ${chalk.green("✅ Working")} - Service running and model '${defaultOllamaModel}' is available.`,
                      );
                    }
                  } else {
                    results.push({
                      provider: p,
                      status: "failed",
                      configured: true,
                      authenticated: false,
                      error: `Ollama service is running, but model '${defaultOllamaModel}' is not found. Please run 'ollama pull ${defaultOllamaModel}'.`,
                    });
                    if (spinner) {
                      spinner.fail(
                        `${p}: ${chalk.red("❌ Model Not Found")} - Run 'ollama pull ${defaultOllamaModel}'`,
                      );
                    }
                  }
                } catch (error) {
                  results.push({
                    provider: p,
                    status: "failed",
                    configured: false,
                    authenticated: false,
                    error:
                      "Ollama is not running. Please start with: ollama serve",
                  });
                  if (spinner) {
                    spinner.fail(
                      `${p}: ${chalk.red("❌ Failed")} - Service not running`,
                    );
                  }
                }
                continue;
              }

              // Provider has env vars, now test authentication
              try {
                const start = Date.now();

                // Add timeout to prevent hanging
                const testPromise = sdk.generate({
                  input: { text: "test" },
                  provider: p as any,
                  maxTokens: 1,
                  disableTools: true, // Disable tools for faster status check
                });

                const timeoutPromise = new Promise((_, reject) => {
                  setTimeout(
                    () => reject(new Error("Provider test timeout (5s)")),
                    5000,
                  );
                });

                await Promise.race([testPromise, timeoutPromise]);
                const duration = Date.now() - start;

                results.push({
                  provider: p,
                  status: "working",
                  configured: true,
                  authenticated: true,
                  responseTime: duration,
                });
                if (spinner) {
                  spinner.succeed(
                    `${p}: ${chalk.green("✅ Working")} (${duration}ms)`,
                  );
                } else if (!argv.quiet) {
                  console.log(
                    `${p}: ${chalk.green("✅ Working")} (${duration}ms)`,
                  );
                }
              } catch (error) {
                const errorMsg = (error as Error).message.includes("timeout")
                  ? "Connection timeout"
                  : (error as Error).message.split("\n")[0];

                results.push({
                  provider: p,
                  status: "failed",
                  configured: true,
                  authenticated: false,
                  error: errorMsg,
                });
                if (spinner) {
                  spinner.fail(`${p}: ${chalk.red("❌ Failed")} - ${errorMsg}`);
                } else if (!argv.quiet) {
                  console.error(
                    `${p}: ${chalk.red("❌ Failed")} - ${errorMsg}`,
                  );
                }
              }
            }

            const working = results.filter(
              (r) => r.status === "working",
            ).length;
            const configured = results.filter((r) => r.configured).length;

            if (spinner) {
              spinner.info(
                chalk.blue(
                  `\n📊 Summary: ${working}/${results.length} providers working, ${configured}/${results.length} configured`,
                ),
              );
            } else if (!argv.quiet) {
              console.log(
                chalk.blue(
                  `\n📊 Summary: ${working}/${results.length} providers working, ${configured}/${results.length} configured`,
                ),
              );
            }

            if (argv.verbose && !argv.quiet) {
              console.log(chalk.blue("\n📋 Detailed Results:"));
              console.log(JSON.stringify(results, null, 2));
            }
          },
        )
        .demandCommand(1, "")
        .example("$0 provider status", "Check all providers");
    },
  )

  // Status command alias
  .command(
    "status",
    "Check AI provider connectivity and performance (alias for provider status)",
    (yargsConfig) =>
      yargsConfig
        .usage("Usage: $0 status [options]")
        .option("verbose", {
          type: "boolean",
          alias: "v",
          description: "Show detailed information",
        })
        .option("quiet", {
          type: "boolean",
          alias: "q",
          description: "Suppress non-essential output",
        })
        .example("$0 status", "Quick provider status check")
        .example("$0 status --verbose", "Show detailed status information"),
    async (argv) => {
      // Direct implementation instead of redirect to avoid recursion
      const { CLICommandFactory } = await import(
        "./factories/command-factory.js"
      );
      const commandFactory = new CLICommandFactory();
      await commandFactory.executeProviderStatus(argv);
    },
  )

  // Configuration Command Group
  .command(
    "config <subcommand>",
    "Manage NeuroLink configuration",
    (yargsConfig) => {
      yargsConfig
        .usage("Usage: $0 config <subcommand> [options]")
        .command(
          "export",
          "Export current configuration",
          (y) =>
            y
              .usage("Usage: $0 config export [options]")
              .option("output", {
                type: "string",
                alias: "o",
                description: "Output file for configuration",
              })
              .example("$0 config export", "Export to stdout")
              .example("$0 config export -o config.json", "Export to file"),
          async (argv) => {
            try {
              const config = {
                providers: {
                  openai: !!process.env.OPENAI_API_KEY,
                  bedrock: !!(
                    process.env.AWS_ACCESS_KEY_ID &&
                    process.env.AWS_SECRET_ACCESS_KEY
                  ),
                  vertex: !!(
                    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
                    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
                    (process.env.GOOGLE_AUTH_CLIENT_EMAIL &&
                      process.env.GOOGLE_AUTH_PRIVATE_KEY)
                  ),
                  anthropic: !!process.env.ANTHROPIC_API_KEY,
                  azure: !!(
                    process.env.AZURE_OPENAI_API_KEY &&
                    process.env.AZURE_OPENAI_ENDPOINT
                  ),
                  "google-ai": !!process.env.GOOGLE_AI_API_KEY,
                },
                defaults: {
                  temperature: 0.7,
                  maxTokens: 500,
                },
                timestamp: new Date().toISOString(),
              };

              const output = JSON.stringify(config, null, 2);
              if (argv.output) {
                fs.writeFileSync(argv.output, output);
                if (!argv.quiet) {
                  console.log(
                    chalk.green(`✅ Configuration exported to ${argv.output}`),
                  );
                }
              } else {
                process.stdout.write(output + "\n");
              }
            } catch (error) {
              handleError(error as Error, "Configuration export");
            }
          },
        )
        .demandCommand(1, "")
        .example("$0 config export", "Export configuration");
    },
  )

  // Get Best Provider Command
  .command(
    "get-best-provider",
    "Show the best available AI provider",
    (yargsInstance) =>
      yargsInstance
        .usage("Usage: $0 get-best-provider [options]")
        .option("format", {
          choices: ["text", "json"] as const,
          default: "text",
          description: "Output format",
        })
        .example("$0 get-best-provider", "Show best provider")
        .example("$0 get-best-provider --format json", "Show in JSON format"),
    async (argv) => {
      try {
        const { getBestProvider } = await import(
          "../lib/utils/providerUtils-fixed.js"
        );
        const bestProvider = await getBestProvider();

        if (argv.format === "json") {
          process.stdout.write(
            JSON.stringify({ provider: bestProvider }, null, 2) + "\n",
          );
        } else {
          if (!argv.quiet) {
            console.log(
              chalk.green(`🎯 Best available provider: ${bestProvider}`),
            );
          } else {
            process.stdout.write(bestProvider + "\n");
          }
        }
      } catch (error) {
        handleError(error as Error, "Provider selection");
      }
    },
  )

  // Completion Command
  .command(
    "completion",
    "Generate shell completion script",
    (yargsInstance) =>
      yargsInstance
        .usage("Usage: $0 completion")
        .example("$0 completion >> ~/.bashrc", "Add to bash")
        .example("$0 completion >> ~/.zshrc", "Add to zsh"),
    async (argv) => {
      cli.showCompletionScript();
    },
  );

// Add NEW Generate Command (Primary)
cli.command(CLICommandFactory.createGenerateCommand());

// Add MCP Commands
addMCPCommands(cli);

// Add Ollama Commands
addOllamaCommands(cli);

// Execute CLI
(async () => {
  try {
    // Initialize CLI with manual MCP support
    await initializeCLI();

    // Parse and execute commands
    await cli.parse();
  } catch (error) {
    // Global error handler - should not reach here due to fail() handler
    process.stderr.write(
      chalk.red(`Unexpected CLI error: ${(error as Error).message}\n`),
    );
    process.exit(1);
  }
})();
