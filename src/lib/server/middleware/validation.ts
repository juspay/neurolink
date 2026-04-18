/**
 * Request Validation Middleware
 * Provides schema-based request validation for server adapters
 */

import type {
  ExtendedValidationSchema,
  MiddlewareDefinition,
  MiddlewareRequestSchema,
  PropertySchema,
  ValidationConfig,
} from "../../types/index.js";
import { ValidationError as ServerValidationError } from "../errors.js";

/**
 * Re-export ValidationError from errors for convenience
 */
export { ValidationError } from "../errors.js";

/**
 * Create request validation middleware
 *
 * @example
 * ```typescript
 * const validationMiddleware = createRequestValidationMiddleware({
 *   bodySchema: {
 *     required: ["input"],
 *     properties: {
 *       input: { type: "string", minimum: 1 },
 *       temperature: { type: "number", minimum: 0, maximum: 1 },
 *     },
 *   },
 * });
 *
 * server.registerMiddleware(validationMiddleware);
 * ```
 */
export function createRequestValidationMiddleware(
  config: ValidationConfig,
): MiddlewareDefinition {
  const {
    bodySchema,
    querySchema,
    paramsSchema,
    headersSchema,
    customValidator,
    skipPaths = [],
    errorFormatter = defaultErrorFormatter,
  } = config;

  return {
    name: "request-validation",
    order: 15, // Run after auth
    excludePaths: skipPaths,
    handler: async (ctx, next) => {
      const errors: Array<{ field: string; message: string }> = [];

      // Validate body
      if (bodySchema && ctx.body) {
        const bodyErrors = validateObject(
          ctx.body as Record<string, unknown>,
          bodySchema,
          "body",
        );
        errors.push(...bodyErrors);
      }

      // Validate query
      if (querySchema) {
        const queryErrors = validateObject(ctx.query, querySchema, "query");
        errors.push(...queryErrors);
      }

      // Validate params
      if (paramsSchema) {
        const paramsErrors = validateObject(ctx.params, paramsSchema, "params");
        errors.push(...paramsErrors);
      }

      // Validate headers
      if (headersSchema) {
        const headerErrors = validateObject(
          ctx.headers,
          headersSchema,
          "headers",
        );
        errors.push(...headerErrors);
      }

      // Run custom validator
      if (customValidator) {
        try {
          await customValidator(ctx);
        } catch (error) {
          if (error instanceof ServerValidationError) {
            errors.push(...error.errors);
          } else {
            errors.push({
              field: "custom",
              message: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      // If there are errors, throw
      if (errors.length > 0) {
        const formattedError = errorFormatter(
          errors.map((e) => new ServerValidationError([e], ctx.requestId)),
        );
        const error = new ServerValidationError(errors, ctx.requestId);
        // Attach formatted response to error
        (error as unknown as { response: unknown }).response = formattedError;
        throw error;
      }

      return next();
    },
  };
}

/**
 * Validate an object against a schema
 */
function validateObject(
  obj: Record<string, unknown>,
  schema: MiddlewareRequestSchema,
  prefix: string,
): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
        errors.push({
          field: `${prefix}.${field}`,
          message: `${field} is required`,
        });
      }
    }
  }

  // Check additional properties
  if (schema.additionalProperties === false && schema.properties) {
    const allowedKeys = new Set(Object.keys(schema.properties));
    for (const key of Object.keys(obj)) {
      if (!allowedKeys.has(key)) {
        errors.push({
          field: `${prefix}.${key}`,
          message: `Unknown property: ${key}`,
        });
      }
    }
  }

  // Validate properties
  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const value = obj[key];

      // Skip undefined values (handled by required check)
      if (value === undefined) {
        continue;
      }

      const propErrors = validateProperty(
        value,
        propSchema,
        `${prefix}.${key}`,
      );
      errors.push(...propErrors);
    }
  }

  return errors;
}

/**
 * Validate a single property
 */
