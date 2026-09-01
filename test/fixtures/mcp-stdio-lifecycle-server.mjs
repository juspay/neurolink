// Stdio MCP server fixture for test/continuous-test-suite-mcp-stdio-lifecycle.ts.
//
// Runs as a real child process so the suite can kill, wedge, crash and stop
// it the way production servers die.
//
//   node <fixture> serve <spawn-log>         normal server; appends its pid to
//                                            <spawn-log> on boot so the suite
//                                            can count how often it was spawned
//   node <fixture> die-on-start <spawn-log>  writes a traceback to stderr and
//                                            exits 2 before speaking MCP
import { appendFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const [, , mode = "serve", spawnLog] = process.argv;
if (spawnLog) {
  appendFileSync(spawnLog, `${process.pid}\n`);
}

if (mode === "die-on-start") {
  process.stderr.write(
    "Traceback (most recent call last):\n  fixture boot failure marker\n",
  );
  process.exit(2);
}

const server = new McpServer({
  name: "stdio-lifecycle-fixture",
  version: "1.0.0",
});

const text = (value) => ({ content: [{ type: "text", text: value }] });

server.registerTool(
  "whoami",
  { description: "Returns this server's pid", inputSchema: {} },
  async () => text(String(process.pid)),
);

server.registerTool(
  "block",
  {
    description: "Blocks the event loop for ms milliseconds",
    inputSchema: { ms: z.number() },
  },
  async ({ ms }) => {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      // Spin: a single-threaded server cannot answer a ping while a
      // synchronous tool runs, which is the case the health check must not
      // mistake for a hung process.
    }
    return text("blocked");
  },
);

server.registerTool(
  "crash",
  { description: "Writes a traceback to stderr and exits", inputSchema: {} },
  async () => {
    process.stderr.write(
      "Traceback (most recent call last):\n  simulated failure\nRuntimeError: fixture crash marker\n",
    );
    setTimeout(() => process.exit(3), 50);
    return text("crashing");
  },
);

await server.connect(new StdioServerTransport());
