/**
 * MCP Elicitation Protocol
 *
 * Protocol-level interface for the MCP elicitation system that enables
 * tools to request interactive user input during execution.
 *
 * This module provides:
 * - Protocol message types for MCP elicitation requests/responses
 * - Protocol-level handlers for different transport types
 * - Utility functions for protocol message construction
 * - Integration with the ElicitationManager
 *
 * Implements MCP 2024-11-05 elicitation specification.
 *
 * @module mcp/elicitationProtocol
 * @since 8.39.0
 */

import { randomUUID } from "crypto";
import type { JsonValue } from "../types/common.js";
import { logger } from "../utils/logger.js";
import { withTimeout } from "../utils/async/withTimeout.js";
import type {
  Elicitation,
  ElicitationResponse,
  ElicitationType,
  ElicitationHandler,
  FormField,
  SelectOption,
} from "./elicitation/types.js";
import {
  ElicitationManager,
  globalElicitationManager,
} from "./elicitation/elicitationManager.js";

/**
 * MCP elicitation protocol message types
 */
export type ElicitationProtocolMessageType =
  | "elicitation/request"
  | "elicitation/response"
  | "elicitation/cancel";

/**
 * Request params type
 */
export type ElicitationRequestParams = {
  type: ElicitationType;
  message: string;
  toolName: string;
  serverId?: string;
  timeout?: number;
  optional?: boolean;
  defaultValue?: JsonValue;
  options?: Record<string, JsonValue>;
};

/**
 * Response params type
 */
export type ElicitationResponseParams = {
  requestId: string;
  responded: boolean;
  value?: JsonValue;
  cancelled?: boolean;
  timedOut?: boolean;
  error?: string;
};

/**
 * Cancel params type
 */
export type ElicitationCancelParams = {
  requestId: string;
  reason?: string;
};

/**
 * Base protocol message structure
 */
export type ElicitationProtocolMessage = {
  jsonrpc: "2.0";
  id: string;
  method: ElicitationProtocolMessageType;
  params:
    | ElicitationRequestParams
    | ElicitationResponseParams
    | ElicitationCancelParams;
};

/**
 * Elicitation request protocol message
 */
export type ElicitationRequestMessage = {
  jsonrpc: "2.0";
  id: string;
  method: "elicitation/request";
  params: ElicitationRequestParams;
};

/**
 * Elicitation response protocol message
 */
export type ElicitationResponseMessage = {
  jsonrpc: "2.0";
  id: string;
  method: "elicitation/response";
  params: ElicitationResponseParams;
};

/**
 * Elicitation cancel protocol message
 */
export type ElicitationCancelMessage = {
  jsonrpc: "2.0";
  id: string;
  method: "elicitation/cancel";
  params: ElicitationCancelParams;
};

/**
 * Protocol message union type
 */
export type ElicitationProtocolPayload =
  | ElicitationRequestMessage
  | ElicitationResponseMessage
  | ElicitationCancelMessage;

/**
 * Protocol handler function type
 */
export type ElicitationProtocolHandler = (
  message: ElicitationProtocolPayload,
) => Promise<ElicitationProtocolPayload | void>;

/**
 * Protocol adapter configuration
 */
export type ElicitationProtocolAdapterConfig = {
  manager?: ElicitationManager;
  defaultTimeout?: number;
  enableLogging?: boolean;
  customHandler?: ElicitationProtocolHandler;
};

/**
 * Create an elicitation request protocol message
 */
export function createElicitationRequest(
  params: ElicitationRequestParams,
): ElicitationRequestMessage {
  return {
    jsonrpc: "2.0",
    id: randomUUID(),
    method: "elicitation/request",
    params: {
      type: params.type,
      message: params.message,
      toolName: params.toolName,
      serverId: params.serverId,
      timeout: params.timeout,
      optional: params.optional,
      defaultValue: params.defaultValue,
      options: params.options ?? {},
    },
  };
}

/**
 * Create an elicitation response protocol message
 */
export function createElicitationResponse(
  requestId: string,
  response: Omit<ElicitationResponseParams, "requestId">,
): ElicitationResponseMessage {
  return {
    jsonrpc: "2.0",
    id: randomUUID(),
    method: "elicitation/response",
    params: {
      requestId,
      responded: response.responded,
      value: response.value,
      cancelled: response.cancelled,
      timedOut: response.timedOut,
      error: response.error,
    },
  };
}

/**
 * Create an elicitation cancel protocol message
 */
export function createElicitationCancel(
  requestId: string,
  reason?: string,
): ElicitationCancelMessage {
  return {
    jsonrpc: "2.0",
    id: randomUUID(),
    method: "elicitation/cancel",
    params: {
      requestId,
      reason,
    },
  };
}

/**
 * Check if a message is an elicitation protocol message
 */
