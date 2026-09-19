[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareHeartbeatRequest

# Type Alias: ProxyShareHeartbeatRequest

> **ProxyShareHeartbeatRequest** = `object`

Defined in: [types/proxy.ts:4650](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4650)

What a borrower sends when checking in.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4651](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4651)

---

### coinsSpent?

> `optional` **coinsSpent?**: `number`

Defined in: [types/proxy.ts:4653](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4653)

Coins the borrower believes it has spent since the last heartbeat.

---

### requests?

> `optional` **requests?**: `number`

Defined in: [types/proxy.ts:4654](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4654)

---

### reportedAt

> **reportedAt**: `number`

Defined in: [types/proxy.ts:4656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4656)

Borrower's clock, for drift diagnostics only.
