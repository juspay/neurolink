/**
 * Elicitation Manager
 *
 * Manager for handling elicitation requests during tool execution.
 * Enables MCP tools to request interactive user input mid-execution.
 *
 * @module mcp/elicitation/elicitationManager
 * @since 8.39.0
 */

import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import type {
  Elicitation,
  ElicitationResponse,
  ElicitationHandler,
  ElicitationManagerConfig,
  SelectOption,
  FormField,
  ConfirmationElicitation,
  TextElicitation,
  SelectElicitation,
  MultiSelectElicitation,
  FormElicitation,
  SecretElicitation,
} from "./types.js";
import { logger } from "../../utils/logger.js";

/**
 * Manager for handling elicitation requests during tool execution
 *
 * The elicitation protocol allows MCP tools to request interactive user input
 * mid-execution. This is useful for:
 * - Confirming destructive operations
 * - Requesting missing information
 * - Getting user preferences
 * - Handling authentication challenges
 *
 * @example
 * ```typescript
 * const elicitationManager = new ElicitationManager({
 *   defaultTimeout: 60000,
 *   handler: async (request) => {
 *     // Implement UI prompt based on request type
 *     if (request.type === "confirmation") {
 *       const confirmed = await showConfirmDialog(request.message);
 *       return {
 *         requestId: request.id,
 *         responded: true,
 *         value: confirmed,
 *         timestamp: Date.now(),
 *       };
 *     }
 *     // Handle other types...
 *   },
 * });
 *
 * // Use in a tool
 * const response = await elicitationManager.request({
 *   type: "confirmation",
 *   message: "Are you sure you want to delete this file?",
 *   toolName: "deleteFile",
 * });
 *
 * if (response.value === true) {
 *   // Proceed with deletion
 * }
 * ```
 */
export class ElicitationManager extends EventEmitter {
  private config: Required<ElicitationManagerConfig>;
  private pendingRequests: Map<
    string,
    {
      request: Elicitation;
      resolve: (response: ElicitationResponse) => void;
      timer?: ReturnType<typeof setTimeout>;
      settled: boolean;
    }
  > = new Map();

  constructor(config: ElicitationManagerConfig = {}) {
    super();

    this.config = {
      defaultTimeout: config.defaultTimeout ?? 60000,
      enabled: config.enabled ?? true,
      handler: config.handler ?? this.defaultHandler.bind(this),
      fallbackBehavior: config.fallbackBehavior ?? "timeout",
    };
  }

  /**
   * Set the elicitation handler
   */
  setHandler(handler: ElicitationHandler): void {
    this.config.handler = handler;
  }

  /**
   * Enable or disable elicitation
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;

    if (!enabled) {
      // Resolve all pending requests with timeout/default
      for (const [requestId, pending] of this.pendingRequests) {
        if (pending.settled) {
          continue;
        }
        pending.settled = true;
        this.handleDisabled(pending.request, pending.resolve);
        if (pending.timer) {
          clearTimeout(pending.timer);
        }
        this.pendingRequests.delete(requestId);
      }
    }
  }

  /**
   * Check if elicitation is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Request user input
   */
  async request(
    elicitation: Omit<Elicitation, "id"> & { id?: string },
  ): Promise<ElicitationResponse> {
    const request: Elicitation = {
      ...elicitation,
      id: elicitation.id ?? randomUUID(),
    } as Elicitation;

    // If disabled, handle according to fallback behavior
    if (!this.config.enabled) {
      return this.handleDisabledRequest(request);
    }

    const timeout = request.timeout ?? this.config.defaultTimeout;

    return new Promise<ElicitationResponse>((resolve) => {
      // Set up timeout
      const timer = setTimeout(() => {
        const pending = this.pendingRequests.get(request.id);
        if (!pending || pending.settled) {
          return;
        }
        pending.settled = true;
        this.handleTimeout(request, resolve);
      }, timeout);

      // Store pending request with shared settled flag
      this.pendingRequests.set(request.id, {
        request,
        resolve,
        timer,
        settled: false,
      });

      // Emit request event
      this.emit("elicitationRequested", request);

      // Call handler (wrapped to catch synchronous throws)
      Promise.resolve()
        .then(() => this.config.handler(request))
        .then((response) => {
          const pending = this.pendingRequests.get(request.id);
          if (!pending || pending.settled) {
            return;
          }
          pending.settled = true;
          clearTimeout(timer);
          this.pendingRequests.delete(request.id);
          this.emit("elicitationResponded", response);
          resolve(response);
        })
        .catch((error) => {
          const pending = this.pendingRequests.get(request.id);
          if (!pending || pending.settled) {
            return;
          }
          pending.settled = true;
          clearTimeout(timer);
          this.pendingRequests.delete(request.id);
          const errorResponse: ElicitationResponse = {
            requestId: request.id,
            responded: false,
            error: error instanceof Error ? error.message : String(error),
            timestamp: Date.now(),
          };
          this.emit("elicitationError", { request, error });
          resolve(errorResponse);
        });
    });
  }

