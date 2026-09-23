[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceipt

# Type Alias: ProxyShareReceipt

> **ProxyShareReceipt** = `object`

Defined in: [types/proxy.ts:4315](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4315)

A lender's signed statement that one borrowed request was settled, and for
how much.

`usage` travels with it so the borrower can recompute the charge from the
response it actually received, rather than taking the coin figure on faith.
`sequence` is contiguous per grant, so a withheld receipt shows up as a gap.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4316](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4316)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4317](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4317)

---

### sequence

> **sequence**: `number`

Defined in: [types/proxy.ts:4319](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4319)

Monotonic, contiguous, per grant.

---

### settledAt

> **settledAt**: `number`

Defined in: [types/proxy.ts:4320](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4320)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4321](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4321)

---

### usage

> **usage**: [`ProxyShareUsage`](ProxyShareUsage.md)

Defined in: [types/proxy.ts:4322](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4322)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4323](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4323)

---

### balanceAfter

> **balanceAfter**: `number` \| `null`

Defined in: [types/proxy.ts:4325](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4325)

Remaining balance after this charge; null on an unlimited grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4326](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4326)
