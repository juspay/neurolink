[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerLimitsSnapshot

# Type Alias: ProxyPeerLimitsSnapshot

> **ProxyPeerLimitsSnapshot** = `object`

Defined in: [types/proxy.ts:4449](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4449)

What `GET /peer/limits` tells a borrower.

Scoped to the caller's own grant on purpose: it carries no account labels and
no per-account figures, so it cannot be used to describe — or count — the
lender's pool. `null` on a slice means no ceiling is configured for that
window, which is different from a ceiling with nothing left.

## Properties

### grantState

> **grantState**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:4450](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4450)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:4451](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4451)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:4452](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4452)

---

### remainingCoins?

> `optional` **remainingCoins?**: `number`

Defined in: [types/proxy.ts:4453](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4453)

---

### servable

> **servable**: `boolean`

Defined in: [types/proxy.ts:4455](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4455)

Whether at least one of the lender's accounts can serve this grant now.

---

### withheldReason?

> `optional` **withheldReason?**: [`ProxyShareRefusalReason`](ProxyShareRefusalReason.md)

Defined in: [types/proxy.ts:4456](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4456)

---

### sliceLeftPct

> **sliceLeftPct**: `object`

Defined in: [types/proxy.ts:4457](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4457)

#### session

> **session**: `number` \| `null`

#### weekly

> **weekly**: `number` \| `null`

---

### retryAfterSeconds?

> `optional` **retryAfterSeconds?**: `number`

Defined in: [types/proxy.ts:4461](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4461)
