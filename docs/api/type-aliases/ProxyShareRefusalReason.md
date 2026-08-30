[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRefusalReason

# Type Alias: ProxyShareRefusalReason

> **ProxyShareRefusalReason** = `"missing_token"` \| `"unknown_token"` \| `"malformed_token"` \| `"paused"` \| `"revoked"` \| `"expired"` \| `"out_of_window"` \| `"model_not_allowed"` \| `"exhausted"` \| `"rate_limited"` \| `"concurrency_limited"` \| `"reserve_floor"` \| `"spillover_inactive"` \| `"slice_exhausted"` \| `"no_capacity"`

Defined in: [types/proxy.ts:3503](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3503)

Why a borrowed request was refused. Surfaced verbatim in a response header.
