import type { Argv, CommandModule } from "yargs";
import type { ProxyPolyfillArgs } from "../../lib/types/index.js";
import { inspectProxyPackage } from "../../lib/proxy/globalInstaller.js";
import { captureProxyPackageBaseline } from "../../lib/proxy/proxyPackagePolyfills.js";

/** Record the base of a locally patched package without changing running services. */
export const proxyPolyfillCommand: CommandModule<object, ProxyPolyfillArgs> = {
  command: "polyfill <action>",
  describe: "Preserve local proxy compatibility edits across staged upgrades",
  builder: (yargs: Argv) =>
    yargs
      .positional("action", {
        choices: ["capture"] as const,
        type: "string",
        demandOption: true,
      })
      .option("base", {
        type: "string",
        demandOption: true,
        description:
          "CLI entry script of the pristine package used for the local edit",
      })
      .option("patched", {
        type: "string",
        demandOption: true,
        description: "CLI entry script of the locally patched package",
      })
      .option("format", {
        choices: ["text", "json"] as const,
        type: "string",
        default: "text",
      })
      .example(
        "neurolink proxy polyfill capture --base /original/dist/cli/index.js --patched /local/dist/cli/index.js",
        "Record the exact original files so later upgrades can apply only the local diff",
      ) as Argv<ProxyPolyfillArgs>,
  handler: async (argv) => {
    try {
      const base = inspectProxyPackage(argv.base);
      const patched = inspectProxyPackage(argv.patched);
      const files = captureProxyPackageBaseline(base, patched);
      const result = {
        captured: true,
        baseVersion: base.version,
        patchedVersion: patched.version,
        files,
      };
      console.info(
        argv.format === "json"
          ? JSON.stringify(result)
          : `Recorded ${files.length} local proxy polyfill file(s). Upgrades will apply remaining diff hunks, skip included fixes, and retain the current worker on conflicts.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Proxy polyfill capture failed";
      console.error(
        argv.format === "json"
          ? JSON.stringify({ captured: false, message })
          : message,
      );
      process.exitCode = 1;
    }
  },
};
