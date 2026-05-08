[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TierComparisonResult

# Type Alias: TierComparisonResult

> **TierComparisonResult** = `object`

Defined in: [types/subscription.ts:538](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L538)

Subscription tier comparison result

## Description

Result of comparing two subscription tiers

## Properties

### isHigher

> **isHigher**: `boolean`

Defined in: [types/subscription.ts:540](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L540)

Whether the first tier is higher than the second

---

### isLower

> **isLower**: `boolean`

Defined in: [types/subscription.ts:542](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L542)

Whether the first tier is lower than the second

---

### isEqual

> **isEqual**: `boolean`

Defined in: [types/subscription.ts:544](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L544)

Whether the tiers are equal

---

### levelDifference

> **levelDifference**: `number`

Defined in: [types/subscription.ts:546](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L546)

Numeric difference between tier levels (positive = first is higher)
