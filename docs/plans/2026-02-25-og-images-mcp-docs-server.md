# Dynamic OG Images + MCP Docs Server — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add runtime dynamic OG image generation to the landing page (4 templates) and an MCP docs server with 6 tools + pre-built search index to make NeuroLink documentation queryable by AI assistants.

**Architecture:** Two independent features. Feature 1 adds a SvelteKit API route at `/api/og` that uses satori + resvg-wasm to render 4 template types (home, docs, sdk, examples) as 1200x630 PNGs cached at the CDN edge. Feature 2 adds a Docusaurus build plugin that generates a MiniSearch index, and an MCP server (stdio + HTTP) exposing 6 tools, accessible via `neurolink docs` CLI command.

**Tech Stack:** SvelteKit, satori, satori-html, @resvg/resvg-wasm, MiniSearch, @modelcontextprotocol/sdk ^1.26.0, gray-matter, yargs

---

## Part A: Dynamic OG Images

### Task 1: Install OG image dependencies

**Files:**

- Modify: `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/landing/package.json`

**Step 1: Install packages**

Run:

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/landing && pnpm add satori satori-html @resvg/resvg-wasm
```

Expected: 3 packages added to `dependencies` in package.json

**Step 2: Verify installation**

Run:

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/landing && node -e "import('satori').then(() => console.log('satori OK')); import('satori-html').then(() => console.log('satori-html OK')); import('@resvg/resvg-wasm').then(() => console.log('resvg-wasm OK'));"
```

Expected: All three print OK

**Step 3: Commit**

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/landing && git add package.json pnpm-lock.yaml && git commit -m "chore: add satori + resvg-wasm for dynamic OG images"
```

---

### Task 2: Font loading utility

**Files:**

- Create: `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/landing/src/routes/api/og/fonts.ts`

**Step 1: Create fonts.ts**

This module fetches Inter font files from Google Fonts and caches them in memory. Satori requires ArrayBuffer font data.

```typescript
// Font loading + caching for satori OG image generation
// Inter is the primary font used across the landing page

let fontCache: ArrayBuffer[] | null = null;

const INTER_FONTS = [
  {
    url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2",
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hiA.woff2",
    weight: 600 as const,
    style: "normal" as const,
  },
  {
    url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hiA.woff2",
    weight: 700 as const,
    style: "normal" as const,
  },
];

export async function loadFonts(): Promise<
  { name: string; data: ArrayBuffer; weight: number; style: string }[]
> {
  if (fontCache) {
    return fontCache.map((data, i) => ({
      name: "Inter",
      data,
      weight: INTER_FONTS[i].weight,
      style: INTER_FONTS[i].style,
    }));
  }

  const buffers = await Promise.all(
    INTER_FONTS.map(async (font) => {
      const res = await fetch(font.url);
      return res.arrayBuffer();
    }),
  );

  fontCache = buffers;

  return buffers.map((data, i) => ({
    name: "Inter",
    data,
    weight: INTER_FONTS[i].weight,
    style: INTER_FONTS[i].style,
  }));
}
```

**Step 2: Commit**

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/landing && git add src/routes/api/og/fonts.ts && git commit -m "feat(og): add font loading utility for satori"
```

---

### Task 3: OG image templates

**Files:**

- Create: `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/landing/src/routes/api/og/templates.ts`

**Step 1: Create templates.ts**

Four template functions returning satori-html markup. Each returns an HTML string that satori-html converts to a VDOM tree for satori rendering.

Design tokens (from landing page CSS):

- Background: `#0a0a0a`
- Brand blue: `#016fb9`
- Accent orange: `#ff9505`
- Text primary: `#fafafa`
- Text muted: `#94A3B8`
- Gradient: linear-gradient from `#016fb9` to `#ff9505`

