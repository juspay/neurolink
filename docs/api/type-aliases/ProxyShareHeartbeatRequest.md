[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareHeartbeatRequest

# Type Alias: ProxyShareHeartbeatRequest

> **ProxyShareHeartbeatRequest** = `object`

Defined in: [types/proxy.ts:4892](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4892)

What a borrower sends when checking in.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4893](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4893)

---

### coinsSpent?

> `optional` **coinsSpent?**: `number`

Defined in: [types/proxy.ts:4895](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4895)

Coins the borrower believes it has spent since the last heartbeat.

---

### requests?

> `optional` **requests?**: `number`

Defined in: [types/proxy.ts:4896](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4896)

---

### reportedAt

> **reportedAt**: `number`

Defined in: [types/proxy.ts:4898](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4898)

Borrower's clock, for drift diagnostics only.
