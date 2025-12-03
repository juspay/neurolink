import type { Argv } from "yargs";
import { spawnSync } from "child_process";

import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";

import { logger } from "../../lib/utils/logger.js";
import { OllamaUtils } from "../utils/ollamaUtils.js";

export function addOllamaCommands(cli: Argv) {
  cli.command(
    "ollama <command>",
    "Manage Ollama local AI models",
    (yargs: Argv) => {
      return yargs
        .command(
          "list-models",
          "List installed Ollama models",
          {},
          listModelsHandler,
        )
        .command(
          "pull <model>",
          "Download an Ollama model",
          {
            model: {
              describe: "Model name to download",
              type: "string",
              demandOption: true,
            },
          },
          pullModelHandler,
        )
        .command(
          "remove <model>",
          "Remove an Ollama model",
          {
            model: {
              describe: "Model name to remove",
              type: "string",
              demandOption: true,
            },
          },
          removeModelHandler,
        )
        .command("status", "Check Ollama service status", {}, statusHandler)
        .command("start", "Start Ollama service", {}, startHandler)
        .command("stop", "Stop Ollama service", {}, stopHandler)
        .command("setup", "Interactive Ollama setup", {}, setupHandler)
        .demandCommand(1, "Please specify a command");
    },
    () => {}, // No-op handler
  );
}

async function listModelsHandler() {
  const spinner = ora("Fetching installed models...").start();
  try {
    const res = spawnSync("ollama", ["list"], { encoding: "utf8" });
    if (res.error) {
      throw res.error;
    }

    spinner.succeed("Installed models:");
    const output = res.stdout?.toString().trim();
    if (output) {
      logger.always(output);
    } else {
      logger.always(
        chalk.yellow(
          'No models installed. Use "neurolink ollama pull <model>" to download a model.',
        ),
      );
    }
  } catch (error: unknown) {
    spinner.fail("Failed to list models. Is Ollama installed?");
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(chalk.red("Error:", errorMessage));
    logger.always(chalk.blue("\nTip: Install Ollama from https://ollama.ai"));
    process.exit(1);
  }
}

async function pullModelHandler(argv: { model: string }) {
  const { model } = argv;
  logger.always(chalk.blue(`Downloading model: ${model}`));
  logger.always(chalk.gray("This may take several minutes..."));

  try {
    const res = spawnSync("ollama", ["pull", model], { stdio: "inherit" });
    if (res.error) {
      throw res.error;
    }
    if (res.status !== 0) {
      throw new Error(`ollama pull exited with code ${res.status}`);
    }

    logger.always(chalk.green(`\n✅ Successfully downloaded ${model}`));
    logger.always(
      chalk.blue(
        `\nTest it with: npx @juspay/neurolink generate "Hello!" --provider ollama --model ${model}`,
      ),
    );
  } catch (error: unknown) {
    logger.error(chalk.red(`\n❌ Failed to download ${model}`));
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(chalk.red("Error:", errorMessage));
    process.exit(1);
  }
}

async function removeModelHandler(argv: { model: string }) {
  const { model } = argv;

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `Are you sure you want to remove model "${model}"?`,
      default: false,
    },
  ]);

  if (!confirm) {
    logger.always(chalk.yellow("Removal cancelled."));
    return;
  }

  const spinner = ora(`Removing model ${model}...`).start();
  try {
    const res = spawnSync("ollama", ["rm", model], { encoding: "utf8" });
    if (res.error) {
      throw res.error;
    }
    if (res.status !== 0) {
      throw new Error(`ollama rm exited with ${res.status}`);
    }

    spinner.succeed(`Successfully removed ${model}`);
  } catch (_error: unknown) {
    spinner.fail(`Failed to remove ${model}`);
    const errorMessage =
      _error instanceof Error ? _error.message : String(_error);
    logger.error(chalk.red("Error:", errorMessage));
    process.exit(1);
  }
}

async function statusHandler() {
  const spinner = ora("Checking Ollama service status...").start();

  try {
    const res = spawnSync("ollama", ["list"], { encoding: "utf8" });
    if (res.error) {
      throw res.error;
    }
    if (res.status !== 0) {
      throw new Error("Ollama not running");
    }

    spinner.succeed("Ollama service is running");
  } catch (error: unknown) {
    spinner.fail("Ollama service is not running");
    logger.debug("Ollama status check failed:", error);
    logger.always(chalk.yellow("\nStart Ollama with: ollama serve"));
    process.exit(1);
  }
}

async function startHandler() {
  await OllamaUtils.startOllamaService();
}