  /**
   * Convenience method for confirmation requests
   */
  async confirm(
    message: string,
    options?: {
      toolName?: string;
      serverId?: string;
      confirmLabel?: string;
      cancelLabel?: string;
      timeout?: number;
    },
  ): Promise<boolean> {
    const request: Omit<ConfirmationElicitation, "id"> = {
      type: "confirmation",
      message,
      toolName: options?.toolName ?? "unknown",
      serverId: options?.serverId,
      confirmLabel: options?.confirmLabel,
      cancelLabel: options?.cancelLabel,
      timeout: options?.timeout,
    };
    const response = await this.request(request);

    return response.value === true;
  }

  /**
   * Convenience method for text input
   */
  async getText(
    message: string,
    options?: {
      toolName?: string;
      placeholder?: string;
      defaultValue?: string;
      timeout?: number;
    },
  ): Promise<string | undefined> {
    const request: Omit<TextElicitation, "id"> = {
      type: "text",
      message,
      toolName: options?.toolName ?? "unknown",
      placeholder: options?.placeholder,
      defaultValue: options?.defaultValue,
      timeout: options?.timeout,
    };
    const response = await this.request(request);

    return response.value as string | undefined;
  }

  /**
   * Convenience method for selection
   */
  async select<T extends string>(
    message: string,
    options: Array<{ value: T; label: string }>,
    config?: {
      toolName?: string;
      timeout?: number;
    },
  ): Promise<T | undefined> {
    const request: Omit<SelectElicitation, "id"> = {
      type: "select",
      message,
      toolName: config?.toolName ?? "unknown",
      options: options as SelectOption[],
      timeout: config?.timeout,
    };
    const response = await this.request(request);

    return response.value as T | undefined;
  }

  /**
   * Convenience method for multiple selection
   */
  async multiSelect<T extends string>(
    message: string,
    options: Array<{ value: T; label: string }>,
    config?: {
      toolName?: string;
      timeout?: number;
      minSelections?: number;
      maxSelections?: number;
    },
  ): Promise<T[] | undefined> {
    const request: Omit<MultiSelectElicitation, "id"> = {
      type: "multiselect",
      message,
      toolName: config?.toolName ?? "unknown",
      options: options as SelectOption[],
      timeout: config?.timeout,
      minSelections: config?.minSelections,
      maxSelections: config?.maxSelections,
    };
    const response = await this.request(request);

    return response.value as T[] | undefined;
  }

  /**
   * Convenience method for form input
   */
  async form<T extends Record<string, unknown>>(
    message: string,
    fields: FormField[],
    config?: {
      toolName?: string;
      serverId?: string;
      timeout?: number;
      submitLabel?: string;
    },
  ): Promise<T | undefined> {
    const request: Omit<FormElicitation, "id"> = {
      type: "form",
      message,
      toolName: config?.toolName ?? "unknown",
      serverId: config?.serverId,
      fields,
      submitLabel: config?.submitLabel,
      timeout: config?.timeout,
    };
    const response = await this.request(request);

    return response.value as T | undefined;
  }

