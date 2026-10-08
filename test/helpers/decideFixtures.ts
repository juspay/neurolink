import type { DecideCatalogJson } from "../../src/lib/types/index.js";

/** A Laya-shaped decide entry built in memory; mutate a structuredClone of it. */
export const LAYA_ENTRY: DecideCatalogJson = {
  id: "laya",
  displayName: "Laya",
  aliases: [],
  inferenceKinds: ["decide"],
  wire: {},
  models: {
    default: "typed-decisions",
    catalog: {
      "typed-decisions": {
        contextWindow: 1024,
        maxOutputTokens: 256,
        vision: false,
        status: "production",
        description: "Laya typed-decisions checkpoint; 1,024-token window",
      },
      multilingual: {
        contextWindow: 1024,
        maxOutputTokens: 256,
        vision: false,
        status: "production",
        description: "Laya multilingual checkpoint; 1,024-token window",
      },
      english: {
        contextWindow: 512,
        maxOutputTokens: 256,
        vision: false,
        status: "production",
        description: "Laya English checkpoint; 512-token window",
      },
      auto: {
        contextWindow: 512,
        maxOutputTokens: 256,
        vision: false,
        status: "production",
        description:
          "Sends no model; Laya's router picks a checkpoint by the language of the state",
      },
    },
  },
  timeouts: { decideMs: 5000 },
  decisionLimits: {
    maxStateTokens: 320,
    maxQuestions: 64,
    nonAsciiTokensPerChar: 1.5,
    models: {
      "typed-decisions": { maxStateTokens: 768 },
      multilingual: { maxStateTokens: 768, nonAsciiTokensPerChar: 0.6 },
      english: { maxStateTokens: 320 },
      auto: { maxStateTokens: 320 },
    },
  },
  decide: {
    dialect: "system-one",
    order: 2,
    baseURLRequired: true,
    baseURLNormalize: ["strip-trailing-slash"],
    endpoint: "{baseURL}/predict",
    model: { placement: "body-unless-alias", alias: "auto" },
    requestIdHeaders: ["x-litellm-call-id"],
    response: { modelPaths: ["routing.model", "model"] },
    errors: {
      rules: [
        { status: [401, 403], kind: "authentication" },
        { status: 413, kind: "max_tokens_exceeded" },
        { status: 429, kind: "rate_limit" },
        { status: 503, kind: "overloaded" },
        { statusMin: 500, kind: "server" },
      ],
      default: "invalid_request",
      bodyShapes: [
        { path: "error.message" },
        {
          path: "detail",
          isArray: true,
          formatter: "fastapi-validation",
          kind: "invalid_request",
          retryable: false,
        },
        { path: "detail" },
      ],
    },
  },
  setup: {
    url: "https://github.com/NandhaKishorM/laya",
    apiKeyFormat: null,
    billingPolicy: "free-tier",
    description: "API key for your Laya endpoint",
    instructions: [
      "1. Run a Laya server, or use a LiteLLM proxy with a pass-through route to one",
      "2. Set LAYA_BASE_URL to its base URL (NeuroLink calls <LAYA_BASE_URL>/predict)",
      "3. Set {apiKeyEnvVar} to the key it accepts (on LiteLLM, a virtual key with that route in its Allowed Routes)",
    ],
  },
  evidence: {
    rosterVerified: { date: "2026-10-08", method: "in-memory test fixture" },
    liveMatrix: null,
    addedInPR: "in-memory test fixture",
  },
};
