// Stdio MCP server fixture for
// test/continuous-test-suite-observability-setup-metrics.ts.
//
// Exposes two tools so the suite can read `mcp_tool_calls_total` for both
// outcomes of a call:
//   echo  resolves a normal result
//   fail  RESOLVES an MCP protocol error (`isError: true`), the shape a real
//         client produces for an upstream error
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "observability-metrics-fixture",
  version: "1.0.0",
});

server.registerTool(
  "echo",
  { description: "Resolves a normal result", inputSchema: {} },
  async () => ({ content: [{ type: "text", text: "ok" }] }),
);

server.registerTool(
  "fail",
  { description: "Resolves an MCP error result", inputSchema: {} },
  async () => ({
    isError: true,
    content: [{ type: "text", text: "simulated failure" }],
  }),
);

await server.connect(new StdioServerTransport());
