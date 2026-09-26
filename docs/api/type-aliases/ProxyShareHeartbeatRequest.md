[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareHeartbeatRequest

# Type Alias: ProxyShareHeartbeatRequest

> **ProxyShareHeartbeatRequest** = `object`

Defined in: [types/proxy.ts:4902](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4902)

What a borrower sends when checking in.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4903](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4903)

---

### coinsSpent?

> `optional` **coinsSpent?**: `number`

Defined in: [types/proxy.ts:4905](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4905)

Coins the borrower believes it has spent since the last heartbeat.

---

### requests?

> `optional` **requests?**: `number`

Defined in: [types/proxy.ts:4906](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4906)

---

### reportedAt

> **reportedAt**: `number`

Defined in: [types/proxy.ts:4908](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4908)

Borrower's clock, for drift diagnostics only.
