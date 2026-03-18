---
description: "Make NeuroLink's 360+ documentation pages queryable by AI assistants via MCP. Search docs, get pages, browse API reference — all from Claude Desktop, Cursor, VS Code, or any MCP-compatible client."
title: "NeuroLink Docs MCP Server"
sidebar_position: 15
slug: /mcp/docs-server
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# NeuroLink Docs MCP Server

The NeuroLink Docs MCP Server makes the entire NeuroLink documentation (360+ pages across 27 sections) queryable by AI assistants through the [Model Context Protocol](https://modelcontextprotocol.io). Instead of copy-pasting docs into your prompt, your AI assistant can search, browse, and read NeuroLink documentation on demand.

**What it provides:**

- **6 tools** — full-text search, page retrieval, section browsing, API reference lookup, example search, and changelog
- **Pre-built search index** — generated at build time with MiniSearch for instant results
- **Dual transport** — stdio for local use, HTTP for remote/hosted deployments
- **Zero configuration** — runs via `npx` with no API keys required

## Quick Start

Add the NeuroLink docs server to your AI development tool:

<Tabs groupId="mcp-client">
<TabItem value="claude-desktop" label="Claude Desktop" default>

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "neurolink-docs": {
      "command": "npx",
      "args": ["-y", "@juspay/neurolink", "docs"]
    }
  }
}
```

Restart Claude Desktop after saving.

</TabItem>
<TabItem value="cursor" label="Cursor">

Create or edit `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "neurolink-docs": {
      "command": "npx",
      "args": ["-y", "@juspay/neurolink", "docs"]
    }
  }
}
```

Cursor will detect the config automatically.

</TabItem>
<TabItem value="claude-code" label="Claude Code">

Run this command in your terminal:

```bash
claude mcp add neurolink-docs -- npx -y @juspay/neurolink docs
```

The server will be available in your next Claude Code session.

</TabItem>
<TabItem value="vscode" label="VS Code">

Create or edit `.vscode/mcp.json` in your project root:

```json
{
  "servers": {
    "neurolink-docs": {
      "command": "npx",
      "args": ["-y", "@juspay/neurolink", "docs"]
    }
  }
}
```

VS Code will detect the MCP server on next reload.

</TabItem>
<TabItem value="windsurf" label="Windsurf">

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "neurolink-docs": {
      "command": "npx",
      "args": ["-y", "@juspay/neurolink", "docs"]
    }
  }
}
```

Restart Windsurf after saving.

</TabItem>
</Tabs>

:::tip[Same command everywhere]
All clients use the same `npx -y @juspay/neurolink docs` command. The only difference is the config file location and JSON key format (`mcpServers` vs `servers`).
:::

## Available Tools

The docs server exposes 6 tools to your AI assistant:

| Tool                | Description                                          | Parameters                               |
| ------------------- | ---------------------------------------------------- | ---------------------------------------- |
| `search_docs`       | Full-text search across all documentation            | `query` (required), `limit?`, `section?` |
| `get_page`          | Get the full content of a specific doc page          | `path` (required)                        |
| `list_sections`     | List all documentation sections and their pages      | none                                     |
| `get_api_reference` | Get SDK API reference, optionally filtered by method | `method?`                                |
| `get_examples`      | Get code examples by topic or provider               | `topic?`, `provider?`                    |
| `get_changelog`     | Get recent changelog entries                         | `limit?`                                 |

## Tool Examples

### search_docs

Search across all NeuroLink documentation with optional section filtering.

**Request:**

```json
{
  "query": "RAG pipeline",
  "limit": 3,
  "section": "features"
}
```

**Response:**

```json
{
  "query": "RAG pipeline",
  "resultCount": 3,
  "results": [
    {
      "title": "RAG (Retrieval-Augmented Generation)",
      "description": "Complete RAG pipeline with 9 chunking strategies...",
      "section": "features",
      "path": "features/rag",
      "url": "https://docs.neurolink.ink/docs/features/rag",
      "score": 12.45
    },
    {
      "title": "File Processors",
      "description": "Process 50+ file types for AI consumption...",
      "section": "features",
      "path": "features/file-processors",
      "url": "https://docs.neurolink.ink/docs/features/file-processors",
      "score": 8.21
    }
  ]
}
```

### get_page

Retrieve the full content of a specific documentation page by its path.

**Request:**

```json
{
  "path": "getting-started/installation"
}
```

**Response:**

```json
{
  "title": "Installation",
  "description": "Install NeuroLink via npm, yarn, or pnpm...",
  "section": "getting-started",
  "path": "getting-started/installation",
  "url": "https://docs.neurolink.ink/docs/getting-started/installation",
  "content": "# Installation\n\nInstall NeuroLink using your preferred package manager..."
}
```

### list_sections

List all documentation sections and the pages they contain.

**Request:** _(no parameters)_

**Response:**

