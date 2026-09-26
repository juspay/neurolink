[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InfraRegistryEntry

# Type Alias: InfraRegistryEntry\<TItem, TMetadata\>

> **InfraRegistryEntry**\<`TItem`, `TMetadata`\> = `object`

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

#### Returns

`Promise`\<`TItem`\>

---

### metadata

> **metadata**: `TMetadata`

---

### instance?

> `optional` **instance?**: `TItem`
