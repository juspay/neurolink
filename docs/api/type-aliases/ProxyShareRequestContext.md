[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRequestContext

# Type Alias: ProxyShareRequestContext

> **ProxyShareRequestContext** = `object`

Defined in: [types/proxy.ts:4076](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4076)

Request-scoped view of the grant serving the current borrowed request.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4077](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4077)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4078](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4078)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:4079](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4079)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4080](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4080)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:4081](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4081)

---

### holdId?

> `optional` **holdId?**: `string`

Defined in: [types/proxy.ts:4083](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4083)

Pre-authorization opened at admission; settlement closes it.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4085](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4085)

Model the borrower asked for, carried so settlement can price it.
