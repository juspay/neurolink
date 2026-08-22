[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GeminiMalformedRetryConfig

# Type Alias: GeminiMalformedRetryConfig

> **GeminiMalformedRetryConfig** = \{ `enableMalformedRetry`: `true`; `buildMalformedRetryNote`: (`conversation`, `step`) => [`GeminiTurnContent`](GeminiTurnContent.md)[]; \} \| \{ `enableMalformedRetry?`: `false`; `buildMalformedRetryNote?`: `never`; \}

Defined in: [types/loopEngine.ts:527](https://github.com/juspay/neurolink/blob/release/src/lib/types/loopEngine.ts#L527)

Opt in to the single MALFORMED_FUNCTION_CALL retry.

Vertex Gemini only. AI Studio has no such retry today (confirmed: zero
MALFORMED_FUNCTION_CALL handling in its client), and turning it on there
would be a behaviour change disguised as a shared refactor. The engine owns
the one-retry budget; this only says whether to ask.

A union rather than two independent optional fields because the retry is
only worth spending a step on if the re-issued request differs from the one
that just failed. `runAgenticLoop` falls back to the unchanged conversation
when no note builder is supplied (`buildMalformedRetryNote?.(…) ??
conversation`), so enabling the retry without one re-sends a byte-identical
request and most often reproduces the same malformed call — a step burned
for nothing. Requiring the builder here makes that combination unsayable
instead of merely discouraged.

## Union Members

### Type Literal

\{ `enableMalformedRetry`: `true`; `buildMalformedRetryNote`: (`conversation`, `step`) => [`GeminiTurnContent`](GeminiTurnContent.md)[]; \}

#### enableMalformedRetry

> **enableMalformedRetry**: `true`

#### buildMalformedRetryNote

> **buildMalformedRetryNote**: (`conversation`, `step`) => [`GeminiTurnContent`](GeminiTurnContent.md)[]

Append the corrective turn that the retry re-issues with.
Provider-supplied because the note is written in the provider's own
content shape.

##### Parameters

###### conversation

[`GeminiTurnContent`](GeminiTurnContent.md)[]

###### step

`number`

##### Returns

[`GeminiTurnContent`](GeminiTurnContent.md)[]

---

### Type Literal

\{ `enableMalformedRetry?`: `false`; `buildMalformedRetryNote?`: `never`; \}
