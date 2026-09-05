[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareHeartbeatRequest

# Type Alias: ProxyShareHeartbeatRequest

> **ProxyShareHeartbeatRequest** = `object`

Defined in: [types/proxy.ts:4158](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4158)

What a borrower sends when checking in.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4159)

---

### coinsSpent?

> `optional` **coinsSpent?**: `number`

Defined in: [types/proxy.ts:4161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4161)

Coins the borrower believes it has spent since the last heartbeat.

---

### requests?

> `optional` **requests?**: `number`

Defined in: [types/proxy.ts:4162](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4162)

---

### reportedAt

> **reportedAt**: `number`

Defined in: [types/proxy.ts:4164](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4164)

Borrower's clock, for drift diagnostics only.
