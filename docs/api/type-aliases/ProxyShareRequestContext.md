[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRequestContext

# Type Alias: ProxyShareRequestContext

> **ProxyShareRequestContext** = `object`

Defined in: [types/proxy.ts:3946](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3946)

Request-scoped view of the grant serving the current borrowed request.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3947](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3947)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:3948](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3948)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3949](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3949)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:3950](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3950)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3951](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3951)

---

### holdId?

> `optional` **holdId?**: `string`

Defined in: [types/proxy.ts:3953](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3953)

Pre-authorization opened at admission; settlement closes it.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3955](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3955)

Model the borrower asked for, carried so settlement can price it.
