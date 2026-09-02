[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRequestContext

# Type Alias: ProxyShareRequestContext

> **ProxyShareRequestContext** = `object`

Defined in: [types/proxy.ts:3577](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3577)

Request-scoped view of the grant serving the current borrowed request.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3578](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3578)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:3579](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3579)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3580](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3580)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:3581](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3581)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3582](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3582)

---

### holdId?

> `optional` **holdId?**: `string`

Defined in: [types/proxy.ts:3584](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3584)

Pre-authorization opened at admission; settlement closes it.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3586](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3586)

Model the borrower asked for, carried so settlement can price it.
