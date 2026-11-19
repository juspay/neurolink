import { readFileSync } from "node:fs";

const catalog = JSON.parse(
  readFileSync(
    new URL("../../dist/providers/catalog/together-ai.json", import.meta.url),
    "utf8",
  ),
) as { models: { default: string } };

export const TOGETHER_AI_DEFAULT_MODEL = catalog.models.default;
