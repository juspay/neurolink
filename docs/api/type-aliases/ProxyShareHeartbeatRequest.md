[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareHeartbeatRequest

# Type Alias: ProxyShareHeartbeatRequest

> **ProxyShareHeartbeatRequest** = `object`

Defined in: [types/proxy.ts:4767](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4767)

What a borrower sends when checking in.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4768](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4768)

---

### coinsSpent?

> `optional` **coinsSpent?**: `number`

Defined in: [types/proxy.ts:4770](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4770)

Coins the borrower believes it has spent since the last heartbeat.

---

### requests?

> `optional` **requests?**: `number`

Defined in: [types/proxy.ts:4771](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4771)

---

### reportedAt

> **reportedAt**: `number`

Defined in: [types/proxy.ts:4773](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4773)

Borrower's clock, for drift diagnostics only.
