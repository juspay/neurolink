// GENERATED FILE — do not edit. Regenerate with `pnpm run codegen:catalog`.
// Source of truth: the per-provider JSON files in this directory.
import basetenJson from "./baseten.json" with { type: "json" };
import cerebrasJson from "./cerebras.json" with { type: "json" };
import cloudflareJson from "./cloudflare.json" with { type: "json" };
import fireworksJson from "./fireworks.json" with { type: "json" };
import gmicloudJson from "./gmicloud.json" with { type: "json" };
import groqJson from "./groq.json" with { type: "json" };
import inceptionLabsJson from "./inception-labs.json" with { type: "json" };
import ioIntelligenceJson from "./io-intelligence.json" with { type: "json" };
import mistralJson from "./mistral.json" with { type: "json" };
import perplexityJson from "./perplexity.json" with { type: "json" };
import sambanovaJson from "./sambanova.json" with { type: "json" };
import togetherAiJson from "./together-ai.json" with { type: "json" };
import upstageJson from "./upstage.json" with { type: "json" };
import xaiJson from "./xai.json" with { type: "json" };
import type { ProviderCatalogJson } from "../../types/index.js";

export const CATALOG_JSON_ENTRIES: ProviderCatalogJson[] = [
  basetenJson as ProviderCatalogJson,
  cerebrasJson as ProviderCatalogJson,
  cloudflareJson as ProviderCatalogJson,
  fireworksJson as ProviderCatalogJson,
  gmicloudJson as ProviderCatalogJson,
  groqJson as ProviderCatalogJson,
  inceptionLabsJson as ProviderCatalogJson,
  ioIntelligenceJson as ProviderCatalogJson,
  mistralJson as ProviderCatalogJson,
  perplexityJson as ProviderCatalogJson,
  sambanovaJson as ProviderCatalogJson,
  togetherAiJson as ProviderCatalogJson,
  upstageJson as ProviderCatalogJson,
  xaiJson as ProviderCatalogJson,
];

export const CATALOG_PROVIDER_IDS = [
  "baseten",
  "cerebras",
  "cloudflare",
  "fireworks",
  "gmicloud",
  "groq",
  "inception-labs",
  "io-intelligence",
  "mistral",
  "perplexity",
  "sambanova",
  "together-ai",
  "upstage",
  "xai",
] as const;
