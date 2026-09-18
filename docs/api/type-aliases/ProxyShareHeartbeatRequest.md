[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareHeartbeatRequest

# Type Alias: ProxyShareHeartbeatRequest

> **ProxyShareHeartbeatRequest** = `object`

Defined in: [types/proxy.ts:4520](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4520)

What a borrower sends when checking in.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4521](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4521)

---

### coinsSpent?

> `optional` **coinsSpent?**: `number`

Defined in: [types/proxy.ts:4523](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4523)

Coins the borrower believes it has spent since the last heartbeat.

---

### requests?

> `optional` **requests?**: `number`

Defined in: [types/proxy.ts:4524](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4524)

---

### reportedAt

> **reportedAt**: `number`

Defined in: [types/proxy.ts:4526](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4526)

Borrower's clock, for drift diagnostics only.
