[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareHeartbeatRequest

# Type Alias: ProxyShareHeartbeatRequest

> **ProxyShareHeartbeatRequest** = `object`

Defined in: [types/proxy.ts:4151](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4151)

What a borrower sends when checking in.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4152](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4152)

---

### coinsSpent?

> `optional` **coinsSpent?**: `number`

Defined in: [types/proxy.ts:4154](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4154)

Coins the borrower believes it has spent since the last heartbeat.

---

### requests?

> `optional` **requests?**: `number`

Defined in: [types/proxy.ts:4155](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4155)

---

### reportedAt

> **reportedAt**: `number`

Defined in: [types/proxy.ts:4157](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4157)

Borrower's clock, for drift diagnostics only.
