[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRequestContext

# Type Alias: ProxyShareRequestContext

> **ProxyShareRequestContext** = `object`

Defined in: [types/proxy.ts:3568](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3568)

Request-scoped view of the grant serving the current borrowed request.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3569)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:3570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3570)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3571)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:3572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3572)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3573)

---

### holdId?

> `optional` **holdId?**: `string`

Defined in: [types/proxy.ts:3575](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3575)

Pre-authorization opened at admission; settlement closes it.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3577](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3577)

Model the borrower asked for, carried so settlement can price it.
