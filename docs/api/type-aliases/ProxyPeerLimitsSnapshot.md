[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerLimitsSnapshot

# Type Alias: ProxyPeerLimitsSnapshot

> **ProxyPeerLimitsSnapshot** = `object`

Defined in: [types/proxy.ts:3844](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3844)

What `GET /peer/limits` tells a borrower.

Scoped to the caller's own grant on purpose: it carries no account labels and
no per-account figures, so it cannot be used to describe — or count — the
lender's pool. `null` on a slice means no ceiling is configured for that
window, which is different from a ceiling with nothing left.

## Properties

### grantState

> **grantState**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:3845](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3845)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3846)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3847](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3847)

---

### remainingCoins?

> `optional` **remainingCoins?**: `number`

Defined in: [types/proxy.ts:3848](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3848)

---

### servable

> **servable**: `boolean`

Defined in: [types/proxy.ts:3850](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3850)

Whether at least one of the lender's accounts can serve this grant now.

---

### withheldReason?

> `optional` **withheldReason?**: [`ProxyShareRefusalReason`](ProxyShareRefusalReason.md)

Defined in: [types/proxy.ts:3851](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3851)

---

### sliceLeftPct

> **sliceLeftPct**: `object`

Defined in: [types/proxy.ts:3852](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3852)

#### session

> **session**: `number` \| `null`

#### weekly

> **weekly**: `number` \| `null`

---

### retryAfterSeconds?

> `optional` **retryAfterSeconds?**: `number`

Defined in: [types/proxy.ts:3856](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3856)
