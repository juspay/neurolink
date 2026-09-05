[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareEntitlement

# Type Alias: ProxyShareEntitlement

> **ProxyShareEntitlement** = `object`

Defined in: [types/proxy.ts:3483](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3483)

## Properties

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3484](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3484)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/proxy.ts:3486](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3486)

Remaining balance when `ledger` is "coins".

---

### refill?

> `optional` **refill?**: `object`

Defined in: [types/proxy.ts:3487](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3487)

#### amount

> **amount**: `number`

#### per

> **per**: [`ProxyShareRefillPeriod`](ProxyShareRefillPeriod.md)

#### lastAt?

> `optional` **lastAt?**: `number`
