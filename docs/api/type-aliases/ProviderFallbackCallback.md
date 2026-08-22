[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderFallbackCallback

# Type Alias: ProviderFallbackCallback

> **ProviderFallbackCallback** = (`error`) => `Promise`\<\{ `provider?`: `string`; `model?`: `string`; \} \| `null`\>

Defined in: [types/config.ts:60](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L60)

Curator P2-3: callback signature for centralized fallback policy. When an
explicit callback is configured (per-call or instance), it is invoked for
ANY error thrown by a generate/stream call except genuine caller cancels —
network errors, 5xx, timeouts, auth failures included. A caller cancel is
identified by the caller-supplied `abortSignal` having fired, not by error
shape: abort-shaped errors from NeuroLink's own turn/stall watchdogs and
per-step timeouts DO invoke the callback, so provider hangs can fall back.
The callback receives the error unmodified so hosts can classify it
themselves (status codes, `isNonRetryableProviderError`, …). Return
`{ provider, model }` (either / both optional) to drive a retry; return
`null` to bubble the original error untouched.

## Parameters

### error

`unknown`

## Returns

`Promise`\<\{ `provider?`: `string`; `model?`: `string`; \} \| `null`\>
