[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountQuota

# Type Alias: AccountQuota

> **AccountQuota** = `object`

Defined in: [types/proxy.ts:747](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L747)

## Properties

### sessionUsed

> **sessionUsed**: `number`

Defined in: [types/proxy.ts:749](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L749)

0.0-1.0 (from unified-5h-utilization)

---

### sessionStatus

> **sessionStatus**: `string`

Defined in: [types/proxy.ts:751](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L751)

"allowed" | "throttled" | "rejected"

---

### sessionResetAt

> **sessionResetAt**: `number`

Defined in: [types/proxy.ts:753](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L753)

Unix timestamp (seconds) when the 5h window resets

---

### weeklyUsed

> **weeklyUsed**: `number`

Defined in: [types/proxy.ts:755](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L755)

0.0-1.0 (from unified-7d-utilization)

---

### weeklyStatus

> **weeklyStatus**: `string`

Defined in: [types/proxy.ts:757](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L757)

"allowed" | "throttled" | "rejected"

---

### weeklyResetAt

> **weeklyResetAt**: `number`

Defined in: [types/proxy.ts:759](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L759)

Unix timestamp (seconds) when the 7d window resets

---

### fallbackPercentage

> **fallbackPercentage**: `number`

Defined in: [types/proxy.ts:761](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L761)

0.0-1.0 (from fallback-percentage)

---

### overageStatus

> **overageStatus**: `string`

Defined in: [types/proxy.ts:763](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L763)

"allowed" | "rejected"

---

### lastUpdated

> **lastUpdated**: `number`

Defined in: [types/proxy.ts:765](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L765)

Epoch ms when we last captured this data
