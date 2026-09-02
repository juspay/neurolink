[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RefactoringResult

# Type Alias: RefactoringResult

> **RefactoringResult** = `object`

Defined in: [types/mcp.ts:2622](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2622)

Result of the code-refactoring AI workflow.

## Properties

### refactoredCode

> **refactoredCode**: `string`

Defined in: [types/mcp.ts:2623](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2623)

---

### changes

> **changes**: `string`[]

Defined in: [types/mcp.ts:2624](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2624)

---

### improvements

> **improvements**: `string`[]

Defined in: [types/mcp.ts:2625](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2625)

---

### metrics

> **metrics**: `object`

Defined in: [types/mcp.ts:2626](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2626)

#### linesReduced

> **linesReduced**: `number`

#### complexityReduction

> **complexityReduction**: `number`

#### readabilityScore

> **readabilityScore**: `number`
