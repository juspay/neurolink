#!/usr/bin/env tsx
/**
 * Continuous Test Suite: provider and model name resolution (#354, #337),
 * driven through the public surface (Rule 15).
 *
 * Both issues are about what happens to a *name* on the way into
 * `ProviderFactory.createProvider`, so both are reached the same way — through
 * `new NeuroLink().generate()` — and neither needs a real credential:
 *
 *   - #354 rejects before any network call, so the provider cases just read
 *     the rejection message.
 *   - #337 has to observe the model id that actually reaches the wire, so the
 *     model cases run under `installMockFetch` with a fake OPENAI_API_KEY (the
 *     idiom from continuous-test-suite-file-intake-validation.ts) and assert on
 *     the captured request body.
 *
 * Run: npx tsx test/continuous-test-suite-provider-model-resolution.ts
 */
import {
  defineSuite,
  assert,
  assertEqual,
  assertIncludes,
} from "./helpers/harness.js";
import { installMockFetch } from "./utils/mockFetch.js";
import { NeuroLink, ProviderFactory } from "../dist/index.js";

const { test, runSuite } = defineSuite(
  "Provider & model name resolution (#354, #337)",
  { offline: true },
);

/** Capture a rejection without letting a resolve slip through unnoticed. */
async function rejectionMessageFrom(
  run: () => Promise<unknown>,
): Promise<string> {
  try {
    await run();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("expected the call to reject, but it resolved");
}

/**
 * Fake key so provider construction never depends on a real credential, and
 * OPENAI_BASE_URL cleared so the mocked api.openai.com route matches what the
 * provider dials. Same shape as the intake suite's helper.
 */
async function withFakeOpenAICredential<T>(fn: () => Promise<T>): Promise<T> {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalBaseUrl = process.env.OPENAI_BASE_URL;
  process.env.OPENAI_API_KEY = "test-fake-openai-credential-for-resolution";
  delete process.env.OPENAI_BASE_URL;
  try {
    return await fn();
  } finally {
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
    if (originalBaseUrl === undefined) {
      delete process.env.OPENAI_BASE_URL;
    } else {
      process.env.OPENAI_BASE_URL = originalBaseUrl;
    }
  }
}

const CHAT_COMPLETION = {
  id: "chatcmpl-resolution",
  object: "chat.completion",
  created: 0,
  model: "stub",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: "ok" },
      finish_reason: "stop",
    },
  ],
  usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
};

/**
 * Run one generate() against a mocked OpenAI and return the `model` field the
 * provider actually put on the wire, or null when no request was made.
 *
 * Returning null rather than throwing keeps the precondition explicit at the
 * call site: a case that asserts "the model was not rewritten" must first
 * establish that a request happened at all.
 */
async function modelOnTheWire(
  provider: string,
  model: string,
): Promise<string | null> {
  return withFakeOpenAICredential(async () => {
    const { unset, calls } = installMockFetch([
      { url: "api.openai.com", respond: { json: CHAT_COMPLETION } },
    ]);
    const nl = new NeuroLink();
    try {
      await nl.generate({
        input: { text: "name resolution probe" },
        provider,
        model,
      });
    } catch {
      // A downstream failure is fine — the request body was already captured,
      // and that is the only thing under test here.
    } finally {
      unset();
      await nl.dispose();
    }
    // Match on "carries a model in its body" rather than a specific path:
    // which OpenAI endpoint the provider dials is not what is under test, and
    // pinning the path would make this fail for the wrong reason if it moved.
    for (const call of calls) {
      const body = call.bodyJson as { model?: unknown } | undefined;
      if (typeof body?.model === "string") {
        return body.model;
      }
    }
    return null;
  });
}

// ---------------------------------------------------------------------------
// PR #1753 review follow-ups — the "unresolvable provider" message must
// describe what THIS PROCESS actually registered, not the full static
// descriptor catalog (Tara-ag providerFactory.ts:233, CodeRabbit
// providerFactory.ts:239). Both tests below call `ProviderFactory.createProvider`
// directly (a genuine runtime export — see continuous-test-suite-credentials.ts
// for existing precedent using `ProviderFactory.getAvailableProviders()` the
// same way) and MUST run before any `NeuroLink` instance below performs a
// generate()/stream() call: that first call is what triggers
// `ProviderRegistry.registerAllProviders()`, and once it has run, every
// built-in provider name is registered for the rest of this process — the
// "recognised but unregistered" branch would no longer be reachable through
// any real provider name. Placing these first, before that happens, gives a
// registry containing only what this test explicitly registers.
// ---------------------------------------------------------------------------

const CUSTOM_PROVIDER_NAME = "acme-custom-llm-9182";

