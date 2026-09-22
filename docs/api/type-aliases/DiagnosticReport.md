[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticReport

# Type Alias: DiagnosticReport

> **DiagnosticReport** = `object`

Defined in: [types/providers.ts:2407](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2407)

Aggregated SageMaker diagnostic report.

## Properties

### overallStatus

> **overallStatus**: `"healthy"` \| `"issues"` \| `"critical"`

Defined in: [types/providers.ts:2408](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2408)

---

### results

> **results**: [`DiagnosticResult`](DiagnosticResult.md)[]

Defined in: [types/providers.ts:2409](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2409)

---

### summary

> **summary**: `object`

Defined in: [types/providers.ts:2410](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2410)

#### total

> **total**: `number`

#### passed

> **passed**: `number`

#### failed

> **failed**: `number`

#### warnings

> **warnings**: `number`
