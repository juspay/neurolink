/**
 * FlexibleToolValidator - Universal Safety Checks Only
 *
 * Following Anthropic's MCP specification which intentionally leaves tool naming flexible,
 * this validator only blocks truly dangerous cases to support maximum MCP tool compatibility.
 *
 * Phase 1 Implementation:
 * - Universal safety checks only (empty names, control characters, excessive length)
 * - No context-specific validation or arbitrary pattern restrictions
 * - Designed to support ALL legitimate MCP tools (github.create_repo, filesystem.read_file, etc.)
 */

import { registryLogger } from "../utils/logger.js";
import type { FlexibleValidationResult } from "../types/mcpTypes.js";

export class FlexibleToolValidator {
  // Universal safety limits (generous to support all legitimate tools)
  private static readonly MAX_TOOL_NAME_LENGTH = 1000; // Much more generous than npm's 214
  private static readonly MIN_TOOL_NAME_LENGTH = 1;

  /**
   * Validate tool name with universal safety checks only
   *
   * This method only blocks truly dangerous cases:
   * 1. Empty or whitespace-only names
   * 2. Control characters that could break systems
   * 3. Excessively long names that could cause memory issues
   *
   * Everything else is allowed to support maximum MCP tool compatibility.
   */
  static validateToolName(toolId: string): FlexibleValidationResult {
    const warnings: string[] = [];

    // Safety Check 1: Empty or whitespace-only names
    if (!toolId || typeof toolId !== "string") {
      return {
        isValid: false,
        error: "Tool name is required and must be a string",
      };
    }

    // Safety Check 2: Control characters that could break systems (check BEFORE trimming!)
    // Only block truly dangerous control characters, not printable characters
    //
    // This regex blocks dangerous C0 control characters and DEL:
    // - \x00-\x08: NULL, SOH, STX, ETX, EOT, ENQ, ACK, BEL, BS
    // - \x0B: Vertical Tab (VT)
    // - \x0C: Form Feed (FF)
    // - \x0E-\x1F: SO, SI, DLE, DC1-4, NAK, SYN, ETB, CAN, EM, SUB, ESC, FS-US
    // - \x7F: DEL
    //
    // Explicitly ALLOWS these printable control characters:
    // - \x09: TAB (horizontal tab) - commonly used in text
    // - \x0A: LF (line feed) - commonly used in text
    // - \x0D: CR (carriage return) - commonly used in text
    // eslint-disable-next-line no-control-regex
    const hasControlCharacters = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(
      toolId,
    );
    if (hasControlCharacters) {
      return {
        isValid: false,
        error: "Tool name contains control characters that could break systems",
      };
    }

    const trimmedName = toolId.trim();
    if (trimmedName.length === 0) {
      return {
        isValid: false,
        error: "Tool name cannot be empty or whitespace-only",
      };
    }

    // Safety Check 3: Length limits (very generous)
    if (trimmedName.length < this.MIN_TOOL_NAME_LENGTH) {
      return {
        isValid: false,
        error: `Tool name must be at least ${this.MIN_TOOL_NAME_LENGTH} character long`,
      };
    }

    if (trimmedName.length > this.MAX_TOOL_NAME_LENGTH) {
      return {
        isValid: false,
        error: `Tool name exceeds maximum length of ${this.MAX_TOOL_NAME_LENGTH} characters`,
      };
    }

    // Optional warnings for unusual but not dangerous patterns
    if (trimmedName !== toolId) {
      warnings.push(
        "Tool name has leading/trailing whitespace (will be trimmed)",
      );
    }

    if (trimmedName.length > 200) {
      warnings.push("Tool name is unusually long but allowed");
    }

    registryLogger.debug(
      `✅ FlexibleToolValidator: Tool '${toolId}' passed universal safety checks`,
    );

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate tool information with minimal safety checks
   */
  static validateToolInfo(
    toolId: string,
    toolInfo: { description?: string; serverId?: string },
  ): FlexibleValidationResult {
    // First validate the tool name
    const nameValidation = this.validateToolName(toolId);
    if (!nameValidation.isValid) {
      return nameValidation;
    }

    const warnings = [...(nameValidation.warnings || [])];

    // Minimal safety checks for tool info
    if (toolInfo.description && typeof toolInfo.description !== "string") {
      return {
        isValid: false,
        error: "Tool description must be a string if provided",
      };
    }

    if (toolInfo.serverId && typeof toolInfo.serverId !== "string") {
      return {
        isValid: false,
        error: "Tool serverId must be a string if provided",
      };
    }

    registryLogger.debug(
      `✅ FlexibleToolValidator: Tool info for '${toolId}' passed validation`,
    );

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Get information about what this validator checks
   */
  static getValidationInfo(): {
    philosophy: string;
    checks: string[];
    whatIsAllowed: string[];
    examples: {
      valid: string[];
      invalid: string[];
    };
  } {
    return {
      philosophy:
        "Maximum flexibility with universal safety only - following Anthropic's MCP specification",
      checks: [
        "Empty or whitespace-only names",
        "Excessive length (over 1000 characters)",
        "Control characters that could break systems",
      ],
      whatIsAllowed: [
        "Dots (github.create_repo, filesystem.read_file)",
        "Hyphens and underscores (my-tool, user_helper)",
        "Numbers (tool1, my_tool_v2)",
        "Unicode characters (🚀_tool, café_manager)",
        "Mixed case (createRepo, ReadFile)",
        "Long descriptive names (enterprise_database_connection_manager)",
        "Any legitimate MCP tool naming pattern",
      ],
      examples: {
        valid: [
          "github.create_repo",
          "filesystem.read_file",
          "my-custom-tool",
          "user_helper",
          "tool1",
          "🚀_rocket_tool",
          "enterprise.database.connection.manager",
          "UPPERCASE_TOOL",
          "mixed_Case.Tool-Name_123",
        ],
        invalid: [
          "", // Empty
          "   ", // Whitespace only
          "tool\x00", // Control character
          "a".repeat(1001), // Too long
        ],
      },
    };
  }
}
