const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

module.exports = function pluginSearchIndex(context, opts = {}) {
  const docsDir = path.resolve(context.siteDir, opts.docsDir || "docs");
  const outputPath = path.resolve(
    context.siteDir,
    "static",
    opts.outputFile || "search-index.json",
  );
  const debug = opts.debug || false;

  function log(...args) {
    if (debug) {
      console.log("[search-index]", ...args);
    }
  }

  function collectMarkdownFiles(dir, basePath = "") {
    const files = [];
    if (!fs.existsSync(dir)) {
      return files;
    }

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

  function stripMarkdown(text) {
    let result = text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]+`/g, "")
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
      .replace(/#{1,6}\s+/g, "")
      .replace(/[*_~]+/g, "")
      .replace(/>\s+/g, "")
      .replace(/\|.*\|/g, "")
      .replace(/-{3,}/g, "");
    // Iteratively strip HTML tags to handle nested/malformed tags
    let prev;
    do {
      prev = result;
      result = result.replace(/<[^>]*>/g, "").replace(/<[a-zA-Z][^>]*$/gm, "");
    } while (result !== prev);
    return result.replace(/\n{2,}/g, "\n").trim();
  }

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
            content: stripMarkdown(content).slice(0, 5000),
            section,
            tags: Array.isArray(tags) ? tags : [],
            path: docPath,
          });
        } catch (err) {
          console.warn(
            `[search-index] Error processing ${relPath}:`,
            err.message,
          );
        }
      }

      log(`Indexed ${documents.length} documents`);
      return { documents };
    },

    async contentLoaded({ content }) {
      const { documents } = content;

      const indexData = {
        version: 1,
        generatedAt: new Date().toISOString(),
        documentCount: documents.length,
        documents,
      };

      try {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, JSON.stringify(indexData));
        log(`Wrote search index to ${outputPath} (${documents.length} docs)`);
      } catch (err) {
        throw new Error(
          `[search-index] Failed to write index to ${outputPath}: ${err.message}`,
        );
      }
    },
  };
};
