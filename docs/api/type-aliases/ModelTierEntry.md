[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelTierEntry

# Type Alias: ModelTierEntry

> **ModelTierEntry** = `object`

Defined in: [types/requestRouter.ts:59](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/requestRouter.ts#L59)

Tier-to-(provider,model) mapping used by `createDefaultRequestRouter`.
Each tier is optional; an unmatched tier produces an empty decision.

## Properties

### provider

> **provider**: `string`

Defined in: [types/requestRouter.ts:60](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/requestRouter.ts#L60)

---

### model

> **model**: `string`

Defined in: [types/requestRouter.ts:61](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/requestRouter.ts#L61)

---

### region?

> `optional` **region?**: `string`

Defined in: [types/requestRouter.ts:62](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/requestRouter.ts#L62)
