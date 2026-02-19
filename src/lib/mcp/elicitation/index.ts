/**
 * Elicitation Protocol Module
 *
 * Exports for the MCP elicitation protocol that enables tools
 * to request interactive user input during execution.
 *
 * @module mcp/elicitation
 * @since 8.39.0
 */

// Types
export type {
  ElicitationType,
  ElicitationRequest,
  ConfirmationElicitation,
  TextElicitation,
  SelectOption,
  SelectElicitation,
  MultiSelectElicitation,
  FormField,
  FormElicitation,
  FileElicitation,
  SecretElicitation,
  Elicitation,
  ElicitationResponse,
  ElicitationHandler,
  ElicitationManagerConfig,
  ElicitationContext,
} from "./types.js";

// Manager
export {
  ElicitationManager,
  globalElicitationManager,
} from "./elicitationManager.js";
