// Stdio MCP server fixture for
// test/continuous-test-suite-mcp-direct-name-repair.ts.
//
// Exposes a small, realistic tool set so name-repair candidate ranking has
// more than one plausible neighbor to choose from. Each tool echoes its own
// name back in its result so the suite can prove *which* tool actually ran —
// resolving to the wrong name would otherwise pass silently.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "direct-name-repair-fixture",
  version: "1.0.0",
});

const text = (value) => ({ content: [{ type: "text", text: value }] });

const TOOLS = ["get_pull_request", "list_pull_requests", "search_code"];

for (const toolName of TOOLS) {
  server.registerTool(
    toolName,
    {
      description: `Fixture tool ${toolName}`,
      inputSchema: { echo: z.string().optional() },
    },
    async ({ echo }) => text(`ran:${toolName}${echo ? `:${echo}` : ""}`),
  );
}

await server.connect(new StdioServerTransport());
