[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRequestContext

# Type Alias: ProxyShareRequestContext

> **ProxyShareRequestContext** = `object`

Defined in: [types/proxy.ts:3925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3925)

Request-scoped view of the grant serving the current borrowed request.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3926](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3926)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:3927](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3927)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3928)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:3929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3929)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3930)

---

### holdId?

> `optional` **holdId?**: `string`

Defined in: [types/proxy.ts:3932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3932)

Pre-authorization opened at admission; settlement closes it.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3934)

Model the borrower asked for, carried so settlement can price it.
