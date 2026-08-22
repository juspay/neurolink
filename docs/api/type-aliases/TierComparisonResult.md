[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TierComparisonResult

# Type Alias: TierComparisonResult

> **TierComparisonResult** = `object`

Defined in: [types/subscription.ts:620](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L620)

Subscription tier comparison result

## Description

Result of comparing two subscription tiers

## Properties

### isHigher

> **isHigher**: `boolean`

Defined in: [types/subscription.ts:622](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L622)

Whether the first tier is higher than the second

---

### isLower

> **isLower**: `boolean`

Defined in: [types/subscription.ts:624](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L624)

Whether the first tier is lower than the second

---

### isEqual

> **isEqual**: `boolean`

Defined in: [types/subscription.ts:626](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L626)

Whether the tiers are equal

---

### levelDifference

> **levelDifference**: `number`

Defined in: [types/subscription.ts:628](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L628)

Numeric difference between tier levels (positive = first is higher)