await test("a provider registered without a descriptor is listed as registered, not mislabelled an alias", async () => {
  // Never actually invoked: both createProvider() calls below target other
  // names, so only the registration's presence/metadata is under test.
  ProviderFactory.registerProvider(CUSTOM_PROVIDER_NAME, async () => {
    throw new Error("stub constructor should never be invoked");
  });

  const message = await rejectionMessageFrom(() =>
    ProviderFactory.createProvider("zzqqxxvv-nothing-like-it-9182"),
  );
  assertIncludes(
    message,
    "Unknown provider",
    "precondition: the unknown-name branch produced this message",
  );

  const aliasesSegment = message.slice(message.indexOf("Accepted aliases"));
  assert(
    !aliasesSegment.includes(CUSTOM_PROVIDER_NAME),
    "a provider registered with no descriptor was mislabelled an alias of something",
  );

  const validSegment = message.slice(
    message.indexOf("Valid providers"),
    message.indexOf("Accepted aliases"),
  );
  assertIncludes(
    validSegment,
    CUSTOM_PROVIDER_NAME,
    "a registered provider did not appear in the valid/registered list at all",
  );
});

await test("the recognised-but-unregistered message lists only providers actually registered in this process", async () => {
  // "azure" is a real built-in provider, recognised via the static
  // descriptor index, but this process has not registered it yet — the
  // only NeuroLink work so far is the registration above, and
  // ProviderRegistry.registerAllProviders() has not run. This is the
  // "known provider, no registration" branch.
  const message = await rejectionMessageFrom(() =>
    ProviderFactory.createProvider("azure"),
  );
  assertIncludes(
    message,
    "is a recognised provider",
    "precondition: the known-but-unregistered branch produced this message",
  );
  assertIncludes(
    message,
    CUSTOM_PROVIDER_NAME,
    "the provider actually registered in this process is missing from the list",
  );
  assert(
    !message.includes("anthropic"),
    "the list named a built-in provider this process never registered",
  );
});

// ---------------------------------------------------------------------------
// #354 — provider name validation
// ---------------------------------------------------------------------------

await test("a mistyped provider name is met with a suggestion", async () => {
  const nl = new NeuroLink();
  try {
    const message = await rejectionMessageFrom(() =>
      nl.generate({ input: { text: "x" }, provider: "opennai" }),
    );
    assertIncludes(message, "Did you mean", "the message offers a suggestion");
    // Read the suggestion segment specifically: "openai" also appears in the
    // valid-provider list further along, so matching the whole message would
    // pass even with no suggestion at all.
    const suggested = message.slice(
      message.indexOf("Did you mean"),
      message.indexOf("?", message.indexOf("Did you mean")) + 1,
    );
    assertIncludes(
      suggested,
      "openai",
      "the suggestion itself names the intended provider",
    );
  } finally {
    await nl.dispose();
  }
});

await test("the message still lists the valid provider names", async () => {
  const nl = new NeuroLink();
  try {
    const message = await rejectionMessageFrom(() =>
      nl.generate({ input: { text: "x" }, provider: "opennai" }),
    );
    assertIncludes(
      message,
      "Valid providers",
      "the message lists what is valid",
    );
    assertIncludes(message, "anthropic", "the list includes a canonical name");
  } finally {
    await nl.dispose();
  }
});

await test("a name with no near match is not given a misleading suggestion", async () => {
  const nl = new NeuroLink();
  try {
    const message = await rejectionMessageFrom(() =>
      nl.generate({
        input: { text: "x" },
        provider: "zzqqxxvv-nothing-like-it",
      }),
    );
    // Precondition for the negative: this is the unknown-name branch, not the
    // empty-registry or recognised-but-unregistered one.
    assertIncludes(
      message,
      "Unknown provider",
      "precondition: the unknown-name branch produced this message",
    );
    assert(
      !message.includes("Did you mean"),
      "a name nothing resembles was offered a suggestion anyway",
    );
  } finally {
    await nl.dispose();
  }
});

// ---------------------------------------------------------------------------
// #337 — model alias resolution
// ---------------------------------------------------------------------------

await test("a registry alias reaches the provider as the canonical model id", async () => {
  const onWire = await modelOnTheWire("openai", "gpt4o");
  assert(
    onWire !== null,
    "precondition: a request carrying a model id was sent",
  );
  assertEqual(onWire, "gpt-4o", "the alias was resolved before the request");
});

await test("a canonical model id is passed through unchanged", async () => {
  const onWire = await modelOnTheWire("openai", "gpt-4o");
  assert(
    onWire !== null,
    "precondition: a request carrying a model id was sent",
  );
  assertEqual(onWire, "gpt-4o", "a canonical id survived resolution intact");
});

await test("an unrecognised model id is passed through unchanged", async () => {
  // A custom or brand-new id must keep working exactly as before.
  const onWire = await modelOnTheWire("openai", "my-private-finetune-v3");
  assert(
    onWire !== null,
    "precondition: a request carrying a model id was sent",
  );
  assertEqual(
    onWire,
    "my-private-finetune-v3",
    "an id the registry does not know was rewritten",
  );
});

await test("an alias belonging to another provider is not applied", async () => {
  // "sonnet-5" is a registry alias, but for Anthropic. Applying it while
  // constructing OpenAI would rewrite a name that means something else to
  // whoever is being dialled — the cross-provider check exists for this.
  const onWire = await modelOnTheWire("openai", "sonnet-5");
  assert(
    onWire !== null,
    "precondition: a request carrying a model id was sent",
  );
  assertEqual(
    onWire,
    "sonnet-5",
    "another provider's alias was applied to this provider",
  );
});

await runSuite();
