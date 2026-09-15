[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareHeartbeatRequest

# Type Alias: ProxyShareHeartbeatRequest

> **ProxyShareHeartbeatRequest** = `object`

Defined in: [types/proxy.ts:4495](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4495)

What a borrower sends when checking in.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4496](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4496)

---

### coinsSpent?

> `optional` **coinsSpent?**: `number`

Defined in: [types/proxy.ts:4498](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4498)

Coins the borrower believes it has spent since the last heartbeat.

---

### requests?

> `optional` **requests?**: `number`

Defined in: [types/proxy.ts:4499](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4499)

---

### reportedAt

> **reportedAt**: `number`

Defined in: [types/proxy.ts:4501](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4501)

Borrower's clock, for drift diagnostics only.
