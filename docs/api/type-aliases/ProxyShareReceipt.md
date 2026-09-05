[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceipt

# Type Alias: ProxyShareReceipt

> **ProxyShareReceipt** = `object`

Defined in: [types/proxy.ts:3706](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3706)

A lender's signed statement that one borrowed request was settled, and for
how much.

`usage` travels with it so the borrower can recompute the charge from the
response it actually received, rather than taking the coin figure on faith.
`sequence` is contiguous per grant, so a withheld receipt shows up as a gap.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3707](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3707)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3708](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3708)

---

### sequence

> **sequence**: `number`

Defined in: [types/proxy.ts:3710](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3710)

Monotonic, contiguous, per grant.

---

### settledAt

> **settledAt**: `number`

Defined in: [types/proxy.ts:3711](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3711)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3712](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3712)

---

### usage

> **usage**: [`ProxyShareUsage`](ProxyShareUsage.md)

Defined in: [types/proxy.ts:3713](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3713)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:3714](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3714)

---

### balanceAfter

> **balanceAfter**: `number` \| `null`

Defined in: [types/proxy.ts:3716](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3716)

Remaining balance after this charge; null on an unlimited grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:3717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3717)
