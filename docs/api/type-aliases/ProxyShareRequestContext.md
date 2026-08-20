[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRequestContext

# Type Alias: ProxyShareRequestContext

> **ProxyShareRequestContext** = `object`

Defined in: [types/proxy.ts:3476](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3476)

Request-scoped view of the grant serving the current borrowed request.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3477](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3477)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:3478](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3478)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3479](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3479)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:3480](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3480)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3481](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3481)

---

### holdId?

> `optional` **holdId?**: `string`

Defined in: [types/proxy.ts:3483](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3483)

Pre-authorization opened at admission; settlement closes it.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3485](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3485)

Model the borrower asked for, carried so settlement can price it.
