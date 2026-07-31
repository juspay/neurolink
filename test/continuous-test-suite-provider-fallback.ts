#!/usr/bin/env tsx
/**
 * Continuous Test Suite: provider fallback orchestration + Anthropic proxy
 * User-Agent (pure, no API).
 *
 * Covers two related resilience fixes:
 *
 * 1. Anthropic api_key+proxy User-Agent — when ANTHROPIC_BASE_URL routes
 *    traffic through a proxy, the api_key client must send the claude-cli
 *    User-Agent instead of the bare "@anthropic-ai/sdk" default. WAFs in
 *    front of proxy deployments (e.g. Cloudflare) block "Anthropic/JS x.y.z"
 *    outright, returning 403 for every request. Direct-to-Anthropic traffic
 *    keeps the honest SDK UA.
 *
 * 2. Fallback orchestration trigger widening — an EXPLICIT providerFallback
 *    callback (per-call or instance) is consulted for any error except client
 *    aborts; the callback owns the decision and can return null to bubble.
 *    modelChain-only configs keep the original narrow model-access-denied
 *    gate. Without the widening, a dead primary provider (network error, 5xx,
 *    timeout, auth failure) throws without ever consulting the callback.
 *
 * Run: npx tsx test/continuous-test-suite-provider-fallback.ts
 */
import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
import { NeuroLink } from "../src/lib/neurolink.js";
import { AnthropicProvider } from "../src/lib/providers/anthropic.js";
import { CLAUDE_CLI_USER_AGENT } from "../src/lib/auth/anthropicOAuth.js";

const { test, runSuite } = defineSuite(
  "Provider fallback + Anthropic proxy UA",
);

// ---------------------------------------------------------------------------
// Fallback orchestration (runWithFallbackOrchestration)
// ---------------------------------------------------------------------------

type FallbackNext = { provider?: string; model?: string } | null;
type Orchestrate = (
  optionsOrPrompt: unknown,
  kind: "generate" | "stream",
  inner: (opts: unknown) => Promise<unknown>,
) => Promise<unknown>;

// The orchestration is a private method; invoke it directly with a stub
// inner so the tests are deterministic and free of provider/network
// machinery (which has its own retry layers that would mask the gate).
function makeOrchestrator(
  config?: ConstructorParameters<typeof NeuroLink>[0],
): Orchestrate {
  const nl = new NeuroLink(config);
  const target = nl as unknown as {
    runWithFallbackOrchestration: Orchestrate;
  };
  return target.runWithFallbackOrchestration.bind(nl);
}

const networkError = () =>
  new Error("connect ECONNREFUSED 10.0.0.1:443 — fetch failed");
const serverError = () =>
  Object.assign(new Error("Internal Server Error"), { status: 500 });
const abortError = () =>
  Object.assign(new Error("The operation was aborted"), {
    name: "AbortError",
  });
const accessDeniedError = () =>
  Object.assign(new Error("model access denied"), {
    name: "ModelAccessDeniedError",
  });

// A stub inner that throws the queued errors in order, then succeeds.
function makeInner(errors: unknown[]) {
  const seenOpts: Array<Record<string, unknown>> = [];
  let attempt = 0;
  const inner = async (opts: unknown) => {
    seenOpts.push(opts as Record<string, unknown>);
    const err = errors[attempt++];
    if (err) {
      throw err;
    }
    return { text: "ok", attempt };
  };
  return { inner, seenOpts };
}

await test("explicit callback consulted on a synthetic network error", async () => {
  const run = makeOrchestrator();
  const netErr = networkError();
  const { inner, seenOpts } = makeInner([netErr]);
  const callbackErrors: unknown[] = [];
  const result = (await run(
    {
      input: { text: "hi" },
      provider: "anthropic",
      model: "claude-primary",
      providerFallback: async (err: unknown): Promise<FallbackNext> => {
        callbackErrors.push(err);
        return { provider: "openai", model: "gpt-fallback" };
      },
    },
    "generate",
    inner,
  )) as { text: string };

  assertEqual(callbackErrors.length, 1, "callback must be invoked once");
  assert(
    callbackErrors[0] === netErr,
    "callback must receive the original error object unmodified",
  );
  assertEqual(seenOpts.length, 2, "one failed attempt + one retry");
  assertEqual(
    seenOpts[1].provider,
    "openai",
    "retry must use the provider returned by the callback",
  );
  assertEqual(
    seenOpts[1].model,
    "gpt-fallback",
    "retry must use the model returned by the callback",
  );
  assertEqual(
    seenOpts[1].providerFallback,
    undefined,
    "providerFallback must be stripped from the retried options",
  );
  assertEqual(
    seenOpts[1].modelChain,
    undefined,
    "modelChain must be stripped from the retried options",
  );
  assertEqual(result.text, "ok", "the successful retry result is returned");
});

