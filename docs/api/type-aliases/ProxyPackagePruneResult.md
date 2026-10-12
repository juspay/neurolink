[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPackagePruneResult

# Type Alias: ProxyPackagePruneResult

> **ProxyPackagePruneResult** = `object`

## Properties

### skipped?

> `optional` **skipped?**: `string`

Set when the pass declined to remove anything or stopped early, with the reason.

---

### removed

> **removed**: `string`[]

---

### retained

> **retained**: `object`[]

#### name

> **name**: `string`

#### reason

> **reason**: [`ProxyPackagePruneRetention`](ProxyPackagePruneRetention.md)

---

### failed

> **failed**: `object`[]

#### name

> **name**: `string`

#### message

> **message**: `string`
