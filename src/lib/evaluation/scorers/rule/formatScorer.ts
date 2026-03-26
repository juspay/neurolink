/**
 * @file Format Scorer
 * Evaluates response format compliance (JSON, markdown, code, etc.)
 */

import type {
  RuleScorerConfig,
  ScoreResult,
  ScorerInput,
  ScorerMetadata,
  ScorerRule,
} from "../../../types/scorerTypes.js";
import { logger } from "../../../utils/logger.js";
import {
  BaseRuleScorer,
  DEFAULT_RULE_SCORER_CONFIG,
} from "./baseRuleScorer.js";

/**
 * Expected format types
 */
export type FormatType =
  | "json"
  | "markdown"
  | "code"
  | "list"
  | "numbered-list"
  | "bullet-list"
  | "table"
  | "yaml"
  | "xml"
  | "plain"
  | "html"
  | "custom";

/**
 * Code language types for code format validation
 */
export type CodeLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "c"
  | "cpp"
  | "csharp"
  | "go"
  | "rust"
  | "sql"
  | "bash"
  | "any";

/**
 * Configuration specific to format scoring
 */
export type FormatScorerConfig = RuleScorerConfig & {
  /** Expected format type */
  expectedFormat?: FormatType;
  /** Multiple allowed formats */
  allowedFormats?: FormatType[];
  /** For code format: expected language */
  codeLanguage?: CodeLanguage;
  /** For JSON format: validate against schema */
  jsonSchema?: object;
  /** For markdown: required elements */
  markdownRequirements?: {
    hasHeadings?: boolean;
    hasCodeBlocks?: boolean;
    hasLinks?: boolean;
    hasLists?: boolean;
    minHeadingLevel?: number;
    maxHeadingLevel?: number;
  };
  /** For list format: requirements */
  listRequirements?: {
    minItems?: number;
    maxItems?: number;
    itemPattern?: string;
  };
  /** Custom format regex pattern */
  customPattern?: string;
  /** Whether format must be exclusive (no other content) */
  strictFormat?: boolean;
};

/**
 * Format validation result
 */
type FormatValidationResult = {
  isValid: boolean;
  detectedFormat: FormatType | null;
  issues: string[];
  structureAnalysis?: object;
};

/**
 * Scorer metadata for format
 */
const FORMAT_METADATA: ScorerMetadata = {
  id: "format",
  name: "Format Validator",
  description:
    "Evaluates response format compliance (JSON, markdown, code, lists, etc.)",
  type: "rule",
  category: "quality",
  version: "1.0.0",
  defaultConfig: {
    ...DEFAULT_RULE_SCORER_CONFIG,
    threshold: 0.8,
  },
  requiredInputs: ["response"],
  optionalInputs: ["custom"],
};

/**
 * FormatScorer evaluates response format against expected formats
 */
export class FormatScorer extends BaseRuleScorer {
  private _formatConfig: FormatScorerConfig;

  constructor(config?: FormatScorerConfig) {
    super(FORMAT_METADATA, config);
    this._formatConfig = {
      expectedFormat: "plain",
      strictFormat: false,
      ...config,
    };
  }

  /**
   * Get format-specific configuration
   */
  get formatConfig(): FormatScorerConfig {
    return this._formatConfig;
  }

  /**
   * Get rules for this scorer
   */
  getRules(): ScorerRule[] {
    const rules: ScorerRule[] = [];
    const formats = this._formatConfig.allowedFormats ?? [
      this._formatConfig.expectedFormat ?? "plain",
    ];

    // Main format rule
    rules.push({
      id: "format-check",
      description: `Check format is one of: ${formats.join(", ")}`,
      type: "custom" as const,
      params: {
        formats,
        strict: this._formatConfig.strictFormat ?? false,
      },
      weight: 1.0,
    });

    // Add specific requirement rules based on format
    if (
      formats.includes("markdown") &&
      this._formatConfig.markdownRequirements
    ) {
      rules.push({
        id: "markdown-requirements",
        description: "Check markdown structure requirements",
        type: "custom" as const,
        params: {
          requirements: this._formatConfig.markdownRequirements,
        },
        weight: 0.5,
      });
    }

    if (
      (formats.includes("list") ||
        formats.includes("numbered-list") ||
        formats.includes("bullet-list")) &&
      this._formatConfig.listRequirements
    ) {
      rules.push({
        id: "list-requirements",
        description: "Check list structure requirements",
        type: "custom" as const,
        params: {
          requirements: this._formatConfig.listRequirements,
        },
        weight: 0.5,
      });
    }

    if (formats.includes("json") && this._formatConfig.jsonSchema) {
      rules.push({
        id: "json-schema",
        description: "Validate JSON against schema",
        type: "custom" as const,
        params: {
          schema: this._formatConfig
            .jsonSchema as import("../../../types/common.js").JsonObject,
        },
        weight: 0.5,
      });
    }

    return rules;
  }

