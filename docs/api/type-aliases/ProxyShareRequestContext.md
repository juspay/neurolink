[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRequestContext

# Type Alias: ProxyShareRequestContext

> **ProxyShareRequestContext** = `object`

Defined in: [types/proxy.ts:4196](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4196)

Request-scoped view of the grant serving the current borrowed request.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4197](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4197)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4198)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:4199](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4199)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4200](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4200)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:4201](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4201)

---

### holdId?

> `optional` **holdId?**: `string`

Defined in: [types/proxy.ts:4203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4203)

Pre-authorization opened at admission; settlement closes it.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4205](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4205)

Model the borrower asked for, carried so settlement can price it.
