// Stdio MCP server fixture for
// test/continuous-test-suite-mcp-min-tools-readiness.ts.
//
// Speaks the MCP protocol correctly, advertises the `tools` capability, and
// answers `tools/list` with an empty array — a legitimate shape for a
// resource/prompt-only server (as opposed to a server that never advertises
// `tools` at all, which fails discovery outright with "Method not found").
// Used to prove that ExternalServerManager.addServer either does (compat) or
// does not (when minTools is configured) treat a zero-tool registration as
// ready.
//
// The low-level Server is used instead of the McpServer convenience wrapper
// because McpServer only registers the tools/list handler when at least one
// tool has been added via registerTool() — there is no way to advertise an
// intentionally empty tool set through that API.
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "zero-tools-fixture", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [] }));

await server.connect(new StdioServerTransport());
