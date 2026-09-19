[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticReport

# Type Alias: DiagnosticReport

> **DiagnosticReport** = `object`

Defined in: [types/providers.ts:2403](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2403)

Aggregated SageMaker diagnostic report.

## Properties

### overallStatus

> **overallStatus**: `"healthy"` \| `"issues"` \| `"critical"`

Defined in: [types/providers.ts:2404](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2404)

---

### results

> **results**: [`DiagnosticResult`](DiagnosticResult.md)[]

Defined in: [types/providers.ts:2405](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2405)

---

### summary

> **summary**: `object`

Defined in: [types/providers.ts:2406](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2406)

#### total

> **total**: `number`

#### passed

> **passed**: `number`

#### failed

> **failed**: `number`

#### warnings

> **warnings**: `number`