  /**
   * Evaluate a single format rule
   */
  evaluateRule(
    rule: ScorerRule,
    input: ScorerInput,
  ): { passed: boolean; score: number } {
    switch (rule.id) {
      case "format-check": {
        const formats = rule.params.formats as FormatType[];
        const result = this._validateFormat(input.response, formats);
        return {
          passed: result.isValid,
          score: result.isValid ? 1.0 : 0.0,
        };
      }

      case "markdown-requirements": {
        const requirements = rule.params
          .requirements as FormatScorerConfig["markdownRequirements"];
        const result = this._checkMarkdownRequirements(
          input.response,
          requirements ?? {},
        );
        return result;
      }

      case "list-requirements": {
        const requirements = rule.params
          .requirements as FormatScorerConfig["listRequirements"];
        const result = this._checkListRequirements(
          input.response,
          requirements ?? {},
        );
        return result;
      }

      case "json-schema": {
        const schema = rule.params.schema as object;
        const result = this._validateJsonSchema(input.response, schema);
        return result;
      }

      default:
        return { passed: true, score: 1.0 };
    }
  }

  /**
   * Validate format against allowed formats
   */
  private _validateFormat(
    text: string,
    allowedFormats: FormatType[],
  ): FormatValidationResult {
    const issues: string[] = [];

    // Detect format
    const detectedFormat = this._detectFormat(text);

    // Check if detected format is allowed
    const isValid =
      allowedFormats.includes(detectedFormat) ||
      (detectedFormat === "plain" && allowedFormats.includes("plain"));

    if (!isValid) {
      issues.push(
        `Expected format(s): ${allowedFormats.join(", ")}, but detected: ${detectedFormat}`,
      );
    }

    return { isValid, detectedFormat, issues };
  }

  /**
   * Detect the format of the text
   */
  private _detectFormat(text: string): FormatType {
    const trimmed = text.trim();

    // Check JSON
    if (this._isValidJson(trimmed)) {
      return "json";
    }

    // Check YAML (basic detection)
    if (this._isYaml(trimmed)) {
      return "yaml";
    }

    // Check XML/HTML
    if (this._isXml(trimmed)) {
      return trimmed.toLowerCase().includes("<!doctype html") ||
        trimmed.includes("<html")
        ? "html"
        : "xml";
    }

    // Check code blocks
    if (this._hasCodeBlocks(trimmed)) {
      return "code";
    }

    // Check markdown elements
    if (this._hasMarkdownElements(trimmed)) {
      return "markdown";
    }

    // Check lists
    if (this._isNumberedList(trimmed)) {
      return "numbered-list";
    }

    if (this._isBulletList(trimmed)) {
      return "bullet-list";
    }

    // Check tables (markdown style)
    if (this._hasTable(trimmed)) {
      return "table";
    }

    return "plain";
  }

  /**
   * Check if text is valid JSON
   */
  private _isValidJson(text: string): boolean {
    try {
      const parsed = JSON.parse(text);
      return typeof parsed === "object" && parsed !== null;
    } catch {
      return false;
    }
  }

  /**
   * Check if text appears to be YAML
   */
  private _isYaml(text: string): boolean {
    // Basic YAML detection: key: value patterns
    const lines = text.split("\n");
    let yamlPatternCount = 0;

    for (const line of lines) {
      // Skip empty lines and comments
      if (line.trim() === "" || line.trim().startsWith("#")) {
        continue;
      }

      // Check for key: value pattern (but not URLs)
      if (/^[\s-]*[\w_]+:\s*.+/.test(line) && !line.includes("://")) {
        yamlPatternCount++;
      }
    }

    return yamlPatternCount >= 2;
  }

