[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceipt

# Type Alias: ProxyShareReceipt

> **ProxyShareReceipt** = `object`

Defined in: [types/proxy.ts:3699](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3699)

A lender's signed statement that one borrowed request was settled, and for
how much.

`usage` travels with it so the borrower can recompute the charge from the
response it actually received, rather than taking the coin figure on faith.
`sequence` is contiguous per grant, so a withheld receipt shows up as a gap.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3700](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3700)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3701](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3701)

---

### sequence

> **sequence**: `number`

Defined in: [types/proxy.ts:3703](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3703)

Monotonic, contiguous, per grant.

---

### settledAt

> **settledAt**: `number`

Defined in: [types/proxy.ts:3704](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3704)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3705](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3705)

---

### usage

> **usage**: [`ProxyShareUsage`](ProxyShareUsage.md)

Defined in: [types/proxy.ts:3706](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3706)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:3707](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3707)

---

### balanceAfter

> **balanceAfter**: `number` \| `null`

Defined in: [types/proxy.ts:3709](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3709)

Remaining balance after this charge; null on an unlimited grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:3710](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3710)
