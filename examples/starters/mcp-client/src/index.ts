/**
 * Registers the filesystem MCP server (via `.mcp-config.json`, loaded
 * automatically from the current working directory) and runs one
 * generation where the model uses that server's tools to read sample.txt.
 *
 * Config-file auto-loading and status/tool APIs verified against:
 *   src/lib/neurolink.ts:2798  (loadMCPConfigurationInternal, called during MCP init)
 *   src/lib/mcp/externalServerManager.ts:355 (defaults to .mcp-config.json in cwd)
 *   src/lib/neurolink.ts:13711 (getMCPStatus — call before listMCPServers, per its own doc comment)
 *   src/lib/neurolink.ts:13781 (listMCPServers)
 *   src/lib/types/generate.ts:1128 (disableTools — tools stay enabled by default, so no flag needed)
 *   src/lib/types/generate.ts:1443 (toolsUsed on the generate() result)
 */

import { NeuroLink } from "@juspay/neurolink";

const PROVIDER_ENV_VARS = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_AI_API_KEY",
] as const;

function hasProviderKey(): boolean {
  return PROVIDER_ENV_VARS.some((name) => Boolean(process.env[name]));
}

async function main(): Promise<void> {
  if (!hasProviderKey()) {
    console.error(
      "No provider API key found. Set one of: " +
        PROVIDER_ENV_VARS.join(", ") +
        " (see .env.example).",
    );
    process.exitCode = 1;
    return;
  }

  const neurolink = new NeuroLink();

  try {
    // getMCPStatus() triggers MCP initialization (which loads .mcp-config.json
    // from cwd) and must be awaited before listMCPServers() is meaningful.
    const status = await neurolink.getMCPStatus();
    console.log(
      `MCP status: ${status.availableServers}/${status.totalServers} server(s) available, ${status.totalTools} tool(s) discovered.`,
    );

    const servers = await neurolink.listMCPServers();
    const filesystem = servers.find((server) => server.name === "filesystem");
    if (!filesystem) {
      console.error(
        "The filesystem MCP server from .mcp-config.json was not registered. " +
          "Check that npx can reach @modelcontextprotocol/server-filesystem.",
      );
      process.exitCode = 1;
      return;
    }
    console.log(
      `filesystem server: ${filesystem.status} (${filesystem.tools.length} tool(s): ${filesystem.tools
        .map((tool) => tool.name)
        .join(", ")})`,
    );

    const result = await neurolink.generate({
      input: {
        text: "Use your file tools to read sample.txt in the current directory, then quote its second paragraph back to me exactly.",
      },
    });

    console.log("\nModel response:\n" + result.content);
    if (result.toolsUsed?.length) {
      console.log("\nTools used: " + result.toolsUsed.join(", "));
    } else {
      console.log(
        "\nNo tools were used — the model answered without reading the file.",
      );
    }
  } finally {
    await neurolink.shutdown();
  }
}

await main();
