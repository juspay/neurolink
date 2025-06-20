import type { CommandModule } from "yargs";
import { AgentEnhancedProvider } from "../../lib/providers/agent-enhanced-provider.js";
import ora from "ora";
import chalk from "chalk";

export const agentGenerateCommand: CommandModule = {
  command: "agent-generate <prompt>",
  describe: "Generate text with agent capabilities (tool calling)",
  builder: (yargs) =>
    yargs
      .positional("prompt", {
        describe: "The prompt for the agent",
        type: "string",
      })
      .option("provider", {
        alias: "p",
        describe: "The AI provider to use",
        type: "string",
        choices: ["google-ai", "openai", "anthropic"],
        default: "google-ai",
      })
      .option("model", {
        alias: "m",
        describe: "The model to use",
        type: "string",
      })
      .option("toolCategory", {
        alias: "t",
        describe: "The category of tools to use",
        type: "string",
        choices: ["basic", "filesystem", "utility", "all"],
        default: "all",
      }),
  handler: async (argv: any) => {
    const { prompt, provider, model, toolCategory } = argv;

    const spinner = ora(
      `Generating response with ${provider} agent...`,
    ).start();

    try {
      const agentProvider = new AgentEnhancedProvider({
        provider,
        model,
        toolCategory,
      });

      const result = await agentProvider.generateText(prompt);

      if (result) {
        spinner.succeed("Response generated successfully!");
        console.log(chalk.green("\nAI Response:"));
        console.log(result.text);

        if (result.toolCalls && result.toolCalls.length > 0) {
          console.log(chalk.yellow("\nTools Called:"));
          for (const call of result.toolCalls) {
            console.log(`- ${call.toolName}`);
            console.log(`  Args: ${JSON.stringify(call.args)}`);
          }
        }
        if (result.toolResults && result.toolResults.length > 0) {
          console.log(chalk.blue("\nTool Results:"));
          for (const toolResult of result.toolResults as any) {
            console.log(`- ${toolResult.toolName}`);
            console.log(`  Result: ${JSON.stringify(toolResult.result)}`);
          }
        }
      } else {
        spinner.fail("Failed to generate response.");
      }
    } catch (error) {
      spinner.fail("An error occurred during generation.");
      console.error(chalk.red(error));
      process.exit(1);
    }
  },
};
