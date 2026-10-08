import type { DecideContractFixture } from "./decideContractFixture.js";

/**
 * An in-source copy of the Laya reply set. The harness tests that feed a
 * controlled fixture use it alone and never read the Laya file: the negative
 * controls, the entries and fixtures built from it (acme-co, typesafe), the
 * reader tests (which write it to a temporary directory and read it back) and
 * the scenario fixtures themselves. The Laya source of truth is
 * test/fixtures/decide/laya/contract.json, which the real loop reads (the mocked
 * suite and the contract suite's Laya run). Tests that compare with that run
 * (the scenario controls in judgeScenarios, the per-label and planned-count
 * tests) read the disk fixture through it, so a row deleted from the file can
 * redden them as well; the agreement test names the root cause. That test
 * compares the success reply and every row of this copy with the file: the file
 * may hold more rows than this copy, never fewer, and no row may differ.
 */
export const LAYA_INLINE_CONTRACT: DecideContractFixture = {
  version: 1,
  id: "laya",
  success: {
    headers: { "x-litellm-call-id": "call-laya-1" },
    body: {
      model: "laya-rl-agent",
      answers: {
        urgent: {
          type: "noul",
          noul: 0.91,
          confidence: 0.91,
          action: { act_probability: 0.5 },
        },
        team: {
          type: "choice",
          choice: "billing",
          probabilities: { billing: 0.84, technical: 0.1, sales: 0.06 },
          confidence: 0.79,
          action: { act_probability: 0.5 },
        },
        mood: {
          type: "score",
          score: 1.7,
          legend: { "0": "calm", "1": "annoyed", "2": "angry" },
          probabilities: { "0": 0.1, "1": 0.1, "2": 0.8 },
          confidence: 0.7,
          action: { act_probability: 0.5 },
        },
      },
      usage: { input_tokens: 96, output_tokens: 0 },
      routing: {
        model: "typed-decisions",
        reason: "explicit model='typed-decisions'",
      },
    },
    expected: {
      model: "typed-decisions",
      requestId: "call-laya-1",
      inputTokens: 96,
      answers: {
        urgent: { type: "boolean", probability: 0.91 },
        team: {
          type: "choice",
          choice: "billing",
          probabilities: { billing: 0.84, technical: 0.1, sales: 0.06 },
          confidence: 0.79,
        },
        mood: {
          type: "score",
          score: 1.7,
          legend: { "0": "calm", "1": "annoyed", "2": "angry" },
          probabilities: { "0": 0.1, "1": 0.1, "2": 0.8 },
          confidence: 0.7,
        },
      },
    },
  },
  errors: [
    // Probed live: the message shape is Laya's own; the Key Hash digest in the body is a synthetic stand-in.
    {
      label: "masked key echo",
      provenance: "seen-live",
      status: 401,
      body: {
        error: {
          message:
            "Authentication Error, Invalid proxy server token passed. Received API Key = sk-...cred, Key Hash (Token) =9f2c0e41d3a7b8c6e5f40112233445566778899aabbccddeeff00112233445566. Unable to find token in cache or `LiteLLM_VerificationTokenTable`",
          type: "token_not_found_in_db",
          param: "key",
          code: "401",
        },
      },
      expect: {
        kind: "authentication",
        retryable: false,
        messageIncludes: ["Invalid proxy server token"],
        messageExcludes: ["Received API Key", "9f2c0e41"],
      },
    },
    // Probed live: the proxy echoes the whole key when it is not shaped like a LiteLLM key.
    {
      label: "unmasked key echo",
      provenance: "seen-live",
      status: 401,
      body: {
        error: {
          message:
            "LiteLLM Virtual Key expected. Received={apiKey}, expected to start with 'sk-'.",
          type: "auth_error",
          param: "None",
          code: "401",
        },
      },
      expect: {
        kind: "authentication",
        retryable: false,
        messageIncludes: ["Virtual Key expected"],
        messageExcludes: ["{apiKey}"],
      },
    },
    // Probed live; the hash is a synthetic stand-in for the key's digest.
    {
      label: "rate limit with a key hash",
      provenance: "seen-live",
      status: 429,
      body: {
        error: {
          message:
            "Max parallel request limit reached. Hashed API key: 9f2c0e41d3a7b8c6e5f40112233445566778899aabbccddeeff00112233445566. Try again later.",
          type: "rate_limit_error",
          code: "429",
        },
      },
      expect: {
        kind: "rate_limit",
        retryable: true,
        messageIncludes: ["parallel request limit"],
        messageExcludes: ["9f2c0e41"],
      },
    },
    // Probed live: FastAPI's own check on the question types.
    {
      label: "detail string",
      provenance: "seen-live",
      status: 400,
      body: {
        detail: "question 'q': type must be one of ['choice', 'noul', 'score']",
      },
      expect: {
        kind: "invalid_request",
        retryable: false,
        messageIncludes: ["type must be one of"],
      },
    },
    // Probed live: FastAPI request validation; `input` echoes the request, so the text must never reach a message.
    {
      label: "validation array",
      provenance: "seen-live",
      status: 422,
      body: {
        detail: [
          {
            type: "value_error",
            loc: ["body", "questions", "team"],
            msg: "Value error, 'choice' questions require non-empty `criteria`",
            input: { secret: "state text must never be logged" },
          },
        ],
      },
      expect: {
        kind: "invalid_request",
        retryable: false,
        messageIncludes: ["questions.team"],
        messageExcludes: ["secret"],
      },
    },
    // Stand-ins: no live probe returned a 413, 503 or 500, so these are written in Laya's FastAPI {detail} envelope.
    {
      label: "state too large",
      provenance: "stand-in",
      status: 413,
      body: { detail: "state too large (50001 > 50000 chars)" },
      expect: { kind: "max_tokens_exceeded", retryable: false },
    },
    {
      label: "upstream unavailable",
      provenance: "stand-in",
      status: 503,
      body: { detail: "upstream unavailable" },
      expect: {
        kind: "overloaded",
        retryable: true,
        messageIncludes: ["upstream unavailable"],
      },
    },
    {
      label: "internal error",
      provenance: "stand-in",
      status: 500,
      body: { detail: "internal error" },
      expect: { kind: "server", retryable: true },
    },
    // Stand-in: no live probe returned both envelopes at once. It pins which text wins when a reply holds both
    // (the proxy's error.message, as for the legacy Laya provider), on a status no rule matches.
    {
      label: "error message beside a detail",
      provenance: "stand-in",
      status: 409,
      body: {
        error: { message: "proxy text wins" },
        detail: "server text loses",
      },
      expect: {
        kind: "invalid_request",
        retryable: false,
        messageIncludes: ["proxy text wins"],
        messageExcludes: ["server text loses"],
      },
    },
    // Stand-in: no live probe returned a 403; the first rule lists it beside 401, so a body has to pin it.
    {
      label: "forbidden",
      provenance: "stand-in",
      status: 403,
      body: {
        error: {
          message: "Forbidden: this key may not call this route",
          type: "forbidden",
          code: "403",
        },
      },
      expect: {
        kind: "authentication",
        retryable: false,
        messageIncludes: ["Forbidden"],
      },
    },
    // Stand-in: no live probe returned a 502; it sits above the 500 edge of the catch-all rule, which 500 alone does not pin.
    {
      label: "bad gateway",
      provenance: "stand-in",
      status: 502,
      body: { detail: "bad gateway" },
      expect: {
        kind: "server",
        retryable: true,
        messageIncludes: ["bad gateway"],
      },
    },
    // Stand-in: no live probe returned a 499; it sits just below the 500 edge, so it falls through to the default kind.
    {
      label: "client closed request",
      provenance: "stand-in",
      status: 499,
      body: { detail: "client closed request" },
      expect: {
        kind: "invalid_request",
        retryable: false,
        messageIncludes: ["client closed request"],
      },
    },
  ],
};
