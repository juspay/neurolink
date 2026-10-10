/**
 * `neurolink setup <provider>` for every Tier-2 JSON-catalog provider.
 *
 * A catalog vendor is configured by the same three variables whatever the
 * vendor: an API key, an optional model and an optional base URL (or, for a
 * vendor whose URL is computed from another credential, that credential).
 * Every name, default and instruction is read from the provider's catalog
 * JSON through the same helpers the runtime uses, so this flow writes
 * exactly the variables the provider reads and needs no per-vendor code.
 */

import chalk from "chalk";
import inquirer from "inquirer";
import { logger } from "../../lib/utils/logger.js";
import type {
  CliCatalogSetupFlags,
  ProviderCatalogJson,
} from "../../lib/types/index.js";
import {
  buildCatalogConfigOptions,
  catalogEnvVar,
  catalogExtraCredentialEnvVar,
} from "../../lib/providers/catalog/loader.js";
import { maskCredential } from "../utils/maskCredential.js";
import { updateEnvFile, displayEnvUpdateSummary } from "../utils/envManager.js";

const NUMBERED_STEP = /^\d+[.)]\s/;

function catalogSetupVars(entry: ProviderCatalogJson): {
  apiKey: string;
  apiKeyFallbacks: string[];
  model: string;
  baseURL: string | undefined;
  extras: string[];
} {
  return {
    apiKey: catalogEnvVar(entry, "apiKey"),
    apiKeyFallbacks: entry.wire.apiKeyFallbackEnvVars ?? [],
    model: catalogEnvVar(entry, "model"),
    // A templated URL is built from an extra credential, so there is no
    // base-URL variable to offer for it.
    baseURL: entry.wire.baseURLTemplate
      ? undefined
      : catalogEnvVar(entry, "baseURL"),
    extras: entry.wire.baseURLTemplate
      ? (entry.wire.extraCredentials ?? []).map((extra) =>
          catalogExtraCredentialEnvVar(entry, extra),
        )
      : [],
  };
}

/**
 * The catalog's own steps (already interpolated by the loader), followed by
 * the variables this vendor reads with their defaults. Steps in the JSON are
 * often numbered already, so they are printed as written rather than
 * numbered a second time.
 */
export function printCatalogProviderInstructions(
  entry: ProviderCatalogJson,
): void {
  const vars = catalogSetupVars(entry);
  const config = buildCatalogConfigOptions(entry);
  logger.always(chalk.yellow(`📋 To set up ${entry.displayName}:`));
  config.instructions.forEach((step, index) => {
    logger.always(
      NUMBERED_STEP.test(step) ? `  ${step}` : `  ${index + 1}. ${step}`,
    );
  });
  logger.always("");
  logger.always(chalk.yellow("Environment variables:"));
  logger.always(chalk.cyan(`  export ${vars.apiKey}=your_api_key_here`));
  if (vars.apiKeyFallbacks.length > 0) {
    logger.always(
      chalk.gray(`  (${vars.apiKeyFallbacks.join(", ")} also accepted)`),
    );
  }
  for (const extra of vars.extras) {
    logger.always(chalk.cyan(`  export ${extra}=your_value_here`));
  }
  logger.always(
    chalk.cyan(
      `  export ${vars.model}=${entry.models.default}   # optional, this is the default`,
    ),
  );
  if (vars.baseURL && entry.wire.baseURL) {
    logger.always(
      chalk.cyan(
        `  export ${vars.baseURL}=${entry.wire.baseURL}   # optional, this is the default`,
      ),
    );
  }
  logger.always("");
  logger.always(chalk.gray(`Docs: ${entry.setup.url}`));
}

function readApiKey(vars: ReturnType<typeof catalogSetupVars>): string {
  return (
    [vars.apiKey, ...vars.apiKeyFallbacks]
      .map((name) => process.env[name])
      .find((value) => !!value) ?? ""
  );
}

