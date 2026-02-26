# Design: Dynamic OG Images + MCP Docs Server

**Date**: 2026-02-25
**Status**: Approved
**Features**: Dynamic OG Images, MCP Docs Server

---

## Feature 1: Dynamic OG Images

### Decision Summary

- **Approach**: satori + @resvg/resvg-wasm (pure WASM, no native deps)
- **Generation**: Runtime via Vercel serverless function
- **Design**: Feature-rich cards with 4 templates per page type
- **Caching**: CDN edge cache with long TTL

### Endpoint

```
GET /api/og?type=home
GET /api/og?type=docs&title=Getting+Started&section=Documentation
GET /api/og?type=sdk&method=generate()&subtitle=Text+generation+with+13+providers
GET /api/og?type=examples&title=RAG+Pipeline&subtitle=Build+a+complete+RAG+system
```

Single SvelteKit API route: `src/routes/api/og/+server.ts`

### Templates

| Type       | Layout                                  | Dynamic Fields         |
| ---------- | --------------------------------------- | ---------------------- |
| `home`     | Brain logo + "NeuroLink" + tagline      | None (branded default) |
| `docs`     | Section icon + breadcrumb + title       | `title`, `section`     |
| `sdk`      | Code-style monospace + method signature | `method`, `subtitle`   |
| `examples` | Play icon + example name + description  | `title`, `subtitle`    |

### Rendering Pipeline

1. Parse query params, select template
2. Load Inter font (cached after first load)
3. satori renders JSX-like markup to SVG
4. @resvg/resvg-wasm converts SVG to PNG (1200x630)
5. Return PNG with `Cache-Control: public, max-age=86400, s-maxage=31536000, immutable`

### Design Tokens

- Background: `#0a0a0a`
- Brand blue: `#016fb9`
- Accent orange: `#ff9505`
- Text primary: `#fafafa`
- Text muted: `#94A3B8`
- Font: Inter (400, 600, 700)
- Monospace: Hack (for SDK template)

### Dependencies

- `satori` — JSX to SVG
- `satori-html` — HTML string to satori-compatible VDOM
- `@resvg/resvg-wasm` — SVG to PNG

### Files

**New:**

- `landing/src/routes/api/og/+server.ts` — endpoint + rendering
- `landing/src/routes/api/og/templates.ts` — 4 template functions
- `landing/src/routes/api/og/fonts.ts` — font loading + caching

**Modified:**

- `landing/src/routes/+layout.svelte` — update og:image URL
- `landing/package.json` — add satori, satori-html, @resvg/resvg-wasm

---

## Feature 2: MCP Docs Server

### Decision Summary

- **Approach**: Docusaurus build plugin + standalone server
- **Location**: `docs-site/mcp-server/`
- **Transport**: Both stdio and HTTP
- **CLI command**: `neurolink docs`
- **Index**: Pre-built at docs-site build time via MiniSearch
- **Package**: Part of main `@juspay/neurolink` package (not separate)

### Directory Structure

```
docs-site/
├── mcp-server/
│   ├── index.ts          — Server entry point (stdio + HTTP)
│   ├── tools.ts          — 6 tool definitions
│   ├── search.ts         — MiniSearch wrapper
│   └── types.ts          — Shared types
├── plugins/
│   └── docusaurus-plugin-search-index/
│       └── index.js      — Build-time index generator
└── static/
    └── search-index.json — Pre-built MiniSearch index (generated)
```

### Build-time Index Generation

Docusaurus plugin runs during build:

1. Glob all `docs/**/*.md` and `docs/**/*.mdx` (359 files)
2. Parse frontmatter (title, sidebar_label, description, tags)
3. Extract content, strip Markdown syntax
4. Build MiniSearch index with fields: `title`, `content`, `section`, `path`
5. Write `static/search-index.json`

### 6 MCP Tools

| Tool                | Description                                       | Params                        |
| ------------------- | ------------------------------------------------- | ----------------------------- |
| `search_docs`       | Full-text search across all docs                  | `query`, `limit?`, `section?` |
| `get_page`          | Get full content of a specific doc page           | `path`                        |
| `list_sections`     | List all doc sections and their pages             | none                          |
| `get_api_reference` | Get SDK API reference (methods, params, examples) | `method?`                     |
| `get_examples`      | Get code examples by topic                        | `topic?`, `provider?`         |
| `get_changelog`     | Get recent changelog entries                      | `limit?`                      |

### Dual Transport

**stdio (local):**

```bash
neurolink docs
```

MCP config for Claude Desktop / Cursor:

```json
{
  "neurolink-docs": {
    "command": "npx",
    "args": ["@juspay/neurolink", "docs"]
  }
}
```

**HTTP (remote):**

- Hosted at `https://docs.neurolink.ink/mcp`
- Uses `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk`
- Rate limiting via existing httpRateLimiter pattern

### CLI Integration

```
neurolink docs                                — Start MCP docs server (stdio)
neurolink docs --transport http --port 3001   — Start HTTP server
```

Registered in `src/cli/commands/docs.ts`, added to CLI entry point.

### Dependencies

- `minisearch` — Full-text search (~8KB)
- `@modelcontextprotocol/sdk` — Already at ^1.26.0
- `gray-matter` — Frontmatter parsing (build-time only)

### Index Sync

Index stays in sync automatically:

1. Docusaurus build runs plugin → generates `search-index.json`
2. `search-index.json` deploys with docs site (HTTP transport loads from URL)
3. npm package bundles the index (stdio transport loads from package)
4. Every docs deploy = fresh index

### Files

**New:**

- `docs-site/mcp-server/index.ts` — Server entry (stdio + HTTP)
- `docs-site/mcp-server/tools.ts` — 6 tool implementations
- `docs-site/mcp-server/search.ts` — MiniSearch wrapper
- `docs-site/mcp-server/types.ts` — Types
- `docs-site/plugins/docusaurus-plugin-search-index/index.js` — Index builder
- `src/cli/commands/docs.ts` — CLI command

**Modified:**

- `src/cli/index.ts` — Register docs command
- `docs-site/docusaurus.config.ts` — Add search-index plugin
- `package.json` — Add minisearch, gray-matter
