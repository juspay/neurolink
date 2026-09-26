[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerAttempt

# Type Alias: ProxyPeerAttempt

> **ProxyPeerAttempt** = \{ `ok`: `true`; `response`: `Response`; `peer`: [`ProxyPeer`](ProxyPeer.md); \} \| \{ `ok`: `false`; `peer`: [`ProxyPeer`](ProxyPeer.md); `status?`: `number`; `reason`: [`ProxyPeerCooldownReason`](ProxyPeerCooldownReason.md); `message`: `string`; `retryAfterSeconds?`: `number`; \}

Outcome of forwarding one request to one peer.
