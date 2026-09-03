// Stdio MCP server fixture for test/continuous-test-suite-artifact-banking.ts.
//
// One tool, `big_output`, returns `chars` characters of deterministic filler
// with `marker` buried at 75% — large enough to trip a small
// mcp.outputLimits.maxBytes, so the suite can prove WHICH artifact store the
// output normalizer externalized into after setArtifactStore().
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "artifact-store-fixture",
  version: "1.0.0",
});

server.registerTool(
  "big_output",
  {
    description: "Returns `chars` characters of filler with `marker` at 75%",
    inputSchema: { chars: z.number(), marker: z.string() },
  },
  async ({ chars, marker }) => {
    const filler = "0123456789abcdef-";
    let out = "";
    while (out.length < chars) {
      out += filler;
    }
    out = out.slice(0, chars);
    const at = Math.floor(chars * 0.75);
    out = out.slice(0, at) + marker + out.slice(at + marker.length);
    return { content: [{ type: "text", text: out }] };
  },
);

await server.connect(new StdioServerTransport());
