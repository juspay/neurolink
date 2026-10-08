import type { DecideFormatterName } from "../../types/index.js";
import { describeValidationErrors } from "../systemOneDecision.js";

export const DECIDE_FORMATTERS: Readonly<
  Record<DecideFormatterName, (detail: unknown) => string>
> = {
  "fastapi-validation": (detail) =>
    `Request failed validation — ${describeValidationErrors(Array.isArray(detail) ? detail : [])}`,
};
