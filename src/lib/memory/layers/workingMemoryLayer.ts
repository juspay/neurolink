/**
 * Working Memory Layer
 *
 * Provides persistent structured storage for user profiles,
 * preferences, and other continuously relevant information.
 *
 * Supports two formats:
 * - Template-based (Markdown): Free-form text with replace semantics
 * - Schema-based (Zod/JSON Schema): Structured JSON with merge semantics
 *
 * @module memory/layers/workingMemoryLayer
 * @since 9.0.0
 */

import type { z } from "zod";
import type {
  MemoryContext,
  WorkingMemoryConfig,
  WorkingMemoryStorage,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

import type { MemoryJSONSchema7 } from "../../types/index.js";

/**
 * Default template for working memory
 */
const DEFAULT_TEMPLATE = `# User Profile
- Name: [Unknown]
- Preferences: [None recorded]
- Goals: [None stated]
- Important Context: [None]

# Conversation Notes
- Key Topics: [None]
- Decisions Made: [None]
- Follow-up Items: [None]`;

/**
 * Default update instructions
 */
const DEFAULT_UPDATE_INSTRUCTIONS = `When you learn new information about the user (name, preferences, goals, etc.),
use the updateWorkingMemory tool to save it. This helps maintain context across conversations.
Only update when you learn something meaningful that should persist.`;

/**
 * Working Memory Layer
 *
 * Provides persistent structured storage for user profiles,
 * preferences, and other continuously relevant information.
 */
export class WorkingMemoryLayer {
  private storage: WorkingMemoryStorage;
  private config: Required<Omit<WorkingMemoryConfig, "schema">> & {
    schema?: z.ZodObject<z.ZodRawShape>;
  };
  private mode: "template" | "schema";
  private zodSchema?: z.ZodObject<z.ZodRawShape>;

  constructor(storage: WorkingMemoryStorage, config: WorkingMemoryConfig) {
    this.storage = storage;
    this.config = this.normalizeConfig(config);

    // Determine mode
    if (config.schema && this.isZodSchema(config.schema)) {
      this.mode = "schema";
      this.zodSchema = config.schema;
    } else {
      this.mode = "template";
    }
  }

  /**
   * Normalize configuration with defaults
   */
  private normalizeConfig(config: WorkingMemoryConfig) {
    return {
      enabled: config.enabled ?? true,
      scope: config.scope ?? "resource",
      template: config.template ?? DEFAULT_TEMPLATE,
      schema: config.schema,
      maxTokens: config.maxTokens ?? 2000,
      updateInstructions:
        config.updateInstructions ?? DEFAULT_UPDATE_INSTRUCTIONS,
    };
  }

  /**
   * Check if the schema is a Zod schema
   */
  private isZodSchema(schema: unknown): schema is z.ZodObject<z.ZodRawShape> {
    return (
      typeof schema === "object" &&
      schema !== null &&
      "_def" in schema &&
      typeof (schema as { _def: unknown })._def === "object"
    );
  }

  /**
   * Retrieve working memory for a context
   */
  async retrieve(
    context: MemoryContext,
  ): Promise<string | Record<string, unknown> | null> {
    if (!this.config.enabled) {
      return null;
    }

    const startTime = Date.now();

    try {
      const data = await this.storage.get(
        context.resourceId || "default",
        this.config.scope === "thread" ? context.threadId : undefined,
      );

      if (!data) {
        // Return initial template/schema if no data exists
        return this.mode === "template"
          ? this.config.template
          : this.getEmptySchemaValue();
      }

      logger.debug("[WorkingMemoryLayer] Retrieved working memory", {
        resourceId: context.resourceId,
        threadId: context.threadId,
        scope: this.config.scope,
        mode: this.mode,
        durationMs: Date.now() - startTime,
      });

      return data;
    } catch (error) {
      logger.error("[WorkingMemoryLayer] Failed to retrieve working memory", {
        resourceId: context.resourceId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Update working memory
   *
   * Template mode: Replace semantics (full content replacement)
   * Schema mode: Merge semantics (deep merge with existing data)
   */
  async update(
    context: MemoryContext,
    data: string | Record<string, unknown>,
    reason?: string,
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      let finalData: string | Record<string, unknown>;

      if (this.mode === "schema" && typeof data === "object") {
        // Schema mode: Merge with existing data
        const existing = await this.retrieve(context);
        if (existing && typeof existing === "object") {
          finalData = this.deepMerge(existing as Record<string, unknown>, data);
        } else {
          finalData = data;
        }

        // Validate against schema
        if (this.zodSchema) {
          this.zodSchema.parse(finalData);
        }
      } else {
        // Template mode: Replace semantics
        finalData = data;
      }

      await this.storage.set(
        context.resourceId || "default",
        this.config.scope === "thread" ? context.threadId : undefined,
        finalData,
      );

      logger.info("[WorkingMemoryLayer] Updated working memory", {
        resourceId: context.resourceId,
        threadId: context.threadId,
        mode: this.mode,
        reason,
      });
    } catch (error) {
      logger.error("[WorkingMemoryLayer] Failed to update working memory", {
        resourceId: context.resourceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Clear working memory for a context
   */
  async clear(context: MemoryContext): Promise<void> {
    await this.storage.delete(
      context.resourceId || "default",
      this.config.scope === "thread" ? context.threadId : undefined,
    );

    logger.debug("[WorkingMemoryLayer] Cleared working memory", {
      resourceId: context.resourceId,
      scope: this.config.scope,
    });
  }

  /**
   * Get the update instructions for the agent
   */
  getUpdateInstructions(): string {
    return this.config.updateInstructions;
  }

  /**
   * Get the schema/template definition for the agent
   */
  getDefinition(): {
    mode: "template" | "schema";
    definition: string | MemoryJSONSchema7;
  } {
    if (this.mode === "schema" && this.zodSchema) {
      // Convert Zod schema to JSON Schema for the agent
      return {
        mode: "schema",
        definition: this.zodToJsonSchema(this.zodSchema),
      };
    }

    return { mode: "template", definition: this.config.template };
  }

  /**
   * Format working memory for inclusion in system prompt
   */
  formatForPrompt(data: string | Record<string, unknown> | null): string {
    if (!data) {
      return "";
    }

    if (typeof data === "string") {
      return `\n\n## Working Memory\n${data}`;
    }

    return `\n\n## Working Memory\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  }

  /**
   * Get the current mode
   */
  getMode(): "template" | "schema" {
    return this.mode;
  }

  /**
   * Close the layer and release resources
   */
  async close(): Promise<void> {
    await this.storage.close();
    logger.debug("[WorkingMemoryLayer] Closed");
  }

  /**
   * Get empty schema value
   */
  private getEmptySchemaValue(): Record<string, unknown> {
    return {};
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): Record<string, unknown> {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      if (
        source[key] !== null &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key]) &&
        target[key] !== null &&
        typeof target[key] === "object" &&
        !Array.isArray(target[key])
      ) {
        result[key] = this.deepMerge(
          target[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>,
        );
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Convert Zod schema to JSON Schema
   */
  private zodToJsonSchema(
    schema: z.ZodObject<z.ZodRawShape>,
  ): MemoryJSONSchema7 {
    const shape = schema.shape;
    const properties: Record<string, MemoryJSONSchema7> = {};

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = this.zodFieldToJsonSchema(value as z.ZodTypeAny);
    }

    return {
      type: "object",
      properties,
    };
  }

  /**
   * Convert a Zod field to JSON Schema
   */
  private zodFieldToJsonSchema(field: z.ZodTypeAny): MemoryJSONSchema7 {
    const def = (
      field as unknown as {
        _def: {
          typeName: string;
          type?: z.ZodTypeAny;
          innerType?: z.ZodTypeAny;
        };
      }
    )._def;
    const typeName = def.typeName;

    switch (typeName) {
      case "ZodString":
        return { type: "string" };
      case "ZodNumber":
        return { type: "number" };
      case "ZodBoolean":
        return { type: "boolean" };
      case "ZodArray":
        return {
          type: "array",
          items: this.zodFieldToJsonSchema(def.type!),
        };
      case "ZodObject":
        return this.zodToJsonSchema(field as z.ZodObject<z.ZodRawShape>);
      case "ZodOptional":
        return this.zodFieldToJsonSchema(def.innerType!);
      default:
        return {};
    }
  }
}
