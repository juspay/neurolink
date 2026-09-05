[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRequestContext

# Type Alias: ProxyShareRequestContext

> **ProxyShareRequestContext** = `object`

Defined in: [types/proxy.ts:3597](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3597)

Request-scoped view of the grant serving the current borrowed request.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3598](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3598)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:3599](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3599)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3600](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3600)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:3601](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3601)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3602](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3602)

---

### holdId?

> `optional` **holdId?**: `string`

Defined in: [types/proxy.ts:3604](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3604)

Pre-authorization opened at admission; settlement closes it.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3606](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3606)

Model the borrower asked for, carried so settlement can price it.
