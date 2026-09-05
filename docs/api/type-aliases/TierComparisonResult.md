[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TierComparisonResult

# Type Alias: TierComparisonResult

> **TierComparisonResult** = `object`

Defined in: [types/subscription.ts:621](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L621)

Subscription tier comparison result

## Description

Result of comparing two subscription tiers

## Properties

### isHigher

> **isHigher**: `boolean`

Defined in: [types/subscription.ts:623](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L623)

Whether the first tier is higher than the second

---

### isLower

> **isLower**: `boolean`

Defined in: [types/subscription.ts:625](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L625)

Whether the first tier is lower than the second

---

### isEqual

> **isEqual**: `boolean`

Defined in: [types/subscription.ts:627](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L627)

Whether the tiers are equal

---

### levelDifference

> **levelDifference**: `number`

Defined in: [types/subscription.ts:629](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L629)

Numeric difference between tier levels (positive = first is higher)
