[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareEntitlement

# Type Alias: ProxyShareEntitlement

> **ProxyShareEntitlement** = `object`

Defined in: [types/proxy.ts:3806](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3806)

## Properties

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3807](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3807)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/proxy.ts:3809](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3809)

Remaining balance when `ledger` is "coins".

---

### refill?

> `optional` **refill?**: `object`

Defined in: [types/proxy.ts:3810](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3810)

#### amount

> **amount**: `number`

#### per

> **per**: [`ProxyShareRefillPeriod`](ProxyShareRefillPeriod.md)

#### lastAt?

> `optional` **lastAt?**: `number`
