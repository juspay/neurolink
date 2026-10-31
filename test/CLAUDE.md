# test/ guidance

Loaded automatically when working under `test/`. The suite rules (end-to-end only, one module graph per suite) are Critical Rule 15 in the root CLAUDE.md.

## ⚠️ Keep payloads out of assertion messages

`defineSuite`'s `test()` classifies a thrown error as **SKIP** — not FAIL — when
it is a `Skip`, when the message starts with `SKIP:`, **or, in a suite not
declared `offline` (see below), when the message matches
`isExpectedProviderError()`** and the error is not a `HardFail`, which is never
downgraded whatever its message says. That last clause reads the message text,
so an assertion message that merely _quotes_ provider-ish content is downgraded
to a skip and the run still exits 0.

```ts
// DON'T — dumping the actual value into the message. If the payload contains
// something like "stream_error", "502" or "ECONNREFUSED", a genuine failure is
// reported as ⊘ skipped and CI stays green.
assert(ok, `terminal journal wrong — got ${JSON.stringify(actual)}`);

// DO — describe the discrepancy without quoting the payload.
assert(ok, `terminal journal wrong — mismatch at ${keyPath}`);
```

This bit during the Vitest migration: three real failures in
`continuous-test-suite-proxy-terminal-errors.ts` reported as `Passed: 2,
Skipped: 3` with exit 0. An audit of the 26 no-API suites found no _existing_
suite affected, but the docs search-index suite later hit it for real: its
assertions quote names like `OPENAI_API_KEY`, and a deliberately broken control
reported `2 skipped` and `RESULT: PASS`.

The structural fix is to declare a suite that makes no network call `offline`:
`defineSuite("…", { offline: true })`. The matcher is then never consulted — only
an explicit `Skip` or a `SKIP:` message skips, and a per-test timeout fails too.
Do this for any suite whose only upstream is a loopback stand-in, a mock or a
fixture. A suite that also has a live, key-gated case cannot (that case needs
the provider-error-to-skip route), so split it: the offline cases go in a suite
declared `offline`, the live ones in a `-live` file that keeps the skip route,
and the original script name chains the two (`test:decide`, `test:model-pool`
and `test:agent-delegation` do this). Shared setup goes in `test/helpers/`
(`decideSuiteShared.ts` for the decide pair).

When adding a suite, sanity-check it by breaking one assertion on purpose and
confirming it reports `✗` and exits non-zero rather than `⊘`.
