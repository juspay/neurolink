[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / InfraRegistryEntry

# Type Alias: InfraRegistryEntry\<TItem, TMetadata\>

> **InfraRegistryEntry**\<`TItem`, `TMetadata`\> = `object`

Defined in: [types/common.ts:451](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L451)

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

Defined in: [types/common.ts:452](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L452)

#### Returns

`Promise`\<`TItem`\>

---

### metadata

> **metadata**: `TMetadata`

Defined in: [types/common.ts:453](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L453)

---

### instance?

> `optional` **instance?**: `TItem`

Defined in: [types/common.ts:454](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L454)
