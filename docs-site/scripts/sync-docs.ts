#!/usr/bin/env tsx

/**
 * sync-docs.ts
 *
 * Transforms markdown files from ../docs/ to docs-site/docs/
 * Converting MkDocs-specific syntax to Docusaurus MDX format.
 *
 * Usage: pnpm tsx docs-site/scripts/sync-docs.ts
 */

import * as fs from "fs";
import { glob } from "glob";
import matter from "gray-matter";
import * as path from "path";
import { GitChangeDetector, type GitChangeInfo } from "./gitChangeDetector.js";

// Configuration
const SOURCE_DIR = path.resolve(__dirname, "../../docs");
const TARGET_DIR = path.resolve(__dirname, "../docs");
const STATIC_DIR = path.resolve(__dirname, "../static");

// Directory-specific sidebar position counters
const directorySidebarCounters = new Map<string, number>();

// Directories to exclude from sync
const EXCLUDED_DIRS = ["tracking", "phases", "analysis"];

// Auto-badge detection configuration
const ENABLE_AUTO_BADGES = process.env.AUTO_BADGE_DETECTION !== "false";

// Badge mappings for title tags
const TITLE_BADGES: Record<string, string> = {
  "[new]": "new",
  "[beta]": "beta",
  "[deprecated]": "deprecated",
  "[experimental]": "experimental",
};

// Admonition type mappings from MkDocs to Docusaurus
const ADMONITION_TYPES: Record<string, string> = {
  note: "note",
  warning: "warning",
  tip: "tip",
  danger: "danger",
  info: "info",
  success: "tip",
  example: "info",
  caution: "caution",
  important: "warning",
  abstract: "note",
  question: "info",
  quote: "note",
  bug: "danger",
};

/**
 * File mappings to reorganize docs into proper categories
 * Format: 'source-path': 'destination-path'
 */
const FILE_MAPPINGS: Record<string, string> = {
  // Provider integrations -> getting-started/providers/
  "ollama-setup.md": "getting-started/providers/ollama.md",
  "litellm-integration.md": "getting-started/providers/litellm.md",
  "sagemaker-integration.md": "getting-started/providers/sagemaker.md",

  // MCP docs -> mcp/
  "mcp-foundation.md": "mcp/overview.md",
  "mcp-integration.md": "mcp/integration.md",
  "mcp-http-transport.md": "mcp/http-transport.md",
  "mcp-configuration-locations.md": "mcp/configuration.md",
  "mcp-concurrency-guide.md": "mcp/concurrency.md",
  "mcp-testing-guide.md": "mcp/testing.md",
  "mcp-latency-optimization-implementation-guide.md": "mcp/optimization.md",
  "mcp-docs-server.md": "mcp/docs-server.md",

  // Memory docs -> memory/
  "conversation-memory.md": "memory/conversation.md",
  "context-summarization.md": "memory/summarization.md",
  "features/memory.md": "features/memory.md",
  "advanced/memory-integration.md": "advanced/memory-integration.md",

  // Workflow docs -> workflows/
  "advanced-orchestration.md": "workflows/orchestration.md",
  "ai-orchestration-guide.md": "workflows/ai-orchestration.md",
  "middleware.md": "workflows/middleware.md",
  "custom-middleware-guide.md": "workflows/custom-middleware.md",
  "error-handling.md": "workflows/error-handling.md",

  // Observability -> observability/
  "telemetry-guide.md": "observability/telemetry.md",
  "health-monitoring-guide.md": "observability/health-monitoring.md",
  "provider-status-monitoring.md": "observability/provider-status.md",

  // Deployment -> deployment/
  "enterprise-proxy-setup.md": "deployment/enterprise-proxy.md",
  "performance-optimization.md": "deployment/performance.md",
  "performance-optimization-guide.md": "deployment/performance-guide.md",
  "configuration.md": "deployment/configuration.md",
  "configuration-management.md": "deployment/configuration-management.md",

  // SDK -> sdk/
  "api-reference.md": "sdk/api-reference.md",
  "framework-integration.md": "sdk/framework-integration.md",
  "sdk-custom-tools.md": "sdk/custom-tools-guide.md",

  // Reference -> reference/
  "troubleshooting.md": "reference/troubleshooting.md",
  "provider-comparison.md": "reference/provider-comparison.md",
  "provider-behavior.md": "reference/provider-behavior.md",

  // Community -> community/
  "contributing.md": "community/contributing.md",
  "code-of-conduct.md": "community/code-of-conduct.md",
  "changelog.md": "community/changelog.md",

  // Features consolidation
  "human-in-the-loop.md": "features/hitl.md",
  "guardrails-implementation.md": "features/guardrails-implementation.md",
  "guardrails-ai-integration.md": "features/guardrails-ai.md",
  "image-generation-streaming.md": "features/image-generation.md",
  "real-time-services.md": "features/real-time-services.md",
  "real-time-speech-agents.md": "features/speech-agents.md",

  // Guides
  "domain-specific-usage.md": "guides/domain-specific.md",
  "dynamic-models.md": "guides/dynamic-models.md",
  "session-management-guide.md": "guides/session-management.md",

  // Testing -> development/
  "testing.md": "development/testing.md",
  "comprehensive-testing-plan.md": "development/testing-plan.md",
  "provider-agnostic-testing.md": "development/provider-testing.md",

  // Architecture -> development/
  "factory-pattern-architecture.md": "development/factory-architecture.md",
  "factory-pattern-migration.md": "development/factory-migration.md",
  "large-context-handling-design-doc.md": "development/large-context-design.md",
};

interface TransformResult {
  content: string;
  frontmatter: Record<string, unknown>;
}

interface FileInfo {
  sourcePath: string;
  relativePath: string;
  targetPath: string;
}

/**
 * Convert MkDocs admonitions to Docusaurus format
 * MkDocs: !!! note "Title"
 *            Content here
 * Docusaurus: :::note[Title]
 *             Content here
 *             :::
 */
