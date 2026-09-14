[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerAttempt

# Type Alias: ProxyPeerAttempt

> **ProxyPeerAttempt** = \{ `ok`: `true`; `response`: `Response`; `peer`: [`ProxyPeer`](ProxyPeer.md); \} \| \{ `ok`: `false`; `peer`: [`ProxyPeer`](ProxyPeer.md); `status?`: `number`; `reason`: [`ProxyPeerCooldownReason`](ProxyPeerCooldownReason.md); `message`: `string`; `retryAfterSeconds?`: `number`; \}

Defined in: [types/proxy.ts:4374](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4374)

Outcome of forwarding one request to one peer.
