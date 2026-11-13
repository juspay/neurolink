// Stdio MCP server fixture for test/continuous-test-suite-hitl-confirm-once.ts.
// `hang` never answers; when the client cancels the request the SDK aborts
// `extra.signal`, and the fixture records that in the file named by
// CANCEL_MARKER_FILE.
import { writeFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "cancel-observer-fixture",
  version: "1.0.0",
});

server.registerTool(
  "hang",
  { description: "Never answers; records a client cancellation" },
  (extra) =>
    new Promise((resolve) => {
      extra.signal.addEventListener("abort", () => {
        writeFileSync(process.env.CANCEL_MARKER_FILE, "cancelled");
        resolve({ content: [{ type: "text", text: "cancelled" }] });
      });
    }),
);

await server.connect(new StdioServerTransport());