async function stopHandler() {
  const spinner = ora("Stopping Ollama service...").start();

  try {
    if (process.platform === "darwin") {
      try {
        spawnSync("pkill", ["ollama"], { encoding: "utf8" });
      } catch {
        spawnSync("killall", ["Ollama"], { encoding: "utf8" });
      }
    } else if (process.platform === "linux") {
      try {
        spawnSync("systemctl", ["stop", "ollama"], { encoding: "utf8" });
      } catch {
        spawnSync("pkill", ["ollama"], { encoding: "utf8" });
      }
    } else {
      spawnSync("taskkill", ["/F", "/IM", "ollama.exe"], { encoding: "utf8" });
    }

    spinner.succeed("Ollama service stopped");
  } catch (err) {
    spinner.fail("Failed to stop Ollama service");
    logger.error(chalk.red("It may not be running or requires manual stop"));
    logger.error(chalk.red(`Error details: ${err}`));
  }
}

async function setupHandler() {
  logger.always(chalk.blue("🦙 Welcome to Ollama Setup!\n"));

  // Check installation
  const checkSpinner = ora("Checking Ollama installation...").start();
  let isInstalled = false;

  try {
    spawnSync("ollama", ["--version"], { encoding: "utf8" });
    isInstalled = true;
    checkSpinner.succeed("Ollama is installed");
  } catch {
    checkSpinner.fail("Ollama is not installed");
  }

  if (!isInstalled) {
    logger.always(chalk.yellow("\nOllama needs to be installed first."));
    logger.always(chalk.blue("\nInstallation instructions:"));

    if (process.platform === "darwin") {
      logger.always("\nFor macOS:");
      logger.always(chalk.gray("  brew install ollama"));
      logger.always(chalk.gray("  # or download from https://ollama.ai"));
    } else if (process.platform === "linux") {
      logger.always("\nFor Linux:");
      logger.always(
        chalk.gray("  curl -fsSL https://ollama.ai/install.sh | sh"),
      );
    } else {
      logger.always("\nFor Windows:");
      logger.always(chalk.gray("  Download from https://ollama.ai"));
    }

    const { proceedAnyway } = await inquirer.prompt([
      {
        type: "confirm",
        name: "proceedAnyway",
        message: "Would you like to continue with setup anyway?",
        default: false,
      },
    ]);

    if (!proceedAnyway) {
      logger.always(chalk.blue("\nInstall Ollama and run setup again!"));
      return;
    }
  }

  // Check if service is running
  let serviceRunning = false;
  try {
    spawnSync("ollama", ["list"], { encoding: "utf8" });
    serviceRunning = true;
    logger.always(chalk.green("\n✅ Ollama service is running"));
  } catch {
    logger.always(chalk.yellow("\n⚠️  Ollama service is not running"));

    const { startService } = await inquirer.prompt([
      {
        type: "confirm",
        name: "startService",
        message: "Would you like to start the Ollama service?",
        default: true,
      },
    ]);

    if (startService) {
      await startHandler();
      serviceRunning = true;
    }
  }

  if (serviceRunning) {
    // List available models
    logger.always(chalk.blue("\n📦 Popular Ollama models:"));
    logger.always("  • llama2 (7B) - General purpose");
    logger.always("  • codellama (7B) - Code generation");
    logger.always("  • mistral (7B) - Fast and efficient");
    logger.always("  • tinyllama (1B) - Lightweight");
    logger.always("  • phi (2.7B) - Microsoft's compact model");

    const { downloadModel } = await inquirer.prompt([
      {
        type: "confirm",
        name: "downloadModel",
        message: "Would you like to download a model?",
        default: true,
      },
    ]);

    if (downloadModel) {
      const { selectedModel } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedModel",
          message: "Select a model to download:",
          choices: [
            {
              name: "llama2 (7B) - Recommended for general use",
              value: "llama2",
            },
            {
              name: "codellama (7B) - Best for code generation",
              value: "codellama",
            },
            { name: "mistral (7B) - Fast and efficient", value: "mistral" },
            { name: "tinyllama (1B) - Lightweight, fast", value: "tinyllama" },
            { name: "phi (2.7B) - Microsoft's compact model", value: "phi" },
            { name: "Other (enter manually)", value: "other" },
          ],
        },
      ]);

      let modelToDownload = selectedModel;

      if (selectedModel === "other") {
        const { customModel } = await inquirer.prompt([
          {
            type: "input",
            name: "customModel",
            message: "Enter the model name:",
            validate: (input) =>
              input.trim().length > 0 || "Model name is required",
          },
        ]);
        modelToDownload = customModel;
      }

      await pullModelHandler({ model: modelToDownload });
    }
  }

  logger.always(chalk.green("\n✅ Setup complete!\n"));
  logger.always(chalk.blue("Next steps:"));
  logger.always(
    "1. List models: " + chalk.gray("neurolink ollama list-models"),
  );
  logger.always(
    "2. Generate text: " +
      chalk.gray('neurolink generate "Hello!" --provider ollama'),
  );
  logger.always(
    "3. Use specific model: " +
      chalk.gray(
        'neurolink generate "Hello!" --provider ollama --model codellama',
      ),
  );
  logger.always(
    chalk.gray(
      "\nFor more information, see: https://docs.neurolink.ai/providers/ollama",
    ),
  );
}

export default addOllamaCommands;
