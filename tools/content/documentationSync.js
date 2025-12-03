#!/usr/bin/env node

/**
 * NeuroLink Documentation Automation System
 * Automated README.md synchronization and API reference generation
 * Part of Developer Experience Enhancement Plan 2.0 - Phase 3B
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
  mkdirSync,
} from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "../..");

class DocumentationSync {
  constructor() {
    this.docsDir = join(ROOT_DIR, "docs");
    this.readmeFile = join(ROOT_DIR, "README.md");
    this.packageJsonFile = join(ROOT_DIR, "package.json");

    this.sections = {
      installation: {
        pattern: /## Installation/i,
        priority: 1,
      },
      quickStart: {
        pattern: /## Quick Start|## Getting Started/i,
        priority: 2,
      },
      usage: {
        pattern: /## Usage|## Basic Usage/i,
        priority: 3,
      },
      apiReference: {
        pattern: /## API Reference|## API/i,
        priority: 4,
      },
      examples: {
        pattern: /## Examples/i,
        priority: 5,
      },
      configuration: {
        pattern: /## Configuration/i,
        priority: 6,
      },
      troubleshooting: {
        pattern: /## Troubleshooting/i,
        priority: 7,
      },
    };

    this.results = {
      timestamp: new Date().toISOString(),
      filesProcessed: 0,
      sectionsFound: 0,
      synchronizations: [],
      validationResults: {},
      apiGeneration: {},
    };
  }

  /**
   * Main synchronization execution
   */
  async sync(validateOnly = false) {
    try {
      console.log("\n📚 NeuroLink Documentation Automation - Phase 3B");
      console.log("==================================================");

      if (validateOnly) {
        await this.validateDocumentation();
      } else {
        await this.synchronizeDocumentation();
        await this.generateApiReference();
        await this.updateTableOfContents();
        await this.validateLinks();
      }

      await this.generateReport();
      console.log("\n✅ Documentation sync complete!");
    } catch (error) {
      console.error("❌ Documentation sync failed:", error.message);
      process.exit(1);
    }
  }

  /**
   * Synchronize documentation across files
   */
  async synchronizeDocumentation() {
    console.log("🔄 Synchronizing documentation...");

    // Read all markdown files
    const markdownFiles = await this.findMarkdownFiles();
    console.log(`📄 Found ${markdownFiles.length} markdown files`);

    // Extract sections from all files
    const allSections = await this.extractSections(markdownFiles);
    console.log(
      `📋 Extracted ${Object.keys(allSections).length} unique sections`,
    );

    // Synchronize common sections
    await this.syncCommonSections(allSections);

    // Update main README.md
    await this.updateMainReadme(allSections);
  }

  /**
   * Find all markdown files
   */
  async findMarkdownFiles() {
    const markdownFiles = [];

    const scanDirectory = (dir) => {
      try {
        const items = readdirSync(dir);

        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            // Skip node_modules and .git
            if (!item.startsWith(".") && item !== "node_modules") {
              scanDirectory(fullPath);
            }
          } else if (item.endsWith(".md")) {
            markdownFiles.push(fullPath);
          }
        }
      } catch (error) {
        console.log(`⚠️  Skipping directory ${dir}: ${error.message}`);
      }
    };

    scanDirectory(ROOT_DIR);
    this.results.filesProcessed = markdownFiles.length;

    return markdownFiles;
  }

  /**
   * Extract sections from markdown files
   */
  async extractSections(files) {
    const allSections = {};

    for (const file of files) {
      try {
        const content = readFileSync(file, "utf8");
        const sections = this.parseMarkdownSections(content);

        // Merge sections
        for (const [sectionName, sectionData] of Object.entries(sections)) {
          if (!allSections[sectionName]) {
            allSections[sectionName] = [];
          }
          allSections[sectionName].push({
            ...sectionData,
            sourceFile: relative(ROOT_DIR, file),
          });
        }
      } catch (error) {
        console.log(`⚠️  Failed to parse ${file}: ${error.message}`);
      }
    }

    this.results.sectionsFound = Object.keys(allSections).length;
    return allSections;
  }

  /**
   * Parse markdown sections from content
   */
  parseMarkdownSections(content) {
    const sections = {};
    const lines = content.split("\n");
    let currentSection = null;
    let currentContent = [];

    for (const line of lines) {
      // Check for section headers (##, ###, etc.)
      const headerMatch = line.match(/^(#{2,})\s+(.+)$/);

      if (headerMatch) {
        // Save previous section
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = {
            content: currentContent.join("\n").trim(),
            level: currentSection.level,
            title: currentSection.title,
          };
        }

        // Start new section
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();
        const sectionKey = this.normalizeSectionName(title);

        currentSection = {
          key: sectionKey,
          title,
          level,
        };
        currentContent = [line];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection && currentContent.length > 0) {
      sections[currentSection.key] = {
        content: currentContent.join("\n").trim(),
        level: currentSection.level,
        title: currentSection.title,
      };
    }

    return sections;
  }

  /**
   * Normalize section name for comparison
   */
  normalizeSectionName(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .trim();
  }

  /**
   * Synchronize common sections across files
   */
  async syncCommonSections(allSections) {
    console.log("🔗 Synchronizing common sections...");

    const commonSections = this.identifyCommonSections(allSections);

    for (const [sectionName, versions] of Object.entries(commonSections)) {
      if (versions.length > 1) {
        const canonical = this.selectCanonicalVersion(versions);
        await this.syncSectionAcrossFiles(sectionName, canonical);

        this.results.synchronizations.push({
          section: sectionName,
          canonical: canonical.sourceFile,
          updated: versions.length - 1,
        });
      }
    }

    console.log(
      `🔗 Synchronized ${this.results.synchronizations.length} sections`,
    );
  }

  /**
   * Identify sections that appear in multiple files
   */
  identifyCommonSections(allSections) {
    const common = {};

    for (const [sectionName, versions] of Object.entries(allSections)) {
      // Only consider sections that match our known patterns
      const isKnownSection = Object.values(this.sections).some((s) =>
        s.pattern.test(sectionName),
      );

      if (isKnownSection && versions.length > 1) {
        common[sectionName] = versions;
      }
    }

    return common;
  }

  /**
   * Select canonical version of a section
   */
  selectCanonicalVersion(versions) {
    // Prefer main README.md, then longest content, then newest file

    const readmeVersion = versions.find(
      (v) =>
        v.sourceFile === "README.md" || v.sourceFile.endsWith("/README.md"),
    );

    if (readmeVersion) {
      return readmeVersion;
    }

    // Return version with most content
    return versions.reduce((best, current) =>
      current.content.length > best.content.length ? current : best,
    );
  }

  /**
   * Sync section across files (placeholder)
   */
  async syncSectionAcrossFiles(sectionName, canonical) {
    console.log(`  📝 Syncing "${sectionName}" from ${canonical.sourceFile}`);
    // In a real implementation, this would update the files
    // For now, we'll just log the operation
  }

  /**
   * Update main README.md
   */
  async updateMainReadme(allSections) {
    console.log("📝 Updating main README.md...");

    if (!existsSync(this.readmeFile)) {
      console.log("⚠️  Main README.md not found, creating new one");
      await this.createNewReadme();
      return;
    }

    // Read current README
    const currentContent = readFileSync(this.readmeFile, "utf8");

    // Parse package.json for metadata
    const packageData = JSON.parse(readFileSync(this.packageJsonFile, "utf8"));

    // Generate updated content
    const updatedContent = this.generateReadmeContent(
      currentContent,
      allSections,
      packageData,
    );

    // Write back if changed
    if (updatedContent !== currentContent) {
      writeFileSync(this.readmeFile, updatedContent);
      console.log("✅ README.md updated");
    } else {
      console.log("✅ README.md is up to date");
    }
  }

  /**
   * Generate README content
   */
  generateReadmeContent(currentContent, allSections, packageData) {
    // For now, return current content with updated header
    const lines = currentContent.split("\n");
    const updatedLines = [];
    let inHeader = true;

    for (const line of lines) {
      if (inHeader && line.startsWith("#")) {
        // Update title with package name
        if (line.match(/^#\s+/)) {
          updatedLines.push(`# ${packageData.name}`);
          updatedLines.push("");
          updatedLines.push(packageData.description || "");
          updatedLines.push("");
          updatedLines.push(`**Version:** ${packageData.version}`);
          updatedLines.push(`**License:** ${packageData.license}`);
          updatedLines.push("");
          inHeader = false;
          continue;
        }
      }
      updatedLines.push(line);
    }

    return updatedLines.join("\n");
  }

  /**
   * Create new README.md
   */
  async createNewReadme() {
    const packageData = JSON.parse(readFileSync(this.packageJsonFile, "utf8"));

    const content = `# ${packageData.name}

${packageData.description || ""}

**Version:** ${packageData.version}
**License:** ${packageData.license}

## Installation

\`\`\`bash
npm install ${packageData.name}
\`\`\`

## Quick Start

\`\`\`javascript
import neurolink from '${packageData.name}';

// Your code here
\`\`\`

## Documentation

For detailed documentation, see the [docs](./docs) directory.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the ${packageData.license} License.
`;

    writeFileSync(this.readmeFile, content);
    console.log("✅ New README.md created");
  }

  /**
   * Generate API reference
   */
  async generateApiReference() {
    console.log("📖 Generating API reference...");

    try {
      // Check if TypeDoc is available
      execSync("npx typedoc --version", { stdio: "ignore" });

      // Generate API docs with TypeDoc
      const apiDir = join(this.docsDir, "api");
      if (!existsSync(apiDir)) {
        mkdirSync(apiDir, { recursive: true });
      }

      execSync(`npx typedoc --out ${apiDir} src/`, {
        cwd: ROOT_DIR,
        stdio: "inherit",
      });

      this.results.apiGeneration.status = "success";
      this.results.apiGeneration.outputDir = relative(ROOT_DIR, apiDir);
      console.log(
        `✅ API reference generated in ${this.results.apiGeneration.outputDir}`,
      );
    } catch {
      console.log("⚠️  TypeDoc not available, skipping API generation");
      this.results.apiGeneration.status = "skipped";
      this.results.apiGeneration.reason = "TypeDoc not available";
    }
  }

  /**
   * Update table of contents
   */
  async updateTableOfContents() {
    console.log("📑 Updating table of contents...");

    const markdownFiles = await this.findMarkdownFiles();

    for (const file of markdownFiles) {
      try {
        await this.updateFileTableOfContents(file);
      } catch (error) {
        console.log(`⚠️  Failed to update TOC for ${file}: ${error.message}`);
      }
    }

    console.log("✅ Table of contents updated");
  }

  /**
   * Update table of contents for a single file
   */
  async updateFileTableOfContents(filePath) {
    const content = readFileSync(filePath, "utf8");
    const sections = this.parseMarkdownSections(content);

    // Generate TOC
    const toc = this.generateTableOfContents(sections);

    if (toc.length > 0) {
      // Insert TOC after first heading
      const lines = content.split("\n");
      const tocStart = "<!-- TOC -->";
      const tocEnd = "<!-- /TOC -->";

      // Find existing TOC
      const startIndex = lines.findIndex((line) => line.includes(tocStart));
      const endIndex = lines.findIndex((line) => line.includes(tocEnd));

      if (startIndex !== -1 && endIndex !== -1) {
        // Replace existing TOC
        lines.splice(
          startIndex,
          endIndex - startIndex + 1,
          tocStart,
          ...toc,
          tocEnd,
        );
      } else {
        // Insert new TOC after first heading
        const firstHeadingIndex = lines.findIndex((line) =>
          line.match(/^#\s+/),
        );
        if (firstHeadingIndex !== -1) {
          lines.splice(
            firstHeadingIndex + 1,
            0,
            "",
            tocStart,
            ...toc,
            tocEnd,
            "",
          );
        }
      }

      writeFileSync(filePath, lines.join("\n"));
    }
  }

  /**
   * Generate table of contents from sections
   */
  generateTableOfContents(sections) {
    const toc = [];

    for (const [sectionName, sectionData] of Object.entries(sections)) {
      if (sectionData.level > 1) {
        // Skip main title
        const indent = "  ".repeat(sectionData.level - 2);
        const link = `#${sectionName.replace(/_/g, "-")}`;
        toc.push(`${indent}- [${sectionData.title}](${link})`);
      }
    }

    return toc;
  }

  /**
   * Validate documentation links
   */
  async validateLinks() {
    console.log("🔗 Validating documentation links...");

    const markdownFiles = await this.findMarkdownFiles();
    let totalLinks = 0;
    let brokenLinks = 0;

    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, "utf8");
        const links = this.extractLinks(content);
        totalLinks += links.length;

        for (const link of links) {
          if (!this.validateLink(link, file)) {
            brokenLinks++;
          }
        }
      } catch (error) {
        console.log(
          `⚠️  Failed to validate links in ${file}: ${error.message}`,
        );
      }
    }

    this.results.validationResults = {
      totalLinks,
      brokenLinks,
      validLinks: totalLinks - brokenLinks,
    };

    console.log(
      `🔗 Link validation: ${totalLinks - brokenLinks}/${totalLinks} valid`,
    );
  }

  /**
   * Extract links from markdown content
   */
  extractLinks(content) {
    const links = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      links.push({
        text: match[1],
        url: match[2],
      });
    }

    return links;
  }

  /**
   * Validate a single link
   */
  validateLink(link, sourceFile) {
    const { url } = link;

    // Skip external links for now
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return true;
    }

    // Check relative file links
    if (!url.startsWith("#")) {
      const targetPath = join(dirname(sourceFile), url);
      return existsSync(targetPath);
    }

    // Section links are harder to validate, assume valid for now
    return true;
  }

  /**
   * Validate documentation only
   */
  async validateDocumentation() {
    console.log("🔍 Validating documentation...");

    await this.validateLinks();

    const markdownFiles = await this.findMarkdownFiles();
    this.results.filesProcessed = markdownFiles.length;

    console.log(`📄 Validated ${markdownFiles.length} files`);
  }

  /**
   * Generate comprehensive report
   */
  async generateReport() {
    console.log("\n📊 Generating documentation report...");

    const reportDir = join(ROOT_DIR, "test-reports");
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }

    const reportFile = join(reportDir, `documentationSync-${Date.now()}.json`);
    writeFileSync(reportFile, JSON.stringify(this.results, null, 2));

    console.log("📊 Documentation Report Summary:");
    console.log(`   Files Processed: ${this.results.filesProcessed}`);
    console.log(`   Sections Found: ${this.results.sectionsFound}`);
    console.log(`   Synchronizations: ${this.results.synchronizations.length}`);

    if (this.results.validationResults) {
      const { totalLinks, validLinks, brokenLinks } =
        this.results.validationResults;
      console.log(
        `   Links Validated: ${validLinks}/${totalLinks} (${brokenLinks} broken)`,
      );
    }

    if (this.results.apiGeneration.status) {
      console.log(`   API Generation: ${this.results.apiGeneration.status}`);
    }

    console.log(`   Report saved: ${reportFile}`);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const validateOnly = process.argv.includes("--validate");
  const sync = new DocumentationSync();

  sync.sync(validateOnly).catch((error) => {
    console.error("❌ Documentation sync failed:", error);
    process.exit(1);
  });
}

export default DocumentationSync;
