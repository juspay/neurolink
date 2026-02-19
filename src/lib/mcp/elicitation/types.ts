/**
 * Elicitation Protocol Types
 *
 * Type definitions for the MCP elicitation protocol that enables
 * tools to request interactive user input during execution.
 *
 * @module mcp/elicitation/types
 * @since 8.39.0
 */

import type { JsonValue, JsonObject } from "../../types/common.js";

/**
 * Elicitation request types
 */
export type ElicitationType =
  | "confirmation" // Yes/no confirmation
  | "text" // Free text input
  | "select" // Single selection from options
  | "multiselect" // Multiple selection from options
  | "form" // Structured form input
  | "file" // File selection/upload
  | "secret"; // Sensitive input (passwords, tokens)

/**
 * Base elicitation request
 */
export type ElicitationRequest = {
  /**
   * Unique request identifier
   */
  id: string;

  /**
   * Type of elicitation
   */
  type: ElicitationType;

  /**
   * Message to display to user
   */
  message: string;

  /**
   * Tool requesting the elicitation
   */
  toolName: string;

  /**
   * Server ID of the requesting tool
   */
  serverId?: string;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Whether the request can be skipped
   */
  optional?: boolean;

  /**
   * Default value if skipped or timed out
   */
  defaultValue?: JsonValue;

  /**
   * Additional context for the request
   */
  context?: JsonObject;
};

/**
 * Confirmation elicitation
 */
export type ConfirmationElicitation = ElicitationRequest & {
  type: "confirmation";
  /**
   * Confirm button label
   */
  confirmLabel?: string;
  /**
   * Cancel button label
   */
  cancelLabel?: string;
};

/**
 * Text input elicitation
 */
export type TextElicitation = ElicitationRequest & {
  type: "text";
  /**
   * Input placeholder
   */
  placeholder?: string;
  /**
   * Minimum length
   */
  minLength?: number;
  /**
   * Maximum length
   */
  maxLength?: number;
  /**
   * Validation regex pattern
   */
  pattern?: string;
  /**
   * Whether to allow multiline input
   */
  multiline?: boolean;
};

/**
 * Selection option
 */
export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

/**
 * Select elicitation
 */
export type SelectElicitation = ElicitationRequest & {
  type: "select";
  options: SelectOption[];
};

/**
 * Multi-select elicitation
 */
export type MultiSelectElicitation = ElicitationRequest & {
  type: "multiselect";
  options: SelectOption[];
  minSelections?: number;
  maxSelections?: number;
};

/**
 * Form field definition
 */
export type FormField = {
  name: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "date" | "password";
  required?: boolean;
  defaultValue?: JsonValue;
  options?: SelectOption[]; // For select type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  placeholder?: string;
  description?: string;
};

/**
 * Form elicitation
 */
export type FormElicitation = ElicitationRequest & {
  type: "form";
  fields: FormField[];
  submitLabel?: string;
};

/**
 * File elicitation
 */
export type FileElicitation = ElicitationRequest & {
  type: "file";
  /**
   * Accepted file types (MIME types or extensions)
   */
  accept?: string[];
  /**
   * Allow multiple files
   */
  multiple?: boolean;
  /**
   * Maximum file size in bytes
   */
  maxSize?: number;
};

/**
 * Secret elicitation
 */
export type SecretElicitation = ElicitationRequest & {
  type: "secret";
  /**
   * Hint about what secret is needed
   */
  hint?: string;
};

/**
 * Union of all elicitation types
 */
export type Elicitation =
  | ConfirmationElicitation
  | TextElicitation
  | SelectElicitation
  | MultiSelectElicitation
  | FormElicitation
  | FileElicitation
  | SecretElicitation;

/**
 * Elicitation response
 */
export type ElicitationResponse = {
  /**
   * Request ID this responds to
   */
  requestId: string;

  /**
   * Whether the user provided a response
   */
  responded: boolean;

  /**
   * The user's response value
   */
  value?: JsonValue;

  /**
   * Whether the request was cancelled
   */
  cancelled?: boolean;

  /**
   * Whether the request timed out
   */
  timedOut?: boolean;

  /**
   * Error message if response failed
   */
  error?: string;

  /**
   * Response timestamp
   */
  timestamp: number;
};

/**
 * Elicitation handler function type
 */
export type ElicitationHandler = (
  request: Elicitation,
) => Promise<ElicitationResponse>;

/**
 * Elicitation manager configuration
 */
export type ElicitationManagerConfig = {
  /**
   * Default timeout for elicitation requests
   */
  defaultTimeout?: number;

  /**
   * Whether to allow elicitation (can be disabled for automated environments)
   */
  enabled?: boolean;

  /**
   * Handler for processing elicitation requests
   */
  handler?: ElicitationHandler;

  /**
   * Fallback behavior when no handler is available
   */
  fallbackBehavior?: "timeout" | "default" | "error";
};

/**
 * Elicitation context passed to tools
 */
export type ElicitationContext = {
  /**
   * Request user confirmation
   */
  confirm: (
    message: string,
    options?: { confirmLabel?: string; cancelLabel?: string },
  ) => Promise<boolean>;

  /**
   * Request text input
   */
  getText: (
    message: string,
    options?: { placeholder?: string; defaultValue?: string },
  ) => Promise<string | undefined>;

  /**
   * Request selection
   */
  select: <T extends string>(
    message: string,
    options: Array<{ value: T; label: string }>,
  ) => Promise<T | undefined>;

  /**
   * Request multiple selections
   */
  multiSelect: <T extends string>(
    message: string,
    options: Array<{ value: T; label: string }>,
  ) => Promise<T[] | undefined>;

  /**
   * Request form input
   */
  form: <T extends Record<string, unknown>>(
    message: string,
    fields: FormField[],
  ) => Promise<T | undefined>;

  /**
   * Request raw elicitation
   */
  request: (
    elicitation: Omit<Elicitation, "id">,
  ) => Promise<ElicitationResponse>;
};
