[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceipt

# Type Alias: ProxyShareReceipt

> **ProxyShareReceipt** = `object`

Defined in: [types/proxy.ts:3598](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3598)

A lender's signed statement that one borrowed request was settled, and for
how much.

`usage` travels with it so the borrower can recompute the charge from the
response it actually received, rather than taking the coin figure on faith.
`sequence` is contiguous per grant, so a withheld receipt shows up as a gap.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3599](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3599)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3600](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3600)

---

### sequence

> **sequence**: `number`

Defined in: [types/proxy.ts:3602](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3602)

Monotonic, contiguous, per grant.

---

### settledAt

> **settledAt**: `number`

Defined in: [types/proxy.ts:3603](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3603)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3604](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3604)

---

### usage

> **usage**: [`ProxyShareUsage`](ProxyShareUsage.md)

Defined in: [types/proxy.ts:3605](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3605)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:3606](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3606)

---

### balanceAfter

> **balanceAfter**: `number` \| `null`

Defined in: [types/proxy.ts:3608](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3608)

Remaining balance after this charge; null on an unlimited grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:3609](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3609)
