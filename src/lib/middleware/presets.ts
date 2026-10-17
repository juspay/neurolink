import type { MiddlewarePreset } from "../types/index.js";

/**
 * The presets every `MiddlewareFactory` registers. Built fresh on each call so
 * a factory that edits its own `presets` map cannot change another factory's.
 *
 * `all` is deliberately not "everything": autoEvaluation and lifecycle are
 * opt-in per call and stay out of it. `security` only switches guardrails on;
 * it ships no word list and no model filter, so it redacts nothing until the
 * caller supplies `badWords` or `modelFilter`.
 */
export function createBuiltInMiddlewarePresets(): MiddlewarePreset[] {
  return [
    {
      name: "default",
      description: "Default preset with analytics enabled.",
      config: { analytics: { enabled: true } },
    },
    {
      name: "all",
      description: "Enables analytics and guardrails.",
      config: { analytics: { enabled: true }, guardrails: { enabled: true } },
    },
    {
      name: "security",
      description:
        "Enables guardrails. Filters nothing until badWords or modelFilter is configured.",
      config: { guardrails: { enabled: true } },
    },
  ];
}

export const BUILT_IN_MIDDLEWARE_PRESET_NAMES: readonly string[] =
  createBuiltInMiddlewarePresets().map((preset) => preset.name);
