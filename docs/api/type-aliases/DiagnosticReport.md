[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticReport

# Type Alias: DiagnosticReport

> **DiagnosticReport** = `object`

Defined in: [types/providers.ts:2355](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2355)

Aggregated SageMaker diagnostic report.

## Properties

### overallStatus

> **overallStatus**: `"healthy"` \| `"issues"` \| `"critical"`

Defined in: [types/providers.ts:2356](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2356)

---

### results

> **results**: [`DiagnosticResult`](DiagnosticResult.md)[]

Defined in: [types/providers.ts:2357](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2357)

---

### summary

> **summary**: `object`

Defined in: [types/providers.ts:2358](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2358)

#### total

> **total**: `number`

#### passed

> **passed**: `number`

#### failed

> **failed**: `number`

#### warnings

> **warnings**: `number`
