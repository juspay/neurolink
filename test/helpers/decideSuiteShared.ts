/**
 * Setup shared by the two halves of the `decide` suite:
 * test/continuous-test-suite-decide.ts (offline) and
 * test/continuous-test-suite-decide-live.ts (key-gated, real endpoints).
 *
 * Holds what cases in both files read: the ambient decision-provider settings
 * captured when this module loads (REAL_*), with restoreEnv() and
 * clearDecisionKeys() to put them back or blank them; the fetch capture; and
 * the fixtures and helpers that cases in both files use.
 *
 * The capture reads process.env at load time, so a suite imports this after
 * "dotenv/config". This module imports ../../dist/index.js itself, which loads
 * its own .env first, so the capture sees the same environment it did when it
 * ran in the body of the single suite file.
 */

import { fileURLToPath } from "node:url";
import { NeuroLink } from "../../dist/index.js";
import { installFetchCapture } from "./fetchCapture.js";

// Patches globalThis.fetch before any test runs, so section 6's session-signal
// test can read the outbound decision request. ES imports are hoisted, so this
// runs after dist/ has loaded; it works because fetch is resolved at request
// time (same usage as continuous-test-suite-context.ts's issue-02 tests).
export const fetchCapture = installFetchCapture();

export const REAL_KEY = process.env.TYPESAFE_API_KEY;
export const HAS_KEY = typeof REAL_KEY === "string" && REAL_KEY.trim() !== "";

// There are TWO keys that configure a decision provider, not one. Every
// "nothing is configured" test below has to clear both, because transport
// resolution falls back to the gateway when only the gateway key is present —
// so a suite run with AI_GATEWAY_API_KEY in the ambient environment would
// otherwise find a working provider in exactly the tests asserting there
// isn't one, and eight degradation tests would fail for the wrong reason.
export const REAL_GATEWAY_KEY = process.env.AI_GATEWAY_API_KEY;
// Laya's key configures a decision provider as well. A developer's .env
// holding it would otherwise hand every "nothing is configured" test a working
// provider, exactly as the gateway key would.
export const REAL_LAYA_KEY = process.env.LAYA_API_KEY;
// Laya has no built-in endpoint, so its live tests also need LAYA_BASE_URL.
export const REAL_LAYA_BASE_URL = process.env.LAYA_BASE_URL;
// XOR's key configures a decision provider too, and like Laya it has no
// built-in endpoint, so its live tests also need XOR_BASE_URL.
export const REAL_XOR_KEY = process.env.XOR_API_KEY;
export const REAL_XOR_BASE_URL = process.env.XOR_BASE_URL;
// Perplexity's Decisions API reads PERPLEXITY_API_KEY, the same key the
// `perplexity` text provider reads, so an ambient key from a developer's .env
// configures a decision provider here too. It has a public endpoint, so the key
// alone is enough and every "nothing is configured" test must blank it.
export const REAL_PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY;
export const REAL_PERPLEXITY_DECIDER_BASE_URL =
  process.env.PERPLEXITY_DECIDER_BASE_URL;
export const REAL_PERPLEXITY_DECIDER_MODEL =
  process.env.PERPLEXITY_DECIDER_MODEL;
// Cloudflare Clef reads CLOUDFLARE_API_KEY and CLOUDFLARE_ACCOUNT_ID, the same
// two the `cloudflare` Workers AI text provider reads, so an ambient pair from
// a developer's .env configures a decision provider here too (sixth in the
// order, ahead of OpenAI Decisions and ScaleDown). Both are needed, and every
// "nothing is configured" test must blank both.
export const REAL_CLOUDFLARE_KEY = process.env.CLOUDFLARE_API_KEY;
export const REAL_CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
export const REAL_CLOUDFLARE_CLEF_BASE_URL =
  process.env.CLOUDFLARE_CLEF_BASE_URL;
