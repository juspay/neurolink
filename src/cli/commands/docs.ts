import type { CommandModule, Argv } from "yargs";
import chalk from "chalk";

type DocsCommandArgs = {
  transport?: "stdio" | "http";
  port?: number;
};

export class DocsCommandFactory {
  static createDocsCommand(): CommandModule<object, DocsCommandArgs> {
    return {
      command: "docs",
      describe: "Start the NeuroLink documentation MCP server",
      builder: (yargs: Argv) =>
        yargs
          .option("transport", {
            alias: "t",
            type: "string",
            choices: ["stdio", "http"],
            default: "stdio",
            description:
              "Transport protocol (stdio for local, http for remote)",
          })
          .option("port", {
            alias: "p",
            type: "number",
            default: 3001,
            description: "Port for HTTP transport (ignored for stdio)",
          }) as Argv<DocsCommandArgs>,
      handler: async (argv) => {
        await DocsCommandFactory.executeDocs(argv);
      },
    };
  }

  private static async executeDocs(argv: DocsCommandArgs): Promise<void> {
    try {
      // Dynamic path prevents TypeScript from resolving outside rootDir
      const mcpServerPath = "../../../docs-site/mcp-server/index.js";
      const { startDocsServer } = await import(mcpServerPath);

      await startDocsServer({
        transport: argv.transport,
        port: argv.port,
      });
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("search-index.json not found")
      ) {
        console.error(
          chalk.red("\nSearch index not found. Build the docs site first:\n"),
        );
        console.error(chalk.cyan("  cd docs-site && pnpm build\n"));
        process.exit(1);
      }
      console.error(chalk.red("Failed to start docs server:"), err);
      process.exit(1);
    }
  }
}
