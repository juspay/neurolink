[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyMode

# Type Alias: ProxyMode

> **ProxyMode** = `"full"` \| `"passthrough"` \| `"transparent"`

Defined in: [types/proxy.ts:435](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L435)

Proxy operating mode:

- "full" — managed accounts, retry, rotation, polyfill (default)
- "passthrough" — no polyfill/retry/rotation, but body is still parsed and re-serialized
- "transparent" — zero-mutation byte relay: raw body forwarded as-is, minimal header filtering,
  SSE interceptor for cache metrics only (bytes pass through unmodified)
