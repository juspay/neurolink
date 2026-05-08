[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / InfraRegistryEntry

# Type Alias: InfraRegistryEntry\<TItem, TMetadata\>

> **InfraRegistryEntry**\<`TItem`, `TMetadata`\> = `object`

Defined in: [types/common.ts:421](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L421)

Registry entry for lazy-loaded items in BaseRegistry.
Named InfraRegistryEntry to avoid collision with workflowTypes.ts RegistryEntry.

## Type Parameters

### TItem

`TItem`

### TMetadata

`TMetadata` = `unknown`

## Properties

### factory

> **factory**: () => `Promise`\<`TItem`\>

Defined in: [types/common.ts:422](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L422)

#### Returns

`Promise`\<`TItem`\>

---

### metadata

> **metadata**: `TMetadata`

Defined in: [types/common.ts:423](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L423)

---

### instance?

> `optional` **instance?**: `TItem`

Defined in: [types/common.ts:424](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L424)
