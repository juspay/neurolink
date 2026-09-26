[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceipt

# Type Alias: ProxyShareReceipt

> **ProxyShareReceipt** = `object`

Defined in: [types/proxy.ts:4390](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4390)

A lender's signed statement that one borrowed request was settled, and for
how much.

`usage` travels with it so the borrower can recompute the charge from the
response it actually received, rather than taking the coin figure on faith.
`sequence` is contiguous per grant, so a withheld receipt shows up as a gap.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4391](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4391)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4392](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4392)

---

### sequence

> **sequence**: `number`

Defined in: [types/proxy.ts:4394](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4394)

Monotonic, contiguous, per grant.

---

### settledAt

> **settledAt**: `number`

Defined in: [types/proxy.ts:4395](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4395)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4396](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4396)

---

### usage

> **usage**: [`ProxyShareUsage`](ProxyShareUsage.md)

Defined in: [types/proxy.ts:4397](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4397)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4398](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4398)

---

### balanceAfter

> **balanceAfter**: `number` \| `null`

Defined in: [types/proxy.ts:4400](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4400)

Remaining balance after this charge; null on an unlimited grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4401](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4401)
