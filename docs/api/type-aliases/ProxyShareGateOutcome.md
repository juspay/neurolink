[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGateOutcome

# Type Alias: ProxyShareGateOutcome

> **ProxyShareGateOutcome** = \{ `kind`: `"local"`; \} \| \{ `kind`: `"admitted"`; `context`: [`ProxyShareRequestContext`](ProxyShareRequestContext.md); `release`: () => `void`; \} \| \{ `kind`: `"refused"`; `response`: [`ProxyShareRefusalResponse`](ProxyShareRefusalResponse.md); \}

Defined in: [types/proxy.ts:3887](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3887)

What the inbound gate decided.

`local` is the unauthenticated path a node's own client takes on loopback; it
carries no grant and no accounting. `admitted` owns a concurrency slot that
the caller must release. `refused` is ready to write to the wire as-is.
