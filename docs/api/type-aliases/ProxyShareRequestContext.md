[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRequestContext

# Type Alias: ProxyShareRequestContext

> **ProxyShareRequestContext** = `object`

Defined in: [types/proxy.ts:3907](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3907)

Request-scoped view of the grant serving the current borrowed request.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3908](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3908)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:3909](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3909)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3910](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3910)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:3911](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3911)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3912](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3912)

---

### holdId?

> `optional` **holdId?**: `string`

Defined in: [types/proxy.ts:3914](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3914)

Pre-authorization opened at admission; settlement closes it.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3916](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3916)

Model the borrower asked for, carried so settlement can price it.