  /**
   * Convenience method for secret input
   */
  async getSecret(
    message: string,
    options?: {
      toolName?: string;
      hint?: string;
      timeout?: number;
    },
  ): Promise<string | undefined> {
    const request: Omit<SecretElicitation, "id"> = {
      type: "secret",
      message,
      toolName: options?.toolName ?? "unknown",
      hint: options?.hint,
      timeout: options?.timeout,
    };
    const response = await this.request(request);

    return response.value as string | undefined;
  }

  /**
   * Cancel a pending request
   */
  cancel(requestId: string, reason?: string): void {
    const pending = this.pendingRequests.get(requestId);

    if (pending) {
      if (pending.settled) {
        return;
      }
      pending.settled = true;

      if (pending.timer) {
        clearTimeout(pending.timer);
      }

      const response: ElicitationResponse = {
        requestId,
        responded: false,
        cancelled: true,
        error: reason,
        timestamp: Date.now(),
      };

      pending.resolve(response);
      this.pendingRequests.delete(requestId);
      this.emit("elicitationCancelled", { requestId, reason });
    }
  }

  /**
   * Default handler when none is provided
   */
  private async defaultHandler(
    request: Elicitation,
  ): Promise<ElicitationResponse> {
    logger.warn(
      `[ElicitationManager] No handler for elicitation request: ${request.id}`,
    );

    // If there's a default value, use it
    if (request.defaultValue !== undefined) {
      return {
        requestId: request.id,
        responded: true,
        value: request.defaultValue,
        timestamp: Date.now(),
      };
    }

    // Otherwise, return not responded
    return {
      requestId: request.id,
      responded: false,
      error: "No elicitation handler configured",
      timestamp: Date.now(),
    };
  }

  /**
   * Handle timeout
   */
  private handleTimeout(
    request: Elicitation,
    resolve: (response: ElicitationResponse) => void,
  ): void {
    this.pendingRequests.delete(request.id);

    const response: ElicitationResponse = {
      requestId: request.id,
      responded: false,
      timedOut: true,
      value: request.defaultValue,
      timestamp: Date.now(),
    };

    this.emit("elicitationTimeout", { request });
    resolve(response);
  }

  /**
   * Handle disabled elicitation
   */
  private handleDisabled(
    request: Elicitation,
    resolve: (response: ElicitationResponse) => void,
  ): void {
    resolve(this.handleDisabledRequest(request));
  }

  /**
   * Handle disabled request based on fallback behavior
   */
  private handleDisabledRequest(request: Elicitation): ElicitationResponse {
    switch (this.config.fallbackBehavior) {
      case "default":
        return {
          requestId: request.id,
          responded: request.defaultValue !== undefined,
          value: request.defaultValue,
          timestamp: Date.now(),
        };

      case "error":
        return {
          requestId: request.id,
          responded: false,
          error: "Elicitation is disabled",
          timestamp: Date.now(),
        };

      case "timeout":
      default:
        return {
          requestId: request.id,
          responded: false,
          timedOut: true,
          value: request.defaultValue,
          timestamp: Date.now(),
        };
    }
  }

  /**
   * Get pending request count
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Get all pending requests
   */
  getPendingRequests(): Elicitation[] {
    return Array.from(this.pendingRequests.values()).map((p) => p.request);
  }

  /**
   * Clear all pending requests
   */
  clearPending(reason?: string): void {
    for (const [requestId] of this.pendingRequests) {
      this.cancel(requestId, reason ?? "Cleared");
    }
  }
}

/**
 * Global elicitation manager instance
 */
export const globalElicitationManager = new ElicitationManager();
