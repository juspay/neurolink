import type { CommandModule } from "yargs";
import { NeuroLink } from "../../lib/neurolink.js";
import type { AIProviderName } from "../../lib/index.js";
import ora from "ora";
import chalk from "chalk";

interface GenerateCommandArgs {
  input: string;
  provider: AIProviderName;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  timeout?: string;
  disableTools?: boolean;
  enableAnalytics?: boolean;
  enableEvaluation?: boolean;
  outputFormat?: "text" | "structured" | "json";
  debug?: boolean;
}

/**
 * CLI Command Factory for generate commands
 */
export class CLICommandFactory {
  /**
   * Create the new primary 'generate' command
   */
  static createGenerateCommand(): CommandModule {
    return {
      command: "generate <input>",
      describe: "Generate content using AI (primary command)",
      builder: (yargs) => {
        return yargs
          .positional("input", {
            describe: "Text input for generation",
            type: "string",
          })
          .option("provider", {
            describe: "AI provider to use",
            type: "string",
            choices: [
              "google-ai",
              "vertex",
              "openai",
              "anthropic",
              "bedrock",
              "azure",
              "huggingface",
              "ollama",
              "mistral",
            ],
            default: "google-ai",
          })
          .option("model", {
            describe: "Specific model to use",
            type: "string",
          })
          .option("temperature", {
            describe: "Temperature (0-1)",
            type: "number",
          })
          .option("max-tokens", {
            describe: "Maximum tokens",
            type: "number",
          })
          .option("system-prompt", {
            describe: "System prompt",
            type: "string",
          })
          .option("timeout", {
            describe: "Timeout (e.g., 30s, 2m)",
            type: "string",
          })
          .option("disable-tools", {
            describe: "Disable MCP tools",
            type: "boolean",
            default: false,
          })
          .option("enable-analytics", {
            describe: "Enable usage analytics",
            type: "boolean",
            default: false,
          })
          .option("enable-evaluation", {
            describe: "Enable AI quality evaluation",
            type: "boolean",
            default: false,
          })
          .option("output-format", {
            describe: "Output format",
            type: "string",
            choices: ["text", "structured", "json"],
            default: "text",
          })
          .option("debug", {
            describe: "Enable debug output",
            type: "boolean",
            default: false,
          });
      },
      handler: async (argv) =>
        await CLICommandFactory.executeGenerate(
          argv as unknown as GenerateCommandArgs,
        ),
    };
  }

  /**
   * Execute the generate command
   */
  private static async executeGenerate(argv: GenerateCommandArgs) {
    const spinner = ora("Generating content...").start();

    try {
      const sdk = new NeuroLink();

      const result = await sdk.generate({
        input: { text: argv.input },
        output: { format: argv.outputFormat },
        provider: argv.provider as AIProviderName,
        model: argv.model,
        temperature: argv.temperature,
        maxTokens: argv.maxTokens,
        systemPrompt: argv.systemPrompt,
        timeout: argv.timeout,
        enableAnalytics: argv.enableAnalytics,
        enableEvaluation: argv.enableEvaluation,
      });

      spinner.succeed("Content generated successfully!");

      console.log("\n" + chalk.cyan("Generated Content:"));
      console.log(result.content);

      if (argv.debug) {
        console.log("\n" + chalk.yellow("Debug Information:"));
        console.log("Provider:", result.provider);
        console.log("Model:", result.model);
        if (result.analytics) {
          console.log("Analytics:", JSON.stringify(result.analytics, null, 2));
        }
        if (result.evaluation) {
          console.log(
            "Evaluation:",
            JSON.stringify(result.evaluation, null, 2),
          );
        }
      }

      // Exit successfully
      process.exit(0);
    } catch (error) {
      spinner.fail("Generation failed");
      console.error(chalk.red("Error:"), error);
      process.exit(1);
    }
  }
}
