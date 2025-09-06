import inquirer from "inquirer";
import type { Argv } from "yargs";
import chalk from "chalk";
import { logger } from "../../lib/utils/logger.js";
import { globalSession } from "../../lib/session/globalSessionState.js";
import type { ConversationMemoryConfig } from "../../lib/types/conversationTypes.js";
import { textGenerationOptionsSchema } from "./optionsSchema.js";
import type { OptionSchema } from "./optionsSchema.js";
import { handleError } from "../errorHandler.js";

// Banner Art
const NEUROLINK_BANNER = `
▗▖  ▗▖▗▄▄▄▖▗▖ ▗▖▗▄▄▖  ▗▄▖ ▗▖   ▗▄▄▄▖▗▖  ▗▖▗▖ ▗▖
▐▛▚▖▐▌▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌ ▐▌▐▌     █  ▐▛▚▖▐▌▐▌▗▞▘
▐▌ ▝▜▌▐▛▀▀▘▐▌ ▐▌▐▛▀▚▖▐▌ ▐▌▐▌     █  ▐▌ ▝▜▌▐▛▚▖ 
▐▌  ▐▌▐▙▄▄▖▝▚▄▞▘▐▌ ▐▌▝▚▄▞▘▐▙▄▄▖▗▄█▄▖▐▌  ▐▌▐▌ ▐▌
`;

export class LoopSession {
  private initializeCliParser: () => Argv;
  private isRunning = false;
  private sessionId?: string;

  private sessionVariablesSchema: Record<string, OptionSchema> =
    textGenerationOptionsSchema;

  constructor(
    initializeCliParser: () => Argv,
    private conversationMemoryConfig?: ConversationMemoryConfig,
  ) {
    this.initializeCliParser = initializeCliParser;
  }

  public async start(): Promise<void> {
    // Initialize global session state
    this.sessionId = globalSession.setLoopSession(
      this.conversationMemoryConfig,
    );

    this.isRunning = true;
    logger.always(chalk.bold.green(NEUROLINK_BANNER));
    logger.always(chalk.bold.green("Welcome to NeuroLink Loop Mode!"));

    if (this.conversationMemoryConfig?.enabled) {
      logger.always(chalk.gray(`Session ID: ${this.sessionId}`));
      logger.always(chalk.gray("Conversation memory enabled"));
      logger.always(
        chalk.gray(
          `Max sessions: ${this.conversationMemoryConfig.maxSessions}`,
        ),
      );
      logger.always(
        chalk.gray(
          `Max turns per session: ${this.conversationMemoryConfig.maxTurnsPerSession}\n`,
        ),
      );
    }

    logger.always(chalk.gray('Type "help" for a list of commands.'));
    logger.always(
      chalk.gray('Type "exit", "quit", or ":q" to leave the loop.'),
    );

    while (this.isRunning) {
      try {
        const answers = await inquirer
          .prompt([
            {
              type: "input",
              name: "command",
              message: chalk.blue.bold("neurolink"),
              prefix: chalk.blue.green("⎔"),
              suffix: chalk.blue.green(" »"),
            },
          ])
          .catch(() => {
            // This catch block handles the interruption of inquirer
            return { command: "" };
          });

        const command = answers.command.trim();

        if (
          command.toLowerCase() === "exit" ||
          command.toLowerCase() === "quit" ||
          command.toLowerCase() === ":q"
        ) {
          this.isRunning = false;
          continue;
        }
        if (!command) {
          continue;
        }

        // Handle session variable commands first
        if (await this.handleSessionCommands(command)) {
          continue;
        }

        // Execute the command
        // The .fail() handler in cli.ts is now session-aware and will
        // handle all parsing and validation errors without exiting the loop.
        // We create a fresh instance for each command to prevent state pollution.
        const yargsInstance = this.initializeCliParser();
        await yargsInstance
          .scriptName("")
          .fail((msg, err) => {
            // Re-throw the error to be caught by the outer catch block
            throw err || new Error(msg);
          })
          .exitProcess(false)
          .parse(command);
      } catch (error) {
        // Catch errors from the main loop (e.g., inquirer prompt itself failing)
        handleError(error as Error, "An unexpected error occurred");
      }
    }

    // Cleanup on exit
    globalSession.clearLoopSession();
    logger.always(chalk.yellow("Loop session ended."));
  }

