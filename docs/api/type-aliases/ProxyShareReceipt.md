[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceipt

# Type Alias: ProxyShareReceipt

> **ProxyShareReceipt** = `object`

Defined in: [types/proxy.ts:4029](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4029)

A lender's signed statement that one borrowed request was settled, and for
how much.

`usage` travels with it so the borrower can recompute the charge from the
response it actually received, rather than taking the coin figure on faith.
`sequence` is contiguous per grant, so a withheld receipt shows up as a gap.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4030](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4030)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4031](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4031)

---

### sequence

> **sequence**: `number`

Defined in: [types/proxy.ts:4033](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4033)

Monotonic, contiguous, per grant.

---

### settledAt

> **settledAt**: `number`

Defined in: [types/proxy.ts:4034](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4034)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4035](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4035)

---

### usage

> **usage**: [`ProxyShareUsage`](ProxyShareUsage.md)

Defined in: [types/proxy.ts:4036](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4036)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4037](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4037)

---

### balanceAfter

> **balanceAfter**: `number` \| `null`

Defined in: [types/proxy.ts:4039](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4039)

Remaining balance after this charge; null on an unlimited grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4040](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4040)
