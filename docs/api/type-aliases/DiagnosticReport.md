[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticReport

# Type Alias: DiagnosticReport

> **DiagnosticReport** = `object`

Defined in: [types/providers.ts:2346](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2346)

Aggregated SageMaker diagnostic report.

## Properties

### overallStatus

> **overallStatus**: `"healthy"` \| `"issues"` \| `"critical"`

Defined in: [types/providers.ts:2347](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2347)

---

### results

> **results**: [`DiagnosticResult`](DiagnosticResult.md)[]

Defined in: [types/providers.ts:2348](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2348)

---

### summary

> **summary**: `object`

Defined in: [types/providers.ts:2349](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2349)

#### total

> **total**: `number`

#### passed

> **passed**: `number`

#### failed

> **failed**: `number`

#### warnings

> **warnings**: `number`
