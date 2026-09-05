[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareHeartbeatRequest

# Type Alias: ProxyShareHeartbeatRequest

> **ProxyShareHeartbeatRequest** = `object`

Defined in: [types/proxy.ts:4171](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4171)

What a borrower sends when checking in.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4172](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4172)

---

### coinsSpent?

> `optional` **coinsSpent?**: `number`

Defined in: [types/proxy.ts:4174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4174)

Coins the borrower believes it has spent since the last heartbeat.

---

### requests?

> `optional` **requests?**: `number`

Defined in: [types/proxy.ts:4175](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4175)

---

### reportedAt

> **reportedAt**: `number`

Defined in: [types/proxy.ts:4177](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4177)

Borrower's clock, for drift diagnostics only.
