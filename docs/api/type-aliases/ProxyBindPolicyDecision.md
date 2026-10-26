[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBindPolicyDecision

# Type Alias: ProxyBindPolicyDecision

> **ProxyBindPolicyDecision** = \{ `allowed`: `true`; `warning?`: `string`; \} \| \{ `allowed`: `false`; `reason`: `string`; \}

Whether a listener may bind where it was asked to.

A non-loopback bind needs something in front of the pooled subscriptions:
the share gate (`NEUROLINK_PROXY_REQUIRE_GRANT`), an inbound token, or the
operator's explicit `allowUnauthenticated`.
