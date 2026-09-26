[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DebugResult

# Type Alias: DebugResult

> **DebugResult** = `object`

Result of the AI debugging workflow.

## Properties

### issues

> **issues**: `object`[]

#### type

> **type**: `string`

#### severity

> **severity**: `"low"` \| `"medium"` \| `"high"`

#### description

> **description**: `string`

#### location?

> `optional` **location?**: `string`

---

### suggestions

> **suggestions**: `string`[]

---

### possibleCauses

> **possibleCauses**: `string`[]

---

### fixedOutput?

> `optional` **fixedOutput?**: `string`