export function isElicitationProtocolMessage(
  message: unknown,
): message is ElicitationProtocolPayload {
  if (typeof message !== "object" || message === null) {
    return false;
  }

  const msg = message as Record<string, unknown>;

  return (
    msg.jsonrpc === "2.0" &&
    typeof msg.id === "string" &&
    (msg.method === "elicitation/request" ||
      msg.method === "elicitation/response" ||
      msg.method === "elicitation/cancel") &&
    typeof msg.params === "object" &&
    msg.params !== null
  );
}

/**
 * Convert protocol message to Elicitation type
 */
export function protocolMessageToElicitation(
  message: ElicitationRequestMessage,
): Elicitation {
  const {
    type,
    message: displayMessage,
    toolName,
    serverId,
    timeout,
    optional,
    defaultValue,
    options,
  } = message.params;

  const base = {
    id: message.id,
    type,
    message: displayMessage,
    toolName,
    serverId,
    timeout,
    optional,
    defaultValue,
  };

  // Add type-specific options
  switch (type) {
    case "confirmation":
      return {
        ...base,
        type: "confirmation",
        confirmLabel: options?.confirmLabel as string | undefined,
        cancelLabel: options?.cancelLabel as string | undefined,
      };

    case "text":
      return {
        ...base,
        type: "text",
        placeholder: options?.placeholder as string | undefined,
        minLength: options?.minLength as number | undefined,
        maxLength: options?.maxLength as number | undefined,
        pattern: options?.pattern as string | undefined,
        multiline: options?.multiline as boolean | undefined,
      };

    case "select":
      return {
        ...base,
        type: "select",
        options: (options?.options as SelectOption[]) ?? [],
      };

    case "multiselect":
      return {
        ...base,
        type: "multiselect",
        options: (options?.options as SelectOption[]) ?? [],
        minSelections: options?.minSelections as number | undefined,
        maxSelections: options?.maxSelections as number | undefined,
      };

    case "form":
      return {
        ...base,
        type: "form",
        fields: (options?.fields as FormField[]) ?? [],
        submitLabel: options?.submitLabel as string | undefined,
      };

    case "file":
      return {
        ...base,
        type: "file",
        accept: options?.accept as string[] | undefined,
        multiple: options?.multiple as boolean | undefined,
        maxSize: options?.maxSize as number | undefined,
      };

    case "secret":
      return {
        ...base,
        type: "secret",
        hint: options?.hint as string | undefined,
      };

    default:
      return base as Elicitation;
  }
}

/**
 * Convert ElicitationResponse to protocol message
 */
export function elicitationResponseToProtocol(
  response: ElicitationResponse,
): ElicitationResponseMessage {
  return createElicitationResponse(response.requestId, {
    responded: response.responded,
    value: response.value,
    cancelled: response.cancelled,
    timedOut: response.timedOut,
    error: response.error,
  });
}

/**
 * Elicitation Protocol Adapter
 *
 * Bridges protocol-level messages with the ElicitationManager
 */
export class ElicitationProtocolAdapter {
  private manager: ElicitationManager;
  private config: Required<
    Omit<ElicitationProtocolAdapterConfig, "customHandler">
  > & {
    customHandler?: ElicitationProtocolHandler;
  };

  constructor(config: ElicitationProtocolAdapterConfig = {}) {
    this.manager = config.manager ?? globalElicitationManager;
    this.config = {
      manager: this.manager,
      defaultTimeout: config.defaultTimeout ?? 60000,
      enableLogging: config.enableLogging ?? false,
      customHandler: config.customHandler,
    };
  }

  /**
   * Handle incoming protocol message
   */
  async handleMessage(
    message: ElicitationProtocolPayload,
  ): Promise<ElicitationProtocolPayload | void> {
    if (this.config.enableLogging) {
      logger.info("[ElicitationProtocol] Received:", message.method);
    }

    // Use custom handler if provided
    if (this.config.customHandler) {
      return await withTimeout(
        this.config.customHandler(message),
        this.config.defaultTimeout,
        `[ElicitationProtocol] Custom handler timed out after ${this.config.defaultTimeout}ms`,
      );
    }

    switch (message.method) {
      case "elicitation/request":
        return this.handleRequest(message);

      case "elicitation/response":
        return this.handleResponse(message);

      case "elicitation/cancel":
        return this.handleCancel(message);

      default:
        if (this.config.enableLogging) {
          logger.warn(
            `[ElicitationProtocol] Unhandled method: ${(message as { method: string }).method}`,
          );
        }
        return;
    }
  }

  /**
   * Handle elicitation request
   */
  private async handleRequest(
    message: ElicitationRequestMessage,
  ): Promise<ElicitationResponseMessage> {
    const elicitation = protocolMessageToElicitation(message);

    // Use the manager to process the request
    const response = await this.manager.request({
      ...elicitation,
      timeout: elicitation.timeout ?? this.config.defaultTimeout,
    });

    return elicitationResponseToProtocol(response);
  }

