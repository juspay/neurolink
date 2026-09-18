[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerLimitsSnapshot

# Type Alias: ProxyPeerLimitsSnapshot

> **ProxyPeerLimitsSnapshot** = `object`

Defined in: [types/proxy.ts:4222](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4222)

What `GET /peer/limits` tells a borrower.

Scoped to the caller's own grant on purpose: it carries no account labels and
no per-account figures, so it cannot be used to describe — or count — the
lender's pool. `null` on a slice means no ceiling is configured for that
window, which is different from a ceiling with nothing left.

## Properties

### grantState

> **grantState**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:4223](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4223)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:4224](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4224)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:4225](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4225)

---

### remainingCoins?

> `optional` **remainingCoins?**: `number`

Defined in: [types/proxy.ts:4226](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4226)

---

### servable

> **servable**: `boolean`

Defined in: [types/proxy.ts:4228](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4228)

Whether at least one of the lender's accounts can serve this grant now.

---

### withheldReason?

> `optional` **withheldReason?**: [`ProxyShareRefusalReason`](ProxyShareRefusalReason.md)

Defined in: [types/proxy.ts:4229](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4229)

---

### sliceLeftPct

> **sliceLeftPct**: `object`

Defined in: [types/proxy.ts:4230](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4230)

#### session

> **session**: `number` \| `null`

#### weekly

> **weekly**: `number` \| `null`

---

### retryAfterSeconds?

> `optional` **retryAfterSeconds?**: `number`

Defined in: [types/proxy.ts:4234](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4234)
