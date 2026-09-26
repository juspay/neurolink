[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerLimitsSnapshot

# Type Alias: ProxyPeerLimitsSnapshot

> **ProxyPeerLimitsSnapshot** = `object`

Defined in: [types/proxy.ts:4604](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4604)

What `GET /peer/limits` tells a borrower.

Scoped to the caller's own grant on purpose: it carries no account labels and
no per-account figures, so it cannot be used to describe — or count — the
lender's pool. `null` on a slice means no ceiling is configured for that
window, which is different from a ceiling with nothing left.

## Properties

### grantState

> **grantState**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:4605](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4605)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:4606](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4606)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:4607](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4607)

---

### remainingCoins?

> `optional` **remainingCoins?**: `number`

Defined in: [types/proxy.ts:4608](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4608)

---

### servable

> **servable**: `boolean`

Defined in: [types/proxy.ts:4610](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4610)

Whether at least one of the lender's accounts can serve this grant now.

---

### withheldReason?

> `optional` **withheldReason?**: [`ProxyShareRefusalReason`](ProxyShareRefusalReason.md)

Defined in: [types/proxy.ts:4611](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4611)

---

### sliceLeftPct

> **sliceLeftPct**: `object`

Defined in: [types/proxy.ts:4612](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4612)

#### session

> **session**: `number` \| `null`

#### weekly

> **weekly**: `number` \| `null`

---

### retryAfterSeconds?

> `optional` **retryAfterSeconds?**: `number`

Defined in: [types/proxy.ts:4616](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4616)
