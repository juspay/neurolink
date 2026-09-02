[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGates

# Type Alias: ProxyShareGates

> **ProxyShareGates** = `object`

Defined in: [types/proxy.ts:3443](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3443)

The gate set. Every configured gate must pass; the effective allowance is the
minimum across all of them. Gates are deliberately orthogonal so a headroom
grant can also carry a window-slice ceiling, a spillover grant can also carry
a model allowlist, and so on.

## Properties

### maxSlice?

> `optional` **maxSlice?**: [`ProxyShareWindowSlice`](ProxyShareWindowSlice.md)

Defined in: [types/proxy.ts:3448](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3448)

Hard ceiling on how much of the **pool** the borrower may consume, as a
percentage of one window's worth of capacity. Pool-wide because an
operator saying "a fifth" means a fifth of what they have, not a fifth of
every credential they happen to own.

---

### maxSlicePerAccount?

> `optional` **maxSlicePerAccount?**: [`ProxyShareWindowSlice`](ProxyShareWindowSlice.md)

Defined in: [types/proxy.ts:3451](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3451)

Per-account ceiling. Rare — reach for `maxSlice` unless you specifically
mean "this much of every credential, independently".

---

### reserveFloor?

> `optional` **reserveFloor?**: [`ProxyShareWindowSlice`](ProxyShareWindowSlice.md)

Defined in: [types/proxy.ts:3453](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3453)

Admit only while the lender's own utilization leaves this much headroom.

---

### spillover?

> `optional` **spillover?**: [`ProxyShareSpilloverGate`](ProxyShareSpilloverGate.md)

Defined in: [types/proxy.ts:3454](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3454)

---

### models?

> `optional` **models?**: `string`[]

Defined in: [types/proxy.ts:3456](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3456)

Model tier allowlist, matched case-insensitively as substrings.

---

### accounts?

> `optional` **accounts?**: `string`[]

Defined in: [types/proxy.ts:3458](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3458)

Which of the lender's accounts are lendable under this grant.

---

### rate?

> `optional` **rate?**: [`ProxyShareRate`](ProxyShareRate.md)

Defined in: [types/proxy.ts:3459](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3459)

---

### schedule?

> `optional` **schedule?**: [`ProxyShareSchedule`](ProxyShareSchedule.md)

Defined in: [types/proxy.ts:3460](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3460)

---

### notAfter?

> `optional` **notAfter?**: `number`

Defined in: [types/proxy.ts:3462](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3462)

Grant expiry, epoch ms.
