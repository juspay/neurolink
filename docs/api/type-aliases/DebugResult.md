[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DebugResult

# Type Alias: DebugResult

> **DebugResult** = `object`

Defined in: [types/mcp.ts:2623](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L2623)

Result of the AI debugging workflow.

## Properties

### issues

> **issues**: `object`[]

Defined in: [types/mcp.ts:2624](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L2624)

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

Defined in: [types/mcp.ts:2630](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L2630)

---

### possibleCauses

> **possibleCauses**: `string`[]

Defined in: [types/mcp.ts:2631](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L2631)

---

### fixedOutput?

> `optional` **fixedOutput?**: `string`

Defined in: [types/mcp.ts:2632](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L2632)
