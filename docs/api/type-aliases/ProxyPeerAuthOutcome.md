[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerAuthOutcome

# Type Alias: ProxyPeerAuthOutcome

> **ProxyPeerAuthOutcome** = \{ `ok`: `true`; `grant`: [`ProxyShareGrant`](ProxyShareGrant.md); \} \| \{ `ok`: `false`; `body`: [`ProxyShareRefusalResponse`](ProxyShareRefusalResponse.md)\[`"body"`\]; \}

Result of authenticating a `/peer/*` caller by its share token.
