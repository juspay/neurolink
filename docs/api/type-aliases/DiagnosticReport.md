[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticReport

# Type Alias: DiagnosticReport

> **DiagnosticReport** = `object`

Defined in: [types/providers.ts:2321](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2321)

Aggregated SageMaker diagnostic report.

## Properties

### overallStatus

> **overallStatus**: `"healthy"` \| `"issues"` \| `"critical"`

Defined in: [types/providers.ts:2322](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2322)

---

### results

> **results**: [`DiagnosticResult`](DiagnosticResult.md)[]

Defined in: [types/providers.ts:2323](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2323)

---

### summary

> **summary**: `object`

Defined in: [types/providers.ts:2324](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2324)

#### total

> **total**: `number`

#### passed

> **passed**: `number`

#### failed

> **failed**: `number`

#### warnings

> **warnings**: `number`