export const REAL_CLOUDFLARE_CLEF_MODEL = process.env.CLOUDFLARE_CLEF_MODEL;
// SubQ reads SUBQ_API_KEY and has a built-in endpoint, so an ambient key alone
// configures a decision provider here too (ahead of Perplexity and Clef, which
// share their keys with text providers) and every "nothing is configured" test
// must blank it.
export const REAL_SUBQ_KEY = process.env.SUBQ_API_KEY;
export const REAL_SUBQ_BASE_URL = process.env.SUBQ_BASE_URL;
export const REAL_SUBQ_MODEL = process.env.SUBQ_MODEL;
// OpenAI Decisions reads OPENAI_API_KEY, the key the `openai` chat provider
// reads, so an ambient key from a developer's .env configures a decision
// provider here too (seventh in the order, ahead of only ScaleDown). It has a
// public endpoint, so the key alone is enough and every "nothing is configured"
// test must blank it.
export const REAL_OPENAI_KEY = process.env.OPENAI_API_KEY;
export const REAL_OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;
export const REAL_OPENAI_API_BASE = process.env.OPENAI_API_BASE;
export const REAL_OPENAI_DECISIONS_BASE_URL =
  process.env.OPENAI_DECISIONS_BASE_URL;
export const REAL_OPENAI_DECISIONS_MODEL = process.env.OPENAI_DECISIONS_MODEL;
// ScaleDown reads SCALEDOWN_API_KEY, a key no other provider shares, and has a
// built-in endpoint, so an ambient key alone configures a decision provider
// here too (the very last in the order) and every "nothing is configured" test
// must blank it.
export const REAL_SCALEDOWN_KEY = process.env.SCALEDOWN_API_KEY;
export const REAL_SCALEDOWN_BASE_URL = process.env.SCALEDOWN_BASE_URL;
export const REAL_SCALEDOWN_MODEL = process.env.SCALEDOWN_MODEL;
// Section 19 reads LAYA_MODEL as an input to model resolution, so it is
// saved and restored like the keys rather than deleted outright.
export const REAL_LAYA_MODEL = process.env.LAYA_MODEL;

