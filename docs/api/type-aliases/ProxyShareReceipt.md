[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceipt

# Type Alias: ProxyShareReceipt

> **ProxyShareReceipt** = `object`

Defined in: [types/proxy.ts:4068](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4068)

A lender's signed statement that one borrowed request was settled, and for
how much.

`usage` travels with it so the borrower can recompute the charge from the
response it actually received, rather than taking the coin figure on faith.
`sequence` is contiguous per grant, so a withheld receipt shows up as a gap.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4069](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4069)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4070](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4070)

---

### sequence

> **sequence**: `number`

Defined in: [types/proxy.ts:4072](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4072)

Monotonic, contiguous, per grant.

---

### settledAt

> **settledAt**: `number`

Defined in: [types/proxy.ts:4073](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4073)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4074](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4074)

---

### usage

> **usage**: [`ProxyShareUsage`](ProxyShareUsage.md)

Defined in: [types/proxy.ts:4075](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4075)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4076](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4076)

---

### balanceAfter

> **balanceAfter**: `number` \| `null`

Defined in: [types/proxy.ts:4078](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4078)

Remaining balance after this charge; null on an unlimited grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4079](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4079)
