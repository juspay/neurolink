[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerAuthOutcome

# Type Alias: ProxyPeerAuthOutcome

> **ProxyPeerAuthOutcome** = \{ `ok`: `true`; `grant`: [`ProxyShareGrant`](ProxyShareGrant.md); \} \| \{ `ok`: `false`; `body`: [`ProxyShareRefusalResponse`](ProxyShareRefusalResponse.md)\[`"body"`\]; \}

Defined in: [types/proxy.ts:3831](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3831)

Result of authenticating a `/peer/*` caller by its share token.
