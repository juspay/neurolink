import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { randomUUID } from "node:crypto";
import { DocsSearch } from "./search.js";
import { createToolDefinitions } from "./tools.js";
import type { SearchIndex } from "./types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveIndexPath(): string {
  const localPath = path.resolve(__dirname, "../static/search-index.json");
  if (fs.existsSync(localPath)) return localPath;

  const pkgPath = path.resolve(
    __dirname,
    "../../docs-site/static/search-index.json",
  );
  if (fs.existsSync(pkgPath)) return pkgPath;

  throw new Error(
    "search-index.json not found. Run docs-site build first: cd docs-site && pnpm build",
  );
}

function initSearch(): DocsSearch {
  const indexPath = resolveIndexPath();
  const raw = fs.readFileSync(indexPath, "utf-8");
  const indexData: SearchIndex = JSON.parse(raw);

  const search = new DocsSearch();
  search.loadIndex(indexData);

  return search;
}

function createServer(search: DocsSearch): McpServer {
  const server = new McpServer({
    name: "neurolink-docs",
    version: "1.0.0",
  });

  const tools = createToolDefinitions(search);

  for (const tool of Object.values(tools)) {
    server.tool(
      tool.name,
      tool.description,
      tool.paramsSchema,
      async (args: Record<string, unknown>) => {
        return tool.handler(args as never);
      },
    );
  }

  return server;
}

async function startStdio(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function startHttp(server: McpServer, port: number): Promise<void> {
  const { StreamableHTTPServerTransport } =
    await import("@modelcontextprotocol/sdk/server/streamableHttp.js");
  const http = await import("http");

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  await server.connect(transport);

  const httpServer = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === "/mcp" && req.method === "POST") {
      try {
        await transport.handleRequest(req, res);
      } catch (err) {
        console.error("MCP transport error:", err);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal server error" }));
        }
      }
    } else if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
    } else {
      res.writeHead(404);
      res.end("Not Found");
    }
  });

  const host = process.env.BIND_HOST || "127.0.0.1";
  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, host, () => {
      httpServer.removeListener("error", reject);
      console.error(
        `NeuroLink MCP Docs Server listening on http://${host}:${port}/mcp`,
      );
      console.error(`Health check: http://${host}:${port}/health`);
      resolve();
    });
  });
}

export async function startDocsServer(args: {
  transport?: "stdio" | "http";
  port?: number;
}): Promise<void> {
  const search = initSearch();
  const server = createServer(search);
  const transport = args.transport || "stdio";
  const port = args.port || 3001;

  console.error(
    `NeuroLink MCP Docs Server — ${search.documentCount} docs indexed`,
  );

  if (transport === "http") {
    await startHttp(server, port);
  } else {
    await startStdio(server);
  }
}

const isDirectExecution =
  typeof process !== "undefined" &&
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectExecution) {
  const args = process.argv.slice(2);
  const transportFlag = args.includes("--transport")
    ? args[args.indexOf("--transport") + 1]
    : "stdio";
  if (transportFlag !== "stdio" && transportFlag !== "http") {
    console.error(
      `Invalid transport "${transportFlag}". Must be "stdio" or "http".`,
    );
    process.exit(1);
  }
  const portRaw = args.includes("--port")
    ? parseInt(args[args.indexOf("--port") + 1], 10)
    : 3001;
  const portFlag =
    Number.isNaN(portRaw) || portRaw < 1 || portRaw > 65535 ? 3001 : portRaw;

  startDocsServer({ transport: transportFlag, port: portFlag }).catch((err) => {
    console.error("Failed to start MCP docs server:", err);
    process.exit(1);
  });
}
