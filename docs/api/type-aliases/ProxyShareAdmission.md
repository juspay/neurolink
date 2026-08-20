[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAdmission

# Type Alias: ProxyShareAdmission

> **ProxyShareAdmission** = \{ `admitted`: `true`; `grant`: [`ProxyShareGrant`](ProxyShareGrant.md); \} \| \{ `admitted`: `false`; `status`: `number`; `reason`: [`ProxyShareRefusalReason`](ProxyShareRefusalReason.md); `message`: `string`; `retryAfterSeconds?`: `number`; `grant?`: [`ProxyShareGrant`](ProxyShareGrant.md); \}

Defined in: [types/proxy.ts:3458](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3458)

Result of evaluating an inbound borrowed request.

A refusal carries its own status and reason so the borrower can distinguish
"you are out of credits" from an upstream rate limit. Conflating the two makes
a borrower cool the peer as if it were throttled and retry forever.
