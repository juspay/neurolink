[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareEntitlement

# Type Alias: ProxyShareEntitlement

> **ProxyShareEntitlement** = `object`

Defined in: [types/proxy.ts:3375](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3375)

## Properties

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3376](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3376)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/proxy.ts:3378](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3378)

Remaining balance when `ledger` is "coins".

---

### refill?

> `optional` **refill?**: `object`

Defined in: [types/proxy.ts:3379](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3379)

#### amount

> **amount**: `number`

#### per

> **per**: [`ProxyShareRefillPeriod`](ProxyShareRefillPeriod.md)

#### lastAt?

> `optional` **lastAt?**: `number`
