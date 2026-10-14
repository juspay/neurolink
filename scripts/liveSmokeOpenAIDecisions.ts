#!/usr/bin/env tsx
/**
 * Live smoke for the `openai-decisions` provider: seven requests to OpenAI's
 * Decisions endpoint, and a short report of what came back.
 *
 * Nothing runs it automatically (no package script, no workflow) and nothing in
 * CI should. It spends real money on a real account, so it refuses to start
 * until RUN_LIVE=1 and a non-blank OPENAI_API_KEY are both set, and it says so
 * with exit code 2 before it has imported NeuroLink or made any request.
 *
 *   RUN_LIVE=1 OPENAI_API_KEY=... pnpm exec tsx scripts/liveSmokeOpenAIDecisions.ts
 *
 * Needs a build (`pnpm run build`): it drives the built package, as a caller does.
 *
 * What it prints, per request, and nothing else: ok or the error kind and HTTP
 * status; the model the reply names; whether usage reported input tokens; how
 * many options came back; the sum of their probabilities; and what that request
 * cost at the documented input price. It never prints a state, an option, the
 * key or a response body, and an error's own message is not printed either
 * (it can quote the response). The probability sums are the point: they are the
 * one thing the design could not settle from documentation, and the engine
 * drops an answer whose sum is more than 0.01 from 1.
 *
 * Exit codes: 0 every request answered, 1 at least one did not, 2 refused to run.
 */

// $0.10 per 1M input tokens, input only (no cache or output charge). Regional
// processing premiums and long-context multipliers apply and are not modelled,
// so this is a lower bound, not a bill.
// Source: https://developers.openai.com/api/docs/guides/decisions, read 2026-10-07.
const USD_PER_INPUT_TOKEN = 0.1 / 1_000_000;

const PROVIDER = "openai-decisions";
const ENDPOINT_PATH = "/v1/decisions";
const OPTION_COUNT = 77;
const CHOICE_REQUESTS = 5;
// Five choices, one predicate, one score. A retry of a failed call is a
// request too, so the cap is enforced on the wire, not on the number of calls.
const MAX_REQUESTS = CHOICE_REQUESTS + 2;

const REFUSAL_EXIT = 2;

// Type positions only: nothing is loaded from the package before the guard.
type Dist = typeof import("../dist/index.js");
type Smoke = {
  label: string;
  state: string;
  questions: import("../dist/index.js").DecisionQuestionMap;
};

const optionNames = Array.from(
  { length: OPTION_COUNT },
  (_, i) => `option-${String(i).padStart(3, "0")}`,
);

const smokes: readonly Smoke[] = [
  ...Array.from(
    { length: CHOICE_REQUESTS },
    (_, i): Smoke => ({
      label: `choice(${OPTION_COUNT}) #${i + 1}`,
      state: `Synthetic smoke input ${i + 1}: a made-up note with no real data in it.`,
      questions: {
        pick: {
          type: "choice",
          instructions: "Which synthetic category fits this note best?",
          criteria: Object.fromEntries(
            optionNames.map((name) => [name, `Synthetic category ${name}.`]),
          ),
        },
      },
    }),
  ),
  {
    label: "predicate",
    state: "Synthetic smoke input: a made-up note with no real data in it.",
    questions: {
      flag: { type: "boolean", instructions: "Is this a made-up note?" },
    },
  },
  {
    label: "score(3)",
    state: "Synthetic smoke input: a made-up note with no real data in it.",
    questions: {
      level: {
        type: "score",
        instructions: "How long is this note?",
        criteria: ["One short line.", "A few lines.", "A long passage."],
      },
    },
  },
];

const money = (usd: number): string => `$${usd.toFixed(8)}`;

/** What is missing before a live run may start; names only, never values. */
function missingRequirements(): string[] {
  const missing: string[] = [];
  if (process.env.RUN_LIVE !== "1") {
    missing.push("RUN_LIVE (must be 1)");
  }
  if ((process.env.OPENAI_API_KEY ?? "").trim() === "") {
    missing.push("OPENAI_API_KEY (must be set and non-blank)");
  }
  return missing;
}