  private async handleSessionCommands(command: string): Promise<boolean> {
    const parts = command.split(" ");
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case "help":
        this.showHelp();
        return true;

      case "set":
        if (parts.length === 2 && parts[1].toLowerCase() === "help") {
          this.showSetHelp();
        } else if (parts.length >= 3) {
          const key = parts[1];
          const schema =
            this.sessionVariablesSchema[
              key as keyof typeof this.sessionVariablesSchema
            ];

          if (!schema) {
            logger.always(
              chalk.red(`Error: Unknown session variable "${key}".`),
            );
            logger.always(
              chalk.gray('Use "set help" to see available variables.'),
            );
            return true;
          }

          const valueStr = parts.slice(2).join(" ");
          let value = this.parseValue(valueStr);

          // Validate type
          if (schema.type === "boolean" && typeof value !== "boolean") {
            logger.always(
              chalk.red(
                `Error: Invalid value for "${key}". Expected a boolean (true/false).`,
              ),
            );
            return true;
          }
          if (schema.type === "string") {
            if (typeof value === "number" || typeof value === "boolean") {
              value = String(value);
            } else if (typeof value !== "string") {
              logger.always(
                chalk.red(
                  `Error: Invalid value for "${key}". Expected a string.`,
                ),
              );
              return true;
            }
          }
          if (schema.type === "number" && typeof value !== "number") {
            logger.always(
              chalk.red(
                `Error: Invalid value for "${key}". Expected a number.`,
              ),
            );
            return true;
          }

          // Validate allowedValues
          if (
            schema.allowedValues &&
            !schema.allowedValues.includes(String(value))
          ) {
            logger.always(chalk.red(`Error: Invalid value for "${key}".`));
            logger.always(
              chalk.gray(
                `Allowed values are: ${schema.allowedValues.join(", ")}`,
              ),
            );
            return true;
          }

          globalSession.setSessionVariable(key, value);
          logger.always(chalk.green(`✓ ${key} set to ${value}`));
        } else {
          logger.always(chalk.red("Usage: set <key> <value> or set help"));
        }
        return true;

      case "get":
        if (parts.length >= 2) {
          const key = parts[1];
          const value = globalSession.getSessionVariable(key);
          if (value !== undefined) {
            logger.always(chalk.cyan(`${key}: ${value}`));
          } else {
            logger.always(chalk.yellow(`${key} is not set`));
          }
        } else {
          logger.always(chalk.red("Usage: get <key>"));
        }
        return true;

      case "unset":
        if (parts.length >= 2) {
          const key = parts[1];
          if (globalSession.unsetSessionVariable(key)) {
            logger.always(chalk.green(`✓ ${key} unset`));
          } else {
            logger.always(chalk.yellow(`${key} was not set`));
          }
        } else {
          logger.always(chalk.red("Usage: unset <key>"));
        }
        return true;

      case "show": {
        const variables = globalSession.getSessionVariables();
        if (Object.keys(variables).length > 0) {
          logger.always(chalk.cyan("Session Variables:"));
          for (const [key, value] of Object.entries(variables)) {
            logger.always(chalk.gray(`  ${key}: ${value}`));
          }
        } else {
          logger.always(chalk.yellow("No session variables set"));
        }
        return true;
      }

      case "clear":
        globalSession.clearSessionVariables();
        logger.always(chalk.green("✓ All session variables cleared"));
        return true;

      default:
        return false;
    }
  }

  private parseValue(value: string): string | number | boolean {
    // Try to parse as number
    if (!isNaN(Number(value))) {
      return Number(value);
    }
    // Try to parse as boolean
    if (value.toLowerCase() === "true") {
      return true;
    }
    if (value.toLowerCase() === "false") {
      return false;
    }
    // Return as string
    return value;
  }

  private showHelp(): void {
    logger.always(chalk.cyan("Available Loop Mode Commands:"));
    const commands = [
      {
        cmd: "help",
        desc: "Show this help message.",
      },
      {
        cmd: "set <key> <value>",
        desc: "Set a session variable. Use 'set help' for details.",
      },
      { cmd: "get <key>", desc: "Get a session variable." },
      { cmd: "unset <key>", desc: "Unset a session variable." },
      {
        cmd: "show",
        desc: "Show all currently set session variables.",
      },
      { cmd: "clear", desc: "Clear all session variables." },
      {
        cmd: "exit / quit / :q",
        desc: "Exit the loop mode.",
      },
    ];
    commands.forEach((c) => {
      logger.always(chalk.yellow(`  ${c.cmd.padEnd(20)}`) + `${c.desc}`);
    });
    logger.always(
      "\nAny other command will be executed as a standard neurolink CLI command.",
    );

    // Also show the standard help output
    this.initializeCliParser().showHelp("log");
  }

  private showSetHelp(): void {
    logger.always(chalk.cyan("Available Session Variables to Set:"));
    for (const [key, schema] of Object.entries(this.sessionVariablesSchema)) {
      logger.always(chalk.yellow(`  ${key}`));
      logger.always(`    ${schema.description}`);
      if (schema.allowedValues) {
        logger.always(
          chalk.gray(`    Allowed: ${schema.allowedValues.join(", ")}`),
        );
      } else {
        logger.always(chalk.gray(`    Type: ${schema.type}`));
      }
    }
  }
}
