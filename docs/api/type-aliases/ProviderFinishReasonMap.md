[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderFinishReasonMap

# Type Alias: ProviderFinishReasonMap

> **ProviderFinishReasonMap** = `object`

Translates one wire's finish (stop) reason into another vocabulary.
Lookup order: `map`, then `whenAbsent` for a null or undefined reason,
then `defaultAtToolCap` when the loop stopped with tool calls pending,
then the reason itself under `passthroughUnknown`, then `default`.

## Properties

### map

> **map**: `Record`\<`string`, `string` \| `null`\>

Exact wire value to translated value; `null` means "no reason".

---

### default

> **default**: `string` \| `null`

Value for any reason the map does not list.

---

### whenAbsent?

> `optional` **whenAbsent?**: `string` \| `null`

Value for a null or undefined reason; omitted means it falls through.

---

### defaultAtToolCap?

> `optional` **defaultAtToolCap?**: `string`

Value for an unlisted reason when the step cap cut off pending tool calls.

---

### passthroughUnknown?

> `optional` **passthroughUnknown?**: `boolean`

Return an unlisted reason unchanged instead of `default`.

---

### lowercase?

> `optional` **lowercase?**: `boolean`

Lower-case the reason before the lookup.