export async function handleCatalogProviderSetup(
  entry: ProviderCatalogJson,
  flags: CliCatalogSetupFlags,
): Promise<void> {
  const vars = catalogSetupVars(entry);
  const apiKey = readApiKey(vars);
  const missingExtras = vars.extras.filter((name) => !process.env[name]);
  const model = process.env[vars.model];
  const baseURL = vars.baseURL ? process.env[vars.baseURL] : undefined;
  const configured = !!apiKey && missingExtras.length === 0;

  logger.always(
    chalk.bold.blue(`\n🔧 ${entry.displayName} Configuration Status\n`),
  );
  logger.always(
    `${apiKey ? "✅" : "❌"} API key (${vars.apiKey}): ${
      apiKey ? maskCredential(apiKey) : "Not set"
    }`,
  );
  for (const extra of vars.extras) {
    logger.always(
      `${process.env[extra] ? "✅" : "❌"} ${extra}: ${process.env[extra] ? "set" : "Not set"}`,
    );
  }
  logger.always(
    `${model ? "✅" : "⚠️"} Model (${vars.model}): ${
      model ?? `Not set (default: ${entry.models.default})`
    }`,
  );
  if (vars.baseURL) {
    logger.always(
      `${baseURL ? "✅" : "⚠️"} Base URL (${vars.baseURL}): ${
        baseURL ?? `Not set (default: ${entry.wire.baseURL})`
      }`,
    );
  }

  if (configured) {
    logger.always(chalk.green(`\n✅ ${entry.displayName} is configured!`));
    if (flags.check || flags.nonInteractive) {
      return;
    }
    const { shouldReconfigure } = await inquirer.prompt([
      {
        type: "confirm",
        name: "shouldReconfigure",
        message: "Configuration looks good. Do you want to reconfigure anyway?",
        default: false,
      },
    ]);
    if (!shouldReconfigure) {
      logger.always(chalk.green("✅ Keeping existing configuration."));
      return;
    }
  } else {
    logger.always(
      chalk.yellow(`\n⚠️ ${entry.displayName} configuration needs setup.`),
    );
    if (flags.check) {
      throw new Error(
        `${entry.displayName} configuration is incomplete: set ${[
          ...(apiKey ? [] : [vars.apiKey]),
          ...missingExtras,
        ].join(" and ")}`,
      );
    }
  }

  logger.always("");
  printCatalogProviderInstructions(entry);
  logger.always("");

  if (flags.nonInteractive) {
    logger.always(
      chalk.yellow("Non-interactive mode: skipping configuration prompts."),
    );
    logger.always(
      chalk.blue(
        `Set the variables above, then run: neurolink setup ${entry.id} --check`,
      ),
    );
    return;
  }

  const keyPattern = entry.setup.apiKeyFormat
    ? new RegExp(entry.setup.apiKeyFormat)
    : undefined;
  const { newApiKey } = await inquirer.prompt([
    {
      type: "password",
      name: "newApiKey",
      message: `Enter your ${entry.displayName} API key (${vars.apiKey}):`,
      mask: "*",
      validate: (input: string) => {
        const trimmed = input.trim();
        if (!trimmed) {
          return "API key is required";
        }
        if (keyPattern && !keyPattern.test(trimmed)) {
          return `This does not look like a ${entry.displayName} key (expected ${entry.setup.apiKeyFormat})`;
        }
        return true;
      },
    },
  ]);
  const updates: Record<string, string> = { [vars.apiKey]: newApiKey.trim() };

  for (const extra of vars.extras) {
    const { value } = await inquirer.prompt([
      {
        type: "input",
        name: "value",
        message: `Enter ${extra}:`,
        default: process.env[extra],
        validate: (input: string) =>
          input.trim() ? true : `${extra} is required`,
      },
    ]);
    updates[extra] = value.trim();
  }

  const listed = entry.models.topModels ?? Object.keys(entry.models.catalog);
  const { modelChoice } = await inquirer.prompt([
    {
      type: "select",
      name: "modelChoice",
      message: `Select a model for ${entry.displayName}:`,
      choices: [
        {
          name: `Use the default (${entry.models.default})`,
          value: "default",
        },
        ...listed
          .filter((id) => id !== entry.models.default)
          .map((id) => ({ name: id, value: id })),
        { name: "Custom model name", value: "custom" },
      ],
      default: "default",
    },
  ]);
  let selectedModel: string | undefined;
  if (modelChoice === "custom") {
    const { customModel } = await inquirer.prompt([
      {
        type: "input",
        name: "customModel",
        message: "Enter the model id:",
        validate: (input: string) =>
          input.trim() ? true : "Model id is required",
      },
    ]);
    selectedModel = customModel.trim();
  } else if (modelChoice !== "default") {
    selectedModel = modelChoice;
  }
  if (selectedModel) {
    updates[vars.model] = selectedModel;
  }

  if (vars.baseURL && entry.wire.baseURL) {
    const { newBaseURL } = await inquirer.prompt([
      {
        type: "input",
        name: "newBaseURL",
        message: `Base URL (${vars.baseURL}) — press Enter to keep the default:`,
        default: entry.wire.baseURL,
      },
    ]);
    const trimmed = String(newBaseURL).trim();
    if (trimmed && trimmed !== entry.wire.baseURL) {
      updates[vars.baseURL] = trimmed;
    }
  }

  const result = updateEnvFile(updates);
  displayEnvUpdateSummary(result, false);
  logger.always(
    chalk.green(`\n✅ ${entry.displayName} configuration saved to .env`),
  );
  logger.always(chalk.blue("\n📖 Try it:"));
  logger.always(
    chalk.gray(
      `   neurolink generate "Hello!" --provider ${entry.id}${
        selectedModel ? ` --model ${selectedModel}` : ""
      }`,
    ),
  );
}
