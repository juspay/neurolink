[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HippocampusCondenserGenerateOptions

# Type Alias: HippocampusCondenserGenerateOptions

> **HippocampusCondenserGenerateOptions** = `object`

The exact request shape Hippocampus's condenser sends to `generate()`
(`@juspay/hippocampus` `src/client.ts`, the `neurolink.generate({...})`
call inside `add()`). A full `NeuroLink` instance satisfies this
structurally; so does any host object that can answer a plain text prompt.

## Properties

### input

> **input**: `object`

#### text

> **text**: `string`

---

### provider?

> `optional` **provider?**: `string`

---

### model?

> `optional` **model?**: `string`

---

### temperature?

> `optional` **temperature?**: `number`

---

### disableTools?

> `optional` **disableTools?**: `boolean`
