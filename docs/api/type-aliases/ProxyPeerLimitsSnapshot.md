[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerLimitsSnapshot

# Type Alias: ProxyPeerLimitsSnapshot

> **ProxyPeerLimitsSnapshot** = `object`

Defined in: [types/proxy.ts:3853](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3853)

What `GET /peer/limits` tells a borrower.

Scoped to the caller's own grant on purpose: it carries no account labels and
no per-account figures, so it cannot be used to describe — or count — the
lender's pool. `null` on a slice means no ceiling is configured for that
window, which is different from a ceiling with nothing left.

## Properties

### grantState

> **grantState**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:3854](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3854)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3855](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3855)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3856](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3856)

---

### remainingCoins?

> `optional` **remainingCoins?**: `number`

Defined in: [types/proxy.ts:3857](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3857)

---

### servable

> **servable**: `boolean`

Defined in: [types/proxy.ts:3859](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3859)

Whether at least one of the lender's accounts can serve this grant now.

---

### withheldReason?

> `optional` **withheldReason?**: [`ProxyShareRefusalReason`](ProxyShareRefusalReason.md)

Defined in: [types/proxy.ts:3860](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3860)

---

### sliceLeftPct

> **sliceLeftPct**: `object`

Defined in: [types/proxy.ts:3861](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3861)

#### session

> **session**: `number` \| `null`

#### weekly

> **weekly**: `number` \| `null`

---

### retryAfterSeconds?

> `optional` **retryAfterSeconds?**: `number`

Defined in: [types/proxy.ts:3865](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3865)