export function restoreEnv(): void {
  if (HAS_KEY) {
    process.env.TYPESAFE_API_KEY = REAL_KEY;
  } else {
    delete process.env.TYPESAFE_API_KEY;
  }
  if (REAL_GATEWAY_KEY !== undefined) {
    process.env.AI_GATEWAY_API_KEY = REAL_GATEWAY_KEY;
  } else {
    delete process.env.AI_GATEWAY_API_KEY;
  }
  if (REAL_LAYA_KEY !== undefined) {
    process.env.LAYA_API_KEY = REAL_LAYA_KEY;
  } else {
    delete process.env.LAYA_API_KEY;
  }
  if (REAL_LAYA_BASE_URL !== undefined) {
    process.env.LAYA_BASE_URL = REAL_LAYA_BASE_URL;
  } else {
    delete process.env.LAYA_BASE_URL;
  }
  if (REAL_XOR_KEY !== undefined) {
    process.env.XOR_API_KEY = REAL_XOR_KEY;
  } else {
    delete process.env.XOR_API_KEY;
  }
  if (REAL_XOR_BASE_URL !== undefined) {
    process.env.XOR_BASE_URL = REAL_XOR_BASE_URL;
  } else {
    delete process.env.XOR_BASE_URL;
  }
  if (REAL_PERPLEXITY_KEY !== undefined) {
    process.env.PERPLEXITY_API_KEY = REAL_PERPLEXITY_KEY;
  } else {
    delete process.env.PERPLEXITY_API_KEY;
  }
  if (REAL_PERPLEXITY_DECIDER_BASE_URL !== undefined) {
    process.env.PERPLEXITY_DECIDER_BASE_URL = REAL_PERPLEXITY_DECIDER_BASE_URL;
  } else {
    delete process.env.PERPLEXITY_DECIDER_BASE_URL;
  }
  if (REAL_PERPLEXITY_DECIDER_MODEL !== undefined) {
    process.env.PERPLEXITY_DECIDER_MODEL = REAL_PERPLEXITY_DECIDER_MODEL;
  } else {
    delete process.env.PERPLEXITY_DECIDER_MODEL;
  }
  if (REAL_CLOUDFLARE_KEY !== undefined) {
    process.env.CLOUDFLARE_API_KEY = REAL_CLOUDFLARE_KEY;
  } else {
    delete process.env.CLOUDFLARE_API_KEY;
  }
  if (REAL_CLOUDFLARE_ACCOUNT_ID !== undefined) {
    process.env.CLOUDFLARE_ACCOUNT_ID = REAL_CLOUDFLARE_ACCOUNT_ID;
  } else {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
  }
  if (REAL_CLOUDFLARE_CLEF_BASE_URL !== undefined) {
    process.env.CLOUDFLARE_CLEF_BASE_URL = REAL_CLOUDFLARE_CLEF_BASE_URL;
  } else {
    delete process.env.CLOUDFLARE_CLEF_BASE_URL;
  }
  if (REAL_CLOUDFLARE_CLEF_MODEL !== undefined) {
    process.env.CLOUDFLARE_CLEF_MODEL = REAL_CLOUDFLARE_CLEF_MODEL;
  } else {
    delete process.env.CLOUDFLARE_CLEF_MODEL;
  }
  if (REAL_SUBQ_KEY !== undefined) {
    process.env.SUBQ_API_KEY = REAL_SUBQ_KEY;
  } else {
    delete process.env.SUBQ_API_KEY;
  }
  if (REAL_SUBQ_BASE_URL !== undefined) {
    process.env.SUBQ_BASE_URL = REAL_SUBQ_BASE_URL;
  } else {
    delete process.env.SUBQ_BASE_URL;
  }
  if (REAL_SUBQ_MODEL !== undefined) {
    process.env.SUBQ_MODEL = REAL_SUBQ_MODEL;
  } else {
    delete process.env.SUBQ_MODEL;
  }
  if (REAL_OPENAI_KEY !== undefined) {
    process.env.OPENAI_API_KEY = REAL_OPENAI_KEY;
  } else {
    delete process.env.OPENAI_API_KEY;
  }
  if (REAL_OPENAI_BASE_URL !== undefined) {
    process.env.OPENAI_BASE_URL = REAL_OPENAI_BASE_URL;
  } else {
    delete process.env.OPENAI_BASE_URL;
  }
  if (REAL_OPENAI_API_BASE !== undefined) {
    process.env.OPENAI_API_BASE = REAL_OPENAI_API_BASE;
  } else {
    delete process.env.OPENAI_API_BASE;
  }
  if (REAL_OPENAI_DECISIONS_BASE_URL !== undefined) {
    process.env.OPENAI_DECISIONS_BASE_URL = REAL_OPENAI_DECISIONS_BASE_URL;
  } else {
    delete process.env.OPENAI_DECISIONS_BASE_URL;
  }
  if (REAL_OPENAI_DECISIONS_MODEL !== undefined) {
    process.env.OPENAI_DECISIONS_MODEL = REAL_OPENAI_DECISIONS_MODEL;
  } else {
    delete process.env.OPENAI_DECISIONS_MODEL;
  }
  if (REAL_SCALEDOWN_KEY !== undefined) {
    process.env.SCALEDOWN_API_KEY = REAL_SCALEDOWN_KEY;
  } else {
    delete process.env.SCALEDOWN_API_KEY;
  }
  if (REAL_SCALEDOWN_BASE_URL !== undefined) {
    process.env.SCALEDOWN_BASE_URL = REAL_SCALEDOWN_BASE_URL;
  } else {
    delete process.env.SCALEDOWN_BASE_URL;
  }
  if (REAL_SCALEDOWN_MODEL !== undefined) {
    process.env.SCALEDOWN_MODEL = REAL_SCALEDOWN_MODEL;
  } else {
    delete process.env.SCALEDOWN_MODEL;
  }
  if (REAL_LAYA_MODEL !== undefined) {
    process.env.LAYA_MODEL = REAL_LAYA_MODEL;
  } else {
    delete process.env.LAYA_MODEL;
  }
}

/**
 * Remove every setting that would configure a decision provider, including
 * LAYA_BASE_URL, which Laya needs alongside its key, and PERPLEXITY_API_KEY,
 * which the `perplexity` text provider shares. The Perplexity base URL and
 * model overrides go too, so a developer's own endpoint or model never decides
 * what a keyless test sees. OPENAI_API_KEY goes for the same reason as
 * PERPLEXITY_API_KEY: the `openai` chat provider shares it with OpenAI Decisions.
 * SCALEDOWN_API_KEY goes because it alone configures ScaleDown.
 */
