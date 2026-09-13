[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceipt

# Type Alias: ProxyShareReceipt

> **ProxyShareReceipt** = `object`

Defined in: [types/proxy.ts:3918](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3918)

A lender's signed statement that one borrowed request was settled, and for
how much.

`usage` travels with it so the borrower can recompute the charge from the
response it actually received, rather than taking the coin figure on faith.
`sequence` is contiguous per grant, so a withheld receipt shows up as a gap.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3919)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3920](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3920)

---

### sequence

> **sequence**: `number`

Defined in: [types/proxy.ts:3922](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3922)

Monotonic, contiguous, per grant.

---

### settledAt

> **settledAt**: `number`

Defined in: [types/proxy.ts:3923](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3923)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3924](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3924)

---

### usage

> **usage**: [`ProxyShareUsage`](ProxyShareUsage.md)

Defined in: [types/proxy.ts:3925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3925)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:3926](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3926)

---

### balanceAfter

> **balanceAfter**: `number` \| `null`

Defined in: [types/proxy.ts:3928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3928)

Remaining balance after this charge; null on an unlimited grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:3929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3929)