function convertAdmonitions(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Match admonition start: !!! type "Title" or !!! type
    const admonitionMatch = line.match(/^!{3}\s+(\w+)(?:\s+"([^"]*)")?(.*)$/);

    if (admonitionMatch) {
      const type = admonitionMatch[1];
      const title = admonitionMatch[2];
      const inlineContent = admonitionMatch[3]?.trim() || "";
      const docusaurusType = ADMONITION_TYPES[type.toLowerCase()] || "note";

      // Collect content lines
      const bodyLines: string[] = [];

      // Add any inline content first
      if (inlineContent) {
        bodyLines.push(inlineContent);
      }

      // Look ahead for content
      i++;
      while (i < lines.length) {
        const nextLine = lines[i];

        // Check if line is indented (4 spaces or tab)
        if (nextLine.startsWith("    ") || nextLine.startsWith("\t")) {
          // Remove leading 4 spaces or tab
          const contentLine = nextLine.startsWith("    ") ? nextLine.slice(4) : nextLine.slice(1);
          bodyLines.push(contentLine);
          i++;
        } else if (nextLine.trim() === "") {
          // Empty line - check if next non-empty line is still part of admonition
          if (i + 1 < lines.length) {
            const lookAhead = lines[i + 1];
            if (lookAhead && (lookAhead.startsWith("    ") || lookAhead.startsWith("\t"))) {
              bodyLines.push(""); // Preserve empty line within admonition
              i++;
            } else {
              break;
            }
          } else {
            break;
          }
        } else if (nextLine.match(/^#{1,6}\s/) || nextLine.match(/^!{3}\s+/)) {
          // Next line is a heading or another admonition - stop
          break;
        } else if (bodyLines.length === 0 && !inlineContent) {
          // No indented content found yet - treat this unindented line as the content
          // This handles malformed MkDocs where content isn't properly indented
          bodyLines.push(nextLine);
          i++;
          // Continue until we hit a blank line or heading
          while (i < lines.length) {
            const followingLine = lines[i];
            if (followingLine.trim() === "" || followingLine.match(/^#{1,6}\s/) || followingLine.match(/^!{3}\s+/)) {
              break;
            }
            // Only continue if this isn't a new structural element
            if (!followingLine.match(/^[*-]\s/) && !followingLine.match(/^\d+\.\s/)) {
              // Not a list item, could be continuation
              bodyLines.push(followingLine);
              i++;
            } else {
              break;
            }
          }
          break;
        } else {
          break;
        }
      }

      // Build Docusaurus admonition
      const processedBody = bodyLines.join("\n").trimEnd();
      if (title) {
        result.push(`:::${docusaurusType}[${title}]`);
      } else {
        result.push(`:::${docusaurusType}`);
      }
      if (processedBody) {
        result.push(processedBody);
      }
      result.push(":::");
      result.push(""); // Add blank line after admonition
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join("\n");
}

/**
 * Convert MkDocs tabs syntax to Docusaurus Tabs
 * MkDocs: === "Tab Title"
 *             Content
 * Docusaurus: <Tabs> with TabItem components
 */
function convertTabs(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];
  let i = 0;
  let needsTabsImport = false;

  while (i < lines.length) {
    const line = lines[i];

    // Check if this is the start of a tab block
    const tabMatch = line.match(/^===\s+"([^"]+)"\s*$/);

    if (tabMatch) {
      // Collect all consecutive tabs
      const tabs: Array<{ label: string; content: string[] }> = [];

      while (i < lines.length) {
        const currentLine = lines[i];
        const currentTabMatch = currentLine.match(/^===\s+"([^"]+)"\s*$/);

        if (currentTabMatch) {
          const label = currentTabMatch[1];
          const tabContent: string[] = [];

          // Move to next line and collect indented content
          i++;
          while (i < lines.length) {
            const contentLine = lines[i];
            // Check if line is indented or empty within the tab
            if (contentLine.startsWith("    ") || contentLine.startsWith("\t")) {
              const unindented = contentLine.startsWith("    ") ? contentLine.slice(4) : contentLine.slice(1);
              tabContent.push(unindented);
              i++;
            } else if (contentLine.trim() === "") {
              // Check if next line is another tab or more content
              if (i + 1 < lines.length) {
                const nextLine = lines[i + 1];
                if (nextLine.startsWith("    ") || nextLine.startsWith("\t")) {
                  tabContent.push(""); // Preserve empty line
                  i++;
                } else if (nextLine.match(/^===\s+"[^"]+"\s*$/)) {
                  // Next is another tab, move to it
                  i++;
                  break;
                } else {
                  // End of tab block
                  break;
                }
              } else {
                break;
              }
            } else if (contentLine.match(/^===\s+"[^"]+"\s*$/)) {
              // Another tab starts
              break;
            } else {
              // End of tabs block
              break;
            }
          }

          tabs.push({ label, content: tabContent });
        } else {
          break;
        }
      }

      if (tabs.length > 0) {
        needsTabsImport = true;
        result.push("<Tabs>");

        tabs.forEach((tab, index) => {
          const value = tab.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const defaultAttr = index === 0 ? " default" : "";
          result.push(`<TabItem value="${value}" label="${tab.label}"${defaultAttr}>`);
          result.push("");
          result.push(...tab.content);
          result.push("");
          result.push("</TabItem>");
        });

        result.push("</Tabs>");
        result.push("");
      }
    } else {
      result.push(line);
      i++;
    }
  }

  // Add imports at the top if tabs were found
  if (needsTabsImport) {
    const importStatement = `import Tabs from '@theme/Tabs';\nimport TabItem from '@theme/TabItem';\n`;
    return importStatement + "\n" + result.join("\n");
  }

  return result.join("\n");
}

/**
 * Remove MkDocs attribute syntax {: .class} or { .class }
 */
function removeAttributeSyntax(content: string): string {
  // Remove {: .class} or {: #id} or {: .class .class2} (standard syntax)
  let result = content.replace(/\s*\{:\s*[^}]+\}/g, "");
  // Also remove { .class } or { .class .class2 } (alternative syntax)
  result = result.replace(/\s*\{\s+\.[a-zA-Z0-9_-]+(?:\s+\.[a-zA-Z0-9_-]+)*(?:\s+[a-zA-Z0-9_-]+="[^"]*")*\s*\}/g, "");
  return result;
}

/**
 * Convert MkDocs material grid cards to simple markdown
 */
function convertGridCards(content: string): string {
  // Unwrap <div class="grid cards" markdown> containers, keeping inner content
  // This preserves the content while removing the container divs and *** separators
  return content.replace(
    /<div\s+class="grid\s+cards"[^>]*markdown>\s*([\s\S]*?)\s*<\/div>/gi,
    (match, innerContent) => {
      // Remove *** thematic breaks used as card separators in MkDocs grid cards
      return innerContent.replace(/^\s*\*\*\*\s*$/gm, "").trim();
    },
  );
}

/**
 * Convert material icons to Unicode emoji alternatives
 * :material-icon-name: -> Unicode emoji
 * Also strips MkDocs attribute syntax like { .class title="..." }
 */
function convertMaterialIcons(content: string): string {
  const iconMap: Record<string, string> = {
    "material-clock-fast": "⏱️",
    "material-clock-outline": "🕐",
    "material-download": "📥",
    "material-key": "🔑",
    "material-cog": "⚙️",
    "material-check": "✅",
    "material-close": "❌",
    "material-alert": "⚠️",
    "material-alert-circle": "⚠️",
    "material-information": "ℹ️",
    "material-rocket": "🚀",
    "material-console": "💻",
    "material-console-line": "💻",
    "material-code": "💻",
    "material-code-block-tags": "📝",
    "material-star": "⭐",
    "material-lightbulb": "💡",
    "material-briefcase": "💼",
    "material-help-circle": "❓",
    "material-frequently-asked-questions": "❓",
    "material-shield-check": "🛡️",
    "material-shield-lock": "🔐",
    "material-compare": "⚖️",
    "material-camera": "📷",
    "material-play-circle": "▶️",
    "material-web": "🌐",
    "material-book-open": "📖",
    "material-heart": "❤️",
    "material-test-tube": "🧪",
    "material-sitemap": "🗺️",
    "material-factory": "🏭",
    "material-tag-multiple": "🏷️",
    "material-link-variant": "🔗",
    "material-connection": "🔌",
    "material-chart-line": "📈",
    "material-chart-timeline": "📊",
    "material-chart-box": "📊",
    "material-refresh": "🔄",
    "material-wave": "🌊",
    "material-middleware": "🔧",
    "material-video": "🎬",
    "material-image": "🖼️",
    "material-image-plus": "🖼️",
    "material-image-text": "🖼️",
    "material-microphone": "🎤",
    "material-server": "🖥️",
    "material-server-network": "🌐",
    "material-database-search": "🔍",
    "material-database-export": "📤",
    "material-database-cog": "🗄️",
    "material-security": "🔒",
    "material-tools": "🛠️",
    "material-hand-pointing-up": "👆",
    "material-brain": "🧠",
    "material-brain-circuit": "🧠",
    "material-aws": "☁️",
    "material-table-large": "📊",
    "material-file-pdf-box": "📄",
    "material-file-word": "📝",
    "material-earth": "🌍",
    "material-speedometer": "⚡",
    "material-flash": "⚡",
    "material-new-box": "🆕",
    "material-api": "📡",
  };

  // First strip MkDocs attribute syntax: { .class title="..." }
  content = content.replace(/:material-[a-z-]+:\{[^}]*\}/g, (match) => {
    const iconMatch = match.match(/:material-([a-z-]+):/);
    if (iconMatch) {
      const replacement = iconMap[`material-${iconMatch[1]}`];
      if (!replacement) {
        console.warn(`  ⚠️  Unmapped material icon: :material-${iconMatch[1]}:`);
      }
      return replacement || "";
    }
    return "";
  });

  // Then convert remaining material icons
  return content.replace(/:material-([a-z-]+):/g, (match, iconName) => {
    const replacement = iconMap[`material-${iconName}`];
    if (!replacement) {
      console.warn(`  ⚠️  Unmapped material icon: :material-${iconName}:`);
    }
    return replacement || "";
  });
}

/**
 * Process title to extract and handle badges
 */
function processTitleBadges(title: string): { title: string; badges: string[] } {
  const badges: string[] = [];
  let processedTitle = title;

  for (const [tag, badge] of Object.entries(TITLE_BADGES)) {
    if (processedTitle.toLowerCase().includes(tag)) {
      badges.push(badge);
      processedTitle = processedTitle.replace(new RegExp(tag, "gi"), "").trim();
    }
  }

  return { title: processedTitle, badges };
}

/**
 * Generate sidebar_position based on file order or special rules
 * Uses deterministic positioning based on alphabetical order within each directory
 */
