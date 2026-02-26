import { z } from "zod";
import type { DocsSearch } from "./search.js";

export function createToolDefinitions(search: DocsSearch) {
  return {
    search_docs: {
      name: "search_docs",
      description:
        "Full-text search across all NeuroLink documentation. Returns ranked results with title, description, section, and path.",
      paramsSchema: {
        query: z
          .string()
          .describe(
            "Search query (e.g. 'RAG pipeline', 'MCP configuration', 'streaming')",
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Max results to return (default: 10, max: 50)"),
        section: z
          .string()
          .optional()
          .describe(
            "Filter by section (e.g. 'features', 'sdk', 'cli', 'mcp', 'rag', 'examples')",
          ),
      },
      handler: (args: { query: string; limit?: number; section?: string }) => {
        const limit = Math.max(1, Math.min(args.limit || 10, 50));
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
        "Get the full content of a specific documentation page by its path.",
      paramsSchema: {
        path: z
          .string()
          .describe(
            "Document path (e.g. 'getting-started/installation', 'features/multimodal')",
          ),
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
      description: "List all documentation sections and their pages.",
      paramsSchema: {},
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
        "Get SDK API reference documentation. Optionally filter by method name.",
      paramsSchema: {
        method: z
          .string()
          .optional()
          .describe(
            "Filter by method name (e.g. 'generate', 'stream'). Omit for full reference.",
          ),
      },
      handler: (args: { method?: string }) => {
        if (args.method) {
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
      paramsSchema: {
        topic: z
          .string()
          .optional()
          .describe(
            "Filter by topic (e.g. 'rag', 'streaming', 'agents', 'mcp')",
          ),
        provider: z
          .string()
          .optional()
          .describe(
            "Filter by provider (e.g. 'openai', 'anthropic', 'google')",
          ),
      },
      handler: (args: { topic?: string; provider?: string }) => {
        const query = [args.topic, args.provider].filter(Boolean).join(" ");
        if (!query) {
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
        const exampleSections = ["examples", "cookbook", "demos"];
        const allResults = exampleSections.flatMap((section) =>
          search.search(query, 10, section),
        );
        const seen = new Map<string, (typeof allResults)[0]>();
        for (const r of allResults) {
          const existing = seen.get(r.id);
          if (!existing || r.score > existing.score) {
            seen.set(r.id, r);
          }
        }
        const results = Array.from(seen.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);
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
      paramsSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Max entries to return (default: 5)"),
      },
      handler: (args: { limit?: number }) => {
        const changelogDocs = search.getBySection("community");
        const changelog = changelogDocs
          .filter(
            (d) =>
              d.path.includes("changelog") ||
              d.title.toLowerCase().includes("changelog") ||
              d.title.toLowerCase().includes("release notes"),
          )
          .sort((a, b) => {
            const toEpoch = (p: string) => {
              const m = p.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
              if (!m) return Number.NEGATIVE_INFINITY;
              const [, y, mo, d] = m;
              return Date.UTC(Number(y), Number(mo) - 1, Number(d));
            };
            return (
              toEpoch(b.path) - toEpoch(a.path) || b.path.localeCompare(a.path)
            );
          });
        const limit = Math.max(1, Math.min(args.limit || 5, 50));
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