  /**
   * Check if text is XML
   */
  private _isXml(text: string): boolean {
    return (
      (text.startsWith("<?xml") || text.startsWith("<")) &&
      text.endsWith(">") &&
      /<\/?[a-zA-Z][a-zA-Z0-9]*[^>]{0,1000}>/.test(text.slice(0, 10000))
    );
  }

  /**
   * Check if text has code blocks
   */
  private _hasCodeBlocks(text: string): boolean {
    return /```[\s\S]{0,10000}?```/.test(text) || /`[^`]{1,1000}`/.test(text);
  }

  /**
   * Check if text has markdown elements
   */
  private _hasMarkdownElements(text: string): boolean {
    // Check for headings, bold, italic, links, etc.
    const markdownPatterns = [
      /^#{1,6}\s+.+/m, // Headings
      /\*\*[^*]+\*\*/, // Bold
      /\*[^*]+\*/, // Italic
      /__[^_]+__/, // Bold (underscore)
      /_[^_]+_/, // Italic (underscore)
      /\[[^\]]{1,500}\]\([^)]{1,2000}\)/, // Links (bounded)
      /!\[[^\]]{0,500}\]\([^)]{1,2000}\)/, // Images (bounded)
      /^>\s+.+/m, // Blockquotes
      /^-{3,}$/m, // Horizontal rule
      /^\*{3,}$/m, // Horizontal rule
    ];

    return markdownPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Check if text is a numbered list
   */
  private _isNumberedList(text: string): boolean {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const numberedLines = lines.filter((l) => /^\d+[.)]\s+/.test(l));
    return (
      numberedLines.length >= 2 && numberedLines.length / lines.length > 0.5
    );
  }

  /**
   * Check if text is a bullet list
   */
  private _isBulletList(text: string): boolean {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const bulletLines = lines.filter((l) => /^[-*+]\s+/.test(l));
    return bulletLines.length >= 2 && bulletLines.length / lines.length > 0.5;
  }

  /**
   * Check if text has a table
   */
  private _hasTable(text: string): boolean {
    // Markdown table pattern: | header | header |
    return /\|.+\|/.test(text) && /\|[-:]+\|/.test(text);
  }

  /**
   * Check markdown-specific requirements
   */
  private _checkMarkdownRequirements(
    text: string,
    requirements: NonNullable<FormatScorerConfig["markdownRequirements"]>,
  ): { passed: boolean; score: number } {
    let totalChecks = 0;
    let passedChecks = 0;

    if (requirements.hasHeadings !== undefined) {
      totalChecks++;
      if (/^#{1,6}\s+.+/m.test(text) === requirements.hasHeadings) {
        passedChecks++;
      }
    }

    if (requirements.hasCodeBlocks !== undefined) {
      totalChecks++;
      if (this._hasCodeBlocks(text) === requirements.hasCodeBlocks) {
        passedChecks++;
      }
    }

    if (requirements.hasLinks !== undefined) {
      totalChecks++;
      if (
        /\[[^\]]{1,500}\]\([^)]{1,2000}\)/.test(text) === requirements.hasLinks
      ) {
        passedChecks++;
      }
    }

    if (requirements.hasLists !== undefined) {
      totalChecks++;
      const hasList = this._isNumberedList(text) || this._isBulletList(text);
      if (hasList === requirements.hasLists) {
        passedChecks++;
      }
    }

    if (
      requirements.minHeadingLevel !== undefined ||
      requirements.maxHeadingLevel !== undefined
    ) {
      totalChecks++;
      const headingMatches = text.match(/^(#{1,6})\s+/gm);
      if (headingMatches) {
        const levels = headingMatches.map((m) => m.trim().indexOf(" "));
        const minLevel = Math.min(...levels);
        const maxLevel = Math.max(...levels);

        const minOk =
          requirements.minHeadingLevel === undefined ||
          minLevel >= requirements.minHeadingLevel;
        const maxOk =
          requirements.maxHeadingLevel === undefined ||
          maxLevel <= requirements.maxHeadingLevel;

        if (minOk && maxOk) {
          passedChecks++;
        }
      }
    }

    if (totalChecks === 0) {
      return { passed: true, score: 1.0 };
    }

    const score = passedChecks / totalChecks;
    return { passed: score >= 0.8, score };
  }

  /**
   * Check list-specific requirements
   */
  private _checkListRequirements(
    text: string,
    requirements: NonNullable<FormatScorerConfig["listRequirements"]>,
  ): { passed: boolean; score: number } {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const listItems = lines.filter((l) => /^(\d+[.)]\s+|[-*+]\s+)/.test(l));

    let totalChecks = 0;
    let passedChecks = 0;

    if (requirements.minItems !== undefined) {
      totalChecks++;
      if (listItems.length >= requirements.minItems) {
        passedChecks++;
      }
    }

    if (requirements.maxItems !== undefined) {
      totalChecks++;
      if (listItems.length <= requirements.maxItems) {
        passedChecks++;
      }
    }

    if (requirements.itemPattern !== undefined) {
      totalChecks++;
      if (requirements.itemPattern.length > 100) {
        logger.warn("[FormatScorer] itemPattern too long, using default");
      } else if (
        /(\+|\*|\?)\s*\).*?(\+|\*|\?)/.test(requirements.itemPattern) ||
        /\(\?.*?\)\s*(\+|\*|\{)/.test(requirements.itemPattern)
      ) {
        // Detect nested quantifiers that can cause catastrophic backtracking
        logger.warn(
          "[FormatScorer] itemPattern contains potentially unsafe nested quantifiers",
        );
      } else {
        try {
          const pattern = new RegExp(requirements.itemPattern);
          const matchingItems = listItems.filter((item) => pattern.test(item));
          if (matchingItems.length === listItems.length) {
            passedChecks++;
          }
        } catch {
          logger.warn("[FormatScorer] Invalid itemPattern, using default");
        }
      }
    }

    if (totalChecks === 0) {
      return { passed: true, score: 1.0 };
    }

    const score = passedChecks / totalChecks;
    return { passed: score >= 0.8, score };
  }

  /**
   * Validate JSON against schema (basic validation)
   */
  private _validateJsonSchema(
    text: string,
    _schema: object,
  ): { passed: boolean; score: number } {
    // First check if it's valid JSON
    try {
      JSON.parse(text);
      // TODO: Implement full JSON Schema validation
      // For now, just check it's valid JSON
      return { passed: true, score: 1.0 };
    } catch {
      return { passed: false, score: 0.0 };
    }
  }

  /**
   * Override score to add detailed format analysis
   */
  async score(input: ScorerInput): Promise<ScoreResult> {
    const result = await super.score(input);
    const detectedFormat = this._detectFormat(input.response);

    return {
      ...result,
      metadata: {
        ...result.metadata,
        detectedFormat,
        expectedFormat: this._formatConfig.expectedFormat ?? "plain",
        allowedFormats: this._formatConfig.allowedFormats ?? [],
        strictFormat: this._formatConfig.strictFormat ?? false,
      },
    };
  }
}

/**
 * Factory function for creating FormatScorer instances
 */
export async function createFormatScorer(
  config?: FormatScorerConfig,
): Promise<FormatScorer> {
  return new FormatScorer(config);
}

/**
 * Pre-configured format scorer presets
 */
export const FormatScorerPresets = {
  /** JSON format */
  json: (): FormatScorer =>
    new FormatScorer({
      expectedFormat: "json",
      strictFormat: true,
    }),

  /** Markdown format */
  markdown: (): FormatScorer =>
    new FormatScorer({
      expectedFormat: "markdown",
    }),

  /** Markdown with headings required */
  markdownWithHeadings: (): FormatScorer =>
    new FormatScorer({
      expectedFormat: "markdown",
      markdownRequirements: {
        hasHeadings: true,
        minHeadingLevel: 1,
        maxHeadingLevel: 3,
      },
    }),

  /** Bullet list format */
  bulletList: (): FormatScorer =>
    new FormatScorer({
      expectedFormat: "bullet-list",
    }),

  /** Numbered list format */
  numberedList: (): FormatScorer =>
    new FormatScorer({
      expectedFormat: "numbered-list",
    }),

  /** Code response */
  code: (): FormatScorer =>
    new FormatScorer({
      expectedFormat: "code",
    }),

  /** Plain text only */
  plainText: (): FormatScorer =>
    new FormatScorer({
      expectedFormat: "plain",
      strictFormat: true,
    }),
} as const;
