[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRequestContext

# Type Alias: ProxyShareRequestContext

> **ProxyShareRequestContext** = `object`

Defined in: [types/proxy.ts:4268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4268)

Request-scoped view of the grant serving the current borrowed request.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4269](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4269)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4270](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4270)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:4271](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4271)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4272](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4272)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:4273](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4273)

---

### holdId?

> `optional` **holdId?**: `string`

Defined in: [types/proxy.ts:4275](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4275)

Pre-authorization opened at admission; settlement closes it.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4277](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4277)

Model the borrower asked for, carried so settlement can price it.
