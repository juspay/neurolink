[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScalarRecoveryDecision

# Type Alias: ScalarRecoveryDecision

> **ScalarRecoveryDecision** = \{ `kind`: `"empty"`; \} \| \{ `kind`: `"accepted"`; `value`: `unknown`; \} \| \{ `kind`: `"rejected"`; `value`: `unknown`; \} \| \{ `kind`: `"nullish"`; \} \| \{ `kind`: `"not-json"`; \}

Defined in: [types/utilities.ts:354](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L354)

Decision returned by `recoverScalarRoot`. Each caller applies it to its own
result shape and logger prefix, preserving its existing warning behaviour:

- `empty` — the text is a JSON-encoded empty string (an EMPTY
  completion, not a recovered scalar). Callers normalize to a
  true empty.
- `accepted` — a scalar root the caller's schema accepts; safe to publish
  as `structuredData`.
- `rejected` — a scalar root the caller's schema rejects (e.g. a raw
  string under an object schema — the shape a truncated
  response degrades to). Do NOT publish it.
- `nullish` — the text is the JSON literals `null`/`undefined`; there is
  no structured value to publish.
- `not-json` — the text is not JSON at all.
