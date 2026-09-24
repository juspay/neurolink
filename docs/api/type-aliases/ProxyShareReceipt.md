[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceipt

# Type Alias: ProxyShareReceipt

> **ProxyShareReceipt** = `object`

Defined in: [types/proxy.ts:4318](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4318)

A lender's signed statement that one borrowed request was settled, and for
how much.

`usage` travels with it so the borrower can recompute the charge from the
response it actually received, rather than taking the coin figure on faith.
`sequence` is contiguous per grant, so a withheld receipt shows up as a gap.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4319](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4319)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4320](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4320)

---

### sequence

> **sequence**: `number`

Defined in: [types/proxy.ts:4322](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4322)

Monotonic, contiguous, per grant.

---

### settledAt

> **settledAt**: `number`

Defined in: [types/proxy.ts:4323](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4323)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4324](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4324)

---

### usage

> **usage**: [`ProxyShareUsage`](ProxyShareUsage.md)

Defined in: [types/proxy.ts:4325](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4325)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4326](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4326)

---

### balanceAfter

> **balanceAfter**: `number` \| `null`

Defined in: [types/proxy.ts:4328](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4328)

Remaining balance after this charge; null on an unlimited grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4329](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4329)
