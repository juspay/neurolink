[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DebugResult

# Type Alias: DebugResult

> **DebugResult** = `object`

Defined in: [types/mcp.ts:2642](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2642)

Result of the AI debugging workflow.

## Properties

### issues

> **issues**: `object`[]

Defined in: [types/mcp.ts:2643](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2643)

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

Defined in: [types/mcp.ts:2649](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2649)

---

### possibleCauses

> **possibleCauses**: `string`[]

Defined in: [types/mcp.ts:2650](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2650)

---

### fixedOutput?

> `optional` **fixedOutput?**: `string`

Defined in: [types/mcp.ts:2651](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2651)
