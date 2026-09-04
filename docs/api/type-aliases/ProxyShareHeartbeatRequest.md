[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareHeartbeatRequest

# Type Alias: ProxyShareHeartbeatRequest

> **ProxyShareHeartbeatRequest** = `object`

Defined in: [types/proxy.ts:4157](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4157)

What a borrower sends when checking in.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4158](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4158)

---

### coinsSpent?

> `optional` **coinsSpent?**: `number`

Defined in: [types/proxy.ts:4160](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4160)

Coins the borrower believes it has spent since the last heartbeat.

---

### requests?

> `optional` **requests?**: `number`

Defined in: [types/proxy.ts:4161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4161)

---

### reportedAt

> **reportedAt**: `number`

Defined in: [types/proxy.ts:4163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4163)

Borrower's clock, for drift diagnostics only.
