[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyMode

# Type Alias: ProxyMode

> **ProxyMode** = `"full"` \| `"passthrough"` \| `"transparent"`

Defined in: [types/proxy.ts:447](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L447)

Proxy operating mode:

- "full" — managed accounts, retry, rotation, polyfill (default)
- "passthrough" — no polyfill/retry/rotation, but body is still parsed and re-serialized
- "transparent" — zero-mutation byte relay: raw body forwarded as-is, minimal header filtering,
  SSE interceptor for cache metrics only (bytes pass through unmodified)