```typescript
// OG image templates — 4 types for feature-rich social cards
// All templates render at 1200x630px with Inter font

export type OGType = "home" | "docs" | "sdk" | "examples";

interface OGParams {
  type: OGType;
  title?: string;
  subtitle?: string;
  section?: string;
  method?: string;
}

const COLORS = {
  bg: "#0a0a0a",
  blue: "#016fb9",
  orange: "#ff9505",
  text: "#fafafa",
  muted: "#94A3B8",
  border: "#1e1e1e",
} as const;

// Shared wrapper — all templates use this outer container
function wrap(inner: string): string {
  return `<div style="display:flex;flex-direction:column;width:1200px;height:630px;background:${COLORS.bg};padding:60px;font-family:Inter,sans-serif;">${inner}</div>`;
}

// Shared logo bar at the top
function logoBar(): string {
  return `<div style="display:flex;align-items:center;gap:16px;margin-bottom:40px;">
    <div style="display:flex;width:48px;height:48px;border-radius:12px;background:${COLORS.blue};align-items:center;justify-content:center;">
      <div style="display:flex;color:white;font-size:28px;font-weight:700;">N</div>
    </div>
    <div style="display:flex;font-size:28px;font-weight:700;color:${COLORS.text};">Neuro<span style="color:${COLORS.orange};">Link</span></div>
  </div>`;
}

// Shared footer bar at the bottom
function footerBar(): string {
  return `<div style="display:flex;margin-top:auto;align-items:center;justify-content:space-between;">
    <div style="display:flex;font-size:18px;color:${COLORS.muted};">neurolink.ink</div>
    <div style="display:flex;font-size:16px;color:${COLORS.muted};">The Complete TypeScript AI SDK</div>
  </div>`;
}

function homeTemplate(): string {
  return wrap(`
    ${logoBar()}
    <div style="display:flex;flex-direction:column;flex:1;justify-content:center;">
      <div style="display:flex;font-size:56px;font-weight:700;color:${COLORS.text};line-height:1.1;margin-bottom:20px;">The Complete TypeScript AI SDK</div>
      <div style="display:flex;font-size:24px;color:${COLORS.muted};line-height:1.4;">14+ Providers &middot; RAG &middot; MCP &middot; Agents &middot; Voice &middot; 50+ File Types</div>
    </div>
    ${footerBar()}
  `);
}

function docsTemplate(title: string, section: string): string {
  return wrap(`
    ${logoBar()}
    <div style="display:flex;flex-direction:column;flex:1;justify-content:center;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
        <div style="display:flex;font-size:18px;color:${COLORS.blue};font-weight:600;text-transform:uppercase;letter-spacing:2px;">${section}</div>
      </div>
      <div style="display:flex;font-size:52px;font-weight:700;color:${COLORS.text};line-height:1.15;">${title}</div>
    </div>
    ${footerBar()}
  `);
}

function sdkTemplate(method: string, subtitle: string): string {
  return wrap(`
    ${logoBar()}
    <div style="display:flex;flex-direction:column;flex:1;justify-content:center;">
      <div style="display:flex;font-size:18px;color:${COLORS.blue};font-weight:600;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;">SDK Reference</div>
      <div style="display:flex;padding:24px 32px;background:#141414;border:1px solid ${COLORS.border};border-radius:12px;margin-bottom:20px;">
        <div style="display:flex;font-size:40px;font-weight:600;color:${COLORS.orange};font-family:monospace;">${method}</div>
      </div>
      <div style="display:flex;font-size:22px;color:${COLORS.muted};line-height:1.4;">${subtitle}</div>
    </div>
    ${footerBar()}
  `);
}

function examplesTemplate(title: string, subtitle: string): string {
  return wrap(`
    ${logoBar()}
    <div style="display:flex;flex-direction:column;flex:1;justify-content:center;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="display:flex;width:32px;height:32px;border-radius:8px;background:${COLORS.orange};align-items:center;justify-content:center;">
          <div style="display:flex;color:white;font-size:18px;">&#9654;</div>
        </div>
        <div style="display:flex;font-size:18px;color:${COLORS.orange};font-weight:600;text-transform:uppercase;letter-spacing:2px;">Example</div>
      </div>
      <div style="display:flex;font-size:48px;font-weight:700;color:${COLORS.text};line-height:1.15;margin-bottom:16px;">${title}</div>
      <div style="display:flex;font-size:22px;color:${COLORS.muted};line-height:1.4;">${subtitle}</div>
    </div>
    ${footerBar()}
  `);
}

export function getTemplate(params: OGParams): string {
  switch (params.type) {
    case "home":
      return homeTemplate();
    case "docs":
      return docsTemplate(
        params.title || "Documentation",
        params.section || "Docs",
      );
    case "sdk":
      return sdkTemplate(
        params.method || "generate()",
        params.subtitle || "Unified API for 14+ AI providers",
      );
    case "examples":
      return examplesTemplate(
        params.title || "Code Examples",
        params.subtitle || "Production-ready patterns and recipes",
      );
    default:
      return homeTemplate();
  }
}
```

**Step 2: Commit**

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/landing && git add src/routes/api/og/templates.ts && git commit -m "feat(og): add 4 OG image templates (home, docs, sdk, examples)"
```

---

### Task 4: OG image API endpoint

**Files:**

- Create: `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/landing/src/routes/api/og/+server.ts`

**Step 1: Create the SvelteKit API route**

This is the main endpoint. It parses query params, selects a template, renders via satori, converts to PNG via resvg-wasm, and returns with cache headers.

```typescript
import type { RequestHandler } from "./$types";
import satori from "satori";
import { html } from "satori-html";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import { loadFonts } from "./fonts";
import { getTemplate, type OGType } from "./templates";

let wasmInitialized = false;

