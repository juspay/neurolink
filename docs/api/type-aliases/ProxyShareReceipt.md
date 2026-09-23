[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceipt

# Type Alias: ProxyShareReceipt

> **ProxyShareReceipt** = `object`

Defined in: [types/proxy.ts:4295](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4295)

A lender's signed statement that one borrowed request was settled, and for
how much.

`usage` travels with it so the borrower can recompute the charge from the
response it actually received, rather than taking the coin figure on faith.
`sequence` is contiguous per grant, so a withheld receipt shows up as a gap.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4296](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4296)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4297](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4297)

---

### sequence

> **sequence**: `number`

Defined in: [types/proxy.ts:4299](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4299)

Monotonic, contiguous, per grant.

---

### settledAt

> **settledAt**: `number`

Defined in: [types/proxy.ts:4300](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4300)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4301](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4301)

---

### usage

> **usage**: [`ProxyShareUsage`](ProxyShareUsage.md)

Defined in: [types/proxy.ts:4302](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4302)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4303](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4303)

---

### balanceAfter

> **balanceAfter**: `number` \| `null`

Defined in: [types/proxy.ts:4305](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4305)

Remaining balance after this charge; null on an unlimited grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4306](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4306)
