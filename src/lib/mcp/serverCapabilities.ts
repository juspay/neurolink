/**
 * MCP Server Capabilities - Resources and Prompts
 *
 * Extends MCP server functionality with resource and prompt handling
 * according to MCP specification. This module provides:
 * - Resource registration and management
 * - Prompt template registration and execution
 * - Resource subscription support
 *
 * @module mcp/serverCapabilities
 * @since 8.39.0
 */

import { EventEmitter } from "events";
import type { JsonObject, JsonValue } from "../types/common.js";
import { logger } from "../utils/logger.js";
import { ErrorFactory } from "../utils/errorHandling.js";
import { withTimeout } from "../utils/async/withTimeout.js";

/**
 * MCP Resource definition
 */
export type MCPResource = {
  /**
   * Unique resource URI
   */
  uri: string;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Resource description
   */
  description?: string;

  /**
   * MIME type of the resource content
   */
  mimeType?: string;

  /**
   * Resource size in bytes (if known)
   */
  size?: number;

  /**
   * Whether the resource content can change
   */
  dynamic?: boolean;

  /**
   * Resource annotations/metadata
   */
  annotations?: {
    /**
     * Audience description
     */
    audience?: string[];
    /**
     * Priority hint (0-1)
     */
    priority?: number;
  };
};

/**
 * Resource content returned when reading a resource
 */
export type ResourceContent = {
  /**
   * Resource URI
   */
  uri: string;

  /**
   * MIME type
   */
  mimeType?: string;

  /**
   * Text content (for text/* MIME types)
   */
  text?: string;

  /**
   * Binary content as base64 (for non-text MIME types)
   */
  blob?: string;
};

/**
 * Resource reader function type
 */
export type ResourceReader = (
  uri: string,
  context?: JsonObject,
) => Promise<ResourceContent>;

/**
 * Registered resource with reader
 */
export type RegisteredResource = MCPResource & {
  reader: ResourceReader;
};

/**
 * MCP Prompt definition
 */
export type MCPPrompt = {
  /**
   * Unique prompt name
   */
  name: string;

  /**
   * Human-readable description
   */
  description?: string;

  /**
   * Prompt arguments schema
   */
  arguments?: Array<{
    /**
     * Argument name
     */
    name: string;
    /**
     * Argument description
     */
    description?: string;
    /**
     * Whether the argument is required
     */
    required?: boolean;
  }>;
};

/**
 * Prompt message content
 */
export type PromptMessage = {
  /**
   * Message role
   */
  role: "user" | "assistant";

  /**
   * Message content
   */
  content: {
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
    uri?: string;
  };
};

/**
 * Result of getting a prompt
 */
export type PromptResult = {
  /**
   * Optional description
   */
  description?: string;

  /**
   * Prompt messages
   */
  messages: PromptMessage[];
};

/**
 * Prompt generator function type
 */
export type PromptGenerator = (
  args: Record<string, JsonValue>,
  context?: JsonObject,
) => Promise<PromptResult>;

/**
 * Registered prompt with generator
 */
export type RegisteredPrompt = MCPPrompt & {
  generator: PromptGenerator;
};

/**
 * Resource subscription callback
 */
export type ResourceSubscriptionCallback = (
  uri: string,
  content: ResourceContent,
) => void | Promise<void>;

/**
 * Server capabilities configuration
 */
export type ServerCapabilitiesConfig = {
  /**
   * Enable resource support
   */
  resources?: boolean;

  /**
   * Enable prompt support
   */
  prompts?: boolean;

  /**
   * Enable resource subscriptions
   */
  resourceSubscriptions?: boolean;
};

/**
 * Server Capabilities Manager
 *
 * Manages resources and prompts for MCP servers.
 *
 * @example
 * ```typescript
 * const capabilities = new ServerCapabilitiesManager({
 *   resources: true,
 *   prompts: true,
 * });
 *
 * // Register a resource
 * capabilities.registerResource({
 *   uri: "file:///data/config.json",
 *   name: "Configuration",
 *   mimeType: "application/json",
 *   reader: async (uri) => ({
 *     uri,
 *     mimeType: "application/json",
 *     text: JSON.stringify({ key: "value" }),
 *   }),
 * });
 *
 * // Register a prompt
 * capabilities.registerPrompt({
 *   name: "summarize",
 *   description: "Summarize text content",
 *   arguments: [{ name: "text", required: true }],
 *   generator: async (args) => ({
 *     messages: [
 *       { role: "user", content: { type: "text", text: `Summarize: ${args.text}` } },
 *     ],
 *   }),
 * });
 * ```
 */
