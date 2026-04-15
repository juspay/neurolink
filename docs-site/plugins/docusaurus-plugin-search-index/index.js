/**
 * Docusaurus Plugin: Search Index Generator
 *
 * Generates a search-index.json at build time from all docs content.
 * The index is loaded client-side for local search when Algolia is not configured.
 */

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

/** Simple glob matching for exclude patterns */
function matchGlob(glob, filePath) {
  // Convert glob to regex:
  // ** matches any number of path segments (including zero)
  // * matches anything except /
  const regexStr = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape regex chars except * and ?
    .replace(/\*\*\//g, "(.+/)?") // **/ matches zero or more path segments
    .replace(/\/\*\*/g, "(/.+)?") // /** matches zero or more trailing segments
    .replace(/\*\*/g, ".*") // ** alone matches anything
    .replace(/\*/g, "[^/]*"); // * matches within single segment
  return new RegExp("^" + regexStr + "$").test(filePath);
}

/** Strip markdown syntax to get plain text */
function stripMarkdown(content) {
  let result = content
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "")
    // Remove inline code
    .replace(/`[^`]*`/g, "")
    // Remove images
    .replace(/!\[.*?\]\(.*?\)/g, "")
    // Remove links but keep text
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1");

  // Iteratively strip HTML tags to handle nested/malformed tags
  let prev;
  do {
    prev = result;
    result = result.replace(/<[^>]*>/g, "");
  } while (result !== prev);

  return (
    result
      // Remove headings markers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italic
      .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, "$2")
      // Remove blockquotes
      .replace(/^>\s+/gm, "")
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, "")
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // Remove MDX imports/exports
      .replace(/^(import|export)\s+.*$/gm, "")
      // Remove admonitions
      .replace(/^:::.*$/gm, "")
      // Collapse whitespace
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/** Extract sections from markdown content */
function extractSections(content) {
  const sections = [];
  const lines = content.split("\n");
  let currentHeading = "";
  let currentContent = [];
  let currentLevel = 0;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      // Save previous section
      if (currentContent.length > 0) {
        sections.push({
          heading: currentHeading,
          level: currentLevel,
          content: stripMarkdown(currentContent.join("\n")).slice(0, 2000),
        });
      }
      currentLevel = headingMatch[1].length;
      currentHeading = headingMatch[2]
        .replace(/\*\*/g, "")
        .replace(/`/g, "")
        .trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentContent.length > 0) {
    sections.push({
      heading: currentHeading,
      level: currentLevel,
      content: stripMarkdown(currentContent.join("\n")).slice(0, 2000),
    });
  }

  return sections;
}

/** Recursively find all markdown files */
function findMarkdownFiles(dir, baseDir = dir) {
  const files = [];
  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath, baseDir));
    } else if (/\.(md|mdx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

module.exports = function searchIndexPlugin(context, options = {}) {
  const docsDir = options.docsDir || path.resolve(context.siteDir, "docs");

  // Exclude patterns matching docusaurus.config.ts docs.exclude
  const excludeGlobs = options.exclude || [
    "**/api/**",
    "**/cli-guide.md",
    "**/package-overrides.md",
    "**/mcp/concurrency.md",
    "**/features/interactive-cli.md",
    "**/404.md",
    "**/404.mdx",
  ];

  function isExcluded(relativePath) {
    const normalized = relativePath.replace(/\\/g, "/");
    return excludeGlobs.some((glob) => matchGlob(glob, normalized));
  }

  return {
    name: "docusaurus-plugin-search-index",

    async postBuild({ outDir }) {
      await generateIndex(docsDir, outDir, isExcluded);
    },

    // Also generate during dev via configureWebpack
    configureWebpack() {
      return {
        plugins: [
          {
            apply(compiler) {
              compiler.hooks.afterEmit.tapAsync(
                "SearchIndexPlugin",
                (compilation, callback) => {
                  const staticDir = path.resolve(context.siteDir, "static");
                  generateIndex(docsDir, staticDir, isExcluded).then(() =>
                    callback(),
                  );
                },
              );
            },
          },
        ],
      };
    },
  };
};

async function generateIndex(docsDir, outDir, isExcluded) {
  const files = findMarkdownFiles(docsDir);
  const documents = [];
  let id = 0;
  let skipped = 0;

  for (const filePath of files) {
    try {
      const relativePath = path.relative(docsDir, filePath).replace(/\\/g, "/");

      // Skip excluded files (matches docusaurus.config.ts docs.exclude)
      if (isExcluded(relativePath)) {
        skipped++;
        continue;
      }

      const raw = fs.readFileSync(filePath, "utf-8");
      const { data: frontmatter, content } = matter(raw);

      // Skip drafts
      if (frontmatter.draft === true) {
        continue;
      }

      // Build URL path from file path
      const urlPath = relativePath
        .replace(/(index)?\.(md|mdx)$/, "")
        .replace(/\/$/, "");

      const url = `/docs/${urlPath}`;
      const title = frontmatter.title || path.basename(urlPath) || "Untitled";

      // Extract hierarchy from path
      const pathParts = urlPath.split("/");
      const lvl0 =
        pathParts[0]
          ?.replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()) || "Docs";

      // Add main document entry — index full content for better search recall
      const plainContent = stripMarkdown(content);
      documents.push({
        objectID: String(id++),
        title,
        url,
        content: plainContent.slice(0, 5000),
        hierarchy: {
          lvl0,
          lvl1: title,
          lvl2: "",
          lvl3: "",
        },
      });

      // Add section entries
      const sections = extractSections(content);
      for (const section of sections) {
        if (!section.heading) {
          continue;
        }
        const anchor = section.heading
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-");

        documents.push({
          objectID: String(id++),
          title: section.heading,
          url: `${url}#${anchor}`,
          content: section.content,
          hierarchy: {
            lvl0,
            lvl1: title,
            lvl2: section.heading,
            lvl3: "",
          },
        });
      }
    } catch (err) {
      // Skip files that can't be parsed
      console.warn(`[search-index] Skipping ${filePath}: ${err.message}`);
    }
  }

  // Write index
  const indexPath = path.join(outDir, "search-index.json");
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, JSON.stringify(documents));
  console.log(
    `[search-index] Generated ${documents.length} entries from ${files.length} files (${skipped} excluded)`,
  );
}