export function clearDecisionKeys(): void {
  delete process.env.TYPESAFE_API_KEY;
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.LAYA_API_KEY;
  delete process.env.LAYA_BASE_URL;
  delete process.env.XOR_API_KEY;
  delete process.env.XOR_BASE_URL;
  delete process.env.PERPLEXITY_API_KEY;
  delete process.env.PERPLEXITY_DECIDER_BASE_URL;
  delete process.env.PERPLEXITY_DECIDER_MODEL;
  delete process.env.CLOUDFLARE_API_KEY;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.CLOUDFLARE_CLEF_BASE_URL;
  delete process.env.CLOUDFLARE_CLEF_MODEL;
  delete process.env.SUBQ_API_KEY;
  delete process.env.SUBQ_BASE_URL;
  delete process.env.SUBQ_MODEL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_API_BASE;
  delete process.env.OPENAI_DECISIONS_BASE_URL;
  delete process.env.OPENAI_DECISIONS_MODEL;
  delete process.env.SCALEDOWN_API_KEY;
  delete process.env.SCALEDOWN_BASE_URL;
  delete process.env.SCALEDOWN_MODEL;
  delete process.env.LAYA_MODEL;
}

export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/** Narrows a `JSON.parse` result enough to read named fields off it. */
export function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const SUPPORT_TICKET =
  "Hi, my Stripe payouts have been failing for three days. I am losing sales " +
  "every hour and nobody has replied to my emails. I need this fixed today.";

export const ALL_THREE = {
  urgent: {
    type: "boolean",
    instructions: "Does this message express urgency?",
  },
  team: {
    type: "choice",
    instructions: "Which team should handle this message?",
    criteria: {
      billing: "Payments, invoicing, refunds",
      technical: "Bugs, outages, integrations",
      sales: "Pricing, upgrades, new accounts",
    },
  },
  frustration: {
    type: "score",
    instructions: "How frustrated is the sender?",
    criteria: ["Calm", "Mildly annoyed", "Clearly frustrated", "Furious"],
  },
} as const;
export const POOL = [
  {
    provider: "google-ai",
    model: "gemini-2.5-flash",
    id: "fast",
    description: "Cheap and fast; rote edits and simple lookups",
    cost: 1,
    quality: 2,
  },
  {
    provider: "anthropic",
    model: "claude-opus-5",
    id: "deep",
    description: "Most capable; architecture and subtle correctness work",
    cost: 20,
    quality: 10,
  },
];

export const HARD_PROMPT =
  "Our payment reconciliation job double-charges roughly 1 in 50000 customers " +
  "under concurrent retries. Find the race and design a production-safe fix.";
export const CATALOG = [
  {
    id: "github",
    description: "Read and write GitHub issues, pull requests and repositories",
    toolNames: ["github_create_issue", "github_list_prs"],
  },
  {
    id: "weather",
    description: "Current conditions and forecasts for a location",
    toolNames: ["weather_current", "weather_forecast"],
  },
  {
    id: "payments",
    description: "Issue refunds and inspect Stripe charges",
    toolNames: ["payments_refund", "payments_get_charge"],
  },
];
export const TRANSCRIPT = [
  {
    id: "m1",
    role: "user" as const,
    content:
      "We decided the retry budget for the payments worker is 3 attempts with jitter.",
  },
  {
    id: "m2",
    role: "assistant" as const,
    content: "Understood — 3 attempts with jitter for the payments worker.",
  },
  {
    id: "m3",
    role: "user" as const,
    content:
      "By the way, the office coffee machine is broken again and nobody has called the repair company.",
  },
  {
    id: "m4",
    role: "assistant" as const,
    content: "That sounds annoying. I hope somebody calls them soon.",
  },
  {
    id: "m5",
    role: "user" as const,
    content: "Also my train was delayed 40 minutes this morning.",
  },
  {
    id: "m6",
    role: "assistant" as const,
    content: "Sorry to hear that.",
  },
  {
    id: "m7",
    role: "user" as const,
    content: "Let us come back to the worker later.",
  },
  { id: "m8", role: "assistant" as const, content: "Sure." },
  { id: "m9", role: "user" as const, content: "Ready when you are." },
  { id: "m10", role: "assistant" as const, content: "Ready." },
  { id: "m11", role: "user" as const, content: "Ok." },
  { id: "m12", role: "assistant" as const, content: "Ok." },
];
/** True when a stdout/stderr blob contains a printed JS stack frame. */
export function looksLikeStackTrace(output: string): boolean {
  return output.split("\n").some((line) => /^\s*at\s+\S/.test(line));
}

