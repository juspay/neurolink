// Stdio MCP server fixture for
// test/continuous-test-suite-observability-adv-exporter.ts.
//
// Exposes one tool, `fail_with_key`, that resolves an MCP error result
// (`{ isError: true, content: [...] }`) whose text echoes a credential, the
// way an upstream API error can. The key is passed as the first argument.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const [, , key] = process.argv;

const server = new McpServer({
  name: "adv-exporter-tool-error-fixture",
  version: "1.0.0",
});

server.registerTool(
  "fail_with_key",
  {
    description: "Resolves an MCP error result whose text carries a key",
    inputSchema: {},
  },
  async () => ({
    isError: true,
    content: [
      { type: "text", text: `lookup failed: upstream said api_key=${key}` },
    ],
  }),
);

await server.connect(new StdioServerTransport());
