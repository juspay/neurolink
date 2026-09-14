[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerLimitsSnapshot

# Type Alias: ProxyPeerLimitsSnapshot

> **ProxyPeerLimitsSnapshot** = `object`

Defined in: [types/proxy.ts:4183](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4183)

What `GET /peer/limits` tells a borrower.

Scoped to the caller's own grant on purpose: it carries no account labels and
no per-account figures, so it cannot be used to describe — or count — the
lender's pool. `null` on a slice means no ceiling is configured for that
window, which is different from a ceiling with nothing left.

## Properties

### grantState

> **grantState**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:4184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4184)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:4185](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4185)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:4186](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4186)

---

### remainingCoins?

> `optional` **remainingCoins?**: `number`

Defined in: [types/proxy.ts:4187](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4187)

---

### servable

> **servable**: `boolean`

Defined in: [types/proxy.ts:4189](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4189)

Whether at least one of the lender's accounts can serve this grant now.

---

### withheldReason?

> `optional` **withheldReason?**: [`ProxyShareRefusalReason`](ProxyShareRefusalReason.md)

Defined in: [types/proxy.ts:4190](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4190)

---

### sliceLeftPct

> **sliceLeftPct**: `object`

Defined in: [types/proxy.ts:4191](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4191)

#### session

> **session**: `number` \| `null`

#### weekly

> **weekly**: `number` \| `null`

---

### retryAfterSeconds?

> `optional` **retryAfterSeconds?**: `number`

Defined in: [types/proxy.ts:4195](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4195)
