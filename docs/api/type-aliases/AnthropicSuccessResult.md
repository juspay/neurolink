[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicSuccessResult

# Type Alias: AnthropicSuccessResult

> **AnthropicSuccessResult** = \{ `retryNextAccount`: `true`; `failure?`: \{ `message`: `string`; `rateLimit`: `boolean`; `retryDelayMs?`: `number`; `sameAccountRetry?`: \{ `coolingUntil`: `number`; `retryAfterMs`: `number`; \}; \}; \} \| \{ `response`: `Response` \| `unknown`; `holdsAccountAdmission?`: `boolean`; `served`: `boolean`; \}

Defined in: [types/proxy.ts:1365](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1365)

## Union Members

### Type Literal

\{ `retryNextAccount`: `true`; `failure?`: \{ `message`: `string`; `rateLimit`: `boolean`; `retryDelayMs?`: `number`; `sameAccountRetry?`: \{ `coolingUntil`: `number`; `retryAfterMs`: `number`; \}; \}; \}

---

### Type Literal

\{ `response`: `Response` \| `unknown`; `holdsAccountAdmission?`: `boolean`; `served`: `boolean`; \}

#### response

> **response**: `Response` \| `unknown`

#### holdsAccountAdmission?

> `optional` **holdsAccountAdmission?**: `boolean`

#### served

> **served**: `boolean`

True only when an Anthropic account genuinely produced this response.
False for a same-shaped terminal error synthesized locally (e.g. no
upstream body, or the stream failing before its first chunk) — these
reuse the `{ response }` shape because the client still gets a
response, but no account served anything, so session affinity must
not bind on them.
