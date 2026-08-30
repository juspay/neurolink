[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRequestContext

# Type Alias: ProxyShareRequestContext

> **ProxyShareRequestContext** = `object`

Defined in: [types/proxy.ts:3546](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3546)

Request-scoped view of the grant serving the current borrowed request.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3547](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3547)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:3548](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3548)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3549](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3549)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:3550](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3550)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3551](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3551)

---

### holdId?

> `optional` **holdId?**: `string`

Defined in: [types/proxy.ts:3553](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3553)

Pre-authorization opened at admission; settlement closes it.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3555](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3555)

Model the borrower asked for, carried so settlement can price it.