await test("explicit callback consulted on a synthetic 5xx provider error", async () => {
  const run = makeOrchestrator();
  const err500 = serverError();
  const { inner, seenOpts } = makeInner([err500]);
  const callbackErrors: unknown[] = [];
  const result = (await run(
    {
      input: { text: "hi" },
      provider: "anthropic",
      providerFallback: async (err: unknown): Promise<FallbackNext> => {
        callbackErrors.push(err);
        return { provider: "vertex" };
      },
    },
    "generate",
    inner,
  )) as { text: string };

  assert(callbackErrors[0] === err500, "callback must see the 5xx error");
  assertEqual(seenOpts[1].provider, "vertex", "retry uses returned provider");
  assertEqual(result.text, "ok", "success returned after 5xx fallback");
});

await test("instance-level explicit callback is widened too", async () => {
  const callbackErrors: unknown[] = [];
  const run = makeOrchestrator({
    providerFallback: async (err: unknown): Promise<FallbackNext> => {
      callbackErrors.push(err);
      return { model: "instance-fallback" };
    },
  });
  const { inner, seenOpts } = makeInner([networkError()]);
  const result = (await run(
    { input: { text: "hi" }, provider: "anthropic", model: "primary" },
    "generate",
    inner,
  )) as { text: string };

  assertEqual(callbackErrors.length, 1, "instance callback must be invoked");
  assertEqual(
    seenOpts[1].model,
    "instance-fallback",
    "retry uses the instance callback's model",
  );
  assertEqual(result.text, "ok", "success returned");
});

await test("callback returning null bubbles the original error", async () => {
  const run = makeOrchestrator();
  const netErr = networkError();
  const { inner, seenOpts } = makeInner([netErr, netErr]);
  let thrown: unknown;
  try {
    await run(
      {
        input: { text: "hi" },
        providerFallback: async (): Promise<FallbackNext> => null,
      },
      "generate",
      inner,
    );
  } catch (err) {
    thrown = err;
  }
  assert(thrown === netErr, "the original error object must bubble");
  assertEqual(seenOpts.length, 1, "no retry after the callback declines");
});

await test("abort error does NOT invoke the callback", async () => {
  const run = makeOrchestrator();
  const abortErr = abortError();
  const { inner, seenOpts } = makeInner([abortErr]);
  let callbackInvoked = false;
  let thrown: unknown;
  try {
    await run(
      {
        input: { text: "hi" },
        providerFallback: async (): Promise<FallbackNext> => {
          callbackInvoked = true;
          return { model: "should-not-happen" };
        },
      },
      "generate",
      inner,
    );
  } catch (err) {
    thrown = err;
  }
  assertEqual(callbackInvoked, false, "client aborts must bypass the callback");
  assert(thrown === abortErr, "the abort error must be rethrown");
  assertEqual(seenOpts.length, 1, "no retry on abort");
});

await test("modelChain-only keeps the narrow gate: network error bubbles", async () => {
  const run = makeOrchestrator();
  const netErr = networkError();
  const { inner, seenOpts } = makeInner([netErr]);
  let thrown: unknown;
  try {
    await run(
      {
        input: { text: "hi" },
        model: "claude-primary",
        modelChain: ["claude-primary", "claude-fallback"],
      },
      "generate",
      inner,
    );
  } catch (err) {
    thrown = err;
  }
  assert(
    thrown === netErr,
    "without an explicit callback, non-access-denied errors must bubble",
  );
  assertEqual(seenOpts.length, 1, "the chain must not advance");
});

await test("modelChain-only still walks the chain on model-access-denied", async () => {
  const run = makeOrchestrator();
  const { inner, seenOpts } = makeInner([accessDeniedError()]);
  const result = (await run(
    {
      input: { text: "hi" },
      model: "claude-primary",
      modelChain: ["claude-primary", "claude-fallback"],
    },
    "generate",
    inner,
  )) as { text: string };

  assertEqual(
    seenOpts[1].model,
    "claude-fallback",
    "the chain must advance past the requested model",
  );
  assertEqual(result.text, "ok", "chain fallback succeeds");
});