```json
{
  "totalSections": 27,
  "totalPages": 361,
  "sections": [
    {
      "name": "getting-started",
      "pageCount": 15,
      "pages": [
        { "title": "Getting Started", "path": "getting-started/index" },
        { "title": "Installation", "path": "getting-started/installation" }
      ]
    },
    {
      "name": "sdk",
      "pageCount": 6,
      "pages": [
        { "title": "SDK Overview", "path": "sdk/index" },
        { "title": "API Reference", "path": "sdk/api-reference" }
      ]
    }
  ]
}
```

### get_api_reference

Get SDK API reference documentation. Pass a method name to filter results.

**Request:**

```json
{
  "method": "generate"
}
```

**Response:**

```json
{
  "query": "generate",
  "results": [
    {
      "title": "API Reference",
      "path": "sdk/api-reference",
      "url": "https://docs.neurolink.ink/docs/sdk/api-reference"
    }
  ]
}
```

### get_examples

Find code examples by topic or AI provider.

**Request:**

```json
{
  "topic": "streaming",
  "provider": "anthropic"
}
```

**Response:**

```json
{
  "query": "streaming anthropic",
  "results": [
    {
      "title": "Streaming with Retry",
      "description": "Implement streaming with automatic retry...",
      "section": "cookbook",
      "path": "cookbook/streaming-with-retry",
      "url": "https://docs.neurolink.ink/docs/cookbook/streaming-with-retry"
    }
  ]
}
```

### get_changelog

Get recent NeuroLink release notes and changelog entries.

**Request:**

```json
{
  "limit": 3
}
```

**Response:**

```json
{
  "entries": [
    {
      "title": "Changelog",
      "description": "NeuroLink release history...",
      "path": "community/changelog",
      "url": "https://docs.neurolink.ink/docs/community/changelog",
      "content": "## 9.12.0\n\n### Features\n- MCP CLI gap fix..."
    }
  ]
}
```

## HTTP Transport

For remote or hosted deployments, start the server with HTTP transport:

```bash
# Start HTTP server on default port 3001
neurolink docs --transport http

# Start on a custom port
neurolink docs --transport http --port 8080
```

The HTTP server exposes:

- `POST /mcp` — MCP endpoint (Streamable HTTP transport)
- `GET /health` — Health check endpoint

Configure your MCP client to connect via HTTP:

```json
{
  "mcpServers": {
    "neurolink-docs": {
      "transport": "http",
      "url": "https://your-server.com/mcp"
    }
  }
}
```

:::info[Hosted version]
The hosted version is available at `https://docs.neurolink.ink/mcp` -- no local installation required.
:::

## Programmatic Usage

You can also add the docs server programmatically via the NeuroLink SDK:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Add the docs server as an external MCP server
await neurolink.addExternalMCPServer("neurolink-docs", {
  command: "npx",
  args: ["-y", "@juspay/neurolink", "docs"],
  transport: "stdio",
});

// Now the AI can use docs tools during generation
const result = await neurolink.generate({
  prompt: "How do I set up RAG with NeuroLink? Search the docs first.",
});
```

Or connect to the HTTP transport:

```typescript
await neurolink.addExternalMCPServer("neurolink-docs", {
  transport: "http",
  url: "https://docs.neurolink.ink/mcp",
});
```

## Building the Search Index

The search index is generated automatically during the docs site build:

```bash
cd docs-site && pnpm build
```

This runs the `docusaurus-plugin-search-index` plugin which:

1. Scans all `docs/**/*.md` and `docs/**/*.mdx` files
2. Parses frontmatter (title, description, tags)
3. Extracts and indexes content with MiniSearch
4. Writes `static/search-index.json`

The index is bundled with the npm package, so end users don't need to build it themselves.

## Troubleshooting

### "search-index.json not found"

The search index hasn't been built yet. Run:

```bash
cd docs-site && pnpm build
```

This generates `docs-site/static/search-index.json` which the MCP server needs to function.

### Outdated search results

The search index is generated at build time. To get the latest docs:

```bash
cd docs-site && pnpm build
```

If using the npm package, update to the latest version:

```bash
npm update @juspay/neurolink
```

### Server not appearing in Claude Desktop / Cursor

1. Verify the config file is in the correct location (see [Quick Start](#quick-start) above)
2. Ensure the JSON is valid — a trailing comma or missing bracket will silently fail
3. Restart the application after saving the config
4. Check that `npx` is available in your PATH

### Connection timeout

If the server takes too long to start:

1. The first run downloads `@juspay/neurolink` via npx — this may take 10-30 seconds
2. Subsequent runs use the npm cache and start faster
3. For faster startup, install globally: `npm install -g @juspay/neurolink`

### Tools not returning results

If search returns empty results:

1. Verify the search index exists and is not empty
2. Try broader search terms — the index uses fuzzy matching with prefix search
3. Use `list_sections` first to see available sections, then filter with `section` parameter