export class ServerCapabilitiesManager extends EventEmitter {
  private config: Required<ServerCapabilitiesConfig>;
  private resources: Map<string, RegisteredResource> = new Map();
  private prompts: Map<string, RegisteredPrompt> = new Map();
  private subscriptions: Map<string, Set<ResourceSubscriptionCallback>> =
    new Map();
  private resourceTemplates: Map<string, RegisteredResource> = new Map();

  constructor(config: ServerCapabilitiesConfig = {}) {
    super();

    this.config = {
      resources: config.resources ?? true,
      prompts: config.prompts ?? true,
      resourceSubscriptions: config.resourceSubscriptions ?? true,
    };
  }

  // ========================================
  // RESOURCE MANAGEMENT
  // ========================================

  /**
   * Register a resource
   */
  registerResource(resource: RegisteredResource): this {
    if (!this.config.resources) {
      throw ErrorFactory.invalidConfiguration(
        "resources",
        "Resource support is not enabled",
      );
    }

    this.validateResourceUri(resource.uri);
    this.resources.set(resource.uri, resource);

    this.emit("resourceRegistered", {
      uri: resource.uri,
      name: resource.name,
      timestamp: new Date(),
    });

    logger.debug(`[ServerCapabilities] Registered resource: ${resource.uri}`);

    return this;
  }

  /**
   * Register a resource template (with URI pattern)
   */
  registerResourceTemplate(
    pattern: string,
    template: Omit<RegisteredResource, "uri"> & { uriPattern: string },
  ): this {
    if (!this.config.resources) {
      throw ErrorFactory.invalidConfiguration(
        "resources",
        "Resource support is not enabled",
      );
    }

    this.resourceTemplates.set(pattern, {
      ...template,
      uri: template.uriPattern,
    });

    this.emit("resourceTemplateRegistered", {
      pattern,
      timestamp: new Date(),
    });

    return this;
  }

  /**
   * Unregister a resource
   */
  unregisterResource(uri: string): boolean {
    const removed = this.resources.delete(uri);

    if (removed) {
      // Clear subscriptions
      this.subscriptions.delete(uri);

      this.emit("resourceUnregistered", {
        uri,
        timestamp: new Date(),
      });
    }

    return removed;
  }

