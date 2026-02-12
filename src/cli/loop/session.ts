import chalk from "chalk";
import readline from "readline";
import type { Argv } from "yargs";
import { checkContextBudget } from "../../lib/context/budgetChecker.js";
import { NeuroLink } from "../../lib/neurolink.js";
import { globalSession } from "../../lib/session/globalSessionState.js";
import type {
  OptionSchema,
  RestorationToolContext,
  SessionRestoreResult,
} from "../../lib/types/cli.js";
import type {
  ConversationData,
  ConversationMemoryConfig,
  NeurolinkOptions,
} from "../../lib/types/conversation.js";
import { logger } from "../../lib/utils/logger.js";
import {
  displayConversationPreview,
  displaySessionMessage,
  getConversationPreview,
  loadCommandHistory,
  parseValue,
  restoreSessionVariables,
  saveCommandToHistory,
  verifyConversationContext,
} from "../../lib/utils/loopUtils.js";
import { handleError } from "../errorHandler.js";
import { ConversationSelector } from "./conversationSelector.js";
import { textGenerationOptionsSchema } from "./optionsSchema.js";

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
  private commandHistory: string[] = [];

  private sessionVariablesSchema: Record<string, OptionSchema> =
    textGenerationOptionsSchema;

  constructor(
    initializeCliParser: () => Argv,
    private conversationMemoryConfig?: ConversationMemoryConfig,
    private options?: {
      directResumeSessionId?: string;
      forceNewSession?: boolean;
    },
  ) {
    this.initializeCliParser = initializeCliParser;
  }

  public async start(): Promise<void> {
    // Initialize global session state
    this.sessionId = globalSession.setLoopSession(
      this.conversationMemoryConfig,
    );

    // Load command history from global file, reverse once for most recent first
    this.commandHistory = (await loadCommandHistory()).reverse();

    this.isRunning = true;
    logger.always(chalk.bold.green(NEUROLINK_BANNER));
    logger.always(chalk.bold.green("Welcome to NeuroLink Loop Mode!"));

    // Check for direct CLI options
    const directResumeSessionId = this.options?.directResumeSessionId;
    const forceNewSession = this.options?.forceNewSession;

    // Handle conversation discovery and selection if memory is enabled
    if (this.conversationMemoryConfig?.enabled) {
      logger.always(chalk.gray("Conversation memory enabled"));

      // Handle direct resume option
      if (directResumeSessionId) {
        await this.handleDirectSessionResume(directResumeSessionId);
      }
      // Handle force new session option
      else if (forceNewSession) {
        logger.always(chalk.blue("Force starting new conversation..."));
        this.sessionId = globalSession.setLoopSession(
          this.conversationMemoryConfig,
        );
      }
      // Default behavior: check for existing conversations
      else {
        await this.handleConversationSelection();
      }

      // Display session information
      logger.always(chalk.gray(`Session ID: ${this.sessionId}`));
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
    } else {
      // No conversation memory - just create a new session
      this.sessionId = globalSession.setLoopSession(
        this.conversationMemoryConfig,
      );
      logger.always(chalk.gray(`Session ID: ${this.sessionId}`));
    }

    // Load command history from global file
    this.commandHistory = (await loadCommandHistory()).reverse();

    logger.always(chalk.gray('Type "help" for a list of commands.'));
    logger.always(
      chalk.gray('Type "exit", "quit", or ":q" to leave the loop.'),
    );

    while (this.isRunning) {
      try {
        // Use readline with history support instead of inquirer
        const command = await this.getCommandWithHistory();

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

        // Save command to history
        if (command && command.trim()) {
          this.commandHistory.unshift(command);
          await saveCommandToHistory(command);
        }

        let processedCommand: string | string[];
        if (command.startsWith("//")) {
          // Escape sequence - treat as stream with single /
          processedCommand = ["stream", command.slice(1)];
        } else if (command.startsWith("/")) {
          // Explicit CLI command: remove "/" prefix
          processedCommand = command.slice(1).trim();
          if (!processedCommand) {
            logger.always(chalk.red("Type 'help' for available commands."));
            continue;
          }
          // Handle session variable commands and skip further processing
          if (await this.handleSessionCommands(processedCommand)) {
            continue;
          }
        } else {
          // Default: treat as stream command with array format
          processedCommand = ["stream", command];
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
          .parse(processedCommand);

        // Check context budget after each generation command
        await this.checkContextBudgetWarning();
      } catch (error) {
        // Handle command execution errors gracefully
        handleError(error as Error, "Command execution failed");
      }
    }

    // Cleanup on exit
    this.cleanup();
  }

  /**
   * Handle direct session resume from CLI option
   */
  private async handleDirectSessionResume(
    directResumeSessionId: string,
  ): Promise<void> {
    logger.always(
      chalk.blue(
        `Attempting to resume session: ${directResumeSessionId.slice(0, 12)}...`,
      ),
    );

    try {
      const restoreResult = await this.restoreSession(directResumeSessionId);

      if (restoreResult.success) {
        displaySessionMessage(restoreResult);
        this.sessionId = directResumeSessionId;

        // Display conversation preview
        const preview = await getConversationPreview(directResumeSessionId, 2);
        displayConversationPreview(preview, 2);
      } else {
        displaySessionMessage(restoreResult);
        logger.always(chalk.yellow("Starting new conversation instead..."));
        this.sessionId = globalSession.setLoopSession(
          this.conversationMemoryConfig,
        );
      }
    } catch (error) {
      logger.error(`Failed to resume session ${directResumeSessionId}:`, error);
      logger.always(chalk.yellow("Starting new conversation instead..."));
      this.sessionId = globalSession.setLoopSession(
        this.conversationMemoryConfig,
      );
    }
  }

  /**
   * Handle conversation selection logic when no direct resume is specified
   */
  private async handleConversationSelection(): Promise<void> {
    logger.always(chalk.gray("Checking for existing conversations...\n"));

    try {
      const conversationSelector = new ConversationSelector();

      // Check if there are any stored conversations
      const hasStoredConversations =
        await conversationSelector.hasStoredConversations();

      if (hasStoredConversations) {
        // Show conversation selection menu
        const selectedSessionId =
          await conversationSelector.displayConversationMenu();

        if (selectedSessionId !== "NEW_CONVERSATION") {
          // Restore the selected conversation
          logger.always(chalk.blue("Restoring conversation..."));

          const restoreResult = await this.restoreSession(selectedSessionId);

          if (restoreResult.success) {
            displaySessionMessage(restoreResult);
            this.sessionId = selectedSessionId;

            // Display conversation preview
            const preview = await getConversationPreview(selectedSessionId, 2);
            displayConversationPreview(preview, 2);
          } else {
            displaySessionMessage(restoreResult);
            logger.always(chalk.yellow("Starting new conversation instead..."));
            this.sessionId = globalSession.setLoopSession(
              this.conversationMemoryConfig,
            );
          }
        } else {
          // User chose to start new conversation
          logger.always(chalk.blue("Starting new conversation..."));
          this.sessionId = globalSession.setLoopSession(
            this.conversationMemoryConfig,
          );
        }
      } else {
        // No existing conversations found
        logger.always(chalk.gray("No existing conversations found."));
        logger.always(chalk.blue("Starting new conversation..."));
        this.sessionId = globalSession.setLoopSession(
          this.conversationMemoryConfig,
        );
      }

      // Close the conversation selector
      await conversationSelector.close();
    } catch (error) {
      logger.warn("Failed to check for existing conversations:", error);
      logger.always(chalk.yellow("Starting new conversation..."));
      this.sessionId = globalSession.setLoopSession(
        this.conversationMemoryConfig,
      );
    }
  }

  /**
   * Check context budget and warn if approaching limits.
   */
  private async checkContextBudgetWarning(): Promise<void> {
    const compactionConfig = this.conversationMemoryConfig?.contextCompaction;
    if (!compactionConfig?.enabled) {
      return;
    }
    try {
      const provider =
        (globalSession.getSessionVariable("provider") as string) || "openai";
      const model = globalSession.getSessionVariable("model") as
        | string
        | undefined;
      const neurolinkInstance = globalSession.getOrCreateNeuroLink();
      if (!neurolinkInstance?.conversationMemory || !this.sessionId) {
        return;
      }
      const messages =
        await neurolinkInstance.conversationMemory.buildContextMessages(
          this.sessionId,
        );
      if (!messages || messages.length === 0) {
        return;
      }
      const budgetResult = checkContextBudget({
        provider,
        model,
        conversationMessages: messages.map(
          (m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          }),
        ),
      });
      const usagePercent = budgetResult.usageRatio * 100;
      if (budgetResult.shouldCompact) {
        logger.always(
          chalk.yellow(
            `\n  Context usage: ${usagePercent.toFixed(0)}% of window (${budgetResult.estimatedInputTokens.toLocaleString()} / ${budgetResult.availableInputTokens.toLocaleString()} tokens)`,
          ),
        );
        logger.always(
          chalk.yellow(
            `  Auto-compaction will trigger to preserve conversation quality.\n`,
          ),
        );
      } else if (usagePercent > 60) {
        logger.always(
          chalk.gray(`  Context: ${usagePercent.toFixed(0)}% used`),
        );
      }
    } catch (error) {
      logger.debug("Context budget check failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Clean up session resources and connections
   */
  private cleanup(): void {
    try {
      globalSession.clearLoopSession();
      logger.always(chalk.yellow("Loop session ended."));
    } catch (error) {
      // Silently handle cleanup errors to avoid hanging
      logger.error("Error during cleanup:", error);
    }
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
          let value = parseValue(valueStr);

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

  /**
   * Get command input with history support using readline
   */
  private async getCommandWithHistory(): Promise<string> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        history: [...this.commandHistory], // most recent first
        prompt: `${chalk.blue.green("⎔")} ${chalk.blue.bold("neurolink")} ${chalk.blue.green("»")} `,
      });

      rl.prompt();
      rl.on("line", (input) => {
        rl.close();
        resolve(input.trim());
      });

      rl.on("SIGINT", () => {
        rl.close();
        this.isRunning = false;
        resolve("exit");
      });
    });
  }

  // === SESSION RESTORATION METHODS ===

  /**
   * Restore a conversation session and set up the global session state
   */
  private async restoreSession(
    sessionId: string,
    userId?: string,
  ): Promise<SessionRestoreResult> {
    // Local helper for creating failure results with bound sessionId
    const createFailure = (error: string): SessionRestoreResult => ({
      success: false,
      sessionId,
      messageCount: 0,
      error,
    });

    try {
      logger.debug(`Attempting to restore session: ${sessionId}`);

      // 1. Create NeuroLink instance and validate conversation in one step
      const { neurolinkInstance, conversationData } =
        await this.createAndValidateNeurolinkInstance(sessionId, userId);

      if (!conversationData) {
        return createFailure(
          `Conversation ${sessionId} not found or inaccessible`,
        );
      }

      // 2. Set up tool execution context
      await this.configureToolContext(neurolinkInstance, sessionId, userId);

      // 3. Restore global session state
      this.restoreGlobalSessionState(
        sessionId,
        neurolinkInstance,
        conversationData,
      );

      // 4. Verify conversation context accessibility
      await verifyConversationContext(sessionId);

      const result: SessionRestoreResult = {
        success: true,
        sessionId,
        messageCount: conversationData.messages?.length || 0,
        lastActivity: conversationData.updatedAt,
      };

      logger.info(`Session restored successfully: ${sessionId}`, {
        messageCount: result.messageCount,
        lastActivity: result.lastActivity,
      });

      return result;
    } catch (error) {
      logger.error(`Failed to restore session ${sessionId}:`, error);
      return createFailure(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Create NeuroLink instance and validate conversation in one step
   * Eliminates redundant instance creation and initialization
   */
  private async createAndValidateNeurolinkInstance(
    sessionId: string,
    userId?: string,
  ): Promise<{
    neurolinkInstance: NeuroLink;
    conversationData: ConversationData | null;
  }> {
    // Create NeuroLink instance with proper configuration
    const neurolinkOptions: NeurolinkOptions = {};

    if (this.conversationMemoryConfig?.enabled) {
      neurolinkOptions.conversationMemory = {
        enabled: true,
        maxSessions: this.conversationMemoryConfig.maxSessions,
        maxTurnsPerSession: this.conversationMemoryConfig.maxTurnsPerSession,
      };
      neurolinkOptions.sessionId = sessionId;
    }

    const neurolinkInstance = new NeuroLink(neurolinkOptions);
    await neurolinkInstance.ensureConversationMemoryInitialized();

    // Use the same instance to validate conversation exists
    try {
      const messages =
        await neurolinkInstance.getConversationHistory(sessionId);

      if (!messages || messages.length === 0) {
        logger.debug(`No conversation messages found for session ${sessionId}`);
        return { neurolinkInstance, conversationData: null };
      }

      // Create conversation object with available data
      const conversationData: ConversationData = {
        id: sessionId,
        sessionId,
        userId: userId || "unknown",
        messages,
        createdAt: new Date().toISOString(), // Fallback
        updatedAt: new Date().toISOString(), // Fallback
        title:
          messages[0]?.content?.slice(0, 50) + "..." || "Untitled Conversation",
      };

      return { neurolinkInstance, conversationData };
    } catch (error) {
      logger.debug(
        `Error accessing conversation for session ${sessionId}:`,
        error,
      );
      return { neurolinkInstance, conversationData: null };
    }
  }

  /**
   * Configure tool execution context for the restored session
   */
  private async configureToolContext(
    neurolinkInstance: NeuroLink,
    sessionId: string,
    userId?: string,
  ): Promise<void> {
    const toolContext: RestorationToolContext = {
      sessionId,
      userId: userId || "loop-user",
      source: "loop-mode",
      restored: true,
      timestamp: new Date().toISOString(),
    };

    neurolinkInstance.setToolContext(toolContext);
    logger.debug("Tool execution context configured for restored session", {
      sessionId,
      userId,
      hasToolContext: true,
    });

    await this.verifyToolAvailability(neurolinkInstance);
  }

  /**
   * Verify that tools are available and working in the restored session
   */
  private async verifyToolAvailability(
    neurolinkInstance: NeuroLink,
  ): Promise<void> {
    try {
      const availableTools = await neurolinkInstance.getAllAvailableTools();
      logger.debug(
        `Tools available in restored session: ${availableTools.length} tools`,
        {
          toolNames: availableTools.slice(0, 5).map((t) => t.name),
          hasFileTools: availableTools.some(
            (t) => t.name.includes("file") || t.name.includes("File"),
          ),
          hasDirectoryTools: availableTools.some(
            (t) => t.name.includes("directory") || t.name.includes("Directory"),
          ),
        },
      );

      if (availableTools.length === 0) {
        logger.warn(
          "No tools available in restored session - this may affect AI capabilities",
        );
      }
    } catch (error) {
      logger.warn(
        "Could not verify tool availability in restored session:",
        error,
      );
    }
  }

  /**
   * Restore global session state and session variables
   */
  private restoreGlobalSessionState(
    sessionId: string,
    neurolinkInstance: NeuroLink,
    conversationData?: ConversationData,
  ): void {
    globalSession.clearLoopSession();

    globalSession.restoreLoopSession(
      sessionId,
      neurolinkInstance,
      this.conversationMemoryConfig,
      {},
    );

    if (conversationData) {
      restoreSessionVariables(conversationData);
    }
  }
}
