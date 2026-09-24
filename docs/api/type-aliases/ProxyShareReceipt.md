[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceipt

# Type Alias: ProxyShareReceipt

> **ProxyShareReceipt** = `object`

Defined in: [types/proxy.ts:4440](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4440)

A lender's signed statement that one borrowed request was settled, and for
how much.

`usage` travels with it so the borrower can recompute the charge from the
response it actually received, rather than taking the coin figure on faith.
`sequence` is contiguous per grant, so a withheld receipt shows up as a gap.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4441](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4441)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4442](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4442)

---

### sequence

> **sequence**: `number`

Defined in: [types/proxy.ts:4444](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4444)

Monotonic, contiguous, per grant.

---

### settledAt

> **settledAt**: `number`

Defined in: [types/proxy.ts:4445](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4445)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4446](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4446)

---

### usage

> **usage**: [`ProxyShareUsage`](ProxyShareUsage.md)

Defined in: [types/proxy.ts:4447](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4447)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4448](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4448)

---

### balanceAfter

> **balanceAfter**: `number` \| `null`

Defined in: [types/proxy.ts:4450](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4450)

Remaining balance after this charge; null on an unlimited grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4451](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4451)
