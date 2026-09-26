[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRequestContext

# Type Alias: ProxyShareRequestContext

> **ProxyShareRequestContext** = `object`

Defined in: [types/proxy.ts:4328](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4328)

Request-scoped view of the grant serving the current borrowed request.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4329](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4329)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4330](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4330)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:4331](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4331)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4332](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4332)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:4333](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4333)

---

### holdId?

> `optional` **holdId?**: `string`

Defined in: [types/proxy.ts:4335](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4335)

Pre-authorization opened at admission; settlement closes it.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4337](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4337)

Model the borrower asked for, carried so settlement can price it.
