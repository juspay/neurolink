[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerLimitsSnapshot

# Type Alias: ProxyPeerLimitsSnapshot

> **ProxyPeerLimitsSnapshot** = `object`

Defined in: [types/proxy.ts:3752](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3752)

What `GET /peer/limits` tells a borrower.

Scoped to the caller's own grant on purpose: it carries no account labels and
no per-account figures, so it cannot be used to describe — or count — the
lender's pool. `null` on a slice means no ceiling is configured for that
window, which is different from a ceiling with nothing left.

## Properties

### grantState

> **grantState**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:3753](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3753)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3754](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3754)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3755](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3755)

---

### remainingCoins?

> `optional` **remainingCoins?**: `number`

Defined in: [types/proxy.ts:3756](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3756)

---

### servable

> **servable**: `boolean`

Defined in: [types/proxy.ts:3758](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3758)

Whether at least one of the lender's accounts can serve this grant now.

---

### withheldReason?

> `optional` **withheldReason?**: [`ProxyShareRefusalReason`](ProxyShareRefusalReason.md)

Defined in: [types/proxy.ts:3759](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3759)

---

### sliceLeftPct

> **sliceLeftPct**: `object`

Defined in: [types/proxy.ts:3760](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3760)

#### session

> **session**: `number` \| `null`

#### weekly

> **weekly**: `number` \| `null`

---

### retryAfterSeconds?

> `optional` **retryAfterSeconds?**: `number`

Defined in: [types/proxy.ts:3764](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3764)
