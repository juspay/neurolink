// Stdio MCP server fixture for test/continuous-test-suite-process-exit.ts's
// cross-manager shutdown-concurrency test.
//
// Behaves like an ordinary stdio MCP server, except on SIGTERM it
// deliberately waits a fixed number of milliseconds before exiting, standing
// in for a real server's own graceful-close work (flushing a connection,
// finishing an in-flight request, ...). Attaching several of these to
// separate ExternalServerManager instances gives each manager's shutdown() a
// known, measurable duration, so a test can tell whether cross-manager
// cleanup overlaps them or serializes them.
//
// A ref'd, never-cleared interval keeps the process alive independent of
// stdio state. Without it, the SDK client's own close() sequence
// (StdioClientTransport#close: end the child's stdin, then wait) is enough
// on its own to let the process drain and exit naturally on stdin EOF, well
// before any signal is ever sent — which would make this fixture measure
// "how fast a process exits on stdin EOF" instead of the graceful-shutdown
// delay it exists to simulate. Only the SIGTERM path below is allowed to end
// this process.
//
//   node <fixture> <delayMs>
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const delayMs = Number(process.argv[2] ?? "0");

const keepAlive = setInterval(() => {}, 200);

process.on("SIGTERM", () => {
  setTimeout(() => {
    clearInterval(keepAlive);
    process.exit(0);
  }, delayMs);
});

const server = new McpServer({
  name: "slow-shutdown-fixture",
  version: "1.0.0",
});

server.registerTool(
  "ping",
  { description: "ping", inputSchema: {} },
  async () => ({ content: [{ type: "text", text: "pong" }] }),
);

await server.connect(new StdioServerTransport());
