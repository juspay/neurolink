/**
 * Tool Aggregator - Collects and generates tool exports
 *
 * Scans tool files and generates:
 * 1. Unified tools.mjs export file
 * 2. Tool registry initialization code
 * 3. OpenAPI schemas for documentation
 *
 * @packageDocumentation
 * @module @juspay/neurolink/deployer
 * @category Deployment
 */

import fs from "node:fs";
import path from "node:path";
import { logger } from "../../utils/logger.js";
import type { EntryFile, DiscoveredTool, AggregatedTools } from "../types.js";

/**
 * Tool Aggregator - Collects and generates tool exports
 *
 * @example
 * ```typescript
 * const aggregator = new ToolAggregator('.neurolink/output');
 * const result = await aggregator.aggregate(toolEntries);
 *
 * console.log('Tools found:', result.tools.length);
 * console.log('Export code:', result.exportContent);
 * ```
 */
export class ToolAggregator {
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
  }

  /**
   * Aggregate tools from discovered entry files
   */
  async aggregate(toolEntries: EntryFile[]): Promise<AggregatedTools> {
    const tools: DiscoveredTool[] = [];

    for (const entry of toolEntries) {
      const discovered = await this.extractToolsFromFile(entry);
      tools.push(...discovered);
    }

    logger.info(
      `Aggregated ${tools.length} tools from ${toolEntries.length} files`
    );

    const exportContent = this.generateExportContent(tools, toolEntries);
    const registryCode = this.generateRegistryCode(tools);

    return {
      tools,
      exportContent,
      registryCode,
    };
  }

  /**
   * Extract tool definitions from a file
   */
  private async extractToolsFromFile(
    entry: EntryFile
  ): Promise<DiscoveredTool[]> {
    const tools: DiscoveredTool[] = [];

    try {
      const content = fs.readFileSync(entry.path, "utf-8");

      for (const exportName of entry.exports) {
        const toolInfo = this.parseToolFromContent(content, exportName, entry.path);
        if (toolInfo) {
          tools.push(toolInfo);
        }
      }
    } catch (error) {
      logger.warn(`Failed to extract tools from ${entry.path}:`, error);
    }

    return tools;
  }

  /**
   * Parse tool definition from file content
   */
  private parseToolFromContent(
    content: string,
    exportName: string,
    sourcePath: string
  ): DiscoveredTool | null {
    // Pattern 1: Tool definition object with name and description
    const toolPattern = new RegExp(
      `(?:const|let|var)\\s+${exportName}\\s*[:=]\\s*\\{[^}]*name\\s*:\\s*["']([^"']+)["'][^}]*description\\s*:\\s*["']([^"']+)["']`,
      "s"
    );
    let match = content.match(toolPattern);

    if (match) {
      return {
        name: match[1],
        description: match[2],
        sourcePath,
        exportName,
        category: this.detectCategory(sourcePath),
      };
    }

    // Pattern 2: Tool created with createTool/defineTool function
    const createPattern = new RegExp(
      `(?:const|let|var)\\s+${exportName}\\s*=\\s*(?:createTool|defineTool)\\s*\\(\\s*\\{[^}]*name\\s*:\\s*["']([^"']+)["'][^}]*description\\s*:\\s*["']([^"']+)["']`,
      "s"
    );
    match = content.match(createPattern);

    if (match) {
      return {
        name: match[1],
        description: match[2],
        sourcePath,
        exportName,
        category: this.detectCategory(sourcePath),
      };
    }

    // Pattern 3: Export with tool-like naming (ends with Tool)
    if (exportName.endsWith("Tool") || exportName.endsWith("tool")) {
      return {
        name: this.formatToolName(exportName),
        description: `Tool: ${exportName}`,
        sourcePath,
        exportName,
        category: this.detectCategory(sourcePath),
      };
    }

    return null;
  }

  /**
   * Format tool name from export name
   */
  private formatToolName(exportName: string): string {
    const name = exportName.replace(/Tool$/i, "");
    return name
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .replace(/^-/, "");
  }

  /**
   * Detect tool category from file path
   */
  private detectCategory(filePath: string): string {
    const relativePath = path.relative(process.cwd(), filePath);
    const parts = relativePath.split(path.sep);

    const toolsIndex = parts.indexOf("tools");
    if (toolsIndex >= 0 && parts.length > toolsIndex + 2) {
      return parts[toolsIndex + 1];
    }

    return "general";
  }

  /**
   * Generate tools export file content
   */
  private generateExportContent(
    tools: DiscoveredTool[],
    entries: EntryFile[]
  ): string {
    const imports: string[] = [];
    const registrations: string[] = [];

    const toolsByFile = new Map<string, DiscoveredTool[]>();
    for (const tool of tools) {
      const existing = toolsByFile.get(tool.sourcePath) || [];
      existing.push(tool);
      toolsByFile.set(tool.sourcePath, existing);
    }

    let importIndex = 0;
    for (const [sourcePath, fileTools] of toolsByFile) {
      const relativePath = this.getRelativeImportPath(sourcePath);

      const importNames = fileTools
        .map((t) => t.exportName)
        .filter((n) => n !== "default");
      const hasDefault = fileTools.some((t) => t.exportName === "default");

      if (hasDefault && importNames.length > 0) {
        imports.push(
          `import defaultTool_${importIndex}, { ${importNames.join(", ")} } from "${relativePath}";`
        );
      } else if (hasDefault) {
        imports.push(
          `import defaultTool_${importIndex} from "${relativePath}";`
        );
      } else if (importNames.length > 0) {
        imports.push(
          `import { ${importNames.join(", ")} } from "${relativePath}";`
        );
      }

      for (const tool of fileTools) {
        const varName =
          tool.exportName === "default"
            ? `defaultTool_${importIndex}`
            : tool.exportName;
        registrations.push(`  "${tool.name}": ${varName},`);
      }

      importIndex++;
    }

    if (tools.length === 0) {
      return `// Auto-generated by NeuroLink Deployer
// No tools discovered

export const tools = {};

export const toolNames = [];

export default tools;
`;
    }

    return `// Auto-generated by NeuroLink Deployer
// Do not edit manually

${imports.join("\n")}

export const tools = {
${registrations.join("\n")}
};

export const toolNames = [${tools.map((t) => `"${t.name}"`).join(", ")}];

export default tools;
`;
  }

  /**
   * Generate tool registry initialization code
   */
  private generateRegistryCode(tools: DiscoveredTool[]): string {
    if (tools.length === 0) {
      return `// Tool Registry Initialization
// No tools to register

export function initializeTools(toolRegistry) {
  // No tools discovered
}
`;
    }

    const registrations = tools
      .map(
        (tool) => `
  toolRegistry.registerTool({
    name: "${tool.name}",
    description: "${tool.description.replace(/"/g, '\\"')}",
    category: "${tool.category || "general"}",
    inputSchema: ${JSON.stringify(tool.inputSchema || {}, null, 2).replace(/\n/g, "\n    ")},
    execute: tools["${tool.name}"]?.execute || tools["${tool.name}"],
  });`
      )
      .join("\n");

    return `// Tool Registry Initialization
import { tools } from "./tools.mjs";

export function initializeTools(toolRegistry) {
${registrations}
}
`;
  }

  /**
   * Get relative import path
   */
  private getRelativeImportPath(absolutePath: string): string {
    const relativePath = path.relative(this.outputDir, absolutePath);

    let importPath = relativePath.replace(/\\/g, "/").replace(/\.ts$/, ".js");

    if (!importPath.startsWith(".")) {
      importPath = "./" + importPath;
    }

    return importPath;
  }

  /**
   * Set output directory
   */
  setOutputDir(outputDir: string): void {
    this.outputDir = outputDir;
  }
}

export default ToolAggregator;
