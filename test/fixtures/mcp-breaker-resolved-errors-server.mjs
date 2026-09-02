// Stdio MCP server fixture for
// test/continuous-test-suite-mcp-breaker-resolved-errors.ts.
//
// Exposes one tool, `resolve_error`, that always RESOLVES an MCP protocol
// error (`{ isError: true, content: [...] }`) rather than throwing — the
// shape a real MCP client produces for an upstream error and the exact shape
// `MCPCircuitBreaker` must count as a failure even though the call never
// rejects.
//
//   node <fixture> <call-log>   appends "1" to <call-log> on every
//                                `resolve_error` invocation, so the suite can
//                                prove a circuit-breaker-blocked call never
//                                reached this process.
import { appendFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const [, , callLog] = process.argv;

const server = new McpServer({
  name: "breaker-resolved-errors-fixture",
  version: "1.0.0",
});

server.registerTool(
  "resolve_error",
  {
    description:
      "Always resolves an MCP protocol error result instead of throwing",
    inputSchema: {},
  },
  async () => {
    if (callLog) {
      appendFileSync(callLog, "1\n");
    }
    return {
      isError: true,
      content: [{ type: "text", text: "simulated failure" }],
    };
  },
);

await server.connect(new StdioServerTransport());
