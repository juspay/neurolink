[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RefactoringResult

# Type Alias: RefactoringResult

> **RefactoringResult** = `object`

Defined in: [types/mcp.ts:2641](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2641)

Result of the code-refactoring AI workflow.

## Properties

### refactoredCode

> **refactoredCode**: `string`

Defined in: [types/mcp.ts:2642](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2642)

---

### changes

> **changes**: `string`[]

Defined in: [types/mcp.ts:2643](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2643)

---

### improvements

> **improvements**: `string`[]

Defined in: [types/mcp.ts:2644](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2644)

---

### metrics

> **metrics**: `object`

Defined in: [types/mcp.ts:2645](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2645)

#### linesReduced

> **linesReduced**: `number`

#### complexityReduction

> **complexityReduction**: `number`

#### readabilityScore

> **readabilityScore**: `number`
