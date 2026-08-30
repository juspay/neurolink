[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticReport

# Type Alias: DiagnosticReport

> **DiagnosticReport** = `object`

Defined in: [types/providers.ts:2324](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2324)

Aggregated SageMaker diagnostic report.

## Properties

### overallStatus

> **overallStatus**: `"healthy"` \| `"issues"` \| `"critical"`

Defined in: [types/providers.ts:2325](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2325)

---

### results

> **results**: [`DiagnosticResult`](DiagnosticResult.md)[]

Defined in: [types/providers.ts:2326](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2326)

---

### summary

> **summary**: `object`

Defined in: [types/providers.ts:2327](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2327)

#### total

> **total**: `number`

#### passed

> **passed**: `number`

#### failed

> **failed**: `number`

#### warnings

> **warnings**: `number`
