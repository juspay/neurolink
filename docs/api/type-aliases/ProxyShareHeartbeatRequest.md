[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareHeartbeatRequest

# Type Alias: ProxyShareHeartbeatRequest

> **ProxyShareHeartbeatRequest** = `object`

Defined in: [types/proxy.ts:4499](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4499)

What a borrower sends when checking in.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4500](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4500)

---

### coinsSpent?

> `optional` **coinsSpent?**: `number`

Defined in: [types/proxy.ts:4502](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4502)

Coins the borrower believes it has spent since the last heartbeat.

---

### requests?

> `optional` **requests?**: `number`

Defined in: [types/proxy.ts:4503](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4503)

---

### reportedAt

> **reportedAt**: `number`

Defined in: [types/proxy.ts:4505](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4505)

Borrower's clock, for drift diagnostics only.
