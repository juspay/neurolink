#!/usr/bin/env tsx

/**
 * build-llms-txt.ts
 *
 * Generates two LLM-optimized documentation files:
 * 1. static/llms.txt - Summary version (~50KB) with high-priority sections and truncated content
 * 2. static/llms-full.txt - Complete version with all documentation
 *
 * Usage: pnpm tsx scripts/build-llms-txt.ts
 */

import * as fs from "fs";
import { glob } from "glob";
import matter from "gray-matter";
import * as path from "path";

// Configuration
const DOCS_DIR = path.resolve(__dirname, "../docs");
const OUTPUT_DIR = path.resolve(__dirname, "../static");
const SUMMARY_OUTPUT = path.join(OUTPUT_DIR, "llms.txt");
const FULL_OUTPUT = path.join(OUTPUT_DIR, "llms-full.txt");
const DOCS_BASE_URL = process.env.DOCS_BASE_URL || "https://docs.neurolink.ink";

// Summary file constraints
const SUMMARY_MAX_SIZE_KB = 50;
const SUMMARY_CONTENT_TRUNCATE_CHARS = 500;

// Directories to exclude
const EXCLUDED_DIRS = ["tracking", "phases", "analysis", "plans", "test-reports"];

// Priority definitions for summary file (lower number = higher priority)
interface PriorityRule {
  pattern: string | RegExp;
  priority: number;
  includeInSummary: boolean;
}

