[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyMode

# Type Alias: ProxyMode

> **ProxyMode** = `"full"` \| `"passthrough"` \| `"transparent"`

Defined in: [types/proxy.ts:447](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L447)

Proxy operating mode:

- "full" — managed accounts, retry, rotation, polyfill (default)
- "passthrough" — no polyfill/retry/rotation, but body is still parsed and re-serialized
- "transparent" — zero-mutation byte relay: raw body forwarded as-is, minimal header filtering,
  SSE interceptor for cache metrics only (bytes pass through unmodified)
