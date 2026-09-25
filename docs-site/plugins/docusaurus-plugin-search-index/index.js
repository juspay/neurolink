/**
 * Docusaurus Plugin: Search Index Generator
 *
 * Generates a search-index.json at build time from all docs content.
 * The index is loaded client-side for local search when Algolia is not configured.
 */

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { createHash } = require("node:crypto");

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

  // Every heading is recorded here, even one immediately followed by another
  // heading (empty body) — anchor disambiguation must see every heading a
  // real Markdown slugger would, not just the ones with indexable content.
  // Whether a section has enough body to actually be indexed is decided by
  // the caller, which reads `section.content`.
  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      // Save previous section (skip the pre-first-heading preamble, which
      // has no heading at all)
      if (currentHeading || currentContent.length > 0) {
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
  if (currentHeading || currentContent.length > 0) {
    sections.push({
      heading: currentHeading,
      level: currentLevel,
      content: stripMarkdown(currentContent.join("\n")).slice(0, 2000),
    });
  }

  return sections;
}

/**
 * Codepoint total order; locale collation differs across Node/ICU builds.
 * Plain `<`/`>` on strings compares UTF-16 code units, which diverges from
 * code point order for astral characters (surrogate pairs, U+10000+) vs BMP
 * characters above the surrogate range (U+E000-U+FFFF): a surrogate pair's
 * leading unit (U+D800-U+DBFF) always sorts below those BMP units even when
 * its actual code point is numerically larger. Step through code points
 * explicitly instead.
 */
function byCodepoint(a, b) {
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const ca = a.codePointAt(i);
    const cb = b.codePointAt(j);
    if (ca !== cb) {
      return ca < cb ? -1 : 1;
    }
    i += ca > 0xffff ? 2 : 1;
    j += cb > 0xffff ? 2 : 1;
  }
  if (i < a.length) {
    return 1;
  }
  if (j < b.length) {
    return -1;
  }
  return 0;
}

/** Stable Algolia/MiniSearch object id for one URL. */
function objectIdForUrl(url) {
  return createHash("sha256").update(url).digest("hex");
}

/** Recursively find all markdown files */
function findMarkdownFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => byCodepoint(a.name, b.name));
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath));
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
  let skipped = 0;

  // URL is derived from file path only (frontmatter `slug:` overrides are
  // not consulted), so two files can legitimately compute the same URL —
  // e.g. `tutorials.md` and `tutorials/index.md` both landing on
  // `/docs/tutorials`. That predates this file and is not fixed here; what
  // must hold regardless is that every entry still gets a distinct,
  // order-independent objectID, so a repeat occurrence is disambiguated the
  // same way a repeated heading anchor is below.
  const urlOccurrences = new Map();

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

      const urlOccurrence = urlOccurrences.get(url) ?? 0;
      urlOccurrences.set(url, urlOccurrence + 1);
      // Only the objectID input is suffixed on a repeat — the visible `url`
      // field is untouched, so this changes nothing about what's indexed or
      // where a result links, only how its id is derived.
      const idSource = (forUrl) =>
        urlOccurrence === 0 ? forUrl : `${forUrl}::dup${urlOccurrence}`;

      // Extract hierarchy from path
      const pathParts = urlPath.split("/");
      const lvl0 =
        pathParts[0]
          ?.replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()) || "Docs";

      // Add main document entry — index full content for better search recall
      const plainContent = stripMarkdown(content);
      documents.push({
        objectID: objectIdForUrl(idSource(url)),
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
      const anchorCounts = new Map();
      for (const section of sections) {
        if (!section.heading) {
          continue;
        }
        const baseAnchor = section.heading
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-");
        const occurrence = anchorCounts.get(baseAnchor) ?? 0;
        anchorCounts.set(baseAnchor, occurrence + 1);
        const anchor =
          occurrence === 0 ? baseAnchor : `${baseAnchor}-${occurrence}`;

        // Every heading counts toward anchor disambiguation above (matching
        // Docusaurus's own slugger), but a heading with no body text isn't
        // worth indexing as a search result.
        if (!section.content) {
          continue;
        }

        const sectionUrl = `${url}#${anchor}`;
        documents.push({
          objectID: objectIdForUrl(idSource(sectionUrl)),
          title: section.heading,
          url: sectionUrl,
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
