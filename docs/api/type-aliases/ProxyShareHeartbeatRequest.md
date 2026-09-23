[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareHeartbeatRequest

# Type Alias: ProxyShareHeartbeatRequest

> **ProxyShareHeartbeatRequest** = `object`

Defined in: [types/proxy.ts:4747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4747)

What a borrower sends when checking in.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4748](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4748)

---

### coinsSpent?

> `optional` **coinsSpent?**: `number`

Defined in: [types/proxy.ts:4750](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4750)

Coins the borrower believes it has spent since the last heartbeat.

---

### requests?

> `optional` **requests?**: `number`

Defined in: [types/proxy.ts:4751](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4751)

---

### reportedAt

> **reportedAt**: `number`

Defined in: [types/proxy.ts:4753](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4753)

Borrower's clock, for drift diagnostics only.
