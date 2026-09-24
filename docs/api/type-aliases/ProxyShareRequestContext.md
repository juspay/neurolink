[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRequestContext

# Type Alias: ProxyShareRequestContext

> **ProxyShareRequestContext** = `object`

Defined in: [types/proxy.ts:4318](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4318)

Request-scoped view of the grant serving the current borrowed request.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4319](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4319)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4320](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4320)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:4321](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4321)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4322](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4322)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:4323](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4323)

---

### holdId?

> `optional` **holdId?**: `string`

Defined in: [types/proxy.ts:4325](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4325)

Pre-authorization opened at admission; settlement closes it.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4327](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4327)

Model the borrower asked for, carried so settlement can price it.
