/**
 * Error classes surfaced by the generation pipeline.
 *
 * Used with `.isInstance(e)` checks and instanceof guards in retry,
 * tool-call repair, and stream handling. Today these resolve through the
 * upstream generation library; this file is the only internal source so the
 * implementation can be replaced without touching call sites.
 */

export {
  NoOutputGeneratedError,
  NoObjectGeneratedError,
  NoSuchToolError,
  InvalidToolInputError,
} from "ai";

export { APICallError } from "@ai-sdk/provider";
