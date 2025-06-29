/**
 * Tool Schema Validation and Safety System
 * Based on VS Code and GitHub MCP server patterns
 */

import { MCPTool, MCPToolResult } from './types/mcp-protocol.js';
import { mcpLogger } from './logging.js';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ToolSafetyClassification {
  destructive: boolean;
  requiresConfirmation: boolean;
  sensitiveData: boolean;
  networkAccess: boolean;
  fileSystemAccess: boolean;
  category: 'safe' | 'moderate' | 'dangerous';
}

export interface ToolExecutionContext {
  userId?: string;
  sessionId?: string;
  permissions?: string[];
  confirmationRequired?: boolean;
  dryRun?: boolean;
}

export class ToolValidator {
  private destructivePatterns: RegExp[] = [
    /\bdelete\b|\bremove\b|\brm\b|\bdestroy\b/i,
    /\bdrop\b|\btruncate\b|\bclear\b/i,
    /\bformat\b|\bwipe\b|\berase\b/i,
    /\bkill\b|\bterminate\b|\bstop\b/i
  ];

  // Safe analysis patterns that should never be flagged as destructive
  private safeAnalysisPatterns: RegExp[] = [
    /sequential[_-]?thinking/i,
    /\bthink\b|\banalyz/i,
    /\bplan\b|\bstrateg/i,
    /\breason\b|\bbrainstorm/i,
    /\bcalculat\b|\bcompute/i,
    /\bsearch\b|\bfind\b/i,
    /\bread\b|\bview\b|\blist\b/i
  ];

  private sensitivePatterns: RegExp[] = [
    /password|secret|key|token/i,
    /credential|auth|login/i,
    /private|confidential/i,
    /api[_-]?key|access[_-]?token/i
  ];

  private networkPatterns: RegExp[] = [
    /http|https|ftp|ssh/i,
    /request|fetch|download|upload/i,
    /api|endpoint|webhook/i,
    /socket|connection/i
  ];

  private fileSystemPatterns: RegExp[] = [
    /file|directory|folder/i,
    /read|write|create|mkdir/i,
    /path|filesystem|disk/i,
    /copy|move|rename/i
  ];

  /**
   * Validate tool schema and structure
   */
  validateToolSchema(tool: MCPTool): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic required fields
    if (!tool.name) {
      errors.push({
        field: 'name',
        message: 'Tool name is required',
        severity: 'error',
        suggestion: 'Provide a descriptive name for the tool'
      });
    }

    if (!tool.description) {
      errors.push({
        field: 'description',
        message: 'Tool description is required',
        severity: 'error',
        suggestion: 'Provide a clear description of what the tool does'
      });
    }

    // Validate name format
    if (tool.name && !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(tool.name)) {
      errors.push({
        field: 'name',
        message: 'Tool name must start with a letter and contain only letters, numbers, underscores, and hyphens',
        severity: 'error',
        suggestion: 'Use a valid identifier format like "my_tool" or "myTool"'
      });
    }

    // Validate input schema
    if (tool.inputSchema) {
      const schemaValidation = this.validateInputSchema(tool.inputSchema);
      errors.push(...schemaValidation.errors);
      warnings.push(...schemaValidation.warnings);
    }

    // Check for overly broad permissions
    if (this.hasOverlyBroadPermissions(tool)) {
      warnings.push({
        field: 'permissions',
        message: 'Tool appears to request broad system access',
        suggestion: 'Consider limiting tool scope to specific operations'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate tool arguments against schema
   */
  validateToolArgs(tool: MCPTool, args: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!tool.inputSchema) {
      return { valid: true, errors, warnings };
    }

    const schema = tool.inputSchema;

    // Check required properties
    if (schema.required) {
      for (const requiredField of schema.required) {
        if (!(requiredField in args)) {
          errors.push({
            field: requiredField,
            message: `Required field '${requiredField}' is missing`,
            severity: 'error',
            suggestion: `Provide a value for '${requiredField}'`
          });
        }
      }
    }

    // Validate property types and constraints
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propName in args) {
          const propValidation = this.validateProperty(propName, args[propName], propSchema as any);
          errors.push(...propValidation.errors);
          warnings.push(...propValidation.warnings);
        }
      }
    }

