[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareHeartbeatRequest

# Type Alias: ProxyShareHeartbeatRequest

> **ProxyShareHeartbeatRequest** = `object`

Defined in: [types/proxy.ts:4142](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4142)

What a borrower sends when checking in.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4143](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4143)

---

### coinsSpent?

> `optional` **coinsSpent?**: `number`

Defined in: [types/proxy.ts:4145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4145)

Coins the borrower believes it has spent since the last heartbeat.

---

### requests?

> `optional` **requests?**: `number`

Defined in: [types/proxy.ts:4146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4146)

---

### reportedAt

> **reportedAt**: `number`

Defined in: [types/proxy.ts:4148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4148)

Borrower's clock, for drift diagnostics only.
