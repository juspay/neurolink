[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticReport

# Type Alias: DiagnosticReport

> **DiagnosticReport** = `object`

Defined in: [types/providers.ts:2474](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2474)

Aggregated SageMaker diagnostic report.

## Properties

### overallStatus

> **overallStatus**: `"healthy"` \| `"issues"` \| `"critical"`

Defined in: [types/providers.ts:2475](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2475)

---

### results

> **results**: [`DiagnosticResult`](DiagnosticResult.md)[]

Defined in: [types/providers.ts:2476](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2476)

---

### summary

> **summary**: `object`

Defined in: [types/providers.ts:2477](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2477)

#### total

> **total**: `number`

#### passed

> **passed**: `number`

#### failed

> **failed**: `number`

#### warnings

> **warnings**: `number`
