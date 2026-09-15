[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareEntitlement

# Type Alias: ProxyShareEntitlement

> **ProxyShareEntitlement** = `object`

Defined in: [types/proxy.ts:3820](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3820)

## Properties

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3821](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3821)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/proxy.ts:3823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3823)

Remaining balance when `ledger` is "coins".

---

### refill?

> `optional` **refill?**: `object`

Defined in: [types/proxy.ts:3824](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3824)

#### amount

> **amount**: `number`

#### per

> **per**: [`ProxyShareRefillPeriod`](ProxyShareRefillPeriod.md)

#### lastAt?

> `optional` **lastAt?**: `number`
