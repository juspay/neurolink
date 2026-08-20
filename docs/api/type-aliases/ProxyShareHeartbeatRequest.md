[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareHeartbeatRequest

# Type Alias: ProxyShareHeartbeatRequest

> **ProxyShareHeartbeatRequest** = `object`

Defined in: [types/proxy.ts:4050](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4050)

What a borrower sends when checking in.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4051](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4051)

---

### coinsSpent?

> `optional` **coinsSpent?**: `number`

Defined in: [types/proxy.ts:4053](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4053)

Coins the borrower believes it has spent since the last heartbeat.

---

### requests?

> `optional` **requests?**: `number`

Defined in: [types/proxy.ts:4054](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4054)

---

### reportedAt

> **reportedAt**: `number`

Defined in: [types/proxy.ts:4056](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4056)

Borrower's clock, for drift diagnostics only.
