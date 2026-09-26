[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRequestContext

# Type Alias: ProxyShareRequestContext

> **ProxyShareRequestContext** = `object`

Request-scoped view of the grant serving the current borrowed request.

## Properties

### grantId

> **grantId**: `string`

---

### peerLabel

> **peerLabel**: `string`

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

---

### holdId?

> `optional` **holdId?**: `string`

Pre-authorization opened at admission; settlement closes it.

---

### model?

> `optional` **model?**: `string`

Model the borrower asked for, carried so settlement can price it.