  /**
   * List all resources
   */
  listResources(): MCPResource[] {
    return Array.from(this.resources.values()).map((r) => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: r.mimeType,
      size: r.size,
      dynamic: r.dynamic,
      annotations: r.annotations,
    }));
  }

  /**
   * Read a resource
   */
  async readResource(
    uri: string,
    context?: JsonObject,
  ): Promise<ResourceContent> {
    // Check direct resources
    let resource = this.resources.get(uri);

    // Check templates if not found
    if (!resource) {
      resource = this.findResourceTemplate(uri);
    }

    if (!resource) {
      throw ErrorFactory.invalidConfiguration(
        "resource",
        `Resource not found: ${uri}`,
      );
    }

    const startTime = Date.now();
    const resourceTimeoutMs = 30_000;

    try {
      const content = await withTimeout(
        resource.reader(uri, context),
        resourceTimeoutMs,
        `Resource read timed out after ${resourceTimeoutMs}ms for URI: ${uri}`,
      );
      const duration = Date.now() - startTime;

      this.emit("resourceRead", {
        uri,
        duration,
        success: true,
        timestamp: new Date(),
      });

      return content;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.emit("resourceRead", {
        uri,
        duration,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      });

      throw error;
    }
  }

  /**
   * Subscribe to resource changes
   */
  subscribeToResource(
    uri: string,
    callback: ResourceSubscriptionCallback,
  ): () => void {
    if (!this.config.resourceSubscriptions) {
      throw ErrorFactory.invalidConfiguration(
        "resourceSubscriptions",
        "Resource subscriptions are not enabled",
      );
    }

    if (!this.subscriptions.has(uri)) {
      this.subscriptions.set(uri, new Set());
    }

    const subs = this.subscriptions.get(uri);
    if (subs) {
      subs.add(callback);
    }

    this.emit("resourceSubscribed", {
      uri,
      timestamp: new Date(),
    });

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(uri);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscriptions.delete(uri);
        }
      }

      this.emit("resourceUnsubscribed", {
        uri,
        timestamp: new Date(),
      });
    };
  }

  /**
   * Notify subscribers of resource change
   */
  async notifyResourceChanged(uri: string): Promise<void> {
    const subscribers = this.subscriptions.get(uri);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    try {
      const content = await this.readResource(uri);

      for (const callback of subscribers) {
        try {
          const result = callback(uri, content);
          // Handle async callbacks that return promises
          if (result && typeof (result as Promise<void>).catch === "function") {
            (result as Promise<void>).catch((error: unknown) => {
              logger.error(
                `[ServerCapabilities] Async error notifying subscriber for ${uri}:`,
                error,
              );
            });
          }
        } catch (error) {
          logger.error(
            `[ServerCapabilities] Error notifying subscriber for ${uri}:`,
            error,
          );
        }
      }

      this.emit("resourceChanged", {
        uri,
        subscriberCount: subscribers.size,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error(
        `[ServerCapabilities] Error reading resource for notification: ${uri}`,
        error,
      );
    }
  }

  /**
   * Get resource by URI
   */
  getResource(uri: string): RegisteredResource | undefined {
    return this.resources.get(uri) ?? this.findResourceTemplate(uri);
  }

  /**
   * Validate resource URI
   */
  private validateResourceUri(uri: string): void {
    try {
      new URL(uri);
    } catch {
      // Allow non-URL URIs but warn
      logger.warn(
        `[ServerCapabilities] Resource URI is not a valid URL: ${uri}`,
      );
    }
  }

  /**
   * Find matching resource template
   */
  private findResourceTemplate(uri: string): RegisteredResource | undefined {
    for (const [pattern, template] of this.resourceTemplates) {
      if (this.matchesPattern(uri, pattern)) {
        return {
          ...template,
          uri,
        };
      }
    }
    return undefined;
  }

  /**
   * Check if URI matches a pattern
   */
  private matchesPattern(uri: string, pattern: string): boolean {
    // Guard against excessively long patterns that could cause ReDoS
    if (pattern.length > 200) {
      return false;
    }

    // Escape regex metacharacters, then replace glob wildcards
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".")
      // Restore URI template placeholders: \{...\} -> [^/]+
      .replace(/\\\{[^}]*\\\}/g, "[^/]+");

    try {
      return new RegExp(`^${regexPattern}$`).test(uri);
    } catch {
      // Invalid regex pattern — treat as non-match
      return false;
    }
  }

  // ========================================
  // PROMPT MANAGEMENT
  // ========================================

  /**
   * Register a prompt
   */
  registerPrompt(prompt: RegisteredPrompt): this {
    if (!this.config.prompts) {
      throw ErrorFactory.invalidConfiguration(
        "prompts",
        "Prompt support is not enabled",
      );
    }

    this.validatePromptName(prompt.name);
    this.prompts.set(prompt.name, prompt);

    this.emit("promptRegistered", {
      name: prompt.name,
      timestamp: new Date(),
    });

    logger.debug(`[ServerCapabilities] Registered prompt: ${prompt.name}`);

    return this;
  }

  /**
   * Unregister a prompt
   */
  unregisterPrompt(name: string): boolean {
    const removed = this.prompts.delete(name);

    if (removed) {
      this.emit("promptUnregistered", {
        name,
        timestamp: new Date(),
      });
    }

    return removed;
  }

  /**
   * List all prompts
   */
  listPrompts(): MCPPrompt[] {
    return Array.from(this.prompts.values()).map((p) => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments,
    }));
  }

  /**
   * Get a prompt
   */
  async getPrompt(
    name: string,
    args: Record<string, JsonValue> = {},
    context?: JsonObject,
  ): Promise<PromptResult> {
    const prompt = this.prompts.get(name);

    if (!prompt) {
      throw ErrorFactory.invalidConfiguration(
        "prompt",
        `Prompt not found: ${name}`,
      );
    }

    // Validate required arguments
    for (const arg of prompt.arguments ?? []) {
      if (arg.required && args[arg.name] === undefined) {
        throw ErrorFactory.invalidConfiguration(
          "promptArgument",
          `Missing required argument: ${arg.name}`,
        );
      }
    }

    const startTime = Date.now();
    const promptTimeoutMs = 30_000;

    try {
      const result = await withTimeout(
        prompt.generator(args, context),
        promptTimeoutMs,
        `Prompt generation timed out after ${promptTimeoutMs}ms for prompt: ${name}`,
      );
      const duration = Date.now() - startTime;

      this.emit("promptGenerated", {
        name,
        duration,
        success: true,
        messageCount: result.messages.length,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.emit("promptGenerated", {
        name,
        duration,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      });

      throw error;
    }
  }

  /**
   * Get prompt by name
   */
  getPromptDefinition(name: string): RegisteredPrompt | undefined {
    return this.prompts.get(name);
  }

  /**
   * Validate prompt name
   */
  private validatePromptName(name: string): void {
    if (!name || typeof name !== "string") {
      throw ErrorFactory.invalidConfiguration(
        "promptName",
        "Prompt name is required and must be a string",
      );
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name)) {
      throw ErrorFactory.invalidConfiguration(
        "promptName",
        "Prompt name must start with a letter or underscore and contain only alphanumeric characters, underscores, and hyphens",
      );
    }

    if (this.prompts.has(name)) {
      throw ErrorFactory.invalidConfiguration(
        "promptName",
        `Prompt '${name}' is already registered`,
      );
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get capabilities object for MCP protocol
   */
  getCapabilities(): {
    resources?: { subscribe?: boolean; listChanged?: boolean };
    prompts?: { listChanged?: boolean };
  } {
    const capabilities: {
      resources?: { subscribe?: boolean; listChanged?: boolean };
      prompts?: { listChanged?: boolean };
    } = {};

    if (this.config.resources) {
      capabilities.resources = {
        subscribe: this.config.resourceSubscriptions,
        listChanged: true,
      };
    }

    if (this.config.prompts) {
      capabilities.prompts = {
        listChanged: true,
      };
    }

    return capabilities;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    resourceCount: number;
    templateCount: number;
    promptCount: number;
    subscriptionCount: number;
  } {
    let subscriptionCount = 0;
    for (const subs of this.subscriptions.values()) {
      subscriptionCount += subs.size;
    }

    return {
      resourceCount: this.resources.size,
      templateCount: this.resourceTemplates.size,
      promptCount: this.prompts.size,
      subscriptionCount,
    };
  }

  /**
   * Clear all resources and prompts
   */
  clear(): void {
    this.resources.clear();
    this.resourceTemplates.clear();
    this.prompts.clear();
    this.subscriptions.clear();

    this.emit("cleared", { timestamp: new Date() });
  }
}

/**
 * Create a simple text resource
 */
export function createTextResource(
  uri: string,
  name: string,
  content: string | (() => string | Promise<string>),
  options?: {
    description?: string;
    dynamic?: boolean;
  },
): RegisteredResource {
  return {
    uri,
    name,
    description: options?.description,
    mimeType: "text/plain",
    dynamic: options?.dynamic ?? typeof content === "function",
    reader: async (requestUri: string) => ({
      uri: requestUri,
      mimeType: "text/plain",
      text: typeof content === "function" ? await content() : content,
    }),
  };
}

/**
 * Create a JSON resource
 */
export function createJsonResource<T extends JsonObject>(
  uri: string,
  name: string,
  content: T | (() => T | Promise<T>),
  options?: {
    description?: string;
    dynamic?: boolean;
  },
): RegisteredResource {
  return {
    uri,
    name,
    description: options?.description,
    mimeType: "application/json",
    dynamic: options?.dynamic ?? typeof content === "function",
    reader: async (requestUri: string) => ({
      uri: requestUri,
      mimeType: "application/json",
      text: JSON.stringify(
        typeof content === "function" ? await content() : content,
        null,
        2,
      ),
    }),
  };
}

/**
 * Create a simple prompt template
 */
export function createPrompt(
  name: string,
  template: string,
  options?: {
    description?: string;
    arguments?: MCPPrompt["arguments"];
  },
): RegisteredPrompt {
  return {
    name,
    description: options?.description,
    arguments: options?.arguments,
    generator: async (args) => {
      // Simple template substitution
      let text = template;
      for (const [key, value] of Object.entries(args)) {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        text = text.replace(new RegExp(`\\{${escapedKey}\\}`, "g"), () =>
          String(value),
        );
      }

      return {
        messages: [
          {
            role: "user",
            content: { type: "text", text },
          },
        ],
      };
    },
  };
}
