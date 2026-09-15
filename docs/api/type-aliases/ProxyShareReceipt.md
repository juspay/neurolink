[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceipt

# Type Alias: ProxyShareReceipt

> **ProxyShareReceipt** = `object`

Defined in: [types/proxy.ts:4043](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4043)

A lender's signed statement that one borrowed request was settled, and for
how much.

`usage` travels with it so the borrower can recompute the charge from the
response it actually received, rather than taking the coin figure on faith.
`sequence` is contiguous per grant, so a withheld receipt shows up as a gap.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4044](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4044)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4045](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4045)

---

### sequence

> **sequence**: `number`

Defined in: [types/proxy.ts:4047](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4047)

Monotonic, contiguous, per grant.

---

### settledAt

> **settledAt**: `number`

Defined in: [types/proxy.ts:4048](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4048)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4049](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4049)

---

### usage

> **usage**: [`ProxyShareUsage`](ProxyShareUsage.md)

Defined in: [types/proxy.ts:4050](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4050)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4051](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4051)

---

### balanceAfter

> **balanceAfter**: `number` \| `null`

Defined in: [types/proxy.ts:4053](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4053)

Remaining balance after this charge; null on an unlimited grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4054](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4054)
