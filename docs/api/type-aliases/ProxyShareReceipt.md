[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceipt

# Type Alias: ProxyShareReceipt

> **ProxyShareReceipt** = `object`

A lender's signed statement that one borrowed request was settled, and for
how much.

`usage` travels with it so the borrower can recompute the charge from the
response it actually received, rather than taking the coin figure on faith.
`sequence` is contiguous per grant, so a withheld receipt shows up as a gap.

## Properties

### schemaVersion

> **schemaVersion**: `1`

---

### grantId

> **grantId**: `string`

---

### sequence

> **sequence**: `number`

Monotonic, contiguous, per grant.

---

### settledAt

> **settledAt**: `number`

---

### model?

> `optional` **model?**: `string`

---

### usage

> **usage**: [`ProxyShareUsage`](ProxyShareUsage.md)

---

### coins

> **coins**: `number`

---

### balanceAfter

> **balanceAfter**: `number` \| `null`

Remaining balance after this charge; null on an unlimited grant.

---

### signature

> **signature**: `string`