function generateSidebarPosition(relativePath: string, existingPosition?: number, allFiles?: string[]): number {
  if (existingPosition !== undefined) {
    return existingPosition;
  }

  const filename = path.basename(relativePath, path.extname(relativePath));
  const directory = path.dirname(relativePath);

  // Priority map for special files
  const priorityMap: Record<string, number> = {
    index: 1,
    introduction: 2,
    overview: 2,
    "quick-start": 3,
    "getting-started": 3,
    installation: 4,
    configuration: 5,
    troubleshooting: 98,
    faq: 99,
  };

  // Check if file has a priority position
  if (priorityMap[filename] !== undefined) {
    return priorityMap[filename];
  }

  // Special case: files starting with 00- prefix for manual ordering
  if (filename.startsWith("00-")) {
    const numMatch = filename.match(/^00-(\d+)/);
    if (numMatch) {
      return parseInt(numMatch[1]) || 10;
    }
  }

  // Deterministic positioning based on sorted sibling files
  if (allFiles && allFiles.length > 0) {
    // Get all files in the same directory
    const siblingFiles = allFiles.filter((f) => path.dirname(f) === directory).sort();

    // Find position in sorted list (with gaps of 10 for flexibility)
    const index = siblingFiles.indexOf(relativePath);
    if (index >= 0) {
      return (index + 1) * 10;
    }
  }

  // Fallback to counter-based positioning if allFiles not provided
  const counterKey = directory === "." ? "_root" : directory;
  if (!directorySidebarCounters.has(counterKey)) {
    directorySidebarCounters.set(counterKey, 10);
  }

  const position = directorySidebarCounters.get(counterKey)!;
  directorySidebarCounters.set(counterKey, position + 1);

  return position;
}

/**
 * Extract title from content, avoiding code blocks
 */
function extractTitleFromContent(content: string): string | null {
  // Remove code blocks first to avoid matching # inside them
  const contentWithoutCodeBlocks = content.replace(/```[\s\S]*?```/g, "");

  // Look for first # heading (not ## or more)
  const titleMatch = contentWithoutCodeBlocks.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    return titleMatch[1].trim();
  }

  // Also try to find <h1> tags
  const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    return h1Match[1].trim();
  }

  return null;
}

/**
 * Extract a meaningful description from content
 * Removes code blocks, finds first paragraph, cleans markdown
 */