    // Check for unexpected properties
    if (schema.additionalProperties === false) {
      const allowedProps = new Set(Object.keys(schema.properties || {}));
      for (const argKey of Object.keys(args)) {
        if (!allowedProps.has(argKey)) {
          warnings.push({
            field: argKey,
            message: `Unexpected property '${argKey}'`,
            suggestion: 'Remove unexpected properties or update tool schema'
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Classify tool safety level
   */
  classifyToolSafety(tool: MCPTool): ToolSafetyClassification {
    const toolText = `${tool.name} ${tool.description}`.toLowerCase();
    
    // First check if this is a safe analysis tool
    const isSafeAnalysis = this.safeAnalysisPatterns.some(pattern => pattern.test(toolText));
    
    const destructive = !isSafeAnalysis && this.destructivePatterns.some(pattern => pattern.test(toolText));
    const sensitiveData = this.sensitivePatterns.some(pattern => pattern.test(toolText));
    const networkAccess = this.networkPatterns.some(pattern => pattern.test(toolText));
    const fileSystemAccess = this.fileSystemPatterns.some(pattern => pattern.test(toolText));

    let category: 'safe' | 'moderate' | 'dangerous' = 'safe';
    let requiresConfirmation = false;

    // Analysis and thinking tools are always safe
    if (isSafeAnalysis) {
      category = 'safe';
      requiresConfirmation = false;
    } else if (destructive) {
      category = 'dangerous';
      requiresConfirmation = true;
    } else if (sensitiveData || fileSystemAccess) {
      category = 'moderate';
      requiresConfirmation = true;
    } else if (networkAccess) {
      category = 'moderate';
    }

    return {
      destructive,
      requiresConfirmation,
      sensitiveData,
      networkAccess,
      fileSystemAccess,
      category
    };
  }

  /**
   * Check if tool execution should be allowed
   */
  shouldAllowExecution(
    tool: MCPTool, 
    args: any, 
    context: ToolExecutionContext
  ): { allowed: boolean; reason?: string; requiresConfirmation?: boolean } {
    const safety = this.classifyToolSafety(tool);
    const validation = this.validateToolArgs(tool, args);

    // Block if validation failed
    if (!validation.valid) {
      return {
        allowed: false,
        reason: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      };
    }

    // Check for dangerous operations
    if (safety.category === 'dangerous' && !context.confirmationRequired) {
      return {
        allowed: false,
        reason: 'Destructive operation requires explicit confirmation',
        requiresConfirmation: true
      };
    }

    // Check permissions
    if (context.permissions && safety.sensitiveData) {
      const hasDataPermission = context.permissions.includes('sensitive-data');
      if (!hasDataPermission) {
        return {
          allowed: false,
          reason: 'Tool requires sensitive data permission'
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Sanitize tool result for safe display
   */
  sanitizeToolResult(result: MCPToolResult, tool: MCPTool): MCPToolResult {
    if (!result || typeof result !== 'object') {
      return result;
    }

    const safety = this.classifyToolSafety(tool);
    const sanitized = JSON.parse(JSON.stringify(result));

    if (safety.sensitiveData) {
      this.redactSensitiveData(sanitized);
    }

    return sanitized;
  }

  /**
   * Generate suggestions for fixing validation errors
   */
  generateFixSuggestions(errors: ValidationError[]): string[] {
    return errors
      .filter(error => error.suggestion)
      .map(error => `${error.field}: ${error.suggestion}`);
  }

  // Private helper methods

  private validateInputSchema(schema: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!schema.type) {
      errors.push({
        field: 'inputSchema.type',
        message: 'Schema type is required',
        severity: 'error',
        suggestion: 'Specify "object" for structured inputs'
      });
    }

    if (schema.type === 'object' && !schema.properties) {
      warnings.push({
        field: 'inputSchema.properties',
        message: 'Object schema should define properties',
        suggestion: 'Add properties definition for better validation'
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private validateProperty(name: string, value: any, schema: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Type validation
    if (schema.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      
      // Special case: allow numbers for integer type (JSON Schema compatibility)
      if (schema.type === 'integer' && actualType === 'number' && Number.isInteger(value)) {
        // This is valid - JSON doesn't distinguish between integer and number
      } else if (actualType !== schema.type) {
        errors.push({
          field: name,
          message: `Expected ${schema.type}, got ${actualType}`,
          severity: 'error',
          suggestion: `Convert value to ${schema.type}`
        });
      }
    }

    // String length validation
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength && value.length < schema.minLength) {
        errors.push({
          field: name,
          message: `String too short (minimum ${schema.minLength} characters)`,
          severity: 'error'
        });
      }
      if (schema.maxLength && value.length > schema.maxLength) {
        errors.push({
          field: name,
          message: `String too long (maximum ${schema.maxLength} characters)`,
          severity: 'error'
        });
      }
    }

    // Number range validation (also accept integers for number type)
    if ((schema.type === 'number' || schema.type === 'integer') && typeof value === 'number') {
      // For integer type, check if it's actually an integer
      if (schema.type === 'integer' && !Number.isInteger(value)) {
        errors.push({
          field: name,
          message: `Expected integer, got number with decimal places`,
          severity: 'error'
        });
      }
      
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push({
          field: name,
          message: `Value below minimum (${schema.minimum})`,
          severity: 'error'
        });
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push({
          field: name,
          message: `Value above maximum (${schema.maximum})`,
          severity: 'error'
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private hasOverlyBroadPermissions(tool: MCPTool): boolean {
    const broadPatterns = [
      /.*\*.*/, // Wildcard patterns
      /all|everything|any/i,
      /root|admin|system/i
    ];

    const toolText = `${tool.name} ${tool.description}`;
    return broadPatterns.some(pattern => pattern.test(toolText));
  }

  private redactSensitiveData(obj: any): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'credential', 'auth'];
    
    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      
      if (sensitiveKeys.some(sensitive => keyLower.includes(sensitive))) {
        obj[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        this.redactSensitiveData(value);
      }
    }
  }
}

// Export singleton instance
export const toolValidator = new ToolValidator();

// Convenience functions
export function validateTool(tool: MCPTool): ValidationResult {
  return toolValidator.validateToolSchema(tool);
}

export function validateArgs(tool: MCPTool, args: any): ValidationResult {
  return toolValidator.validateToolArgs(tool, args);
}

export function classifyTool(tool: MCPTool): ToolSafetyClassification {
  return toolValidator.classifyToolSafety(tool);
}

export function canExecuteTool(
  tool: MCPTool, 
  args: any, 
  context: ToolExecutionContext = {}
): { allowed: boolean; reason?: string; requiresConfirmation?: boolean } {
  return toolValidator.shouldAllowExecution(tool, args, context);
}