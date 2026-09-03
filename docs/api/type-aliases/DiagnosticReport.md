[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticReport

# Type Alias: DiagnosticReport

> **DiagnosticReport** = `object`

Defined in: [types/providers.ts:2329](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2329)

Aggregated SageMaker diagnostic report.

## Properties

### overallStatus

> **overallStatus**: `"healthy"` \| `"issues"` \| `"critical"`

Defined in: [types/providers.ts:2330](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2330)

---

### results

> **results**: [`DiagnosticResult`](DiagnosticResult.md)[]

Defined in: [types/providers.ts:2331](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2331)

---

### summary

> **summary**: `object`

Defined in: [types/providers.ts:2332](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2332)

#### total

> **total**: `number`

#### passed

> **passed**: `number`

#### failed

> **failed**: `number`

#### warnings

> **warnings**: `number`
