[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceipt

# Type Alias: ProxyShareReceipt

> **ProxyShareReceipt** = `object`

Defined in: [types/proxy.ts:4047](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4047)

A lender's signed statement that one borrowed request was settled, and for
how much.

`usage` travels with it so the borrower can recompute the charge from the
response it actually received, rather than taking the coin figure on faith.
`sequence` is contiguous per grant, so a withheld receipt shows up as a gap.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4048](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4048)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4049](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4049)

---

### sequence

> **sequence**: `number`

Defined in: [types/proxy.ts:4051](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4051)

Monotonic, contiguous, per grant.

---

### settledAt

> **settledAt**: `number`

Defined in: [types/proxy.ts:4052](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4052)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4053](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4053)

---

### usage

> **usage**: [`ProxyShareUsage`](ProxyShareUsage.md)

Defined in: [types/proxy.ts:4054](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4054)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4055](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4055)

---

### balanceAfter

> **balanceAfter**: `number` \| `null`

Defined in: [types/proxy.ts:4057](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4057)

Remaining balance after this charge; null on an unlimited grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4058](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4058)
