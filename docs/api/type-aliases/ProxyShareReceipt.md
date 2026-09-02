[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceipt

# Type Alias: ProxyShareReceipt

> **ProxyShareReceipt** = `object`

Defined in: [types/proxy.ts:3690](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3690)

A lender's signed statement that one borrowed request was settled, and for
how much.

`usage` travels with it so the borrower can recompute the charge from the
response it actually received, rather than taking the coin figure on faith.
`sequence` is contiguous per grant, so a withheld receipt shows up as a gap.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3691](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3691)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3692](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3692)

---

### sequence

> **sequence**: `number`

Defined in: [types/proxy.ts:3694](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3694)

Monotonic, contiguous, per grant.

---

### settledAt

> **settledAt**: `number`

Defined in: [types/proxy.ts:3695](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3695)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3696](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3696)

---

### usage

> **usage**: [`ProxyShareUsage`](ProxyShareUsage.md)

Defined in: [types/proxy.ts:3697](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3697)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:3698](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3698)

---

### balanceAfter

> **balanceAfter**: `number` \| `null`

Defined in: [types/proxy.ts:3700](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3700)

Remaining balance after this charge; null on an unlimited grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:3701](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3701)
