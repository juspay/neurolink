import type { Argv } from "yargs";
import { execSync } from "child_process";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";

export const ollamaCommand = {
  command: "ollama <command>",
  describe: "Manage Ollama local AI models",
  builder: (yargs: Argv) => {
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
  handler: () => {}, // No-op handler as subcommands handle everything
};

async function listModelsHandler() {
  const spinner = ora("Fetching installed models...").start();
  try {
    const output = execSync("ollama list", { encoding: "utf8" });
    spinner.succeed("Installed models:");

    if (output.trim()) {
      console.log(output);
    } else {
      console.log(
        chalk.yellow(
          'No models installed. Use "neurolink ollama pull <model>" to download a model.',
        ),
      );
    }
  } catch (error: any) {
    spinner.fail("Failed to list models. Is Ollama installed?");
    console.error(chalk.red("Error:", error.message));
    console.log(chalk.blue("\nTip: Install Ollama from https://ollama.ai"));
    process.exit(1);
  }
}

async function pullModelHandler(argv: any) {
  const { model } = argv;
  console.log(chalk.blue(`Downloading model: ${model}`));
  console.log(chalk.gray("This may take several minutes..."));

  try {
    execSync(`ollama pull ${model}`, { stdio: "inherit" });
    console.log(chalk.green(`\n✅ Successfully downloaded ${model}`));
    console.log(
      chalk.blue(
        `\nTest it with: npx @juspay/neurolink generate-text "Hello!" --provider ollama --model ${model}`,
      ),
    );
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Failed to download ${model}`));
    console.error(chalk.red("Error:", error.message));
    process.exit(1);
  }
}

async function removeModelHandler(argv: any) {
  const { model } = argv;

  // Confirm removal
  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `Are you sure you want to remove model "${model}"?`,
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.yellow("Removal cancelled."));
    return;
  }

  const spinner = ora(`Removing model ${model}...`).start();
  try {
    execSync(`ollama rm ${model}`, { encoding: "utf8" });
    spinner.succeed(`Successfully removed ${model}`);
  } catch (error: any) {
    spinner.fail(`Failed to remove ${model}`);
    console.error(chalk.red("Error:", error.message));
    process.exit(1);
  }
}

async function statusHandler() {
  const spinner = ora("Checking Ollama service status...").start();

  try {
    // Try to run a simple command
    execSync("ollama list", { encoding: "utf8" });
    spinner.succeed("Ollama service is running");

    // Get additional info
    try {
      const response = execSync("curl -s http://localhost:11434/api/tags", {
        encoding: "utf8",
      });
      const data = JSON.parse(response);
      if (data.models && data.models.length > 0) {
        console.log(chalk.green(`\n${data.models.length} models available`));
      }
    } catch {
      // Curl might not be available, that's ok
    }
  } catch (error) {
    spinner.fail("Ollama service is not running");
    console.log(chalk.yellow("\nStart Ollama with: ollama serve"));
    console.log(
      chalk.blue("Or restart the Ollama app if using the desktop version"),
    );
    process.exit(1);
  }
}

async function startHandler() {
  console.log(chalk.blue("Starting Ollama service..."));

  try {
    // Check if already running
    try {
      execSync("ollama list", { encoding: "utf8" });
      console.log(chalk.yellow("Ollama service is already running!"));
      return;
    } catch {
      // Not running, continue to start
    }

    // Different approaches for different platforms
    if (process.platform === "darwin") {
      // macOS
      console.log(chalk.gray("Starting Ollama on macOS..."));
      try {
        execSync("open -a Ollama");
        console.log(chalk.green("✅ Ollama app started"));
      } catch {
        // Try service command
        execSync("ollama serve > /dev/null 2>&1 &", { stdio: "ignore" });
        console.log(chalk.green("✅ Ollama service started"));
      }
    } else if (process.platform === "linux") {
      // Linux
      console.log(chalk.gray("Starting Ollama service on Linux..."));
      try {
        execSync("systemctl start ollama", { encoding: "utf8" });
        console.log(chalk.green("✅ Ollama service started"));
      } catch {
        // Try direct command
        execSync("ollama serve > /dev/null 2>&1 &", { stdio: "ignore" });
        console.log(chalk.green("✅ Ollama service started"));
      }
    } else {
      // Windows
      console.log(chalk.gray("Starting Ollama on Windows..."));
      execSync("start ollama serve", { stdio: "ignore" });
      console.log(chalk.green("✅ Ollama service started"));
    }

    console.log(
      chalk.blue("\nWait a few seconds for the service to initialize..."),
    );
  } catch (error: any) {
    console.error(chalk.red("Failed to start Ollama service"));
    console.error(chalk.red("Error:", error.message));
    console.log(
      chalk.blue("\nTry starting Ollama manually or check installation"),
    );
    process.exit(1);
  }
}

async function stopHandler() {
  const spinner = ora("Stopping Ollama service...").start();

  try {
    if (process.platform === "darwin") {
      // macOS
      try {
        execSync("pkill ollama", { encoding: "utf8" });
      } catch {
        execSync("killall Ollama", { encoding: "utf8" });
      }
    } else if (process.platform === "linux") {
      // Linux
      try {
        execSync("systemctl stop ollama", { encoding: "utf8" });
      } catch {
        execSync("pkill ollama", { encoding: "utf8" });
      }
    } else {
      // Windows
      execSync("taskkill /F /IM ollama.exe", { encoding: "utf8" });
    }

    spinner.succeed("Ollama service stopped");
  } catch (error: any) {
    spinner.fail("Failed to stop Ollama service");
    console.error(chalk.red("It may not be running or requires manual stop"));
  }
}

async function setupHandler() {
  console.log(chalk.blue("🦙 Welcome to Ollama Setup!\n"));

  // Check if Ollama is installed
  const checkSpinner = ora("Checking Ollama installation...").start();
  let isInstalled = false;

  try {
    execSync("ollama --version", { encoding: "utf8" });
    isInstalled = true;
    checkSpinner.succeed("Ollama is installed");
  } catch {
    checkSpinner.fail("Ollama is not installed");
  }

  if (!isInstalled) {
    console.log(chalk.yellow("\nOllama needs to be installed first."));
    console.log(chalk.blue("\nInstallation instructions:"));

    if (process.platform === "darwin") {
      console.log("\nFor macOS:");
      console.log(chalk.gray("  brew install ollama"));
      console.log(chalk.gray("  # or download from https://ollama.ai"));
    } else if (process.platform === "linux") {
      console.log("\nFor Linux:");
      console.log(chalk.gray("  curl -fsSL https://ollama.ai/install.sh | sh"));
    } else {
      console.log("\nFor Windows:");
      console.log(chalk.gray("  Download from https://ollama.ai"));
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
      console.log(chalk.blue("\nInstall Ollama and run setup again!"));
      return;
    }
  }

  // Check if service is running
  let serviceRunning = false;
  try {
    execSync("ollama list", { encoding: "utf8" });
    serviceRunning = true;
    console.log(chalk.green("\n✅ Ollama service is running"));
  } catch {
    console.log(chalk.yellow("\n⚠️  Ollama service is not running"));

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
    console.log(chalk.blue("\n📦 Popular Ollama models:"));
    console.log("  • llama2 (7B) - General purpose");
    console.log("  • codellama (7B) - Code generation");
    console.log("  • mistral (7B) - Fast and efficient");
    console.log("  • tinyllama (1B) - Lightweight");
    console.log("  • phi (2.7B) - Microsoft's compact model");

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

  // Final instructions
  console.log(chalk.green("\n✅ Setup complete!\n"));
  console.log(chalk.blue("Next steps:"));
  console.log("1. List models: " + chalk.gray("neurolink ollama list-models"));
  console.log(
    "2. Generate text: " +
      chalk.gray('neurolink generate-text "Hello!" --provider ollama'),
  );
  console.log(
    "3. Use specific model: " +
      chalk.gray(
        'neurolink generate-text "Hello!" --provider ollama --model codellama',
      ),
  );

  console.log(
    chalk.gray(
      "\nFor more information, see: https://docs.neurolink.ai/providers/ollama",
    ),
  );
}

export default ollamaCommand;
