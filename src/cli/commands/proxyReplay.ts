import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { Argv, CommandModule } from "yargs";
import chalk from "chalk";
import {
  compareProxyReplayBundle,
  exportProxyReplayBundle,
  isValidProxyReplayHeaderName,
  readProxyReplayBundle,
  writeProxyReplayDocument,
} from "../../lib/proxy/proxyReplay.js";
import type { ProxyReplayArgs } from "../../lib/types/index.js";
import { logger } from "../../lib/utils/logger.js";

const ACTIONS = ["export", "compare"] as const;
const MAX_BODY_OVERRIDE_BYTES = 16 * 1024 * 1024;

function requiredValue(value: string | undefined, option: string): string {
  if (!value) {
    throw new Error(`${option} is required for this action`);
  }
  return value;
}

function resolveHeaderValues(mappings: string[] | undefined) {
  const values: Record<string, string> = {};
  for (const mapping of mappings ?? []) {
    const separator = mapping.indexOf("=");
    if (separator <= 0 || separator === mapping.length - 1) {
      throw new Error(
        `Invalid --header-env value "${mapping}". Use header-name=ENV_VAR.`,
      );
    }
    const header = mapping.slice(0, separator).trim().toLowerCase();
    if (!isValidProxyReplayHeaderName(header)) {
      throw new Error(`Invalid header name in --header-env: ${header}`);
    }
    const environmentName = mapping.slice(separator + 1).trim();
    const value = process.env[environmentName];
    if (!value) {
      throw new Error(
        `Environment variable ${environmentName} is empty or unset for header ${header}`,
      );
    }
    values[header] = value;
  }
  return values;
}

async function readBodyOverride(filePath: string | undefined) {
  if (!filePath) {
    return undefined;
  }
  const resolvedPath = resolve(filePath);
  const info = await stat(resolvedPath);
  if (!info.isFile() || info.size > MAX_BODY_OVERRIDE_BYTES) {
    throw new Error(
      `Body override must be a regular file no larger than ${MAX_BODY_OVERRIDE_BYTES} bytes`,
    );
  }
  return readFile(resolvedPath, "utf8");
}

function printResult(
  format: "text" | "json",
  value: Record<string, unknown>,
): void {
  logger.always(
    format === "json"
      ? JSON.stringify(value)
      : Object.entries(value)
          .map(([key, child]) => `${key}: ${String(child)}`)
          .join("\n"),
  );
}

export const proxyReplayCommand: CommandModule<object, ProxyReplayArgs> = {
  command: "replay <action>",
  describe: "Export captured proxy requests or compare them directly upstream",
  builder: (yargs: Argv) =>
    yargs
      .positional("action", {
        type: "string",
        choices: [...ACTIONS],
        describe: "Replay action",
      })
      .option("request-id", {
        type: "string",
        alias: "requestId",
        description: "Captured proxy request ID to export",
      })
      .option("attempt", {
        type: "number",
        description: "Specific upstream attempt to reconstruct",
      })
      .option("logs-dir", {
        type: "string",
        alias: "logsDir",
        description: "Proxy log directory",
      })
      .option("bundle", {
        type: "string",
        description: "Replay bundle to compare directly upstream",
      })
      .option("output", {
        type: "string",
        alias: "o",
        description: "Destination JSON file",
      })
      .option("execute", {
        type: "boolean",
        default: false,
        description: "Explicitly permit the direct upstream request",
      })
      .option("header-env", {
        type: "string",
        array: true,
        alias: "headerEnv",
        description:
          "Inject a redacted header from an environment variable (header=ENV_VAR)",
      })
      .option("body-file", {
        type: "string",
        alias: "bodyFile",
        description:
          "Complete request body override for redacted/truncated captures",
      })
      .option("url", {
        type: "string",
        description: "Explicit direct endpoint override",
      })
      .option("timeout-ms", {
        type: "number",
        alias: "timeoutMs",
        default: 120_000,
        description: "Direct request timeout",
      })
      .option("format", {
        type: "string",
        choices: ["text", "json"] as const,
        default: "text" as const,
        description: "Command summary format",
      })
      .option("quiet", {
        type: "boolean",
        alias: "q",
        default: false,
        description: "Suppress non-essential output",
      })
      .example(
        "neurolink proxy replay export --request-id req-123 --output replay.json",
        "Create a deterministic offline replay bundle",
      )
      .example(
        "neurolink proxy replay compare --bundle replay.json --output comparison.json --execute --header-env authorization=ANTHROPIC_AUTHORIZATION",
        "Execute the captured upstream request with an environment-backed credential",
      ) as Argv<ProxyReplayArgs>,
  handler: async (argv) => {
    try {
      const output = requiredValue(argv.output, "--output");
      if (argv.action === "export") {
        const requestId = requiredValue(argv.requestId, "--request-id");
        const bundle = await exportProxyReplayBundle({
          requestId,
          logsDir: argv.logsDir,
          attempt: argv.attempt,
        });
        const written = await writeProxyReplayDocument(output, bundle);
        if (!argv.quiet) {
          printResult(argv.format ?? "text", {
            action: "export",
            output: written.path,
            sha256: written.sha256,
            captures: bundle.completeness.captures,
            replayable: bundle.completeness.replayable,
            blockers: bundle.completeness.blockers.join(",") || "none",
          });
        }
        return;
      }

      const bundlePath = requiredValue(argv.bundle, "--bundle");
      const bundle = await readProxyReplayBundle(bundlePath);
      const comparison = await compareProxyReplayBundle(bundle, {
        execute: argv.execute === true,
        headerValues: resolveHeaderValues(argv.headerEnv),
        bodyOverride: await readBodyOverride(argv.bodyFile),
        urlOverride: argv.url,
        timeoutMs: argv.timeoutMs,
      });
      const written = await writeProxyReplayDocument(output, comparison);
      if (!argv.quiet) {
        printResult(argv.format ?? "text", {
          action: "compare",
          output: written.path,
          sha256: written.sha256,
          status: comparison.direct.status,
          statusMatches: comparison.comparison.statusMatches,
          bodyHashMatches: comparison.comparison.bodyHashMatches,
          jsonShapeMatches: comparison.comparison.jsonShapeMatches,
        });
      }
    } catch (error) {
      logger.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exitCode = 1;
    }
  },
};