async function ensureWasm() {
  if (wasmInitialized) return;
  // @resvg/resvg-wasm ships a .wasm file; initWasm() loads it
  // On Vercel serverless, this runs once per cold start
  try {
    await initWasm(fetch("https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm"));
  } catch {
    // Already initialized (e.g. warm function)
  }
  wasmInitialized = true;
}

const VALID_TYPES = new Set<OGType>(["home", "docs", "sdk", "examples"]);

export const GET: RequestHandler = async ({ url }) => {
  const type = (url.searchParams.get("type") || "home") as OGType;
  const title = url.searchParams.get("title") || undefined;
  const subtitle = url.searchParams.get("subtitle") || undefined;
  const section = url.searchParams.get("section") || undefined;
  const method = url.searchParams.get("method") || undefined;

  // Validate type param
  const resolvedType = VALID_TYPES.has(type) ? type : "home";

  // Load fonts + init WASM in parallel
  const [fonts] = await Promise.all([loadFonts(), ensureWasm()]);

  // Get template HTML string
  const markup = getTemplate({
    type: resolvedType,
    title,
    subtitle,
    section,
    method,
  });

  // Convert HTML string to satori-compatible VDOM
  const vdom = html(markup);

  // Render to SVG
  const svg = await satori(vdom, {
    width: 1200,
    height: 630,
    fonts,
  });

  // Convert SVG to PNG
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return new Response(pngBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable",
    },
  });
};
```

**Step 2: Test locally**

Run:

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/landing && pnpm dev
```

Then open in browser:

- `http://localhost:5173/api/og?type=home`
- `http://localhost:5173/api/og?type=docs&title=Getting%20Started&section=Documentation`
- `http://localhost:5173/api/og?type=sdk&method=generate()&subtitle=Text%20generation`
- `http://localhost:5173/api/og?type=examples&title=RAG%20Pipeline&subtitle=Build%20a%20complete%20RAG%20system`

Expected: Each URL returns a 1200x630 PNG image with the correct template design.

**Step 3: Commit**

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/landing && git add src/routes/api/og/+server.ts && git commit -m "feat(og): add /api/og endpoint with satori + resvg-wasm rendering"
```

---

### Task 5: Update meta tags to use dynamic OG image

**Files:**

- Modify: `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/landing/src/routes/+layout.svelte` (line 61, line 68)

**Step 1: Update og:image and twitter:image URLs**

Change line 61 from:

```html
<meta property="og:image" content="https://neurolink.ink/img/og-default.png" />
```

to:

```html
<meta property="og:image" content="https://neurolink.ink/api/og?type=home" />
```

Change line 68 from:

```html
<meta name="twitter:image" content="https://neurolink.ink/img/og-default.png" />
```

to:

```html
<meta name="twitter:image" content="https://neurolink.ink/api/og?type=home" />
```

**Step 2: Commit**

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/landing && git add src/routes/+layout.svelte && git commit -m "feat(og): update meta tags to use dynamic OG image endpoint"
```

---

## Part B: MCP Docs Server

### Task 6: Install MCP docs server dependencies

**Files:**

- Modify: `/Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues/package.json`

**Step 1: Install packages**

Run:

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues && pnpm add minisearch gray-matter
```

`@modelcontextprotocol/sdk` is already at ^1.26.0.

Expected: `minisearch` and `gray-matter` added to dependencies

**Step 2: Commit**

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues && git add package.json pnpm-lock.yaml && git commit -m "chore: add minisearch + gray-matter for MCP docs server"
```

---

### Task 7: Docusaurus search index plugin

**Files:**

- Create: `/Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues/docs-site/plugins/docusaurus-plugin-search-index/index.js`
- Modify: `/Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues/docs-site/docusaurus.config.ts` (plugins array, ~line 355)

**Step 1: Create the plugin**

This plugin runs during Docusaurus build. It globs all docs markdown files, parses frontmatter with gray-matter, strips Markdown syntax from content, builds a MiniSearch index, and writes `static/search-index.json`.

````javascript
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

/**
 * Docusaurus plugin that generates a MiniSearch-compatible search index
 * at build time. The index is consumed by the MCP docs server.
 */