function validateProperty(
  value: unknown,
  schema: PropertySchema,
  fieldPath: string,
): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];

  // Type validation
  const actualType = getType(value);
  if (actualType !== schema.type) {
    errors.push({
      field: fieldPath,
      message: `Expected ${schema.type}, got ${actualType}`,
    });
    return errors; // Stop further validation if type is wrong
  }

  // Minimum/maximum validation
  if (schema.type === "number" && typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({
        field: fieldPath,
        message: `Value must be at least ${schema.minimum}`,
      });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({
        field: fieldPath,
        message: `Value must be at most ${schema.maximum}`,
      });
    }
  }

  if (schema.type === "string" && typeof value === "string") {
    // Support both minimum/maximum and minLength/maxLength
    const minLen = schema.minLength ?? schema.minimum;
    const maxLen = schema.maxLength ?? schema.maximum;

    if (minLen !== undefined && value.length < minLen) {
      errors.push({
        field: fieldPath,
        message: `String must be at least ${minLen} characters`,
      });
    }
    if (maxLen !== undefined && value.length > maxLen) {
      errors.push({
        field: fieldPath,
        message: `String must be at most ${maxLen} characters`,
      });
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push({
        field: fieldPath,
        message: `String does not match pattern: ${schema.pattern}`,
      });
    }
  }

  if (schema.type === "array" && Array.isArray(value)) {
    // Support both minimum/maximum and minItems/maxItems
    const minItems = schema.minItems ?? schema.minimum;
    const maxItems = schema.maxItems ?? schema.maximum;

    if (minItems !== undefined && value.length < minItems) {
      errors.push({
        field: fieldPath,
        message: `Array must have at least ${minItems} items`,
      });
    }
    if (maxItems !== undefined && value.length > maxItems) {
      errors.push({
        field: fieldPath,
        message: `Array must have at most ${maxItems} items`,
      });
    }
  }

  // Enum validation
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push({
      field: fieldPath,
      message: `Value must be one of: ${schema.enum.join(", ")}`,
    });
  }

  // Custom validation
  if (schema.validate) {
    const result = schema.validate(value);
    if (result !== true) {
      errors.push({
        field: fieldPath,
        message:
          typeof result === "string" ? result : "Custom validation failed",
      });
    }
  }

  return errors;
}

/**
 * Get the type of a value
 */
function getType(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
}

/**
 * Default error formatter
 */
function defaultErrorFormatter(errors: ServerValidationError[]): unknown {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: errors.flatMap((e) => e.errors),
    },
  };
}

/**
 * Create a field validator helper
 */
export function createFieldValidator(
  fieldName: string,
  rules: PropertySchema,
): (value: unknown) => void {
  return (value: unknown) => {
    const errors = validateProperty(value, rules, fieldName);
    if (errors.length > 0) {
      throw new ServerValidationError(errors);
    }
  };
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Create body-only validation middleware
 *
 * @example
 * ```typescript
 * const middleware = createBodyValidationMiddleware({
 *   required: ["input"],
 *   properties: {
 *     input: { type: "string" },
 *   },
 * });
 * ```
 */
export function createBodyValidationMiddleware(
  schema: MiddlewareRequestSchema,
): MiddlewareDefinition {
  return createRequestValidationMiddleware({ bodySchema: schema });
}

/**
 * Create query-only validation middleware
 *
 * @example
 * ```typescript
 * const middleware = createQueryValidationMiddleware({
 *   properties: {
 *     page: { type: "number", minimum: 1 },
 *     limit: { type: "number", minimum: 1, maximum: 100 },
 *   },
 * });
 * ```
 */
export function createQueryValidationMiddleware(
  schema: MiddlewareRequestSchema,
): MiddlewareDefinition {
  return createRequestValidationMiddleware({ querySchema: schema });
}

/**
 * Create a combined validation middleware with full config support
 * Alias for createRequestValidationMiddleware for compatibility
 */
export const createValidationMiddleware = createRequestValidationMiddleware;

// ============================================
// Common Schemas
// ============================================

/**
 * Common validation schemas for reuse
 */
export const CommonSchemas: Record<string, ExtendedValidationSchema> = {
  /**
   * UUID schema
   */
  uuid: {
    type: "string",
    format: "uuid",
  },

  /**
   * Email schema
   */
  email: {
    type: "string",
    format: "email",
  },

  /**
   * Pagination schema
   */
  pagination: {
    type: "object",
    properties: {
      page: {
        type: "number",
        minimum: 1,
      },
      limit: {
        type: "number",
        minimum: 1,
        maximum: 100,
      },
      offset: {
        type: "number",
        minimum: 0,
      },
    },
  },

  /**
   * Sorting schema
   */
  sorting: {
    type: "object",
    properties: {
      sortBy: {
        type: "string",
      },
      sortOrder: {
        type: "string",
        enum: ["asc", "desc"],
      },
    },
  },

  /**
   * ID path parameter schema
   */
  idParam: {
    type: "object",
    required: ["id"],
    properties: {
      id: {
        type: "string",
      },
    },
  },

  /**
   * Date range schema
   */
  dateRange: {
    type: "object",
    properties: {
      startDate: {
        type: "string",
        format: "date",
      },
      endDate: {
        type: "string",
        format: "date",
      },
    },
  },

  /**
   * Search query schema
   */
  search: {
    type: "object",
    properties: {
      q: {
        type: "string",
        minimum: 1,
        maximum: 255,
      },
      fields: {
        type: "array",
      },
    },
  },
};
