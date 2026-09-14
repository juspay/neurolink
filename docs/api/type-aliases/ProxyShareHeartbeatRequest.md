[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareHeartbeatRequest

# Type Alias: ProxyShareHeartbeatRequest

> **ProxyShareHeartbeatRequest** = `object`

Defined in: [types/proxy.ts:4481](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4481)

What a borrower sends when checking in.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4482](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4482)

---

### coinsSpent?

> `optional` **coinsSpent?**: `number`

Defined in: [types/proxy.ts:4484](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4484)

Coins the borrower believes it has spent since the last heartbeat.

---

### requests?

> `optional` **requests?**: `number`

Defined in: [types/proxy.ts:4485](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4485)

---

### reportedAt

> **reportedAt**: `number`

Defined in: [types/proxy.ts:4487](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4487)

Borrower's clock, for drift diagnostics only.
