[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticReport

# Type Alias: DiagnosticReport

> **DiagnosticReport** = `object`

Defined in: [types/providers.ts:2410](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2410)

Aggregated SageMaker diagnostic report.

## Properties

### overallStatus

> **overallStatus**: `"healthy"` \| `"issues"` \| `"critical"`

Defined in: [types/providers.ts:2411](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2411)

---

### results

> **results**: [`DiagnosticResult`](DiagnosticResult.md)[]

Defined in: [types/providers.ts:2412](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2412)

---

### summary

> **summary**: `object`

Defined in: [types/providers.ts:2413](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2413)

#### total

> **total**: `number`

#### passed

> **passed**: `number`

#### failed

> **failed**: `number`

#### warnings

> **warnings**: `number`
