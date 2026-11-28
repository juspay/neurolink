[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderUsageCountDialect

# Type Alias: ProviderUsageCountDialect

> **ProviderUsageCountDialect** = `object`

Where an endpoint puts prompt, completion and total counts. Each list is
tried in order: `pick: "truthy"` takes the first truthy value (`a || b`),
`pick: "defined"` the first non-null one (`a ?? b`); with neither found,
the last value is used. A missing or zero total becomes prompt + completion.

## Properties

### input

> **input**: `string`[]

---

### output

> **output**: `string`[]

---

### total

> **total**: `string`[]

---

### pick

> **pick**: `"truthy"` \| `"defined"`