function readFailure(error: unknown): { kind: string; status: string } {
  const cause =
    typeof error === "object" && error !== null && "cause" in error
      ? (error as { cause?: { kind?: unknown; status?: unknown } }).cause
      : undefined;
  return {
    kind: typeof cause?.kind === "string" ? cause.kind : "unknown",
    status: typeof cause?.status === "number" ? String(cause.status) : "-",
  };
}

function isDecisionsRequest(input: Parameters<typeof fetch>[0]): boolean {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  try {
    return new URL(url).pathname.endsWith(ENDPOINT_PATH);
  } catch {
    return false;
  }
}

async function run(NeuroLink: Dist["NeuroLink"]): Promise<number> {
  // NeuroLink also looks up model lists on its own; those are not Decisions
  // requests and pass through uncounted.
  let sent = 0;
  let budgetStops = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
    if (isDecisionsRequest(args[0])) {
      if (sent >= MAX_REQUESTS) {
        budgetStops += 1;
        throw new Error("request budget exhausted");
      }
      sent += 1;
    }
    return realFetch(...args);
  }) as typeof fetch;

  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  let failures = 0;
  let totalInputTokens = 0;

  for (const [index, smoke] of smokes.entries()) {
    const prefix = `request ${index + 1}/${smokes.length} ${smoke.label}:`;
    const budgetStopsBefore = budgetStops;
    try {
      const result = await neurolink.decide({
        provider: PROVIDER,
        state: smoke.state,
        questions: smoke.questions,
      });
      const answer = Object.values(result.answers)[0];
      const probabilities =
        answer?.type === "choice" || answer?.type === "score"
          ? Object.values(answer.probabilities)
          : [];
      const inputTokens = result.usage.inputTokens;
      totalInputTokens += inputTokens;
      console.log(
        `${prefix} ok model=${JSON.stringify(result.model.slice(0, 64))}` +
          ` inputTokens>0=${inputTokens > 0}` +
          ` options=${probabilities.length > 0 ? probabilities.length : "-"}` +
          ` probabilitySum=${probabilities.length > 0 ? probabilities.reduce((total, p) => total + p, 0).toFixed(6) : "-"}` +
          ` cost=${money(inputTokens * USD_PER_INPUT_TOKEN)}`,
      );
    } catch (error) {
      failures += 1;
      // The engine wraps the wrapper's own throw as a network failure, which
      // on a live run would read as a real one.
      if (budgetStops > budgetStopsBefore) {
        console.log(`${prefix} stopped: request budget reached`);
        continue;
      }
      const { kind, status } = readFailure(error);
      console.log(`${prefix} error kind=${kind} status=${status}`);
    }
  }

  console.log(
    `requests sent: ${sent} of at most ${MAX_REQUESTS}${budgetStops > 0 ? " (request budget reached)" : ""}; failed calls: ${failures};` +
      ` estimated cost at the documented input price, lower bound: ${money(totalInputTokens * USD_PER_INPUT_TOKEN)}`,
  );
  return failures === 0 ? 0 : 1;
}

async function main(): Promise<number> {
  const missing = missingRequirements();
  if (missing.length > 0) {
    console.error(
      `liveSmokeOpenAIDecisions: refusing to run, no request was made. Missing: ${missing.join(", ")}.`,
    );
    return REFUSAL_EXIT;
  }
  const { NeuroLink } = await import("../dist/index.js");
  return run(NeuroLink);
}

main().then(
  (code) => {
    // Let the report reach a pipe before the process ends.
    process.stdout.write("", () => process.exit(code));
  },
  () => {
    // The error is not printed: it can carry a response fragment.
    console.error("liveSmokeOpenAIDecisions: stopped on an unexpected failure.");
    process.exit(1);
  },
);
