[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareHeartbeatRequest

# Type Alias: ProxyShareHeartbeatRequest

> **ProxyShareHeartbeatRequest** = `object`

Defined in: [types/proxy.ts:4842](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4842)

What a borrower sends when checking in.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4843](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4843)

---

### coinsSpent?

> `optional` **coinsSpent?**: `number`

Defined in: [types/proxy.ts:4845](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4845)

Coins the borrower believes it has spent since the last heartbeat.

---

### requests?

> `optional` **requests?**: `number`

Defined in: [types/proxy.ts:4846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4846)

---

### reportedAt

> **reportedAt**: `number`

Defined in: [types/proxy.ts:4848](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4848)

Borrower's clock, for drift diagnostics only.
