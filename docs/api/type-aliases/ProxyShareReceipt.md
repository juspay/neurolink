[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceipt

# Type Alias: ProxyShareReceipt

> **ProxyShareReceipt** = `object`

Defined in: [types/proxy.ts:3719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3719)

A lender's signed statement that one borrowed request was settled, and for
how much.

`usage` travels with it so the borrower can recompute the charge from the
response it actually received, rather than taking the coin figure on faith.
`sequence` is contiguous per grant, so a withheld receipt shows up as a gap.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3720](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3720)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3721](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3721)

---

### sequence

> **sequence**: `number`

Defined in: [types/proxy.ts:3723](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3723)

Monotonic, contiguous, per grant.

---

### settledAt

> **settledAt**: `number`

Defined in: [types/proxy.ts:3724](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3724)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3725](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3725)

---

### usage

> **usage**: [`ProxyShareUsage`](ProxyShareUsage.md)

Defined in: [types/proxy.ts:3726](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3726)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:3727](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3727)

---

### balanceAfter

> **balanceAfter**: `number` \| `null`

Defined in: [types/proxy.ts:3729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3729)

Remaining balance after this charge; null on an unlimited grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:3730](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3730)