const PRIORITY_RULES: PriorityRule[] = [
  { pattern: /^index\.md$/, priority: 1, includeInSummary: true },
  { pattern: /^getting-started\//, priority: 2, includeInSummary: true },
  { pattern: /^sdk\/index\.md$/, priority: 3, includeInSummary: true },
  { pattern: /^sdk\/api-reference\.md$/, priority: 4, includeInSummary: true },
  { pattern: /^cli\/commands\.md$/, priority: 5, includeInSummary: true },
  { pattern: /^features\//, priority: 6, includeInSummary: true },
  { pattern: /^examples\//, priority: 7, includeInSummary: true },
  { pattern: /^cookbook\//, priority: 8, includeInSummary: false },
  { pattern: /^sdk\//, priority: 9, includeInSummary: false },
  { pattern: /^cli\//, priority: 10, includeInSummary: false },
  { pattern: /^mcp\//, priority: 11, includeInSummary: false },
  { pattern: /^advanced\//, priority: 12, includeInSummary: false },
  { pattern: /^reference\//, priority: 13, includeInSummary: false },
  { pattern: /^tutorials\//, priority: 14, includeInSummary: false },
  { pattern: /^development\//, priority: 15, includeInSummary: false },
  { pattern: /.*/, priority: 99, includeInSummary: false },
];

// Section ordering for table of contents
const SECTION_ORDER = [
  "root",
  "getting-started",
  "sdk",
  "cli",
  "features",
  "examples",
  "cookbook",
  "mcp",
  "advanced",
  "reference",
  "tutorials",
  "development",
  "guides",
  "memory",
  "observability",
  "deployment",
  "demos",
  "about",
  "community",
  "workflows",
  "visual-content",
];

interface DocFile {
  relativePath: string;
  section: string;
  title: string;
  content: string;
  rawContent: string;
  priority: number;
  includeInSummary: boolean;
  order: number;
}

interface ProviderInfo {
  name: string;
  slug: string;
}

/**
 * Strip unnecessary formatting from content
 */
function stripFormatting(content: string): string {
  let stripped = content;

  // Remove frontmatter (already handled by gray-matter, but just in case)
  stripped = stripped.replace(/^---[\s\S]*?---\n*/m, "");

  // Remove import statements
  stripped = stripped.replace(/^import\s+.*?;?\s*$/gm, "");

  // Remove JSX components but try to extract meaningful content
  stripped = stripped.replace(/<Tabs\b[^>]*>[\s\S]*?<\/Tabs>/g, (match) => {
    // Extract code blocks from tabs
    const codeBlocks = match.match(/```[\s\S]*?```/g) || [];
    return codeBlocks.join("\n\n");
  });
  stripped = stripped.replace(/<TabItem[^>]*>/g, "");
  stripped = stripped.replace(/<\/TabItem>/g, "");

  // Remove other React components
  stripped = stripped.replace(/<[A-Z][a-zA-Z]*[^>]*\/>/g, "");
  stripped = stripped.replace(/<[A-Z][a-zA-Z]*[^>]*>[\s\S]*?<\/[A-Z][a-zA-Z]*>/g, "");

  // Remove HTML tags (but keep content)
  stripped = stripped.replace(/<[^>]+>/g, "");

  // Remove image references (keep alt text if available)
  stripped = stripped.replace(/!\[([^\]]*)\]\([^)]+\)/g, (_, alt) => (alt ? `[Image: ${alt}]` : ""));

  // Remove MkDocs admonition markers but keep content
  stripped = stripped.replace(/^!{3}\s+\w+(?:\s+"[^"]*")?\s*\n((?:[ \t]+.+\n?)*)/gm, (_, body) => {
    return body
      .split("\n")
      .map((line: string) => line.replace(/^[ \t]{4}/, ""))
      .join("\n");
  });

  // Remove MkDocs tabs syntax but keep content
  stripped = stripped.replace(/^===\s+"[^"]+"\s*\n((?:[ \t]+.+\n?)*)/gm, (_, body) => {
    return body
      .split("\n")
      .map((line: string) => line.replace(/^[ \t]{4}/, ""))
      .join("\n");
  });

  // Remove material icons and emojis
  stripped = stripped.replace(/:material-[a-z-]+:/g, "");
  stripped = stripped.replace(/[\u{1F300}-\u{1F9FF}]/gu, "");

  // Remove badge images
  stripped = stripped.replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, "");
  stripped = stripped.replace(/!\[.*?\]\(https:\/\/(?:badge|img\.shields).*?\)/g, "");

  // Remove attribute syntax
  stripped = stripped.replace(/\s*\{:\s*[^}]+\}/g, "");

  // Remove excessive blank lines
  stripped = stripped.replace(/\n{3,}/g, "\n\n");

  // Remove trailing whitespace
  stripped = stripped
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");

  return stripped.trim();
}

/**
 * Extract title from content or frontmatter
 */
function extractTitle(data: Record<string, unknown>, content: string, relativePath: string): string {
  // Try frontmatter title (remove emojis)
  if (data.title && typeof data.title === "string") {
    return data.title.replace(/[\u{1F300}-\u{1F9FF}]/gu, "").trim();
  }

  // Try to find first H1
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].replace(/[\u{1F300}-\u{1F9FF}]/gu, "").trim();
  }

  // Use filename
  const filename = path.basename(relativePath, path.extname(relativePath));
  return filename
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get section from file path
 */
function getSection(relativePath: string): string {
  const parts = relativePath.split(path.sep);
  if (parts.length > 1) {
    return parts[0];
  }
  return "root";
}

/**
 * Get priority and summary inclusion status for a file
 */
function getPriorityInfo(relativePath: string): { priority: number; includeInSummary: boolean } {
  for (const rule of PRIORITY_RULES) {
    if (typeof rule.pattern === "string") {
      if (relativePath === rule.pattern || relativePath.startsWith(rule.pattern)) {
        return { priority: rule.priority, includeInSummary: rule.includeInSummary };
      }
    } else if (rule.pattern.test(relativePath)) {
      return { priority: rule.priority, includeInSummary: rule.includeInSummary };
    }
  }
  return { priority: 99, includeInSummary: false };
}

/**
 * Get order for sorting within sections
 */
function getOrder(section: string, data: Record<string, unknown>, filename: string, priority: number): number {
  // Primary sort by priority
  const priorityOrder = priority * 10000;

  // Section order
  const sectionIndex = SECTION_ORDER.indexOf(section);
  const sectionOrder = sectionIndex >= 0 ? sectionIndex * 100 : 9000;

  // File order within section
  let fileOrder = 50;
  if (data.sidebar_position !== undefined) {
    fileOrder = Number(data.sidebar_position);
  } else if (filename === "index.md") {
    fileOrder = 0;
  }

  return priorityOrder + sectionOrder + fileOrder;
}

/**
 * Format section name for display
 */
function formatSectionName(section: string): string {
  if (section === "root") return "Introduction";
  if (section === "sdk") return "SDK Reference";
  if (section === "cli") return "CLI";
  if (section === "mcp") return "MCP Integration";
  if (section === "hitl") return "Human-in-the-Loop";

  return section
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Truncate content for summary version
 */
function truncateContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) {
    return content;
  }

  // Try to cut at a sentence boundary
  const truncated = content.substring(0, maxChars);
  const lastPeriod = truncated.lastIndexOf(".");
  const lastNewline = truncated.lastIndexOf("\n");

  const cutPoint = Math.max(lastPeriod, lastNewline);
  if (cutPoint > maxChars * 0.5) {
    return truncated.substring(0, cutPoint + 1) + "\n\n[Content truncated - see llms-full.txt for complete documentation]";
  }

  return truncated + "...\n\n[Content truncated - see llms-full.txt for complete documentation]";
}

/**
 * Extract provider information from documentation.
 *
 * NOTE: This list should be kept in sync with supported providers in
 * src/lib/factories/providerRegistry.ts when adding or removing providers.
 */
function extractProviders(): ProviderInfo[] {
  const providers: ProviderInfo[] = [
    { name: "OpenAI", slug: "openai" },
    { name: "Anthropic Claude", slug: "anthropic" },
    { name: "Google AI Studio (Gemini)", slug: "google-ai" },
    { name: "Google Vertex AI", slug: "vertex" },
    { name: "AWS Bedrock", slug: "bedrock" },
    { name: "Azure OpenAI", slug: "azure" },
    { name: "Mistral AI", slug: "mistral" },
    { name: "LiteLLM (100+ models)", slug: "litellm" },
    { name: "OpenRouter", slug: "openrouter" },
    { name: "Ollama (Local)", slug: "ollama" },
    { name: "Hugging Face", slug: "huggingface" },
    { name: "AWS SageMaker", slug: "sagemaker" },
    { name: "OpenAI-Compatible", slug: "openai-compatible" },
  ];

  return providers;
}

/**
 * Extract API signatures summary
 */
function extractApiSignatures(): string {
  return `
## API Signatures Summary

### Core Methods
- \`neurolink.generate(options)\` - Generate text response
- \`neurolink.stream(options)\` - Stream text response
- \`neurolink.generateImage(options)\` - Generate images (Gemini/Vertex)

### Configuration
- \`new NeuroLink(config)\` - Initialize SDK
- \`neurolink.addExternalMCPServer(name, config)\` - Add MCP server
- \`neurolink.registerTool(tool)\` - Register custom tool

### Common Options
- \`provider\` - AI provider slug (openai, anthropic, google-ai, etc.)
- \`model\` - Model name
- \`input.text\` - Prompt text
- \`input.images\` - Image attachments
- \`maxTokens\` - Response length limit
- \`temperature\` - Creativity (0-1)
- \`thinkingLevel\` - Extended thinking (minimal, low, medium, high)
- \`structuredOutput\` - Zod schema for typed responses

### CLI Commands
- \`neurolink generate <prompt>\` - Generate text
- \`neurolink stream <prompt>\` - Stream text
- \`neurolink loop\` - Interactive session
- \`neurolink setup\` - Configure providers
- \`neurolink status\` - Check provider health
- \`neurolink mcp list\` - List MCP tools
`.trim();
}

/**
 * Get all documentation files
 */
async function getDocFiles(): Promise<DocFile[]> {
  const pattern = "**/*.md";
  const files = await glob(pattern, { cwd: DOCS_DIR, nodir: true });

  const docFiles: DocFile[] = [];

  for (const file of files) {
    // Skip excluded directories
    const parts = file.split(path.sep);
    if (parts.some((part) => EXCLUDED_DIRS.includes(part))) {
      continue;
    }

    const filePath = path.join(DOCS_DIR, file);
    const rawContent = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(rawContent);

    // Normalize to forward slashes for consistent pattern matching
    const normalizedFile = file.split(path.sep).join('/');

    const section = getSection(normalizedFile);
    const title = extractTitle(data, content, file);
    const strippedContent = stripFormatting(content);
    const { priority, includeInSummary } = getPriorityInfo(normalizedFile);
    const order = getOrder(section, data, path.basename(file), priority);

    docFiles.push({
      relativePath: file,
      section,
      title,
      content: strippedContent,
      rawContent: content,
      priority,
      includeInSummary,
      order,
    });
  }

  // Sort by order
  docFiles.sort((a, b) => a.order - b.order);

  return docFiles;
}

/**
 * Group files by section
 */
function groupBySection(files: DocFile[]): Map<string, DocFile[]> {
  const sections = new Map<string, DocFile[]>();

  for (const file of files) {
    const existing = sections.get(file.section) || [];
    existing.push(file);
    sections.set(file.section, existing);
  }

  return sections;
}

/**
 * Sort sections by order
 */
function sortSections(sections: Map<string, DocFile[]>): string[] {
  return Array.from(sections.keys()).sort((a, b) => {
    const aIndex = SECTION_ORDER.indexOf(a);
    const bIndex = SECTION_ORDER.indexOf(b);
    const aOrder = aIndex >= 0 ? aIndex : 999;
    const bOrder = bIndex >= 0 ? bIndex : 999;
    return aOrder - bOrder;
  });
}

/**
 * Build the summary llms.txt content (~50KB)
 */
function buildSummaryLlmsTxt(files: DocFile[]): string {
  const timestamp = new Date().toISOString();
  const lines: string[] = [];

  // Header
  lines.push("# NeuroLink Documentation (Summary)");
  lines.push("");
  lines.push("> Enterprise AI Development Platform - Unified provider access, MCP integration, professional CLI");
  lines.push("");
  lines.push(`Generated: ${timestamp}`);
  lines.push(`Full documentation: ${DOCS_BASE_URL}/llms-full.txt`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Project Overview
  const providers = extractProviders();
  lines.push("## Project Overview");
  lines.push("");
  lines.push("NeuroLink is an enterprise AI development platform that provides:");
  lines.push(`- Unified access to ${providers.length}+ AI providers through a single consistent API`);
  lines.push("- 58+ MCP (Model Context Protocol) tools and integrations");
  lines.push("- TypeScript SDK and professional CLI");
  lines.push("- Production-ready features: Redis memory, failover, telemetry");
  lines.push("- Multimodal support: text, images, PDFs, CSV, audio, video");
  lines.push("");

  // Provider Summary
  lines.push("## Supported Providers");
  lines.push("");
  for (const provider of providers) {
    lines.push(`- **${provider.name}** (\`${provider.slug}\`)`);
  }
  lines.push("");

  // API Signatures
  lines.push(extractApiSignatures());
  lines.push("");
  lines.push("---");
  lines.push("");

  // High-priority content sections
  const summaryFiles = files.filter((f) => f.includeInSummary);
  const sections = groupBySection(summaryFiles);
  const sortedSections = sortSections(sections);

  // Table of Contents
  lines.push("## Table of Contents");
  lines.push("");

  for (const section of sortedSections) {
    const sectionFiles = sections.get(section) || [];
    if (sectionFiles.length === 0) continue;

    const displayName = formatSectionName(section);
    lines.push(`### ${displayName}`);

    for (const file of sectionFiles) {
      lines.push(`- ${file.title}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");

  // Content sections (truncated)
  for (const section of sortedSections) {
    const sectionFiles = sections.get(section) || [];
    if (sectionFiles.length === 0) continue;

    const displayName = formatSectionName(section);
    lines.push(`# ${displayName}`);
    lines.push("");

    for (const file of sectionFiles) {
      lines.push(`## ${file.title}`);
      lines.push("");
      lines.push(`<!-- Source: ${file.relativePath} -->`);
      lines.push("");

      // Truncate content for summary
      const truncated = truncateContent(file.content, SUMMARY_CONTENT_TRUNCATE_CHARS);
      lines.push(truncated);
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  // Footer
  lines.push("# Additional Documentation");
  lines.push("");
  lines.push("This is a summary version. For complete documentation, see:");
  lines.push(`- Full text: ${DOCS_BASE_URL}/llms-full.txt`);
  lines.push(`- Web docs: ${DOCS_BASE_URL}`);
  lines.push("- GitHub: https://github.com/juspay/neurolink");
  lines.push("");

  return lines.join("\n");
}

/**
 * Build the full llms-full.txt content
 */
function buildFullLlmsTxt(files: DocFile[]): string {
  const timestamp = new Date().toISOString();
  const sections = groupBySection(files);
  const sortedSections = sortSections(sections);
  const lines: string[] = [];

  // Header
  lines.push("# NeuroLink Documentation (Complete)");
  lines.push("");
  lines.push("> Enterprise AI Development Platform - Unified provider access, MCP integration, professional CLI");
  lines.push("");
  lines.push(`Generated: ${timestamp}`);
  lines.push(`Summary version: ${DOCS_BASE_URL}/llms.txt`);
  lines.push(`Total files: ${files.length}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Table of Contents
  lines.push("## Table of Contents");
  lines.push("");

  for (const section of sortedSections) {
    const sectionFiles = sections.get(section) || [];
    if (sectionFiles.length === 0) continue;

    const displayName = formatSectionName(section);
    lines.push(`### ${displayName}`);

    for (const file of sectionFiles) {
      lines.push(`- ${file.title}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");

  // Full content sections
  for (const section of sortedSections) {
    const sectionFiles = sections.get(section) || [];
    if (sectionFiles.length === 0) continue;

    const displayName = formatSectionName(section);
    lines.push(`# ${displayName}`);
    lines.push("");

    for (const file of sectionFiles) {
      lines.push(`## ${file.title}`);
      lines.push("");
      lines.push(`<!-- Source: ${file.relativePath} -->`);
      lines.push("");

      // Full content, no truncation
      lines.push(file.content);
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  // Footer
  lines.push("# End of Documentation");
  lines.push("");
  lines.push(`For the latest documentation, visit: ${DOCS_BASE_URL}`);
  lines.push("GitHub: https://github.com/juspay/neurolink");
  lines.push("");

  return lines.join("\n");
}

/**
 * Main build function
 */
async function buildLlmsTxtFiles(): Promise<void> {
  console.log("Building LLM documentation files...\n");
  console.log(`Source: ${DOCS_DIR}`);
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  // Check if source directory exists
  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`Error: Source directory does not exist: ${DOCS_DIR}`);
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Get all documentation files
  const files = await getDocFiles();
  console.log(`Found ${files.length} documentation files`);

  const summaryFiles = files.filter((f) => f.includeInSummary);
  console.log(`High-priority files for summary: ${summaryFiles.length}\n`);

  // Build summary version
  console.log("Building llms.txt (summary)...");
  const summaryContent = buildSummaryLlmsTxt(files);
  fs.writeFileSync(SUMMARY_OUTPUT, summaryContent, "utf-8");
  const summaryStats = fs.statSync(SUMMARY_OUTPUT);
  const summarySizeKB = (summaryStats.size / 1024).toFixed(2);
  console.log(`  Output: ${SUMMARY_OUTPUT}`);
  console.log(`  Size: ${summarySizeKB} KB`);

  if (summaryStats.size > SUMMARY_MAX_SIZE_KB * 1024) {
    console.log(`  Warning: Summary exceeds target size of ${SUMMARY_MAX_SIZE_KB}KB`);
  }

  // Build full version
  console.log("\nBuilding llms-full.txt (complete)...");
  const fullContent = buildFullLlmsTxt(files);
  fs.writeFileSync(FULL_OUTPUT, fullContent, "utf-8");
  const fullStats = fs.statSync(FULL_OUTPUT);
  const fullSizeKB = (fullStats.size / 1024).toFixed(2);
  const fullSizeMB = (fullStats.size / 1024 / 1024).toFixed(2);
  console.log(`  Output: ${FULL_OUTPUT}`);
  console.log(`  Size: ${fullSizeKB} KB (${fullSizeMB} MB)`);

  // Summary
  console.log("\n--- Build Complete ---");
  console.log(`Summary (llms.txt): ${summarySizeKB} KB`);
  console.log(`Complete (llms-full.txt): ${fullSizeMB} MB`);
  console.log(`Total files processed: ${files.length}`);
}

// Run the build
buildLlmsTxtFiles().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