function extractDescription(content: string): string {
  // Remove code blocks and inline code
  let cleaned = content.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/`[^`]+`/g, "");

  // Remove frontmatter if present
  cleaned = cleaned.replace(/^---[\s\S]*?---/m, "");

  // Split into lines and process
  const lines = cleaned.split("\n");
  const paragraphLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines, headings, lists, admonitions
    if (!trimmed) continue;
    if (trimmed.match(/^#{1,6}\s/)) continue; // Headings
    if (trimmed.match(/^[*-]\s/)) continue; // Unordered lists
    if (trimmed.match(/^\d+\.\s/)) continue; // Ordered lists
    if (trimmed.match(/^:::/)) continue; // Admonitions
    if (trimmed.match(/^[>!]/)) continue; // Blockquotes and admonitions

    // Found a paragraph line
    paragraphLines.push(trimmed);

    // If we have enough content, stop
    if (paragraphLines.join(" ").length > 150) break;
  }

  if (paragraphLines.length === 0) {
    return "Documentation page for NeuroLink";
  }

  // Join paragraph lines
  let description = paragraphLines.join(" ");

  // Clean markdown formatting
  description = description.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // Links
  description = description.replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1"); // Bold/italic
  description = description.replace(/\n/g, " "); // Newlines to spaces
  description = description.replace(/\s+/g, " "); // Multiple spaces

  // Truncate to 295 chars at word boundary, then add "..." for max 298 chars
  if (description.length > 300) {
    description = description.substring(0, 295);
    const lastSpace = description.lastIndexOf(" ");
    if (lastSpace > 200) {
      description = description.substring(0, lastSpace) + "...";
    } else {
      description = description + "...";
    }
  }

  // Ensure minimum length
  if (description.length < 20) {
    return "Documentation page for NeuroLink";
  }

  return description.trim();
}

/**
 * Process frontmatter and ensure required fields
 */
function processFrontmatter(
  data: Record<string, unknown>,
  relativePath: string,
  content: string,
  allFiles?: string[],
): Record<string, unknown> {
  const processed: Record<string, unknown> = { ...data };

  // Special handling for homepage
  if (relativePath === "index.md") {
    if (!processed.title) {
      processed.title = "NeuroLink";
    }
    if (!processed.description) {
      processed.description =
        "Enterprise AI Development Platform - Universal provider support, MCP integration, and professional CLI";
    }
    processed.slug = "/";
  }

  // Add description if missing
  if (!processed.description) {
    processed.description = extractDescription(content);
  }

  // Extract title from content if not in frontmatter
  if (!processed.title) {
    const extractedTitle = extractTitleFromContent(content);
    if (extractedTitle) {
      processed.title = extractedTitle;
    } else {
      // Use filename as title
      const filename = path.basename(relativePath, path.extname(relativePath));
      processed.title = filename
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
  }

  // Process title badges
  if (typeof processed.title === "string") {
    const { title, badges } = processTitleBadges(processed.title);
    processed.title = title;
    if (badges.length > 0) {
      processed.tags = [...((processed.tags as string[]) || []), ...badges];
    }
  }

  // Ensure sidebar_position - now passing allFiles for deterministic positioning
  processed.sidebar_position = generateSidebarPosition(
    relativePath,
    processed.sidebar_position as number | undefined,
    allFiles,
  );

  // Generate slug if not present
  if (!processed.slug) {
    const slugPath = relativePath
      .replace(/\.md$/, "")
      .replace(/\/index$/, "")
      .replace(/\\/g, "/")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/_/g, "-");
    if (slugPath && slugPath !== "index") {
      processed.slug = `/${slugPath}`;
    }
  }

  // Special case: API README should have slug /README so that
  // TypeDoc-generated links to /README work correctly
  if (relativePath === "api/README.md" || relativePath === "api\\README.md") {
    processed.slug = "/README";
  }

  // Convert keywords from string to array if necessary
  if (typeof processed.keywords === "string") {
    processed.keywords = processed.keywords
      .split(",")
      .map((kw: string) => kw.trim())
      .filter((kw: string) => kw.length > 0);
  }

  // Trim keywords array to maximum of 10 items
  if (Array.isArray(processed.keywords) && processed.keywords.length > 10) {
    console.log(`  ⚠️  Trimming keywords for ${relativePath}: ${processed.keywords.length} -> 10 items`);
    processed.keywords = processed.keywords.slice(0, 10);
  }

  return processed;
}

/**
 * Add auto-detected badges based on git changes
 * This adds both:
 * 1. Tags to frontmatter (for filtering/search)
 * 2. Badge markers to sidebar_label (for sidebar display)
 *
 * Badge detection is tag-based: files changed since the base branch get badges.
 * No time-based expiration - badges are removed when the branch is merged.
 */
function addAutoBadges(
  frontmatter: Record<string, unknown>,
  relativePath: string,
  gitChanges: GitChangeInfo | null,
): Record<string, unknown> {
  if (!ENABLE_AUTO_BADGES || !gitChanges) {
    return frontmatter;
  }

  const processed = { ...frontmatter };
  const existingTags = Array.isArray(processed.tags)
    ? [...(processed.tags as string[])]
    : typeof processed.tags === "string"
      ? [processed.tags]
      : [];

  // Skip if manual badges already exist in tags
  const manualBadges = ["new", "updated", "beta", "deprecated", "experimental"];
  if (existingTags.some((tag) => manualBadges.includes(tag))) {
    return processed;
  }

  // Skip if sidebar_label already has a badge marker
  const sidebarLabel = processed.sidebar_label as string | undefined;
  if (sidebarLabel && /\[(new|updated|beta|deprecated|experimental)\]/i.test(sidebarLabel)) {
    return processed;
  }

  let badgeType: "new" | "updated" | null = null;

  // Check if file is new (added since base branch)
  if (gitChanges.addedFiles.has(relativePath)) {
    badgeType = "new";
  }
  // Check if file is modified (but not also added - avoid double badge for staged+modified)
  else if (gitChanges.modifiedFiles.has(relativePath) && !gitChanges.addedFiles.has(relativePath)) {
    badgeType = "updated";
  }

  if (badgeType) {
    // Add to tags for filtering/search
    existingTags.push(badgeType);
    processed.tags = existingTags;

    // Add marker to sidebar_label for sidebar badge display
    // Use existing sidebar_label or fall back to title
    const baseLabel = sidebarLabel || (processed.title as string) || "";
    if (baseLabel) {
      processed.sidebar_label = `${baseLabel} [${badgeType}]`;
    }
  }

  return processed;
}

/**
 * Escape JSX-like syntax that would break MDX parsing
 * Examples: <1ms, <2x, etc.
 */
function escapeJsxSyntax(content: string): string {
  // Escape < followed by numbers (e.g., <1ms -> \<1ms)
  // But only outside of code blocks
  const lines = content.split("\n");
  const result: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
    } else if (inCodeBlock) {
      result.push(line);
    } else {
      // Escape < followed by digit outside of code blocks
      // But preserve valid HTML-like patterns in angle brackets
      result.push(line.replace(/<(\d)/g, "\\<$1"));
    }
  }

  return result.join("\n");
}

/**
 * Link path mappings - maps old file references to new locations
 * This handles the reorganization of files into proper categories
 */
const LINK_MAPPINGS: Record<string, string> = {
  // MCP reorganization
  "mcp-foundation": "/mcp/overview",
  "mcp-foundation.md": "/mcp/overview",
  "mcp-integration": "/mcp/integration",
  "mcp-integration.md": "/mcp/integration",
  "mcp-http-transport": "/mcp/http-transport",
  "mcp-http-transport.md": "/mcp/http-transport",
  "mcp-configuration-locations": "/mcp/configuration",
  "mcp-configuration-locations.md": "/mcp/configuration",
  "mcp-concurrency-guide": "/mcp/concurrency",
  "mcp-concurrency-guide.md": "/mcp/concurrency",
  "mcp-testing-guide": "/mcp/testing",
  "mcp-testing-guide.md": "/mcp/testing",
  "mcp-latency-optimization-implementation-guide": "/mcp/optimization",
  "mcp-docs-server": "/mcp/docs-server",
  "mcp-docs-server.md": "/mcp/docs-server",

  // Memory reorganization
  "conversation-memory": "/memory/conversation",
  "conversation-memory.md": "/memory/conversation",
  "context-summarization": "/memory/summarization",
  "context-summarization.md": "/memory/summarization",

  // Workflow reorganization
  "advanced-orchestration": "/workflows/orchestration",
  "ai-orchestration-guide": "/workflows/ai-orchestration",
  middleware: "/workflows/middleware",
  "middleware.md": "/workflows/middleware",
  "custom-middleware-guide": "/workflows/custom-middleware",
  "custom-middleware-guide.md": "/workflows/custom-middleware",
  "error-handling": "/workflows/error-handling",
  "error-handling.md": "/workflows/error-handling",

  // Observability reorganization
  "telemetry-guide": "/observability/telemetry",
  "health-monitoring-guide": "/observability/health-monitoring",
  "provider-status-monitoring": "/observability/provider-status",
  "performance-optimization": "/deployment/performance",
  "performance-optimization.md": "/deployment/performance",
  "real-time-services": "/features/real-time-services",
  "real-time-services.md": "/features/real-time-services",

  // Deployment reorganization
  "enterprise-proxy-setup": "/deployment/enterprise-proxy",
  "performance-optimization-guide": "/deployment/performance-guide",
  configuration: "/deployment/configuration",
  "configuration.md": "/deployment/configuration",
  "configuration-management": "/deployment/configuration-management",

  // SDK reorganization
  "api-reference": "/sdk/api-reference",
  "api-reference.md": "/sdk/api-reference",
  "framework-integration": "/sdk/framework-integration",
  "sdk-custom-tools": "/sdk/custom-tools-guide",

  // Reference reorganization
  troubleshooting: "/reference/troubleshooting",
  "troubleshooting.md": "/reference/troubleshooting",
  "provider-comparison": "/reference/provider-comparison",
  "provider-behavior": "/reference/provider-behavior",
  "provider-feature-compatibility": "/reference/provider-feature-compatibility",
  "provider-feature-compatibility.md": "/reference/provider-feature-compatibility",
  "factory-pattern-migration": "/development/factory-migration",
  "factory-pattern-migration.md": "/development/factory-migration",

  // Community reorganization
  contributing: "/community/contributing",
  "contributing.md": "/community/contributing",
  "code-of-conduct": "/community/code-of-conduct",
  "code-of-conduct.md": "/community/code-of-conduct",
  changelog: "/community/changelog",

  // Features reorganization
  "human-in-the-loop": "/features/hitl",
  "guardrails-implementation": "/features/guardrails-implementation",
  "guardrails-ai-integration": "/features/guardrails-ai",
  "image-generation-streaming": "/features/image-generation",
  "real-time-speech-agents": "/features/speech-agents",
  streaming: "/advanced/streaming",
  "features/streaming": "/advanced/streaming",
  "context-compaction": "/features/context-compaction",
  "context-compaction.md": "/features/context-compaction",
  "thinking-configuration": "/features/thinking-configuration",
  "thinking-configuration.md": "/features/thinking-configuration",
  "claude-proxy": "/features/claude-proxy",
  "claude-proxy.md": "/features/claude-proxy",
  "claude-proxy-architecture": "/features/claude-proxy-architecture",
  "claude-proxy-architecture.md": "/features/claude-proxy-architecture",
  "claude-proxy-config-reference": "/features/claude-proxy-config-reference",
  "claude-proxy-config-reference.md": "/features/claude-proxy-config-reference",
  "claude-proxy-troubleshooting": "/features/claude-proxy-troubleshooting",
  "claude-proxy-troubleshooting.md": "/features/claude-proxy-troubleshooting",

  // Provider guides -> getting-started/providers
  "ollama-setup": "/getting-started/providers/ollama",
  "litellm-integration": "/getting-started/providers/litellm",
  "sagemaker-integration": "/getting-started/providers/sagemaker",

  // Development reorganization
  testing: "/development/testing",
  "testing.md": "/development/testing",
  "comprehensive-testing-plan": "/development/testing-plan",
  "provider-agnostic-testing": "/development/provider-testing",
  "factory-pattern-architecture": "/development/factory-architecture",
  "large-context-handling-design-doc": "/development/large-context-design",

  // Guides
  "domain-specific-usage": "/guides/domain-specific",
  "dynamic-models": "/guides/dynamic-models",
  "session-management-guide": "/guides/session-management",

  // Features - absolute paths often used
  memory: "/features/memory",
  "memory.md": "/features/memory",
  "features/memory": "/features/memory",
  "features/memory.md": "/features/memory",
  guardrails: "/features/guardrails",
  hitl: "/features/hitl",
  multimodal: "/features/multimodal",
  "multimodal-chat": "/features/multimodal-chat",
  tts: "/features/tts",
  "audio-input": "/features/audio-input",
  "file-processors": "/features/file-processors",
  "office-documents": "/features/office-documents",
  "pdf-support": "/features/pdf-support",
  "csv-support": "/features/csv-support",
  "enterprise-hitl": "/features/enterprise-hitl",
  "interactive-cli": "/features/interactive-cli",
  "cli-loop-sessions": "/features/cli-loop-sessions",
  "auto-evaluation": "/features/auto-evaluation",
  interactive: "/demos/interactive",
  "video-generation": "/features/video-generation",
  "ppt-generation": "/features/ppt-generation",
  "conversation-history": "/features/conversation-history",
  "mcp-tools-showcase": "/features/mcp-tools-showcase",
  "provider-orchestration": "/features/provider-orchestration",
  "claude-subscription": "/features/claude-subscription",
  "claude-subscription.md": "/features/claude-subscription",
  "claude-subscription-testing": "/features/claude-subscription-testing",
  "claude-subscription-testing.md": "/features/claude-subscription-testing",
  "mcp-enhancements": "/features/mcp-enhancements",
  "mcp-enhancements.md": "/features/mcp-enhancements",
  "mcp-enhancements-diagrams": "/features/mcp-enhancements-diagrams",
  "mcp-enhancements-diagrams.md": "/features/mcp-enhancements-diagrams",
  "client-sdk": "/features/client-sdk",
  "client-sdk.md": "/features/client-sdk",
  autoresearch: "/features/autoresearch",
  "autoresearch.md": "/features/autoresearch",

  // Cookbook - absolute paths
  "batch-processing": "/cookbook/batch-processing",
  "error-recovery": "/cookbook/error-recovery",
  "cost-optimization": "/cookbook/cost-optimization",
  "streaming-with-retry": "/cookbook/streaming-with-retry",
  "rate-limit-handling": "/cookbook/rate-limit-handling",
  "multi-provider-fallback": "/cookbook/multi-provider-fallback",
  "structured-output": "/cookbook/structured-output",
  "tool-chaining": "/cookbook/tool-chaining",
  "context-window-management": "/cookbook/context-window-management",
  "conversation-summarization": "/cookbook/conversation-summarization",
  "autoresearch-quickstart": "/cookbook/autoresearch-quickstart",
  "autoresearch-quickstart.md": "/cookbook/autoresearch-quickstart",

  // Getting started - absolute paths
  "provider-setup": "/getting-started/provider-setup",
  "quick-start": "/getting-started/quick-start",
  installation: "/getting-started/installation",
  "basic-usage": "/examples/basic-usage",

  // CLI
  commands: "/cli/commands",

  // Examples
  screenshots: "/demos/screenshots",
  videos: "/demos/videos",

  // Deployment -> Enterprise Guides mappings
  "multi-provider-failover": "/guides/enterprise/multi-provider-failover",
  "deployment/multi-provider-failover": "/guides/enterprise/multi-provider-failover",
  "multi-region": "/guides/enterprise/multi-region",
  "deployment/multi-region": "/guides/enterprise/multi-region",
  "regional-streaming": "/features/regional-streaming",
  "deployment/regional-streaming": "/features/regional-streaming",
  "load-balancing": "/guides/enterprise/load-balancing",
  "deployment/load-balancing": "/guides/enterprise/load-balancing",
  architecture: "/development/architecture",
  versioning: "/development/versioning",
  "middleware-architecture": "/advanced/middleware-architecture",

  // Provider paths
  "openai-compatible": "/getting-started/providers/openai-compatible",
  "providers/openrouter": "/getting-started/providers/openrouter",
  "providers/anthropic": "/getting-started/providers/anthropic",
  anthropic: "/getting-started/providers/anthropic",
  // Bare provider names so sibling-relative `./<name>.md` links inside
  // docs/getting-started/providers/ resolve to the canonical Docusaurus path
  // instead of falling through to the generic `/docs/<name>` (which 404s).
  ollama: "/getting-started/providers/ollama",
  deepseek: "/getting-started/providers/deepseek",
  "nvidia-nim": "/getting-started/providers/nvidia-nim",
  "lm-studio": "/getting-started/providers/lm-studio",
  llamacpp: "/getting-started/providers/llamacpp",

  // MCP additional
  "mcp/server-catalog": "/guides/mcp/server-catalog",

  // Reference additional
  analytics: "/reference/analytics",
  "provider-selection": "/reference/provider-selection",
  "provider-capabilities-audit": "/reference/provider-capabilities-audit",

  // NestJS
  "nestjs-integration": "/sdk/nestjs-integration",

  // Memory -> Guides mappings (Redis docs are in guides/)
  "redis-configuration": "/guides/redis-configuration",
  "memory/redis-configuration": "/guides/redis-configuration",
  "redis-migration": "/guides/redis-migration",
  "memory/redis-migration": "/guides/redis-migration",

  // Enterprise
  "enterprise/compliance": "/guides/enterprise/compliance",

  // Special handling for index files
  index: "/",
  "index.md": "/",

  // AI tools (referenced from mcp/overview)
  "ai-analysis-tools": "/ai-analysis-tools",
  "ai-analysis-tools.md": "/ai-analysis-tools",
  "ai-workflow-tools": "/ai-workflow-tools",
  "ai-workflow-tools.md": "/ai-workflow-tools",

  // Miscellaneous path corrections
  business: "/examples/business",
  "environment-variables": "/getting-started/environment-variables",
  litellm: "/getting-started/providers/litellm",
  "updated-provider-test-results": "/advanced/updated-provider-test-results",
  "reference/configuration": "/deployment/configuration",

  // Additional path corrections
  monitoring: "/observability/health-monitoring",
  fastify: "/sdk/framework-integration",
  express: "/sdk/framework-integration",
  compliance: "/guides/enterprise/compliance",
  "enterprise/monitoring": "/guides/enterprise/monitoring",
  "audit-trails": "/guides/enterprise/audit-trails",
  rag: "/tutorials/rag",
  "chat-app": "/tutorials/chat-app",
  faq: "/reference/faq",
  "factory-migration": "/development/factory-migration",
  "custom-tools": "/sdk/custom-tools",
  "builtin-middleware": "/advanced/builtin-middleware",
  "google-vertex": "/getting-started/providers/google-vertex",
  huggingface: "/getting-started/providers/huggingface",
  "openai-tts": "/getting-started/providers/openai-tts",
  elevenlabs: "/getting-started/providers/elevenlabs",
  deepgram: "/getting-started/providers/deepgram",
  "azure-speech": "/getting-started/providers/azure-speech",

  // API documentation paths - these need /api/ prefix
  "enumerations/AIProviderName": "/api/enumerations/AIProviderName",
  "enumerations/BedrockModels": "/api/enumerations/BedrockModels",
  "type-aliases/HTTPRetryConfig": "/api/type-aliases/HTTPRetryConfig",
  "type-aliases/AIProvider": "/api/type-aliases/AIProvider",
  "type-aliases/TokenStorage": "/api/type-aliases/TokenStorage",
  "type-aliases/RateLimitConfig": "/api/type-aliases/RateLimitConfig",
  "type-aliases/TextGenerationResult": "/api/type-aliases/TextGenerationResult",
  "type-aliases/ObservabilityConfig": "/api/type-aliases/ObservabilityConfig",
  "type-aliases/OAuthTokens": "/api/type-aliases/OAuthTokens",
  "type-aliases/MiddlewareFactoryOptions": "/api/type-aliases/MiddlewareFactoryOptions",
  "type-aliases/MCPOAuthConfig": "/api/type-aliases/MCPOAuthConfig",
  "type-aliases/McpMetadata": "/api/type-aliases/McpMetadata",
  "type-aliases/LangfuseConfig": "/api/type-aliases/LangfuseConfig",
  "type-aliases/GenerateOptions": "/api/type-aliases/GenerateOptions",
  "type-aliases/AIModelProviderConfig": "/api/type-aliases/AIModelProviderConfig",
  "classes/RateLimiterManager": "/api/classes/RateLimiterManager",
  "classes/NeuroLinkOAuthProvider": "/api/classes/NeuroLinkOAuthProvider",
  "classes/CircuitBreakerManager": "/api/classes/CircuitBreakerManager",

  // Short API type names used inline
  AnalyticsData: "/api/type-aliases/AnalyticsData",
  ToolResult: "/api/type-aliases/ToolResult",
  TextGenerationOptions: "/api/type-aliases/TextGenerationOptions",
  OAuthTokens: "/api/type-aliases/OAuthTokens",
  NeuroLinkMiddleware: "/api/type-aliases/NeuroLinkMiddleware",
  MiddlewareConfig: "/api/type-aliases/MiddlewareConfig",
  McpMetadata: "/api/type-aliases/McpMetadata",
  MCPCircuitBreaker: "/api/classes/MCPCircuitBreaker",
  LangfuseConfig: "/api/type-aliases/LangfuseConfig",
  HTTPRateLimiter: "/api/classes/HTTPRateLimiter",
  GenerateResult: "/api/type-aliases/GenerateResult",
  ExecutionContext: "/api/type-aliases/ExecutionContext",
  AIModelProviderConfig: "/api/type-aliases/AIModelProviderConfig",

  // Server Adapters - bare names (from relative ./hono.md links within server-adapters/)
  hono: "/guides/server-adapters/hono",
  "hono.md": "/guides/server-adapters/hono",
  security: "/guides/server-adapters/security",
  "security.md": "/guides/server-adapters/security",
  deployment: "/guides/server-adapters/deployment",
  "deployment.md": "/guides/server-adapters/deployment",
  koa: "/guides/server-adapters/koa",
  "koa.md": "/guides/server-adapters/koa",
  websocket: "/guides/server-adapters/websocket",
  "websocket.md": "/guides/server-adapters/websocket",
  errors: "/guides/server-adapters/errors",
  "errors.md": "/guides/server-adapters/errors",

  // Server Adapters - prefixed paths (from relative ./server-adapters/X links)
  "server-adapters": "/guides/server-adapters",
  "server-adapters/index": "/guides/server-adapters",
  "server-adapters/index.md": "/guides/server-adapters",
  "server-adapters/hono": "/guides/server-adapters/hono",
  "server-adapters/hono.md": "/guides/server-adapters/hono",
  "server-adapters/express": "/guides/server-adapters/express",
  "server-adapters/express.md": "/guides/server-adapters/express",
  "server-adapters/fastify": "/guides/server-adapters/fastify",
  "server-adapters/fastify.md": "/guides/server-adapters/fastify",
  "server-adapters/koa": "/guides/server-adapters/koa",
  "server-adapters/koa.md": "/guides/server-adapters/koa",
  "server-adapters/security": "/guides/server-adapters/security",
  "server-adapters/security.md": "/guides/server-adapters/security",
  "server-adapters/deployment": "/guides/server-adapters/deployment",
  "server-adapters/deployment.md": "/guides/server-adapters/deployment",
  "server-adapters/streaming": "/guides/server-adapters/streaming",
  "server-adapters/streaming.md": "/guides/server-adapters/streaming",
  "server-adapters/websocket": "/guides/server-adapters/websocket",
  "server-adapters/websocket.md": "/guides/server-adapters/websocket",
  "server-adapters/errors": "/guides/server-adapters/errors",
  "server-adapters/errors.md": "/guides/server-adapters/errors",
  "server-adapters/middleware": "/guides/server-adapters/middleware",
  "server-adapters/middleware.md": "/guides/server-adapters/middleware",

  // Server Adapters - path-prefixed versions for explicit reference
  // NOTE: Simple names like "hono", "express" etc. should use guides/server-adapters/ paths
  // in their source files to avoid conflicts with other mappings
  "guides/server-adapters/hono": "/guides/server-adapters/hono",
  "guides/server-adapters/hono.md": "/guides/server-adapters/hono",
  "guides/server-adapters/express": "/guides/server-adapters/express",
  "guides/server-adapters/express.md": "/guides/server-adapters/express",
  "guides/server-adapters/fastify": "/guides/server-adapters/fastify",
  "guides/server-adapters/fastify.md": "/guides/server-adapters/fastify",
  "guides/server-adapters/koa": "/guides/server-adapters/koa",
  "guides/server-adapters/koa.md": "/guides/server-adapters/koa",
  "guides/server-adapters/security": "/guides/server-adapters/security",
  "guides/server-adapters/security.md": "/guides/server-adapters/security",
  "guides/server-adapters/deployment": "/guides/server-adapters/deployment",
  "guides/server-adapters/deployment.md": "/guides/server-adapters/deployment",
  "guides/server-adapters/streaming": "/guides/server-adapters/streaming",
  "guides/server-adapters/streaming.md": "/guides/server-adapters/streaming",
  "guides/server-adapters/websocket": "/guides/server-adapters/websocket",
  "guides/server-adapters/websocket.md": "/guides/server-adapters/websocket",
  "guides/server-adapters/errors": "/guides/server-adapters/errors",
  "guides/server-adapters/errors.md": "/guides/server-adapters/errors",
  "guides/server-adapters/middleware": "/guides/server-adapters/middleware",
  "guides/server-adapters/middleware.md": "/guides/server-adapters/middleware",
  "guides/server-adapters": "/guides/server-adapters",
  "guides/server-adapters/index": "/guides/server-adapters",
  "guides/server-adapters/index.md": "/guides/server-adapters",
  "server-configuration": "/reference/server-configuration",
  "server-configuration.md": "/reference/server-configuration",
  "features/observability": "/observability/health-monitoring",
  "features/observability.md": "/observability/health-monitoring",
  observability: "/observability/health-monitoring",
  "observability.md": "/observability/health-monitoring",

  // Other missing mappings
  "error-codes": "/reference/error-codes",
  "google-ai": "/getting-started/providers/google-ai",
  "github-action": "/guides/github-action",
  "factory-patterns": "/advanced/factory-patterns",
  enterprise: "/guides/enterprise",

  // More API type mappings
  SupportedModelName: "/api/type-aliases/SupportedModelName",
  EvaluationData: "/api/type-aliases/EvaluationData",
  "enumerations/OpenAIModels": "/api/enumerations/OpenAIModels",
  "type-aliases/SupportedModelName": "/api/type-aliases/SupportedModelName",
  "type-aliases/OAuthClientInformation": "/api/type-aliases/OAuthClientInformation",
  "type-aliases/MiddlewarePreset": "/api/type-aliases/MiddlewarePreset",
  "type-aliases/MCPServerInfo": "/api/type-aliases/MCPServerInfo",
  ToolContext: "/api/type-aliases/ToolContext",
  OpenTelemetryConfig: "/api/type-aliases/OpenTelemetryConfig",
  MiddlewareFactoryOptions: "/api/type-aliases/MiddlewareFactoryOptions",
  GenerateOptions: "/api/type-aliases/GenerateOptions",

  // Class method anchors - link to class page
  "classes/NeuroLink.md#generate": "/api/classes/NeuroLink",
  "classes/AIProviderFactory.md#createproviderwithfallback": "/api/classes/AIProviderFactory",
  "classes/AIProviderFactory.md#createprovider": "/api/classes/AIProviderFactory",
  "classes/AIProviderFactory.md#createbestprovider": "/api/classes/AIProviderFactory",

  // Other missing paths
  "azure-openai": "/getting-started/providers/azure-openai",
  "migration/from-langchain": "/guides/migration/from-langchain",

  // Final API mappings
  "enumerations/VertexModels": "/api/enumerations/VertexModels",
  "type-aliases/ToolInfo": "/api/type-aliases/ToolInfo",
  "type-aliases/MiddlewareContext": "/api/type-aliases/MiddlewareContext",
  "type-aliases/AuthorizationUrlResult": "/api/type-aliases/AuthorizationUrlResult",
  getBestProvider: "/api/functions/getBestProvider",
  "classes/NeuroLink": "/api/classes/NeuroLink",

  // Provider guides
  "aws-bedrock": "/getting-started/providers/aws-bedrock",

  // Migration guides
  "migration/from-vercel-ai-sdk": "/guides/migration/from-vercel-ai-sdk",

  // Remaining API mappings
  "type-aliases/TokenExchangeRequest": "/api/type-aliases/TokenExchangeRequest",
  "classes/AIProviderFactory": "/api/classes/AIProviderFactory",

  // Provider
  mistral: "/getting-started/providers/mistral",

  // Migration
  "migration-guide": "/guides/migration",

  // The /guides/enterprise link - this folder exists, need index
  "guides/enterprise": "/guides/enterprise",

  // OpenRouter provider
  openrouter: "/getting-started/providers/openrouter",

  // API class mappings
  "classes/InMemoryTokenStorage": "/api/classes/InMemoryTokenStorage",
  "classes/FileTokenStorage": "/api/classes/FileTokenStorage",

  // Additional link mappings
  "link-checking": "/development/link-checking",
  "examples/code-patterns": "/guides/examples/code-patterns",
  "type-aliases/DiscoveredMcp": "/api/type-aliases/DiscoveredMcp",
  "type-aliases/DynamicModelConfig": "/api/type-aliases/DynamicModelConfig",

  // Migration guides
  "guides/migration": "/guides/migration",

  // Additional migration mappings
  "from-langchain": "/guides/migration/from-langchain",
  "frameworks/nextjs": "/sdk/framework-integration",
  "classes/MiddlewareFactory": "/api/classes/MiddlewareFactory",

  // Additional framework mappings
  "frameworks/sveltekit": "/sdk/framework-integration",

  // Migration guides
  "from-vercel-ai-sdk": "/guides/migration/from-vercel-ai-sdk",

  // API type mappings
  "type-aliases/EnhancedProvider": "/api/type-aliases/EnhancedProvider",
  "type-aliases/ModelRegistry": "/api/type-aliases/ModelRegistry",
  "type-aliases/ProviderAttempt": "/api/type-aliases/ProviderAttempt",
  "type-aliases/StreamingOptions": "/api/type-aliases/StreamingOptions",
  "type-aliases/ToolExecutionResult": "/api/type-aliases/ToolExecutionResult",
  "type-aliases/ToolDefinition": "/api/type-aliases/ToolDefinition",
  "type-aliases/LogLevel": "/api/type-aliases/LogLevel",

  // API variables
  "variables/dynamicModelProvider": "/api/variables/dynamicModelProvider",
  "variables/VERSION": "/api/variables/VERSION",
  "variables/DEFAULT_RATE_LIMIT_CONFIG": "/api/variables/DEFAULT_RATE_LIMIT_CONFIG",
  "variables/globalRateLimiterManager": "/api/variables/globalRateLimiterManager",
  "variables/DEFAULT_HTTP_RETRY_CONFIG": "/api/variables/DEFAULT_HTTP_RETRY_CONFIG",
  "variables/globalCircuitBreakerManager": "/api/variables/globalCircuitBreakerManager",
  "variables/DEFAULT_PROVIDER_CONFIGS": "/api/variables/DEFAULT_PROVIDER_CONFIGS",
  "variables/mcpLogger": "/api/variables/mcpLogger",

  // API functions
  "functions/createAIProvider": "/api/functions/createAIProvider",
  "functions/createAIProviderWithFallback": "/api/functions/createAIProviderWithFallback",
  "functions/createBestAIProvider": "/api/functions/createBestAIProvider",
  "functions/generateText": "/api/functions/generateText",
  "functions/initializeTelemetry": "/api/functions/initializeTelemetry",
  "functions/getTelemetryStatus": "/api/functions/getTelemetryStatus",
  "functions/createOAuthProviderFromConfig": "/api/functions/createOAuthProviderFromConfig",
  "functions/isTokenExpired": "/api/functions/isTokenExpired",
  "functions/calculateExpiresAt": "/api/functions/calculateExpiresAt",
  "functions/isRetryableStatusCode": "/api/functions/isRetryableStatusCode",
  "functions/isRetryableHTTPError": "/api/functions/isRetryableHTTPError",
  "functions/withHTTPRetry": "/api/functions/withHTTPRetry",
  "functions/initializeMCPEcosystem": "/api/functions/initializeMCPEcosystem",
  "functions/listMCPs": "/api/functions/listMCPs",
  "functions/executeMCP": "/api/functions/executeMCP",
  "functions/getMCPStats": "/api/functions/getMCPStats",
  "functions/validateTool": "/api/functions/validateTool",
  "functions/initializeOpenTelemetry": "/api/functions/initializeOpenTelemetry",
  "functions/flushOpenTelemetry": "/api/functions/flushOpenTelemetry",
  "functions/shutdownOpenTelemetry": "/api/functions/shutdownOpenTelemetry",
  "functions/getLangfuseHealthStatus": "/api/functions/getLangfuseHealthStatus",
  "functions/setLangfuseContext": "/api/functions/setLangfuseContext",
  "functions/buildObservabilityConfigFromEnv": "/api/functions/buildObservabilityConfigFromEnv",
  "functions/getBestProvider": "/api/functions/getBestProvider",
  "functions/getAvailableProviders": "/api/functions/getAvailableProviders",
  "functions/isValidProvider": "/api/functions/isValidProvider",
};

/**
 * Transform a link path to its new location with /docs prefix
 * Since docs are served from /docs/, all internal doc links need /docs/ prefix
 */
function transformLinkPath(linkPath: string): string {
  // Remove leading ./ or ../
  const cleanPath = linkPath.replace(/^\.\.?\//, "");

  // Remove .md extension for lookup
  const pathWithoutExt = cleanPath.replace(/\.md$/, "");

  // Check if we have a direct mapping
  if (LINK_MAPPINGS[cleanPath]) {
    return "/docs" + LINK_MAPPINGS[cleanPath];
  }
  if (LINK_MAPPINGS[pathWithoutExt]) {
    return "/docs" + LINK_MAPPINGS[pathWithoutExt];
  }

  // Handle paths with anchors
  const anchorMatch = cleanPath.match(/^(.+?)(#.+)$/);
  if (anchorMatch) {
    const [, basePath, anchor] = anchorMatch;
    const baseWithoutExt = basePath.replace(/\.md$/, "");
    if (LINK_MAPPINGS[basePath]) {
      return "/docs" + LINK_MAPPINGS[basePath] + anchor;
    }
    if (LINK_MAPPINGS[baseWithoutExt]) {
      return "/docs" + LINK_MAPPINGS[baseWithoutExt] + anchor;
    }
  }

  // Handle paths that are already in subdirectories (e.g., advanced/mcp-integration.md)
  const parts = cleanPath.split("/");
  if (parts.length > 1) {
    const filename = parts[parts.length - 1];
    const filenameWithoutExt = filename.replace(/\.md$/, "");
    if (LINK_MAPPINGS[filename]) {
      return "/docs" + LINK_MAPPINGS[filename];
    }
    if (LINK_MAPPINGS[filenameWithoutExt]) {
      return "/docs" + LINK_MAPPINGS[filenameWithoutExt];
    }
  }

  // No mapping found, return with /docs/ prefix and clean up .md extension
  // Lowercase the path to match Docusaurus URL generation
  return "/docs/" + pathWithoutExt.toLowerCase();
}

/**
 * Transform image paths from relative to absolute /docs/ paths
 * Images are served from static/docs/ so paths need to be absolute
 * Examples:
 *   ![alt](/docs/path/image.png) -> ![alt](/docs/path/image.png) (unchanged)
 *   ![alt](/path/image.png) -> ![alt](/docs/path/image.png) (add /docs prefix)
 *   ![alt](./path/image.png) -> ![alt](/docs/path/image.png)
 *   ![alt](../path/image.png) -> ![alt](/docs/path/image.png)
 *   ![alt](path/image.png) -> ![alt](/docs/path/image.png)
 *   External URLs (http/https) -> unchanged
 *   Data URLs -> unchanged
 */
function transformImagePaths(content: string): string {
  // Match markdown image syntax: ![alt](path)
  // Capture group 1: alt text (can be empty)
  // Capture group 2: image path
  return content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, altText, imagePath) => {
    // Skip external URLs
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return match;
    }

    // Skip paths that already start with /docs/
    if (imagePath.startsWith("/docs/")) {
      return match;
    }

    // Skip data URLs
    if (imagePath.startsWith("data:")) {
      return match;
    }

    // For absolute paths starting with / but not /docs/, add /docs prefix
    if (imagePath.startsWith("/")) {
      return `![${altText}](/docs${imagePath})`;
    }

    // Remove leading ./ or ../ (can be multiple ../)
    let cleanPath = imagePath;
    while (cleanPath.startsWith("./") || cleanPath.startsWith("../")) {
      if (cleanPath.startsWith("./")) {
        cleanPath = cleanPath.slice(2);
      } else if (cleanPath.startsWith("../")) {
        cleanPath = cleanPath.slice(3);
      }
    }

    // Transform to absolute /docs/ path
    return `![${altText}](/docs/${cleanPath})`;
  });
}

/**
 * Fix internal links to use /docs prefix (since docs are served from /docs/)
 * and transform links to match the new file organization
 */
function fixInternalLinks(content: string): string {
  let result = content;

  // Links with /docs prefix should keep it (docs are served from /docs/)
  // IMPORTANT: Use negative lookbehind (?<!!) to exclude image syntax ![alt](/docs/...)
  // Just clean up any .md extension
  result = result.replace(
    /(?<!!)\]\(\/docs\/((?!http)[^)]+)\)/g,
    (match, path) => `](/docs/${path.replace(/\.md$/, "")})`,
  );

  // Transform relative links to match new file structure
  // Matches: [text](./path.md), [text](../path.md), [text](path.md)
  // But NOT external links like (https://github.com/...)
  result = result.replace(/\]\((\.\.\/)*(\.\/)?([^)]+\.md(?:#[^)]*)?)\)/g, (match, parentDirs, dotSlash, path) => {
    // Don't transform external links
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return match;
    }
    const transformed = transformLinkPath(path);
    return `](${transformed})`;
  });

  // Also transform links without .md extension that reference known files
  // Matches: [text](./mcp-integration), [text](mcp-integration#anchor)
  result = result.replace(
    /\]\((\.\.\/)*(\.\/)?([a-zA-Z0-9_-]+(?:#[^)]*)?)\)/g,
    (match, parentDirs, dotSlash, pathWithAnchor) => {
      // Don't transform if it starts with http, #, or is already an absolute path
      if (pathWithAnchor.startsWith("http") || pathWithAnchor.startsWith("#") || pathWithAnchor.startsWith("/")) {
        return match;
      }

      // Check if this is a known file that needs transformation
      const [basePath, anchor] = pathWithAnchor.split("#");
      if (LINK_MAPPINGS[basePath] || LINK_MAPPINGS[basePath + ".md"]) {
        const transformed = transformLinkPath(pathWithAnchor);
        return `](${transformed})`;
      }

      // Return original if not in our mappings
      return match;
    },
  );

  // Fix absolute paths that reference old locations and add /docs/ prefix
  // Matches: [text](/reference/configuration), [text](/features/streaming)
  // Skip paths that already have /docs/ prefix or are external
  result = result.replace(/\]\(\/(?!docs\/)([a-zA-Z0-9_/-]+(?:#[^)]*)?)\)/g, (match, path) => {
    // Skip external links
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return match;
    }

    // Extract base path and anchor
    const [basePath, anchor] = path.split("#");

    // FIRST check if this needs transformation via LINK_MAPPINGS
    // This takes precedence over the valid prefix check
    if (LINK_MAPPINGS[basePath]) {
      const newPath = anchor ? "/docs" + LINK_MAPPINGS[basePath] + "#" + anchor : "/docs" + LINK_MAPPINGS[basePath];
      return `](${newPath})`;
    }

    // Valid doc prefixes - these paths are valid doc paths and just need /docs/ prefix
    const validPrefixes = [
      "mcp/",
      "memory/",
      "workflows/",
      "observability/",
      "deployment/",
      "sdk/",
      "reference/",
      "community/",
      "features/",
      "getting-started/",
      "development/",
      "guides/",
      "cookbook/",
      "tutorials/",
      "api/",
      "cli/",
      "advanced/",
      "examples/",
      "demos/",
    ];

    // If it starts with a valid prefix, just add /docs/
    if (validPrefixes.some((prefix) => path.startsWith(prefix))) {
      return `](/docs/${path})`;
    }

    // For other paths, add /docs/ prefix
    return `](/docs/${path})`;
  });

  // Fix known broken links at the END (after all transformations have run)
  result = result.replace(/\/docs\/cli-guide/g, "/docs/cli");
  result = result.replace(/\/docs\/features\/interactive-cli/g, "/docs/cli");

  return result;
}

/**
 * Transform markdown content from MkDocs to Docusaurus format
 */
function transformContent(content: string, relativePath: string, allFiles?: string[]): TransformResult {
  // Parse frontmatter
  const { data, content: markdownContent } = matter(content);

  // Apply transformations
  let transformed = markdownContent;

  // Convert MkDocs-specific syntax
  transformed = convertAdmonitions(transformed);
  transformed = convertTabs(transformed);
  transformed = removeAttributeSyntax(transformed);
  transformed = convertGridCards(transformed);
  transformed = convertMaterialIcons(transformed);
  transformed = escapeJsxSyntax(transformed);
  transformed = fixInternalLinks(transformed);
  transformed = transformImagePaths(transformed);

  // Process frontmatter with allFiles for deterministic sidebar positioning
  const frontmatter = processFrontmatter(data, relativePath, transformed, allFiles);

  return {
    content: transformed,
    frontmatter,
  };
}

/**
 * Copy images and assets from docs to static folder
 */
async function copyAssets(sourceDir: string, staticDir: string): Promise<void> {
  const assetPatterns = ["**/*.png", "**/*.jpg", "**/*.jpeg", "**/*.gif", "**/*.svg", "**/*.webp"];

  for (const pattern of assetPatterns) {
    const files = await glob(pattern, { cwd: sourceDir, nodir: true });

    for (const file of files) {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(staticDir, "docs", file);
      const targetDir = path.dirname(targetPath);

      // Create target directory if it doesn't exist
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Copy the file
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`  Copied asset: ${file}`);
    }
  }
}

/**
 * Apply file mapping to determine the target path
 * Checks the full relative path FIRST (for more specific matches),
 * then falls back to basename matching (for generic mappings)
 */
function applyFileMapping(relativePath: string): string {
  // Check if the full relative path matches (for files in subdirectories)
  // This takes precedence over basename matching to allow subdirectory files
  // to keep their location even if there's a basename-based mapping
  const normalizedPath = relativePath.replace(/\\/g, "/");
  if (FILE_MAPPINGS[normalizedPath]) {
    return FILE_MAPPINGS[normalizedPath];
  }

  // Check if the file should NOT be remapped based on its parent directory
  // Files in certain directories (like guides/server-adapters) should keep their location
  const preservedPrefixes = ["guides/server-adapters/", "guides/migration/", "guides/frameworks/"];
  if (preservedPrefixes.some((prefix) => normalizedPath.startsWith(prefix))) {
    return relativePath;
  }

  // Check if there's a direct mapping for this file by basename
  const basename = path.basename(relativePath);
  if (FILE_MAPPINGS[basename]) {
    return FILE_MAPPINGS[basename];
  }

  // No mapping found, use original path
  return relativePath;
}

/**
 * Get all markdown files to process
 */
async function getMarkdownFiles(sourceDir: string): Promise<FileInfo[]> {
  const pattern = "**/*.md";
  const files = await glob(pattern, { cwd: sourceDir, nodir: true });

  return files
    .filter((file) => {
      // Exclude certain directories
      const parts = file.split(path.sep);
      return !parts.some((part) => EXCLUDED_DIRS.includes(part));
    })
    .map((file) => {
      // Apply file mapping to determine target path
      const mappedPath = applyFileMapping(file);
      return {
        sourcePath: path.join(sourceDir, file),
        relativePath: file,
        // Use .md extension (not .mdx) to avoid strict MDX parsing
        // This allows JSX-like content in markdown without breaking the build
        targetPath: path.join(TARGET_DIR, mappedPath),
      };
    });
}

/**
 * Clean the target directory
 */
function cleanTargetDir(targetDir: string): void {
  if (fs.existsSync(targetDir)) {
    // Remove all .md and .mdx files but keep non-generated content
    const files = fs.readdirSync(targetDir, { recursive: true }) as string[];
    for (const file of files) {
      const filePath = path.join(targetDir, file);
      if (fs.statSync(filePath).isFile() && (filePath.endsWith(".mdx") || filePath.endsWith(".md"))) {
        fs.unlinkSync(filePath);
      }
    }
  }
}

/**
 * Main sync function
 */
async function syncDocs(): Promise<void> {
  console.log("Starting docs sync...\n");
  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Target: ${TARGET_DIR}\n`);

  // Check if source directory exists
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Error: Source directory does not exist: ${SOURCE_DIR}`);
    process.exit(1);
  }

  // Clean target directory (generated content only)
  console.log("Cleaning target directory...");
  cleanTargetDir(TARGET_DIR);

  // Get all markdown files
  const files = await getMarkdownFiles(SOURCE_DIR);
  console.log(`Found ${files.length} markdown files to process\n`);

  // Reset directory counters before processing
  directorySidebarCounters.clear();

  // Extract all target relative paths for deterministic sidebar positioning
  const allTargetPaths = files.map((f) => path.relative(TARGET_DIR, f.targetPath));

  // Initialize git change detector for auto-badges (tag-based detection)
  let gitChanges: GitChangeInfo | null = null;

  if (ENABLE_AUTO_BADGES) {
    console.log("🔍 Detecting git changes for auto-badge injection...");
    const changeDetector = new GitChangeDetector();
    // getChangedFiles() uses tag-based detection and logs the baseline tag being used
    gitChanges = changeDetector.getChangedFiles();
  }

  let successCount = 0;
  let errorCount = 0;

  // Process each file
  for (const file of files) {
    try {
      // Read source file
      const sourceContent = fs.readFileSync(file.sourcePath, "utf-8");

      // Determine the relative path for the target (used for frontmatter processing)
      const targetRelativePath = path.relative(TARGET_DIR, file.targetPath);

      // Transform content using the target relative path for proper frontmatter generation
      // Pass allTargetPaths for deterministic sidebar positioning
      const { content, frontmatter } = transformContent(sourceContent, targetRelativePath, allTargetPaths);

      // Add auto-detected badges based on git changes
      const finalFrontmatter = addAutoBadges(frontmatter, file.relativePath, gitChanges);

      // Build output with frontmatter
      const frontmatterYaml = Object.entries(finalFrontmatter)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}:\n${value.map((v) => `  - "${String(v).replace(/"/g, '\\"')}"`).join("\n")}`;
          }
          if (typeof value === "string") {
            // Quote strings that contain special YAML characters
            const needsQuoting = /[:<>#{}[\]!|>&*?\n"'`\\]/.test(value) || value.trim() !== value;
            if (needsQuoting) {
              // Use double quotes and escape internal double quotes and backslashes
              const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
              return `${key}: "${escaped}"`;
            }
            return `${key}: ${value}`;
          }
          return `${key}: ${value}`;
        })
        .join("\n");

      const output = `---\n${frontmatterYaml}\n---\n\n${content}`;

      // Ensure target directory exists
      const targetDir = path.dirname(file.targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Write transformed file
      fs.writeFileSync(file.targetPath, output, "utf-8");

      // Log with indication if file was remapped
      const targetRelative = path.relative(TARGET_DIR, file.targetPath);
      if (file.relativePath !== targetRelative) {
        console.log(`  Transformed: ${file.relativePath} -> ${targetRelative} (remapped)`);
      } else {
        console.log(`  Transformed: ${file.relativePath}`);
      }
      successCount++;
    } catch (error) {
      console.error(`  Error processing ${file.relativePath}:`, error);
      errorCount++;
    }
  }

  // Copy assets
  console.log("\nCopying assets...");
  await copyAssets(SOURCE_DIR, STATIC_DIR);

  // Summary
  console.log("\n--- Sync Complete ---");
  console.log(`Successfully processed: ${successCount} files`);
  if (errorCount > 0) {
    console.log(`Errors: ${errorCount} files`);
  }
}

// Run the sync
syncDocs().catch((error) => {
  console.error("Sync failed:", error);
  process.exit(1);
});
