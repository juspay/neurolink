[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGates

# Type Alias: ProxyShareGates

> **ProxyShareGates** = `object`

Defined in: [types/proxy.ts:4071](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4071)

The gate set. Every configured gate must pass; the effective allowance is the
minimum across all of them. Gates are deliberately orthogonal so a headroom
grant can also carry a window-slice ceiling, a spillover grant can also carry
a model allowlist, and so on.

## Properties

### maxSlice?

> `optional` **maxSlice?**: [`ProxyShareWindowSlice`](ProxyShareWindowSlice.md)

Defined in: [types/proxy.ts:4076](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4076)

Hard ceiling on how much of the **pool** the borrower may consume, as a
percentage of one window's worth of capacity. Pool-wide because an
operator saying "a fifth" means a fifth of what they have, not a fifth of
every credential they happen to own.

---

### maxSlicePerAccount?

> `optional` **maxSlicePerAccount?**: [`ProxyShareWindowSlice`](ProxyShareWindowSlice.md)

Defined in: [types/proxy.ts:4079](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4079)

Per-account ceiling. Rare — reach for `maxSlice` unless you specifically
mean "this much of every credential, independently".

---

### reserveFloor?

> `optional` **reserveFloor?**: [`ProxyShareWindowSlice`](ProxyShareWindowSlice.md)

Defined in: [types/proxy.ts:4081](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4081)

Admit only while the lender's own utilization leaves this much headroom.

---

### spillover?

> `optional` **spillover?**: [`ProxyShareSpilloverGate`](ProxyShareSpilloverGate.md)

Defined in: [types/proxy.ts:4082](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4082)

---

### models?

> `optional` **models?**: `string`[]

Defined in: [types/proxy.ts:4084](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4084)

Model tier allowlist, matched case-insensitively as substrings.

---

### accounts?

> `optional` **accounts?**: `string`[]

Defined in: [types/proxy.ts:4086](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4086)

Which of the lender's accounts are lendable under this grant.

---

### rate?

> `optional` **rate?**: [`ProxyShareRate`](ProxyShareRate.md)

Defined in: [types/proxy.ts:4087](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4087)

---

### schedule?

> `optional` **schedule?**: [`ProxyShareSchedule`](ProxyShareSchedule.md)

Defined in: [types/proxy.ts:4088](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4088)

---

### notAfter?

> `optional` **notAfter?**: `number`

Defined in: [types/proxy.ts:4090](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4090)

Grant expiry, epoch ms.