module.exports = function pluginSearchIndex(context, opts) {
  const docsDir = path.resolve(context.siteDir, opts.docsDir || "docs");
  const outputPath = path.resolve(
    context.siteDir,
    "static",
    opts.outputFile || "search-index.json",
  );
  const debug = opts.debug || false;

  function log(...args) {
    if (debug) console.log("[search-index]", ...args);
  }

  /**
   * Recursively collect all .md and .mdx files from docs directory
   */
  function collectMarkdownFiles(dir, basePath = "") {
    const files = [];
    if (!fs.existsSync(dir)) return files;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(basePath, entry.name);

      if (entry.isDirectory()) {
        files.push(...collectMarkdownFiles(fullPath, relPath));
      } else if (/\.(md|mdx)$/.test(entry.name)) {
        files.push({ fullPath, relPath });
      }
    }
    return files;
  }

  /**
   * Strip markdown syntax to get plain text for indexing
   */
  function stripMarkdown(text) {
    return text
      .replace(/```[\s\S]*?```/g, "") // code blocks
      .replace(/`[^`]+`/g, "") // inline code
      .replace(/!\[.*?\]\(.*?\)/g, "") // images
      .replace(/\[([^\]]+)\]\(.*?\)/g, "$1") // links → text
      .replace(/#{1,6}\s+/g, "") // headings
      .replace(/[*_~]+/g, "") // bold/italic/strike
      .replace(/>\s+/g, "") // blockquotes
      .replace(/\|.*\|/g, "") // tables
      .replace(/-{3,}/g, "") // horizontal rules
      .replace(/\n{2,}/g, "\n") // multiple newlines
      .trim();
  }

  /**
   * Extract the top-level section from a relative path
   * e.g. "features/multimodal.md" → "features"
   */
  function getSection(relPath) {
    const parts = relPath.split(path.sep);
    return parts.length > 1 ? parts[0] : "root";
  }

  return {
    name: "docusaurus-plugin-search-index",

    async loadContent() {
      const markdownFiles = collectMarkdownFiles(docsDir);
      log(`Found ${markdownFiles.length} markdown files`);

      const documents = [];

      for (const { fullPath, relPath } of markdownFiles) {
        try {
          const raw = fs.readFileSync(fullPath, "utf-8");
          const { data: frontmatter, content } = matter(raw);

          const title =
            frontmatter.title ||
            frontmatter.sidebar_label ||
            path.basename(relPath, path.extname(relPath));
          const description = frontmatter.description || "";
          const tags = frontmatter.tags || [];
          const section = getSection(relPath);
          const docPath = relPath
            .replace(/\\/g, "/")
            .replace(/\.(md|mdx)$/, "")
            .replace(/\/index$/, "");

          documents.push({
            id: docPath,
            title,
            description,
            content: stripMarkdown(content).slice(0, 5000), // Cap content for index size
            section,
            tags: Array.isArray(tags) ? tags : [],
            path: docPath,
          });
        } catch (err) {
          log(`Error processing ${relPath}:`, err.message);
        }
      }

      log(`Indexed ${documents.length} documents`);
      return { documents };
    },

    async contentLoaded({ content }) {
      const { documents } = content;

      // Write raw documents array — MiniSearch index is built at server startup
      // This avoids MiniSearch version coupling between plugin and server
      const indexData = {
        version: 1,
        generatedAt: new Date().toISOString(),
        documentCount: documents.length,
        documents,
      };

      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(indexData));
      log(`Wrote search index to ${outputPath} (${documents.length} docs)`);
    },
  };
};
````

**Step 2: Register plugin in docusaurus.config.ts**

Add to the `plugins` array (after the existing `docusaurus-plugin-new-docs` entry, around line 360):

```typescript
// Search index for MCP docs server
["./plugins/docusaurus-plugin-search-index", {
  docsDir: "docs",
  outputFile: "search-index.json",
  debug: process.env.NODE_ENV === "development",
}],
```

**Step 3: Test the plugin**

Run:

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues/docs-site && pnpm build 2>&1 | head -30
```

Then verify the index was generated:

```bash
ls -la /Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues/docs-site/static/search-index.json
```

Expected: File exists, non-empty JSON with `documents` array.

Run:

```bash
node -e "const d = require('./docs-site/static/search-index.json'); console.log('Docs:', d.documentCount, 'Version:', d.version)"
```

Expected: `Docs: <number> Version: 1`

**Step 4: Commit**

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues && git add docs-site/plugins/docusaurus-plugin-search-index/index.js docs-site/docusaurus.config.ts && git commit -m "feat(mcp-docs): add search index Docusaurus plugin"
```

---

### Task 8: MCP docs server — types and search module

**Files:**

- Create: `/Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues/docs-site/mcp-server/types.ts`
- Create: `/Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues/docs-site/mcp-server/search.ts`

**Step 1: Create types.ts**

```typescript
/** Document shape as stored in search-index.json */
export interface IndexDocument {
  id: string;
  title: string;
  description: string;
  content: string;
  section: string;
  tags: string[];
  path: string;
}

/** Top-level search index file shape */
export interface SearchIndex {
  version: number;
  generatedAt: string;
  documentCount: number;
  documents: IndexDocument[];
}

/** Search result returned from MiniSearch */
export interface SearchResult {
  id: string;
  title: string;
  description: string;
  section: string;
  path: string;
  score: number;
  content?: string;
}

/** Section info for list_sections tool */
export interface SectionInfo {
  name: string;
  pageCount: number;
  pages: { title: string; path: string }[];
}
```

**Step 2: Create search.ts**

MiniSearch wrapper that loads the pre-built index and provides search, get, and list operations.

```typescript
import MiniSearch from "minisearch";
import type {
  IndexDocument,
  SearchIndex,
  SearchResult,
  SectionInfo,
} from "./types.js";

export class DocsSearch {
  private miniSearch: MiniSearch<IndexDocument>;
  private documents: Map<string, IndexDocument> = new Map();
  private sections: Map<string, IndexDocument[]> = new Map();

  constructor() {
    this.miniSearch = new MiniSearch<IndexDocument>({
      fields: ["title", "description", "content", "tags"],
      storeFields: ["title", "description", "section", "path"],
      searchOptions: {
        boost: { title: 3, description: 2, tags: 1.5 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
  }

  /** Load documents from the pre-built search index */
  loadIndex(indexData: SearchIndex): void {
    for (const doc of indexData.documents) {
      this.documents.set(doc.id, doc);

      const sectionDocs = this.sections.get(doc.section) || [];
      sectionDocs.push(doc);
      this.sections.set(doc.section, sectionDocs);
    }

    this.miniSearch.addAll(indexData.documents);
  }

  /** Full-text search with optional section filter */
  search(query: string, limit = 10, section?: string): SearchResult[] {
    const filter = section
      ? { filter: (result: { section: string }) => result.section === section }
      : {};
    const results = this.miniSearch.search(query, {
      ...filter,
    }) as (SearchResult & { score: number })[];

    return results.slice(0, limit).map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      section: r.section,
      path: r.path,
      score: r.score,
    }));
  }

  /** Get full content of a specific doc page */
  getPage(docPath: string): IndexDocument | undefined {
    // Try exact match first, then try without leading slash
    return (
      this.documents.get(docPath) ||
      this.documents.get(docPath.replace(/^\//, ""))
    );
  }

  /** List all sections and their pages */
  listSections(): SectionInfo[] {
    const result: SectionInfo[] = [];
    for (const [name, docs] of this.sections) {
      result.push({
        name,
        pageCount: docs.length,
        pages: docs.map((d) => ({ title: d.title, path: d.path })),
      });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Get documents by section (for api reference, examples, changelog) */
  getBySection(section: string): IndexDocument[] {
    return this.sections.get(section) || [];
  }

  /** Get total document count */
  get documentCount(): number {
    return this.documents.size;
  }
}
```

**Step 3: Commit**

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues && git add docs-site/mcp-server/types.ts docs-site/mcp-server/search.ts && git commit -m "feat(mcp-docs): add types and MiniSearch wrapper"
```

---

### Task 9: MCP docs server — tool definitions

**Files:**

- Create: `/Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues/docs-site/mcp-server/tools.ts`

**Step 1: Create tools.ts**

Six MCP tool implementations using the `@modelcontextprotocol/sdk` tool definition pattern.

```typescript
import type { DocsSearch } from "./search.js";

/** Tool definitions for MCP protocol — each has name, description, inputSchema, and handler */
export function createToolDefinitions(search: DocsSearch) {
  return {
    search_docs: {
      name: "search_docs",
      description:
        "Full-text search across all NeuroLink documentation. Returns ranked results with title, description, section, and path.",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description:
              "Search query (e.g. 'RAG pipeline', 'MCP configuration', 'streaming')",
          },
          limit: {
            type: "number",
            description: "Max results to return (default: 10, max: 50)",
          },
          section: {
            type: "string",
            description:
              "Filter by section (e.g. 'features', 'sdk', 'cli', 'mcp', 'rag', 'examples')",
          },
        },
        required: ["query"],
      },
      handler: (args: { query: string; limit?: number; section?: string }) => {
        const limit = Math.min(args.limit || 10, 50);
        const results = search.search(args.query, limit, args.section);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  query: args.query,
                  resultCount: results.length,
                  results: results.map((r) => ({
                    title: r.title,
                    description: r.description,
                    section: r.section,
                    path: r.path,
                    url: `https://docs.neurolink.ink/docs/${r.path}`,
                    score: Math.round(r.score * 100) / 100,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    },

    get_page: {
      name: "get_page",
      description:
        "Get the full content of a specific documentation page by its path. Returns title, description, section, and full markdown content.",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: {
            type: "string",
            description:
              "Document path (e.g. 'getting-started/installation', 'features/multimodal', 'sdk/api-reference')",
          },
        },
        required: ["path"],
      },
      handler: (args: { path: string }) => {
        const doc = search.getPage(args.path);
        if (!doc) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: "Page not found",
                  path: args.path,
                  hint: "Use search_docs or list_sections to find valid paths",
                }),
              },
            ],
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  title: doc.title,
                  description: doc.description,
                  section: doc.section,
                  path: doc.path,
                  url: `https://docs.neurolink.ink/docs/${doc.path}`,
                  content: doc.content,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    },

    list_sections: {
      name: "list_sections",
      description:
        "List all documentation sections and their pages. Use this to discover available content and navigate the docs structure.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      handler: () => {
        const sections = search.listSections();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  totalSections: sections.length,
                  totalPages: sections.reduce((sum, s) => sum + s.pageCount, 0),
                  sections: sections.map((s) => ({
                    name: s.name,
                    pageCount: s.pageCount,
                    pages: s.pages.map((p) => ({
                      title: p.title,
                      path: p.path,
                    })),
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    },

    get_api_reference: {
      name: "get_api_reference",
      description:
        "Get SDK API reference documentation. Optionally filter by method name (e.g. 'generate', 'stream', 'addExternalMCPServer').",
      inputSchema: {
        type: "object" as const,
        properties: {
          method: {
            type: "string",
            description:
              "Filter by method name (e.g. 'generate', 'stream'). Omit to get full API reference.",
          },
        },
      },
      handler: (args: { method?: string }) => {
        if (args.method) {
          // Search for the specific method in SDK docs
          const results = search.search(args.method, 5, "sdk");
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    query: args.method,
                    results: results.map((r) => ({
                      title: r.title,
                      path: r.path,
                      url: `https://docs.neurolink.ink/docs/${r.path}`,
                    })),
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        // Return all SDK docs
        const sdkDocs = search.getBySection("sdk");
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  section: "sdk",
                  pageCount: sdkDocs.length,
                  pages: sdkDocs.map((d) => ({
                    title: d.title,
                    description: d.description,
                    path: d.path,
                    url: `https://docs.neurolink.ink/docs/${d.path}`,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    },

    get_examples: {
      name: "get_examples",
      description:
        "Get code examples from the documentation. Optionally filter by topic or provider.",
      inputSchema: {
        type: "object" as const,
        properties: {
          topic: {
            type: "string",
            description:
              "Filter by topic (e.g. 'rag', 'streaming', 'agents', 'mcp')",
          },
          provider: {
            type: "string",
            description:
              "Filter by provider (e.g. 'openai', 'anthropic', 'google', 'bedrock')",
          },
        },
      },
      handler: (args: { topic?: string; provider?: string }) => {
        const query = [args.topic, args.provider].filter(Boolean).join(" ");
        if (!query) {
          // Return all examples
          const exampleDocs = [
            ...search.getBySection("examples"),
            ...search.getBySection("cookbook"),
            ...search.getBySection("demos"),
          ];
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    pageCount: exampleDocs.length,
                    pages: exampleDocs.map((d) => ({
                      title: d.title,
                      description: d.description,
                      section: d.section,
                      path: d.path,
                      url: `https://docs.neurolink.ink/docs/${d.path}`,
                    })),
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        const results = search.search(query, 10);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  query,
                  results: results.map((r) => ({
                    title: r.title,
                    description: r.description,
                    section: r.section,
                    path: r.path,
                    url: `https://docs.neurolink.ink/docs/${r.path}`,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    },

    get_changelog: {
      name: "get_changelog",
      description: "Get recent changelog entries for NeuroLink releases.",
      inputSchema: {
        type: "object" as const,
        properties: {
          limit: {
            type: "number",
            description: "Max entries to return (default: 5)",
          },
        },
      },
      handler: (args: { limit?: number }) => {
        const changelogDocs = search.getBySection("community");
        const changelog = changelogDocs.filter(
          (d) =>
            d.path.includes("changelog") ||
            d.title.toLowerCase().includes("changelog") ||
            d.title.toLowerCase().includes("release"),
        );
        const limit = args.limit || 5;

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  entries: changelog.slice(0, limit).map((d) => ({
                    title: d.title,
                    description: d.description,
                    path: d.path,
                    url: `https://docs.neurolink.ink/docs/${d.path}`,
                    content: d.content.slice(0, 2000),
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    },
  };
}
```

**Step 2: Commit**

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues && git add docs-site/mcp-server/tools.ts && git commit -m "feat(mcp-docs): add 6 MCP tool definitions"
```

---

### Task 10: MCP docs server — server entry point

**Files:**

- Create: `/Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues/docs-site/mcp-server/index.ts`

**Step 1: Create the server entry point**

This is the main MCP server file. It loads the search index, creates the MiniSearch instance, registers 6 tools, and starts either a stdio or HTTP transport based on command-line args.

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DocsSearch } from "./search.js";
import { createToolDefinitions } from "./tools.js";
import type { SearchIndex } from "./types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Resolve search index location:
 * 1. Local file (development): docs-site/static/search-index.json
 * 2. Package-relative (npm): relative to this file
 */
function resolveIndexPath(): string {
  // Try local development path first
  const localPath = path.resolve(__dirname, "../static/search-index.json");
  if (fs.existsSync(localPath)) return localPath;

  // Try package-relative path
  const pkgPath = path.resolve(
    __dirname,
    "../../docs-site/static/search-index.json",
  );
  if (fs.existsSync(pkgPath)) return pkgPath;

  throw new Error(
    "search-index.json not found. Run docs-site build first: cd docs-site && pnpm build",
  );
}

/** Load and initialize the search engine */
function initSearch(): DocsSearch {
  const indexPath = resolveIndexPath();
  const raw = fs.readFileSync(indexPath, "utf-8");
  const indexData: SearchIndex = JSON.parse(raw);

  const search = new DocsSearch();
  search.loadIndex(indexData);

  return search;
}

/** Create and configure the MCP server with all 6 tools */
function createServer(search: DocsSearch): McpServer {
  const server = new McpServer({
    name: "neurolink-docs",
    version: "1.0.0",
  });

  const tools = createToolDefinitions(search);

  // Register all tools with the MCP server
  for (const tool of Object.values(tools)) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema,
      async (args: Record<string, unknown>) => {
        return tool.handler(args as never);
      },
    );
  }

  return server;
}

/** Start stdio transport (default — for Claude Desktop, Cursor, etc.) */
async function startStdio(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

/** Start HTTP transport (for remote hosted access) */
async function startHttp(server: McpServer, port: number): Promise<void> {
  // Dynamic import to avoid loading HTTP deps when using stdio
  const { StreamableHTTPServerTransport } =
    await import("@modelcontextprotocol/sdk/server/streamableHttp.js");
  const http = await import("http");

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  await server.connect(transport);

  const httpServer = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === "/mcp" && req.method === "POST") {
      await transport.handleRequest(req, res);
    } else if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", docs: search.documentCount }));
    } else {
      res.writeHead(404);
      res.end("Not Found");
    }
  });

  httpServer.listen(port, () => {
    console.error(
      `NeuroLink MCP Docs Server listening on http://localhost:${port}/mcp`,
    );
    console.error(`Health check: http://localhost:${port}/health`);
  });
}

/** Main entry — parse args and start server */
export async function startDocsServer(args: {
  transport?: string;
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

// Allow direct execution: node docs-site/mcp-server/index.js
// (When not imported as a module by the CLI)
const isDirectExecution =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].includes("mcp-server");

if (isDirectExecution) {
  const args = process.argv.slice(2);
  const transportFlag = args.includes("--transport")
    ? args[args.indexOf("--transport") + 1]
    : "stdio";
  const portFlag = args.includes("--port")
    ? parseInt(args[args.indexOf("--port") + 1], 10)
    : 3001;

  startDocsServer({ transport: transportFlag, port: portFlag }).catch((err) => {
    console.error("Failed to start MCP docs server:", err);
    process.exit(1);
  });
}
```

**Step 2: Commit**

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues && git add docs-site/mcp-server/index.ts && git commit -m "feat(mcp-docs): add MCP server entry with stdio + HTTP transport"
```

---

### Task 11: CLI `neurolink docs` command

**Files:**

- Create: `/Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues/src/cli/commands/docs.ts`
- Modify: `/Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues/src/cli/parser.ts` (add import + .command() call)

**Step 1: Create docs.ts command**

Follow the existing CLI command pattern (yargs CommandModule, static factory method, chalk + ora for UX).

```typescript
import type { CommandModule, Argv } from "yargs";
import chalk from "chalk";

interface DocsCommandArgs {
  transport?: string;
  port?: number;
}

export class DocsCommandFactory {
  static createDocsCommand(): CommandModule<object, DocsCommandArgs> {
    return {
      command: "docs",
      describe: "Start the NeuroLink documentation MCP server",
      builder: (yargs: Argv) =>
        yargs
          .option("transport", {
            alias: "t",
            type: "string",
            choices: ["stdio", "http"],
            default: "stdio",
            description:
              "Transport protocol (stdio for local, http for remote)",
          })
          .option("port", {
            alias: "p",
            type: "number",
            default: 3001,
            description: "Port for HTTP transport (ignored for stdio)",
          }) as Argv<DocsCommandArgs>,
      handler: async (argv) => {
        await DocsCommandFactory.executeDocs(argv);
      },
    };
  }

  private static async executeDocs(argv: DocsCommandArgs): Promise<void> {
    try {
      // Dynamic import to avoid loading MCP deps at CLI startup
      const { startDocsServer } =
        await import("../../../docs-site/mcp-server/index.js");

      await startDocsServer({
        transport: argv.transport,
        port: argv.port,
      });
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("search-index.json not found")
      ) {
        console.error(
          chalk.red("\nSearch index not found. Build the docs site first:\n"),
        );
        console.error(chalk.cyan("  cd docs-site && pnpm build\n"));
        process.exit(1);
      }
      console.error(chalk.red("Failed to start docs server:"), err);
      process.exit(1);
    }
  }
}
```

**Step 2: Register in parser.ts**

Add import at the top of `src/cli/parser.ts` (after the existing imports, around line 12):

```typescript
import { DocsCommandFactory } from "./commands/docs.js";
```

Add command registration (after the ragCommand line, around line 208):

```typescript
// Docs MCP Server Command
.command(DocsCommandFactory.createDocsCommand())
```

**Step 3: Verify TypeScript compiles**

Run:

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues && npx tsc --noEmit --project tsconfig.cli.json 2>&1 | head -20
```

Expected: No errors related to docs.ts

**Step 4: Commit**

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues && git add src/cli/commands/docs.ts src/cli/parser.ts && git commit -m "feat(cli): add 'neurolink docs' command for MCP docs server"
```

---

### Task 12: Integration test — build index + verify search

**Step 1: Build the docs site to generate search-index.json**

Run:

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues/docs-site && pnpm build 2>&1 | tail -5
```

Expected: Build succeeds, `[search-index]` log lines appear if debug=true

**Step 2: Verify the index**

Run:

```bash
node -e "
const d = require('./docs-site/static/search-index.json');
console.log('Version:', d.version);
console.log('Generated:', d.generatedAt);
console.log('Documents:', d.documentCount);
console.log('Sections:', [...new Set(d.documents.map(d => d.section))].join(', '));
console.log('Sample:', d.documents[0]?.title, '-', d.documents[0]?.path);
"
```

Expected: Shows document count (180+), sections list, sample document title

**Step 3: Test search module directly**

Run:

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues && npx tsx -e "
import { DocsSearch } from './docs-site/mcp-server/search.js';
import indexData from './docs-site/static/search-index.json' with { type: 'json' };

const search = new DocsSearch();
search.loadIndex(indexData);

console.log('Total docs:', search.documentCount);
console.log('');

// Test search
const results = search.search('RAG pipeline', 3);
console.log('Search \"RAG pipeline\":');
results.forEach(r => console.log(' ', r.title, '-', r.section, '(score:', r.score.toFixed(2), ')'));
console.log('');

// Test get_page
const page = search.getPage('getting-started/installation');
console.log('Get page:', page ? page.title : 'NOT FOUND');
console.log('');

// Test list_sections
const sections = search.listSections();
console.log('Sections:', sections.length);
sections.forEach(s => console.log(' ', s.name, ':', s.pageCount, 'pages'));
"
```

Expected: Search returns relevant results, getPage finds the installation page, sections lists all 25+ sections

**Step 4: Commit test results (if search-index.json should be tracked)**

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues && echo "docs-site/static/search-index.json" >> .gitignore && git add .gitignore && git commit -m "chore: gitignore generated search-index.json"
```

Note: The search index is generated at build time and should not be committed.

---

### Task 13: End-to-end test — stdio MCP server

**Step 1: Test the MCP server starts and responds to tool calls**

The MCP stdio protocol uses JSON-RPC over stdin/stdout. We can test by sending an initialization message and a tool list request.

Run:

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues && echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | npx tsx docs-site/mcp-server/index.ts 2>/dev/null | head -1
```

Expected: JSON-RPC response with server capabilities, including `tools` capability

**Step 2: Test tool listing**

Run:

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues && printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":2,"method":"tools/list"}\n' | npx tsx docs-site/mcp-server/index.ts 2>/dev/null
```

Expected: Response includes all 6 tools: search_docs, get_page, list_sections, get_api_reference, get_examples, get_changelog

**Step 3: Final commit**

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/fix/documentation-issues && git add -A && git commit -m "feat: complete dynamic OG images + MCP docs server implementation"
```

---

## Summary

| Task | Feature   | What                                                 |
| ---- | --------- | ---------------------------------------------------- |
| 1    | OG Images | Install satori, satori-html, @resvg/resvg-wasm       |
| 2    | OG Images | Font loading utility (Inter 400/600/700)             |
| 3    | OG Images | 4 templates (home, docs, sdk, examples)              |
| 4    | OG Images | API endpoint `/api/og` with satori + resvg rendering |
| 5    | OG Images | Update meta tags to use dynamic endpoint             |
| 6    | MCP Docs  | Install minisearch, gray-matter                      |
| 7    | MCP Docs  | Docusaurus search index plugin                       |
| 8    | MCP Docs  | Types + MiniSearch wrapper                           |
| 9    | MCP Docs  | 6 MCP tool definitions                               |
| 10   | MCP Docs  | Server entry (stdio + HTTP)                          |
| 11   | MCP Docs  | CLI `neurolink docs` command                         |
| 12   | MCP Docs  | Integration test — build + verify search             |
| 13   | MCP Docs  | E2E test — stdio MCP server                          |