export const XOR_FIXTURE_DIR = fileURLToPath(
  new URL("../fixtures/decide/xor/", import.meta.url),
);

export const XOR_COLOR_QUESTION = {
  color: {
    type: "choice" as const,
    instructions: "What color is the attached image?",
    criteria: { red: "red", blue: "blue", green: "green", yellow: "yellow" },
  },
};

// The text alias (`xor-latest`) does not read media, so the media cases name
// the multimodal one.
export const XOR_MEDIA_MODEL = "xor-omni";

// Read off the public surface, not imported from source (rule 15).
export type DecideOptions = Parameters<NeuroLink["decide"]>[0];
export type DecisionFailure = {
  kind?: string;
  status?: number;
  retryable?: boolean;
  message: string;
};

/** The structured cause every decision provider attaches to its errors, beside the message. */
export function readDecisionFailure(error: unknown): DecisionFailure {
  const cause =
    error instanceof Error
      ? (
          error as Error & {
            cause?: { kind?: string; status?: number; retryable?: boolean };
          }
        ).cause
      : undefined;
  return {
    kind: cause?.kind,
    status: cause?.status,
    retryable: cause?.retryable,
    message: error instanceof Error ? error.message : "",
  };
}

/** The failure of a call that is expected to fail, or undefined when it did not. */
export async function failureOf(
  run: () => Promise<unknown>,
): Promise<DecisionFailure | undefined> {
  try {
    await run();
    return undefined;
  } catch (error) {
    return readDecisionFailure(error);
  }
}

// `fileURLToPath`, not `.pathname`: the latter stays percent-encoded, so a
// checkout under a path with a space in it would not find a single fixture.
export const PERPLEXITY_FIXTURE_DIR = fileURLToPath(
  new URL("../fixtures/decide/perplexity-decider/", import.meta.url),
);

// A dead local address, so a request that got past a local refusal is recorded
// by the fetch capture and fails at once instead of reaching the real API.
export const PERPLEXITY_DEAD_BASE_URL = "http://127.0.0.1:9/dead-perplexity";
export const PERPLEXITY_DEAD_ROUTE = "/dead-perplexity/v1/decisions";
export const PERPLEXITY_PLACEHOLDER_KEY =
  "pplx-placeholder-for-the-dead-address";
export const PERPLEXITY_ONE_QUESTION = {
  q: { type: "boolean" as const, instructions: "Is this a test?" },
};

/** A client whose Perplexity requests can only land on the dead address. */
export function deadPerplexity(baseURL = PERPLEXITY_DEAD_BASE_URL): NeuroLink {
  return new NeuroLink({
    credentials: {
      perplexityDecider: { apiKey: PERPLEXITY_PLACEHOLDER_KEY, baseURL },
    },
  });
}

/** Requests recorded for the dead address, or for a host under the reserved .invalid TLD, since the last reset. */
export function escapedRequests(): number {
  return fetchCapture
    .list()
    .filter(
      (c) =>
        c.url.endsWith(PERPLEXITY_DEAD_ROUTE) || /\.invalid[:/]/.test(c.url),
    ).length;
}

export type RefusalOptions = Omit<DecideOptions, "provider" | "questions"> &
  Partial<Pick<DecideOptions, "questions">>;

/** A request that must get past every local check and fail at the dead address. */
export async function expectReachesTransport(
  label: string,
  options: RefusalOptions,
): Promise<void> {
  fetchCapture.reset();
  const failure = await failureOf(() =>
    deadPerplexity().decide({
      provider: "perplexity-decider",
      questions: PERPLEXITY_ONE_QUESTION,
      ...options,
    }),
  );
  assert(
    failure?.kind === "network",
    `${label}: the request must get as far as the transport`,
  );
  assert(
    escapedRequests() >= 1,
    `${label}: the request must be recorded on its way out`,
  );
}
