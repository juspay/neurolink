[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareEntitlement

# Type Alias: ProxyShareEntitlement

> **ProxyShareEntitlement** = `object`

Defined in: [types/proxy.ts:3482](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3482)

## Properties

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3483](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3483)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/proxy.ts:3485](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3485)

Remaining balance when `ledger` is "coins".

---

### refill?

> `optional` **refill?**: `object`

Defined in: [types/proxy.ts:3486](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3486)

#### amount

> **amount**: `number`

#### per

> **per**: [`ProxyShareRefillPeriod`](ProxyShareRefillPeriod.md)

#### lastAt?

> `optional` **lastAt?**: `number`