  /**
   * Handle elicitation response (for external responses)
   */
  private async handleResponse(
    _message: ElicitationResponseMessage,
  ): Promise<void> {
    // Responses are typically handled by the manager internally
    // This is for external systems sending responses
    if (this.config.enableLogging) {
      logger.info("[ElicitationProtocol] Response received (no action needed)");
    }
  }

  /**
   * Handle elicitation cancel
   */
  private async handleCancel(message: ElicitationCancelMessage): Promise<void> {
    this.manager.cancel(message.params.requestId, message.params.reason);
  }

  /**
   * Send an elicitation request through the protocol
   */
  async requestElicitation(
    params: ElicitationRequestParams,
  ): Promise<ElicitationResponse> {
    const message = createElicitationRequest(params);
    const elicitation = protocolMessageToElicitation(message);

    return this.manager.request({
      ...elicitation,
      timeout: elicitation.timeout ?? this.config.defaultTimeout,
    });
  }

  /**
   * Cancel a pending elicitation
   */
  cancelElicitation(requestId: string, reason?: string): void {
    this.manager.cancel(requestId, reason);
  }

  /**
   * Get the underlying manager
   */
  getManager(): ElicitationManager {
    return this.manager;
  }

  /**
   * Set protocol handler for the manager
   */
  setHandler(handler: ElicitationHandler): void {
    this.manager.setHandler(handler);
  }

  /**
   * Enable/disable the protocol
   */
  setEnabled(enabled: boolean): void {
    this.manager.setEnabled(enabled);
  }

  /**
   * Check if protocol is enabled
   */
  isEnabled(): boolean {
    return this.manager.isEnabled();
  }
}

/**
 * Create protocol-compliant confirmation request
 */
export function createConfirmationRequest(
  message: string,
  options: {
    toolName: string;
    serverId?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    timeout?: number;
  },
): ElicitationRequestMessage {
  const requestOptions: Record<string, JsonValue> = {};
  if (options.confirmLabel !== undefined) {
    requestOptions.confirmLabel = options.confirmLabel;
  }
  if (options.cancelLabel !== undefined) {
    requestOptions.cancelLabel = options.cancelLabel;
  }

  return createElicitationRequest({
    type: "confirmation",
    message,
    toolName: options.toolName,
    serverId: options.serverId,
    timeout: options.timeout,
    options: requestOptions,
  });
}

/**
 * Create protocol-compliant text input request
 */
export function createTextInputRequest(
  message: string,
  options: {
    toolName: string;
    serverId?: string;
    placeholder?: string;
    defaultValue?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    multiline?: boolean;
    timeout?: number;
  },
): ElicitationRequestMessage {
  const requestOptions: Record<string, JsonValue> = {};
  if (options.placeholder !== undefined) {
    requestOptions.placeholder = options.placeholder;
  }
  if (options.minLength !== undefined) {
    requestOptions.minLength = options.minLength;
  }
  if (options.maxLength !== undefined) {
    requestOptions.maxLength = options.maxLength;
  }
  if (options.pattern !== undefined) {
    requestOptions.pattern = options.pattern;
  }
  if (options.multiline !== undefined) {
    requestOptions.multiline = options.multiline;
  }

  return createElicitationRequest({
    type: "text",
    message,
    toolName: options.toolName,
    serverId: options.serverId,
    defaultValue: options.defaultValue,
    timeout: options.timeout,
    options: requestOptions,
  });
}

/**
 * Create protocol-compliant select request
 */
export function createSelectRequest(
  message: string,
  selectOptions: SelectOption[],
  options: {
    toolName: string;
    serverId?: string;
    defaultValue?: string;
    timeout?: number;
  },
): ElicitationRequestMessage {
  return createElicitationRequest({
    type: "select",
    message,
    toolName: options.toolName,
    serverId: options.serverId,
    defaultValue: options.defaultValue,
    timeout: options.timeout,
    options: {
      options: selectOptions as unknown as JsonValue,
    },
  });
}

/**
 * Create protocol-compliant form request
 */
export function createFormRequest(
  message: string,
  fields: FormField[],
  options: {
    toolName: string;
    serverId?: string;
    submitLabel?: string;
    timeout?: number;
  },
): ElicitationRequestMessage {
  const requestOptions: Record<string, JsonValue> = {
    fields: fields as unknown as JsonValue,
  };
  if (options.submitLabel !== undefined) {
    requestOptions.submitLabel = options.submitLabel;
  }

  return createElicitationRequest({
    type: "form",
    message,
    toolName: options.toolName,
    serverId: options.serverId,
    timeout: options.timeout,
    options: requestOptions,
  });
}

/**
 * Global protocol adapter instance
 */
export const globalElicitationProtocol = new ElicitationProtocolAdapter();