await test("post-retry gate widened: callback consulted again when the retry fails differently", async () => {
  const run = makeOrchestrator();
  const netErr = networkError();
  const err502 = Object.assign(new Error("502 Bad Gateway"), { status: 502 });
  const { inner, seenOpts } = makeInner([netErr, err502]);
  const callbackErrors: unknown[] = [];
  const models = ["second", "third"];
  const result = (await run(
    {
      input: { text: "hi" },
      model: "first",
      providerFallback: async (err: unknown): Promise<FallbackNext> => {
        callbackErrors.push(err);
        return { model: models[callbackErrors.length - 1] };
      },
    },
    "generate",
    inner,
  )) as { text: string };

  assertEqual(callbackErrors.length, 2, "callback invoked for both failures");
  assert(callbackErrors[0] === netErr, "first invocation sees the first error");
  assert(
    callbackErrors[1] === err502,
    "second invocation sees the retry's non-access-denied error (previously bypassed the callback)",
  );
  assertEqual(seenOpts[2].model, "third", "third attempt uses the new model");
  assertEqual(result.text, "ok", "success returned on the third attempt");
});

// ---------------------------------------------------------------------------
// Anthropic proxy User-Agent
// ---------------------------------------------------------------------------

type ClientInternals = {
  client: { _options?: { defaultHeaders?: Record<string, string> } };
};

function withAnthropicEnv(
  baseUrl: string | undefined,
  fn: () => void | Promise<void>,
): void | Promise<void> {
  const saved = process.env.ANTHROPIC_BASE_URL;
  if (baseUrl === undefined) {
    delete process.env.ANTHROPIC_BASE_URL;
  } else {
    process.env.ANTHROPIC_BASE_URL = baseUrl;
  }
  const restore = () => {
    if (saved === undefined) {
      delete process.env.ANTHROPIC_BASE_URL;
    } else {
      process.env.ANTHROPIC_BASE_URL = saved;
    }
  };
  try {
    const out = fn();
    if (out instanceof Promise) {
      return out.finally(restore);
    }
    restore();
    return out;
  } catch (err) {
    restore();
    throw err;
  }
}

await test("proxy mode: api_key path spoofs the claude-cli User-Agent", () =>
  withAnthropicEnv("https://proxy.example.test", () => {
    // credentials.apiKey (without oauthToken) forces the api_key branch.
    const provider = new AnthropicProvider(undefined, undefined, undefined, {
      apiKey: "sk-ant-test-dummy",
    });
    const headers = provider.getAuthHeaders();
    assertEqual(
      headers["User-Agent"],
      CLAUDE_CLI_USER_AGENT,
      "proxy mode must override the SDK User-Agent with the claude-cli UA",
    );
    assert(
      CLAUDE_CLI_USER_AGENT.startsWith("claude-cli/"),
      "spoofed UA must be the claude-cli one the OAuth path already uses",
    );
    // The constructed SDK client must actually carry it as a default header
    // (defaultHeaders merge AFTER the SDK's built-in UA, so this wins).
    const client = (provider as unknown as ClientInternals).client;
    assertEqual(
      client._options?.defaultHeaders?.["User-Agent"],
      CLAUDE_CLI_USER_AGENT,
      "client defaultHeaders must carry the User-Agent override",
    );
  }));

await test("direct mode (no ANTHROPIC_BASE_URL): honest SDK User-Agent kept", () =>
  withAnthropicEnv(undefined, () => {
    const provider = new AnthropicProvider(undefined, undefined, undefined, {
      apiKey: "sk-ant-test-dummy",
    });
    const headers = provider.getAuthHeaders();
    assertEqual(
      "User-Agent" in headers,
      false,
      "direct-to-Anthropic traffic must not override the SDK User-Agent",
    );
    const client = (provider as unknown as ClientInternals).client;
    assertEqual(
      client._options?.defaultHeaders?.["User-Agent"],
      undefined,
      "client defaultHeaders must not contain a User-Agent override",
    );
  }));

await test("proxy mode UA override applies with beta features disabled", () =>
  withAnthropicEnv("https://proxy.example.test", () => {
    const provider = new AnthropicProvider(
      undefined,
      undefined,
      { enableBetaFeatures: false },
      { apiKey: "sk-ant-test-dummy" },
    );
    const headers = provider.getAuthHeaders();
    assertEqual(
      headers["User-Agent"],
      CLAUDE_CLI_USER_AGENT,
      "UA override must not be gated behind enableBetaFeatures",
    );
  }));

await runSuite();
