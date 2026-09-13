[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DebugResult

# Type Alias: DebugResult

> **DebugResult** = `object`

Defined in: [types/mcp.ts:2661](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2661)

Result of the AI debugging workflow.

## Properties

### issues

> **issues**: `object`[]

Defined in: [types/mcp.ts:2662](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2662)

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

Defined in: [types/mcp.ts:2668](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2668)

---

### possibleCauses

> **possibleCauses**: `string`[]

Defined in: [types/mcp.ts:2669](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2669)

---

### fixedOutput?

> `optional` **fixedOutput?**: `string`

Defined in: [types/mcp.ts:2670](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2670)
