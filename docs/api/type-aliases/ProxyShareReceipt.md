[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceipt

# Type Alias: ProxyShareReceipt

> **ProxyShareReceipt** = `object`

Defined in: [types/proxy.ts:4450](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4450)

A lender's signed statement that one borrowed request was settled, and for
how much.

`usage` travels with it so the borrower can recompute the charge from the
response it actually received, rather than taking the coin figure on faith.
`sequence` is contiguous per grant, so a withheld receipt shows up as a gap.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4451](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4451)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4452](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4452)

---

### sequence

> **sequence**: `number`

Defined in: [types/proxy.ts:4454](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4454)

Monotonic, contiguous, per grant.

---

### settledAt

> **settledAt**: `number`

Defined in: [types/proxy.ts:4455](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4455)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4456](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4456)

---

### usage

> **usage**: [`ProxyShareUsage`](ProxyShareUsage.md)

Defined in: [types/proxy.ts:4457](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4457)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4458](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4458)

---

### balanceAfter

> **balanceAfter**: `number` \| `null`

Defined in: [types/proxy.ts:4460](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4460)

Remaining balance after this charge; null on an unlimited grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4461](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4461)
