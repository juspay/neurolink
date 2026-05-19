/**
 * Tool definition helpers + structured-output spec.
 *
 * Today these resolve through the upstream generation library; this file is
 * the only internal source for them so the implementation can be replaced
 * without touching call sites.
 */

export { tool, jsonSchema, Output, stepCountIs } from "ai";
