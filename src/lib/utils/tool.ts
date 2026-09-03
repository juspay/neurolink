/**
 * Tool and schema primitives.
 *
 * These were re-exported from the `ai` package. They are implemented here now,
 * against the local type algebra in `types/aiCompat.ts`. The function and the
 * type had to move together: replacing `tool()` alone leaves it producing an
 * upstream `Tool` that no longer matches the local one, which is how the first
 * attempt failed.
 *
 * Upstream behaviour, reproduced exactly:
 *   - `tool()` is identity. It exists for inference, not for runtime.
 *   - `jsonSchema()` wraps a raw JSON Schema in the duck-typed shape the rest of
 *     this repo reads — `convertZodToJsonSchema` looks for the `jsonSchema`
 *     property, not for the brand — and still stamps
 *     `Symbol.for("vercel.ai.schema")` so anything that does check it keeps
 *     working.
 *   - `stepCountIs(n)` returns `({steps}) => steps.length === n`.
 */

import type { JSONSchema7, Schema, Tool } from "../types/index.js";

const SCHEMA_MARKER = Symbol.for("vercel.ai.schema");

// Two overloads, as upstream. The second is what lets a caller declare a tool
// with no `execute` (the proxy format adapters do exactly that): with OUTPUT
// pinned to `never`, NeverOptional takes its `[N] extends [never]` branch and
// every output property becomes optional.
export function tool<INPUT, OUTPUT>(
  definition: Tool<INPUT, OUTPUT>,
): Tool<INPUT, OUTPUT>;
// eslint-disable-next-line no-redeclare -- TS overload signature
export function tool<INPUT>(definition: Tool<INPUT, never>): Tool<INPUT, never>;
/* eslint-disable no-redeclare, @typescript-eslint/no-explicit-any --
   TypeScript overload implementation signature. It must be assignable from
   both exported overloads above, which only `any` expresses; the exported
   signatures themselves stay precise. */
export function tool(definition: any): any {
  return definition;
}
/* eslint-enable no-redeclare, @typescript-eslint/no-explicit-any */

export function jsonSchema<OBJECT = unknown>(
  schema: JSONSchema7 | (() => JSONSchema7),
  options: {
    validate?: (
      value: unknown,
    ) => { success: true; value: OBJECT } | { success: false; error: unknown };
  } = {},
): Schema<OBJECT> {
  let resolved = schema;
  const wrapper: Schema<OBJECT> & { [SCHEMA_MARKER]?: true } = {
    [SCHEMA_MARKER]: true,
    _type: undefined as OBJECT,
    get jsonSchema(): JSONSchema7 {
      if (typeof resolved === "function") {
        resolved = resolved();
      }
      return resolved;
    },
    ...(options.validate ? { validate: options.validate } : {}),
  };
  return wrapper;
}

export const stepCountIs =
  (stepCount: number) =>
  ({ steps }: { steps: unknown[] }): boolean =>
    steps.length === stepCount;

// `Output` still comes from the upstream package: its only consumer is the
// GenerationHandler path that the native provider loops made unreachable, and
// that whole path is removed in a following change rather than kept alive here.
